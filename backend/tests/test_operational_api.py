from __future__ import annotations

import os
import unittest
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.main import app


@unittest.skipUnless(
    os.getenv("TEST_DATABASE_URL"),
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database with alembic head applied.",
)
class OperationalAPITests(unittest.TestCase):
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
        suffix = uuid4().hex
        self.partner_id = str(uuid4())
        self.category_id = str(uuid4())
        self.product_id = str(uuid4())
        self.product_code = f"OPS-{suffix}"

        self.connection.execute(
            text("INSERT INTO partners (id, name) VALUES (:id, :name)"),
            {"id": self.partner_id, "name": f"Operations partner {suffix}"},
        )
        self.connection.execute(
            text("INSERT INTO categories (id, name) VALUES (:id, :name)"),
            {"id": self.category_id, "name": f"Operations category {suffix}"},
        )
        self.connection.execute(
            text(
                """
                INSERT INTO catalog
                    (id, name, product_name, category_id, category, unit,
                     standard_rate, product_code, stock, reorder_level)
                VALUES
                    (:id, :name, :product_name, :category_id, :category,
                     'each', 125, :product_code, 10, 2)
                """
            ),
            {
                "id": self.product_id,
                "name": f"Operations product {suffix}",
                "product_name": f"Operations product {suffix}",
                "category_id": self.category_id,
                "category": f"Operations category {suffix}",
                "product_code": self.product_code,
            },
        )

        def override_db_session():
            with Session(
                bind=self.connection,
                join_transaction_mode="create_savepoint",
            ) as session:
                yield session

        app.dependency_overrides[get_db_session] = override_db_session
        app.dependency_overrides[get_current_admin] = lambda: AuthenticatedPrincipal(
            id="operations-test-admin",
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

    def _create_rfq(self) -> str:
        response = self.client.post(
            "/api/rfqs",
            json={
                "partnerId": self.partner_id,
                "lines": [{"productCode": self.product_code, "quantity": 2}],
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["data"]["id"]

    def test_purchase_and_import_use_transactional_stock_update(self) -> None:
        payload = {
            "partnerId": self.partner_id,
            "lines": [
                {
                    "productCode": self.product_code,
                    "quantity": 2,
                    "listPrice": 100,
                }
            ],
        }
        for path in ("/api/purchases", "/api/purchases/import"):
            response = self.client.post(path, json=payload)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertTrue(response.json()["success"])

        self.assertEqual(
            self.session.execute(
                text("SELECT stock FROM catalog WHERE id = :id"),
                {"id": self.product_id},
            ).scalar_one(),
            14,
        )

    def test_purchase_without_partner_returns_validation_envelope(self) -> None:
        response = self.client.post(
            "/api/purchases",
            json={
                "lines": [
                    {
                        "productCode": self.product_code,
                        "quantity": 1,
                        "listPrice": 100,
                    }
                ]
            },
        )

        self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(
            response.json(),
            {
                "success": False,
                "data": {"errors": ["Partner id is required"]},
                "error": "Purchase validation failed",
            },
        )

    def test_rfq_crud_search_and_history(self) -> None:
        rfq_id = self._create_rfq()
        response = self.client.put(
            f"/api/rfqs/{rfq_id}",
            json={
                "partnerId": self.partner_id,
                "lines": [{"productCode": self.product_code, "quantity": 3}],
                "deliveryMode": "homeDelivery",
                "scheduledAt": "2026-10-12",
            },
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["grandTotal"], 375)
        self.assertEqual(response.json()["data"]["deliveryMode"], "homeDelivery")
        filtered = self.client.get(
            "/api/rfqs",
            params={
                "partner_id": self.partner_id,
                "status": "pending",
                "search": self.product_code.lower(),
            },
        )
        self.assertEqual(filtered.status_code, 200, filtered.text)
        self.assertEqual(
            [rfq["id"] for rfq in filtered.json()["data"]],
            [rfq_id],
        )
        self.assertEqual(
            self.client.get(f"/api/rfqs/{rfq_id}/history").json()["data"][-1][
                "action"
            ],
            "updated",
        )
        self.assertEqual(
            self.session.execute(
                text(
                    """
                    SELECT count(*)
                    FROM rfq_lines
                    WHERE rfq_id = :rfq_id AND deleted_at IS NOT NULL
                    """
                ),
                {"rfq_id": rfq_id},
            ).scalar_one(),
            1,
        )
        approval = self.client.post(
            f"/api/rfqs/{rfq_id}/approve",
            json={"approved": True},
        )
        self.assertEqual(approval.status_code, 200, approval.text)
        self.assertEqual(approval.json()["data"]["grandTotal"], 375)

    def test_rfq_approval_writes_reward_ledger_and_history(self) -> None:
        rfq_id = self._create_rfq()
        response = self.client.post(
            f"/api/rfqs/{rfq_id}/approve",
            json={"approved": True},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["status"], "approved")
        ledger = self.session.execute(
            text(
                """
                SELECT requester_id, quotation_id, points, type
                FROM reward_ledger
                WHERE quotation_id = :rfq_id
                """
            ),
            {"rfq_id": rfq_id},
        ).one()
        self.assertEqual(ledger, (self.partner_id, rfq_id, 2, "earned"))

        rewards = self.client.get(f"/api/partners/{self.partner_id}/rewards")
        self.assertEqual(rewards.status_code, 200, rewards.text)
        self.assertEqual(rewards.json()["data"]["balance"], 2)
        history = self.client.get(f"/api/rfqs/{rfq_id}/history")
        self.assertEqual(history.status_code, 200, history.text)
        self.assertEqual(history.json()["data"][-1]["action"], "approved")

    def test_dispatch_rejects_duplicate_source_rfq(self) -> None:
        rfq_id = self._create_rfq()
        approval = self.client.post(
            f"/api/rfqs/{rfq_id}/approve",
            json={"approved": True},
        )
        self.assertEqual(approval.status_code, 200, approval.text)
        payload = {
            "sourceRfqId": rfq_id,
            "lines": [{"productCode": self.product_code, "quantity": 3}],
        }

        invalid = self.client.post(
            "/api/dispatches",
            json={
                "sourceRfqId": rfq_id,
                "lines": [{"productCode": self.product_code, "quantity": 0}],
            },
        )
        self.assertEqual(invalid.status_code, 400, invalid.text)
        self.assertEqual(
            invalid.json()["data"]["errors"],
            ["Line 1: valid product code and positive quantity are required"],
        )

        first = self.client.post("/api/dispatches", json=payload)
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.post("/api/dispatches", json=payload)
        self.assertEqual(second.status_code, 409, second.text)
        self.assertEqual(second.json()["error"], "RFQ already has a dispatch")
        self.assertEqual(
            self.session.execute(
                text("SELECT stock FROM catalog WHERE id = :id"),
                {"id": self.product_id},
            ).scalar_one(),
            7,
        )

    def test_inventory_list_and_transaction_routes_return_envelopes(self) -> None:
        inventory = self.client.get("/api/inventory")
        self.assertEqual(inventory.status_code, 200, inventory.text)
        self.assertTrue(inventory.json()["success"])
        self.assertEqual(
            inventory.json()["data"][0]["productCode"],
            self.product_code,
        )

        for path in (
            "/api/inventory/low-stock",
            "/api/inventory/transactions",
            "/api/purchases",
            "/api/rfqs",
            "/api/dispatches",
        ):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(
                    set(response.json()),
                    {"success", "data", "error"},
                )
