import os
import unittest
from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.main import app
from app.models import Catalog, Category, Rack, RackSlot
from app.schemas.operational import RackRequest
from app.services.rack_service import rack_slots


class RackValidationTests(unittest.TestCase):
    def test_rack_slots_follow_row_major_letter_number_codes(self) -> None:
        self.assertEqual(
            rack_slots(2, 3),
            [
                {"code": "A1", "productId": None},
                {"code": "A2", "productId": None},
                {"code": "A3", "productId": None},
                {"code": "B1", "productId": None},
                {"code": "B2", "productId": None},
                {"code": "B3", "productId": None},
            ],
        )

    def test_rack_request_keeps_mongo_field_names(self) -> None:
        body = RackRequest(name="Rack A", rows=3, columns=5)
        self.assertEqual(
            body.model_dump(),
            {"name": "Rack A", "rows": 3, "columns": 5},
        )


@unittest.skipUnless(
    os.getenv("TEST_DATABASE_URL"),
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database with alembic head applied.",
)
class RacksAPITests(unittest.TestCase):
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
            id="racks-test-admin",
            role="admin",
        )
        self.client = TestClient(app, raise_server_exceptions=False)
        self.suffix = uuid4().hex
        self.category_id = str(uuid4())
        self.product_id = str(uuid4())
        now = datetime.now(timezone.utc)
        self.session.add(
            Category(
                id=self.category_id,
                name=f"Racks {self.suffix}",
                is_default=False,
                is_active=True,
                product_count=1,
                created_at=now,
                updated_at=now,
            )
        )
        self.session.add(
            Catalog(
                id=self.product_id,
                name=f"Product {self.suffix}",
                product_name=f"Product {self.suffix}",
                category_id=self.category_id,
                category=f"Racks {self.suffix}",
                unit="each",
                standard_rate=10,
                product_code=f"RACK-{self.suffix}",
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

    def test_create_list_assign_products_and_delete_rack(self) -> None:
        created = self.client.post(
            "/api/racks",
            json={"name": f"Rack {self.suffix}", "rows": 2, "columns": 3},
        )
        self.assertEqual(created.status_code, 200, created.text)
        rack_data = created.json()["data"]
        rack_id = rack_data["id"]
        self.assertEqual((rack_data["rows"], rack_data["columns"]), (2, 3))
        self.assertEqual(
            [slot["code"] for slot in rack_data["slots"]],
            ["A1", "A2", "A3", "B1", "B2", "B3"],
        )

        listed = self.client.get("/api/racks")
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertIn(rack_id, {rack["id"] for rack in listed.json()["data"]})

        assigned = self.client.put(
            f"/api/racks/{rack_id}/assign",
            json={"productId": f"RACK-{self.suffix}", "slotCode": "A1"},
        )
        self.assertEqual(assigned.status_code, 200, assigned.text)
        self.assertEqual(
            assigned.json()["data"],
            {
                "rackId": rack_id,
                "rackName": f"Rack {self.suffix}",
                "slotCode": "A1",
                "productId": self.product_id,
            },
        )
        product = self.session.get(Catalog, self.product_id)
        self.assertEqual(product.rack_id, rack_id)
        self.assertEqual(product.rack_slot, "A1")

        rack_products = self.client.get(f"/api/racks/{rack_id}/products")
        self.assertEqual(rack_products.status_code, 200, rack_products.text)
        self.assertEqual(
            [item["id"] for item in rack_products.json()["data"]],
            [self.product_id],
        )

        occupied_delete = self.client.delete(f"/api/racks/{rack_id}")
        self.assertEqual(occupied_delete.status_code, 409)
        self.assertEqual(
            occupied_delete.json()["error"],
            "Rack with assigned products cannot be deleted",
        )

        slot = self.session.scalar(
            select(RackSlot).where(
                RackSlot.rack_id == rack_id,
                RackSlot.slot_code == "A1",
            )
        )
        slot.product_id = None
        self.session.flush()
        product.rack_id = None
        product.rack_name = None
        product.rack_slot = None
        self.session.flush()

        deleted = self.client.delete(f"/api/racks/{rack_id}")
        self.assertEqual(deleted.status_code, 200, deleted.text)
        self.assertEqual(
            deleted.json()["data"],
            {"deleted": True, "id": rack_id},
        )
        self.assertEqual(self.client.get("/api/racks").json()["data"], [])

    def test_assignment_replaces_occupant_and_updates_catalog_links(self) -> None:
        second_product_id = str(uuid4())
        now = datetime.now(timezone.utc)
        self.session.add(
            Catalog(
                id=second_product_id,
                name=f"Second product {self.suffix}",
                product_name=f"Second product {self.suffix}",
                category_id=self.category_id,
                category=f"Racks {self.suffix}",
                unit="each",
                standard_rate=10,
                product_code=f"RACK2-{self.suffix}",
                stock=0,
                created_at=now,
                updated_at=now,
            )
        )
        self.session.flush()
        rack = Rack(
            id=str(uuid4()),
            name=f"Rack {self.suffix}",
            row_count=1,
            column_count=1,
            created_at=now,
            updated_at=now,
        )
        slot = RackSlot(
            id=str(uuid4()),
            rack_id=rack.id,
            slot_code="A1",
            product_id=self.product_id,
            created_at=now,
            updated_at=now,
        )
        product = self.session.get(Catalog, self.product_id)
        product.rack_id = rack.id
        product.rack_name = rack.name
        product.rack_slot = "A1"
        self.session.add_all([rack, slot])
        self.session.flush()

        response = self.client.put(
            f"/api/racks/{rack.id}/assign",
            json={"productId": second_product_id, "slotCode": "A1"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            self.session.scalar(
                select(RackSlot.product_id).where(RackSlot.id == slot.id)
            ),
            second_product_id,
        )
        self.assertIsNone(product.rack_id)
        second_product = self.session.get(Catalog, second_product_id)
        self.assertEqual(second_product.rack_id, rack.id)
        self.assertEqual(second_product.rack_slot, "A1")

    def test_invalid_rack_dimensions_and_non_admin_mutations(self) -> None:
        invalid = self.client.post(
            "/api/racks",
            json={"name": f"Bad {self.suffix}", "rows": 27, "columns": 1},
        )
        self.assertEqual(invalid.status_code, 400)

        app.dependency_overrides[get_current_admin] = lambda: AuthenticatedPrincipal(
            id="racks-test-staff",
            role="staff",
        )
        denied = self.client.post(
            "/api/racks",
            json={"name": f"Rack {self.suffix}", "rows": 2, "columns": 2},
        )
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(denied.json()["error"], "Insufficient permissions")
