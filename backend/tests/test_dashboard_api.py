from __future__ import annotations

import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy.dialects.postgresql import dialect

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.main import app
from app.services.dashboard_service import dashboard_snapshot


class DashboardSnapshotServiceTests(unittest.TestCase):
    def test_builds_snapshot_payload_from_database_aggregates(self) -> None:
        session = Mock()
        session.scalar.side_effect = [3, 2, 4, 2, 1, 25.555]
        session.execute.side_effect = [
            Mock(one=lambda: (18.25, 1)),
            [("pending", 1), ("custom-status", 2)],
            [
                SimpleNamespace(
                    id="rfq-1",
                    partner_id="partner-1",
                    created_at=datetime(2026, 10, 13, tzinfo=timezone.utc),
                    line_count=2,
                )
            ],
            [
                SimpleNamespace(product_code="SKU-1", dispatch_qty=3.5)
            ],
            [("SKU-1", "Product 1")],
            [
                SimpleNamespace(
                    product_code="SKU-2",
                    name="Product 2",
                    stock=5,
                )
            ],
        ]

        result = dashboard_snapshot(session)

        for call in (*session.scalar.call_args_list, *session.execute.call_args_list):
            str(call.args[0].compile(dialect=dialect()))

        self.assertEqual(
            result,
            {
                "success": True,
                "data": {
                    "catalogCount": 3,
                    "categoryCount": 2,
                    "totalStockUnits": 18.25,
                    "lowStockCount": 1,
                    "rfqCounts": {
                        "pending": 1,
                        "approved": 0,
                        "rejected": 0,
                        "dispatched": 0,
                        "custom-status": 2,
                    },
                    "pendingRfqs": [
                        {
                            "id": "rfq-1",
                            "partnerId": "partner-1",
                            "lineCount": 2,
                            "createdAt": "2026-10-13T00:00:00+00:00",
                        }
                    ],
                    "partnersTotal": 4,
                    "partnersKycApproved": 2,
                    "dispatchValue7d": 25.55,
                    "dispatchCount7d": 1,
                    "salesWindowDays": 30,
                    "topMovingProducts": [
                        {
                            "productCode": "SKU-1",
                            "name": "Product 1",
                            "dispatchQty": 3.5,
                        }
                    ],
                    "slowMovingProducts": [
                        {"productCode": "SKU-2", "name": "Product 2", "stock": 5.0}
                    ],
                },
                "error": None,
            },
        )


class DashboardSnapshotRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        def override_db_session():
            yield object()

        app.dependency_overrides[get_db_session] = override_db_session
        app.dependency_overrides[get_current_admin] = lambda: AuthenticatedPrincipal(
            id="dashboard-test-admin",
            role="admin",
        )
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.pop(get_db_session, None)
        app.dependency_overrides.pop(get_current_admin, None)

    def test_snapshot_route_returns_expected_envelope_and_payload(self) -> None:
        snapshot = {
            "catalogCount": 3,
            "categoryCount": 2,
            "totalStockUnits": 7.5,
            "lowStockCount": 1,
            "rfqCounts": {
                "pending": 1,
                "approved": 0,
                "rejected": 0,
                "dispatched": 0,
            },
            "pendingRfqs": [
                {
                    "id": "rfq-1",
                    "partnerId": "partner-1",
                    "lineCount": 2,
                    "createdAt": "2026-10-13T00:00:00+00:00",
                }
            ],
            "partnersTotal": 1,
            "partnersKycApproved": 1,
            "dispatchValue7d": 10.0,
            "dispatchCount7d": 1,
            "salesWindowDays": 30,
            "topMovingProducts": [
                {"productCode": "SKU-1", "name": "Product 1", "dispatchQty": 1.0}
            ],
            "slowMovingProducts": [],
        }
        with patch(
            "app.routers.dashboard.dashboard_service.dashboard_snapshot",
            return_value={"success": True, "data": snapshot, "error": None},
        ):
            response = self.client.get("/api/dashboard/snapshot")

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.json(),
            {"success": True, "data": snapshot, "error": None},
        )
