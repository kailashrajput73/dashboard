import os
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.main import app
from app.models import (
    Brand,
    Catalog,
    Category,
    Pricing,
    PricingHistory,
    ProductGroup,
    ProductType,
    Subcategory,
)
from app.services import catalog_service


@unittest.skipUnless(
    os.getenv("TEST_DATABASE_URL"),
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database with alembic head applied.",
)
class CatalogAPITests(unittest.TestCase):
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
            id="catalog-test-admin",
            role="admin",
        )
        self.client = TestClient(app, raise_server_exceptions=False)

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.pop(get_db_session, None)
        app.dependency_overrides.pop(get_current_admin, None)
        self.session.close()
        self.outer_transaction.rollback()
        self.connection.close()

    def test_master_import_creates_catalog_taxonomy_and_group_links(self) -> None:
        suffix = uuid4().hex
        code = f"MASTER-{suffix}"
        response = self.client.post(
            "/api/catalog/import/master",
            json={
                "items": [
                    {
                        "name": "UPVC Pipe",
                        "category": f"Pipes {suffix}",
                        "type": "UPVC",
                        "productClass": "Sch 40",
                        "subcategory": "Drainage",
                        "brand": "Acme",
                        "productGroup": "Pipe set",
                        "productCode": code,
                        "mrp": 100,
                        "discount": 10,
                        "gstRate": 18,
                        "sizeMm": "25 mm",
                    }
                ]
            },
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.json()["data"],
            {
                "inserted": 1,
                "updated": 0,
                "skipped": 0,
                "categoryMode": "fromCsv",
            },
        )
        product = self.session.scalars(
            select(Catalog).where(Catalog.product_code == code)
        ).one()
        self.assertEqual(product.size_mm, 25)
        self.assertEqual(product.gst_rate, 18)
        self.assertIsNotNone(product.brand_id)
        self.assertIsNotNone(product.product_type_id)
        self.assertIsNotNone(product.subcategory_id)
        self.assertIsNotNone(
            self.connection.execute(
                select(ProductGroup.id).where(ProductGroup.name == "Pipe set")
            ).scalar_one()
        )

        category = self.session.scalars(
            select(Category).where(Category.id == product.category_id)
        ).one()
        subcategory = self.session.scalars(
            select(Subcategory).where(Subcategory.id == product.subcategory_id)
        ).one()
        product_type = self.session.scalars(
            select(ProductType).where(ProductType.id == product.product_type_id)
        ).one()
        brand = self.session.scalars(
            select(Brand).where(Brand.id == product.brand_id)
        ).one()
        self.assertEqual(category.name, f"Pipes {suffix}")
        self.assertEqual(subcategory.name, "Drainage")
        self.assertEqual(product_type.name, "UPVC")
        self.assertEqual(brand.name, "Acme")

        listed = self.client.get("/api/catalog")
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertTrue(listed.json()["success"])
        item = next(
            item for item in listed.json()["data"] if item["productCode"] == code
        )
        self.assertEqual(len(item["productGroupIds"]), 1)
        self.assertEqual(item["category"], category.name)
        self.assertNotIn("categoryId", item)
        self.assertNotIn("productTypeId", item)

    def test_pricing_upsert_and_pricing_stock_imports(self) -> None:
        suffix = uuid4().hex
        master = self.client.post(
            "/api/catalog/import/master",
            json={
                "items": [
                    {
                        "name": "Connector",
                        "category": "Fittings",
                        "productCode": f"PRICE-{suffix}",
                        "mrp": 50,
                        "discount": 10,
                    }
                ]
            },
        )
        self.assertEqual(master.status_code, 200, master.text)
        product = self.session.scalars(
            select(Catalog).where(Catalog.product_code == f"PRICE-{suffix}")
        ).one()

        updated = self.client.patch(
            f"/api/catalog/{product.id}/pricing",
            json={"mrp": 80, "discount": 25, "purchasePrice": 40},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        current_price = self.session.scalars(
            select(Pricing).where(Pricing.product_code == product.product_code)
        ).one()
        history_count = self.connection.execute(
            select(PricingHistory.id).where(
                PricingHistory.product_code == product.product_code
            )
        ).all()
        self.assertEqual(current_price.mrp, 80)
        self.assertEqual(current_price.selling_price, 60)
        self.assertEqual(current_price.purchase_price, 40)
        self.assertEqual(len(history_count), 2)

        pricing_import = self.client.post(
            "/api/catalog/import/pricing",
            json={
                "items": [
                    {
                        "productCode": f"PRICE-{suffix}",
                        "mrp": 100,
                        "discount": 20,
                        "sellingPrice": 95,
                    },
                    {"productCode": f"ORPHAN-{suffix}", "mrp": 20},
                ]
            },
        )
        self.assertEqual(pricing_import.status_code, 200, pricing_import.text)
        self.assertEqual(pricing_import.json()["data"]["updated"], 1)
        self.assertEqual(pricing_import.json()["data"]["skipped"], 1)
        self.assertEqual(len(pricing_import.json()["data"]["warnings"]), 1)
        current_values = self.connection.execute(
            select(Pricing.mrp, Pricing.selling_price).where(
                Pricing.product_code == product.product_code
            )
        ).one()
        self.assertEqual(current_values.mrp, 100)
        self.assertEqual(current_values.selling_price, 80)

        stock_import = self.client.post(
            "/api/catalog/import/stock",
            json={
                "items": [
                    {"productCode": f"PRICE-{suffix}", "stock": 14},
                    {"productCode": f"ORPHAN-{suffix}", "stock": 4},
                    {"productCode": f"PRICE-{suffix}", "stock": -1},
                ]
            },
        )
        self.assertEqual(stock_import.status_code, 200, stock_import.text)
        self.assertEqual(stock_import.json()["data"], {"updated": 1, "skipped": 2})
        self.assertEqual(
            self.connection.execute(
                select(Catalog.stock).where(Catalog.id == product.id)
            ).scalar_one(),
            14,
        )

    def test_catalog_import_rolls_back_every_write_after_mid_operation_failure(self) -> None:
        suffix = uuid4().hex
        with patch.object(
            catalog_service,
            "_pricing_write",
            side_effect=RuntimeError("forced mid-import failure"),
        ):
            response = self.client.post(
                "/api/catalog/import/master",
                json={
                    "items": [
                        {
                            "name": "Atomic item",
                            "category": f"Atomic category {suffix}",
                            "brand": f"Atomic brand {suffix}",
                            "type": f"Atomic type {suffix}",
                            "productCode": f"ATOMIC-{suffix}",
                        }
                    ]
                },
            )

        self.assertEqual(response.status_code, 500)
        self.assertIsNone(
            self.connection.execute(
                select(Catalog.id).where(
                    Catalog.product_code == f"ATOMIC-{suffix}"
                )
            ).scalar_one_or_none()
        )
        self.assertIsNone(
            self.connection.execute(
                select(Category.id).where(Category.name == f"Atomic category {suffix}")
            ).scalar_one_or_none()
        )
        self.assertIsNone(
            self.connection.execute(
                select(Brand.id).where(Brand.name == f"Atomic brand {suffix}")
            ).scalar_one_or_none()
        )
        self.assertIsNone(
            self.connection.execute(
                select(ProductType.id).where(ProductType.name == f"Atomic type {suffix}")
            ).scalar_one_or_none()
        )

    def test_catalog_requires_admin_bearer_token(self) -> None:
        app.dependency_overrides.pop(get_current_admin, None)
        response = self.client.get("/api/catalog")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"], "Missing admin token")

    def test_read_only_team_roles_cannot_write_catalog(self) -> None:
        app.dependency_overrides[get_current_admin] = (
            lambda: AuthenticatedPrincipal(id="catalog-reader", role="staff")
        )
        listed = self.client.get("/api/catalog")
        self.assertEqual(listed.status_code, 200, listed.text)

        imported = self.client.post(
            "/api/catalog/import/master",
            json={"items": [{"name": "Forbidden", "productCode": "FORBIDDEN"}]},
        )
        self.assertEqual(imported.status_code, 403)
        self.assertEqual(imported.json()["error"], "Insufficient permissions")

    def test_catalog_validation_errors_use_service_envelope(self) -> None:
        response = self.client.post(
            "/api/catalog/import/master",
            json={"items": [{}]},
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json(),
            {
                "success": False,
                "data": None,
                "error": "Request validation failed",
            },
        )
