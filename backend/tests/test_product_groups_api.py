import bcrypt
import os
import unittest
from datetime import datetime, timezone
from unittest.mock import Mock
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.main import app
from app.models import Catalog, Category, ProductGroup, User
from app.schemas.taxonomy import ProductGroupIn
from app.services.product_groups_service import _valid_product_ids


class ProductGroupValidationTests(unittest.TestCase):
    def test_product_ids_are_deduplicated_and_require_two_existing_products(self) -> None:
        session = Mock()
        session.scalars.return_value.all.return_value = ["product-a", "product-b"]

        result = _valid_product_ids(
            session,
            ["product-a", "product-a", "product-b"],
        )

        self.assertEqual(result, ["product-a", "product-b"])

    def test_product_ids_reject_fewer_than_two_distinct_products(self) -> None:
        session = Mock()

        result = _valid_product_ids(session, ["product-a", "product-a"])

        self.assertEqual(result, [])
        session.scalars.assert_not_called()

    def test_product_group_request_requires_name_and_product_ids(self) -> None:
        body = ProductGroupIn(name="Group", productIds=["a", "b"])

        self.assertEqual(body.model_dump(), {"name": "Group", "productIds": ["a", "b"]})


@unittest.skipUnless(
    os.getenv("TEST_DATABASE_URL"),
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database with alembic head applied.",
)
class ProductGroupsAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(os.environ["TEST_DATABASE_URL"])

    @classmethod
    def tearDownClass(cls) -> None:
        cls.engine.dispose()

    def setUp(self) -> None:
        self.connection = self.engine.connect()
        self.outer_transaction = self.connection.begin()
        self.session = Session(
            bind=self.connection,
            join_transaction_mode="create_savepoint",
        )

        def override_db_session():
            with Session(
                bind=self.connection,
                join_transaction_mode="create_savepoint",
            ) as session:
                yield session

        app.dependency_overrides[get_db_session] = override_db_session
        app.dependency_overrides[get_current_admin] = lambda: AuthenticatedPrincipal(
            id="product-groups-test-admin",
            role="admin",
        )
        self.client = TestClient(app, raise_server_exceptions=False)
        self.suffix = uuid4().hex
        self.category_id = str(uuid4())
        self.product_ids = [str(uuid4()) for _ in range(3)]
        now = datetime.now(timezone.utc)
        self.session.add(
            Category(
                id=self.category_id,
                name=f"Product groups {self.suffix}",
                is_default=False,
                is_active=True,
                product_count=0,
                created_at=now,
                updated_at=now,
            )
        )
        for index, product_id in enumerate(self.product_ids):
            self.session.add(
                Catalog(
                    id=product_id,
                    name=f"Product {index} {self.suffix}",
                    product_name=f"Product {index} {self.suffix}",
                    category_id=self.category_id,
                    category=f"Product groups {self.suffix}",
                    unit="each",
                    standard_rate=10,
                    product_code=f"PG-{self.suffix}-{index}",
                    stock=0,
                    created_at=now,
                    updated_at=now,
                )
            )
        self.session.flush()

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.pop(get_db_session, None)
        app.dependency_overrides.pop(get_current_admin, None)
        self.session.close()
        self.outer_transaction.rollback()
        self.connection.close()

    def test_group_crud_and_case_insensitive_duplicate(self) -> None:
        first_two = self.product_ids[:2]
        response = self.client.post(
            "/api/product-groups",
            json={"name": f"Group {self.suffix}", "productIds": first_two},
        )
        self.assertEqual(response.status_code, 200, response.text)
        created = response.json()["data"]
        self.assertEqual(created["name"], f"Group {self.suffix}")
        self.assertEqual(set(created["productIds"]), set(first_two))
        self.assertEqual(created["productCount"], 2)
        self.assertIsNotNone(created["createdAt"])
        group_id = created["id"]

        duplicate = self.client.post(
            "/api/product-groups",
            json={
                "name": f"GROUP {self.suffix}",
                "productIds": self.product_ids,
            },
        )
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(duplicate.json()["error"], "Product group name already exists")

        listed = self.client.get("/api/product-groups")
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertEqual(len(listed.json()["data"]), 1)
        self.assertEqual(listed.json()["data"][0]["id"], group_id)

        updated = self.client.put(
            f"/api/product-groups/{group_id}",
            json={
                "name": f"Renamed {self.suffix}",
                "productIds": self.product_ids[1:],
            },
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["data"]["name"], f"Renamed {self.suffix}")
        self.assertEqual(
            set(updated.json()["data"]["productIds"]),
            set(self.product_ids[1:]),
        )
        self.assertEqual(updated.json()["data"]["productCount"], 2)

        deleted = self.client.delete(f"/api/product-groups/{group_id}")
        self.assertEqual(deleted.status_code, 200, deleted.text)
        self.assertEqual(deleted.json()["data"], {"deleted": True, "id": group_id})
        self.assertIsNotNone(
            self.session.scalar(
                select(ProductGroup.deleted_at).where(ProductGroup.id == group_id)
            )
        )
        self.assertEqual(
            self.session.scalar(
                select(Catalog.deleted_at).where(Catalog.id == self.product_ids[1])
            ),
            None,
        )
        self.assertEqual(self.client.get("/api/product-groups").json()["data"], [])

    def test_product_group_mutations_require_admin_role(self) -> None:
        app.dependency_overrides[get_current_admin] = lambda: AuthenticatedPrincipal(
            id="product-groups-test-staff",
            role="staff",
        )
        response = self.client.post(
            "/api/product-groups",
            json={
                "name": f"Group {self.suffix}",
                "productIds": self.product_ids[:2],
            },
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"], "Insufficient permissions")
        self.assertEqual(self.client.get("/api/product-groups").status_code, 200)

    def test_cascade_soft_deletes_group_products_after_passcode_check(self) -> None:
        name = f"Cascade {self.suffix}"
        created = self.client.post(
            "/api/product-groups",
            json={"name": name, "productIds": self.product_ids[:2]},
        )
        self.assertEqual(created.status_code, 200, created.text)
        group_id = created.json()["data"]["id"]

        contact = f"PG-{self.suffix}"
        password_hash = bcrypt.hashpw(b"secret123", bcrypt.gensalt()).decode()
        self.session.add(
            User(
                id=str(uuid4()),
                role="admin",
                contact_number=contact,
                passcode_hash=password_hash,
                is_active=True,
            )
        )
        self.session.flush()

        response = self.client.post(
            f"/api/product-groups/{group_id}/delete-cascade",
            json={"contactNumber": contact, "passcode": "secret123"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.json()["data"],
            {"deleted": True, "id": group_id, "productsRemoved": 2},
        )
        deleted_products = self.session.scalars(
            select(Catalog.deleted_at).where(Catalog.id.in_(self.product_ids[:2]))
        ).all()
        self.assertEqual(len(deleted_products), 2)
        self.assertTrue(all(deleted_at is not None for deleted_at in deleted_products))
        self.assertIsNotNone(
            self.session.scalar(
                select(ProductGroup.deleted_at).where(ProductGroup.id == group_id)
            )
        )
