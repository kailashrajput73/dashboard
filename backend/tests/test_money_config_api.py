from __future__ import annotations

import os
import unittest
from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.main import app
from app.models import AdminToken, MoneyConfig, User
from app.routers.money_config import router as money_config_router
from app.schemas.operational import MoneyConfigRequest
from app.services.money_config_service import _money_config_json


class MoneyConfigContractTests(unittest.TestCase):
    def test_put_model_defaults_match_mongo_request_schema(self) -> None:
        self.assertEqual(
            MoneyConfigRequest().model_dump(),
            {
                "discountPercent": 0,
                "gstPercent": 0,
                "specialDiscountPercent": 0,
                "showDiscount": True,
                "showGst": True,
                "showSpecialDiscount": False,
            },
        )

    def test_response_uses_the_mongo_money_config_field_names(self) -> None:
        config = MoneyConfig(
            id="config-id",
            admin_id="admin-id",
            discount_percent=1,
            gst_percent=18,
            special_discount_percent=2,
            show_discount=False,
            show_gst=True,
            show_special_discount=True,
        )
        self.assertEqual(
            _money_config_json(config),
            {
                "id": "config-id",
                "adminId": "admin-id",
                "discountPercent": 1,
                "gstPercent": 18,
                "specialDiscountPercent": 2,
                "showDiscount": False,
                "showGst": True,
                "showSpecialDiscount": True,
            },
        )

    def test_both_routes_require_the_existing_admin_dependency(self) -> None:
        dependencies_by_route = {
            (method, route.path): {
                dependency.call.__name__
                for dependency in route.dependant.dependencies
            }
            for route in money_config_router.routes
            for method in route.methods
        }
        for method in ("GET", "PUT"):
            self.assertIn(
                "get_current_admin",
                dependencies_by_route[(method, "/api/money-config/{admin_id}")],
            )

    def test_app_registers_get_and_put_on_the_money_config_path(self) -> None:
        methods = {
            method.upper()
            for method in app.openapi()["paths"]["/api/money-config/{admin_id}"]
        }
        self.assertEqual(methods, {"GET", "PUT"})


@unittest.skipUnless(
    os.getenv("TEST_DATABASE_URL"),
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database with alembic head applied.",
)
class MoneyConfigAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from sqlalchemy import create_engine

        cls.engine = create_engine(os.environ["TEST_DATABASE_URL"])

    @classmethod
    def tearDownClass(cls) -> None:
        cls.engine.dispose()

    def setUp(self) -> None:
        self.connection = self.engine.connect()
        self.outer_transaction = self.connection.begin()
        self.admin_id = str(uuid4())
        self.token = f"money-config-test-{uuid4()}"

        with Session(
            bind=self.connection,
            join_transaction_mode="create_savepoint",
        ) as session:
            session.add(
                User(
                    id=self.admin_id,
                    role="admin",
                    name="Money config API test",
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                )
            )
            session.add(
                AdminToken(
                    id=str(uuid4()),
                    token=self.token,
                    admin_id=self.admin_id,
                )
            )
            session.flush()

        def override_db_session():
            with Session(
                bind=self.connection,
                join_transaction_mode="create_savepoint",
            ) as session:
                yield session

        app.dependency_overrides[get_db_session] = override_db_session
        self.client = TestClient(app, raise_server_exceptions=False)
        self.auth_headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.pop(get_db_session, None)
        self.outer_transaction.rollback()
        self.connection.close()

    def test_get_creates_defaults_and_put_upserts_all_fields(self) -> None:
        response = self.client.get(
            f"/api/money-config/{self.admin_id}",
            headers=self.auth_headers,
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(set(payload), {"success", "data", "error"})
        config = payload["data"]
        self.assertEqual(
            {
                key: config[key]
                for key in (
                    "adminId",
                    "discountPercent",
                    "gstPercent",
                    "specialDiscountPercent",
                    "showDiscount",
                    "showGst",
                    "showSpecialDiscount",
                )
            },
            {
                "adminId": self.admin_id,
                "discountPercent": 0,
                "gstPercent": 18,
                "specialDiscountPercent": 0,
                "showDiscount": True,
                "showGst": True,
                "showSpecialDiscount": False,
            },
        )
        self.assertNotIn("createdAt", config)
        self.assertNotIn("updatedAt", config)

        updated = self.client.put(
            f"/api/money-config/{self.admin_id}",
            json={
                "discountPercent": 5.5,
                "gstPercent": 12,
                "specialDiscountPercent": 3,
                "showDiscount": False,
                "showGst": True,
                "showSpecialDiscount": True,
            },
            headers=self.auth_headers,
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(
            updated.json()["data"],
            {
                "id": config["id"],
                "adminId": self.admin_id,
                "discountPercent": 5.5,
                "gstPercent": 12,
                "specialDiscountPercent": 3,
                "showDiscount": False,
                "showGst": True,
                "showSpecialDiscount": True,
            },
        )

        with Session(self.connection) as session:
            records = session.scalars(
                select(MoneyConfig).where(MoneyConfig.admin_id == self.admin_id)
            ).all()
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0].gst_percent, 12)

    def test_get_rejects_an_admin_id_other_than_the_logged_in_admin(self) -> None:
        response = self.client.get(
            f"/api/money-config/{uuid4()}",
            headers=self.auth_headers,
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json(),
            {
                "success": False,
                "data": None,
                "error": "Insufficient permissions",
            },
        )

    def test_put_upserts_when_config_row_is_missing(self) -> None:
        body = {
            "discountPercent": 2,
            "gstPercent": 18,
            "specialDiscountPercent": 0,
            "showDiscount": True,
            "showGst": True,
            "showSpecialDiscount": False,
        }
        response = self.client.put(
            f"/api/money-config/{self.admin_id}",
            json=body,
            headers=self.auth_headers,
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["adminId"], self.admin_id)
        self.assertEqual(response.json()["data"]["discountPercent"], 2)
