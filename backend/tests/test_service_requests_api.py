from __future__ import annotations

import os
import unittest
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.main import app
from app.models import ServiceRequest
from app.routers.service_requests import router as service_requests_router
from app.schemas.operational import (
    ServiceRequestCreateRequest,
    ServiceRequestUpdateRequest,
)
from app.services.service_requests_service import _history_event


class ServiceRequestContractTests(unittest.TestCase):
    def test_create_defaults_and_update_fields_mirror_mongo_contract(self) -> None:
        body = ServiceRequestCreateRequest(
            serviceType="plumber",
            customerName=" Customer ",
            customerPhone=" 123 ",
            description=" Repair ",
        )
        self.assertEqual(
            body.model_dump(),
            {
                "serviceType": "plumber",
                "customerName": " Customer ",
                "customerPhone": " 123 ",
                "description": " Repair ",
                "address": "",
                "pincode": "",
                "city": "",
                "area": "",
            },
        )
        update = ServiceRequestUpdateRequest()
        self.assertEqual(update.actor, "admin")
        self.assertIsNone(update.status)

    def test_history_event_uses_expected_embedded_json_shape(self) -> None:
        event = _history_event(
            "in_progress",
            actor="admin",
            note="Assigned",
            recommended_person={"name": "Alex", "phone": "123"},
            at="2026-10-14T00:00:00+00:00",
        )
        self.assertEqual(
            event,
            {
                "status": "in_progress",
                "actor": "admin",
                "at": "2026-10-14T00:00:00+00:00",
                "note": "Assigned",
                "recommendedPerson": {"name": "Alex", "phone": "123"},
            },
        )

    def test_only_public_create_omits_admin_auth_dependency(self) -> None:
        dependencies_by_route = {
            (method, route.path): {
                dependency.call.__name__
                for dependency in route.dependant.dependencies
            }
            for route in service_requests_router.routes
            for method in route.methods
        }
        self.assertEqual(
            dependencies_by_route[("POST", "/api/service-requests")],
            {"get_db_session"},
        )
        self.assertIn(
            "get_current_admin",
            dependencies_by_route[("GET", "/api/service-requests")],
        )
        self.assertIn(
            "get_current_admin",
            dependencies_by_route[("PATCH", "/api/service-requests/{request_id}")],
        )


@unittest.skipUnless(
    os.getenv("TEST_DATABASE_URL"),
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database with alembic head applied.",
)
class ServiceRequestsAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(os.environ["TEST_DATABASE_URL"])

    @classmethod
    def tearDownClass(cls) -> None:
        cls.engine.dispose()

    def setUp(self) -> None:
        self.connection = self.engine.connect()
        self.outer_transaction = self.connection.begin()

        def override_db_session():
            with Session(
                bind=self.connection,
                join_transaction_mode="create_savepoint",
            ) as session:
                yield session

        app.dependency_overrides[get_db_session] = override_db_session
        app.dependency_overrides[get_current_admin] = lambda: AuthenticatedPrincipal(
            id="service-requests-test-admin",
            role="admin",
        )
        self.client = TestClient(app, raise_server_exceptions=False)
        self.suffix = uuid4().hex

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.pop(get_db_session, None)
        app.dependency_overrides.pop(get_current_admin, None)
        self.outer_transaction.rollback()
        self.connection.close()

    def test_public_create_admin_list_update_and_embedded_history(self) -> None:
        created = self.client.post(
            "/api/service-requests",
            json={
                "serviceType": "electrician",
                "customerName": f"  Customer {self.suffix}  ",
                "customerPhone": "  9876543210  ",
                "description": "  Fix wiring  ",
                "city": "  Pune  ",
            },
        )
        self.assertEqual(created.status_code, 200)
        created_body = created.json()
        self.assertEqual(
            set(created_body),
            {"success", "data", "error"},
        )
        request = created_body["data"]
        request_id = request["id"]
        self.assertEqual(request["customerName"], f"Customer {self.suffix}")
        self.assertEqual(request["customerPhone"], "9876543210")
        self.assertEqual(request["description"], "Fix wiring")
        self.assertEqual(request["address"], "")
        self.assertEqual(request["city"], "Pune")
        self.assertEqual(request["status"], "pending")
        self.assertIsNone(request["recommendedName"])
        self.assertEqual(request["history"][0]["status"], "pending")
        self.assertEqual(request["history"][0]["actor"], "system")

        listed = self.client.get(
            "/api/service-requests",
            params={
                "service_type": "electrician",
                "search": self.suffix,
                "created_from": request["createdAt"],
                "created_to": request["createdAt"],
            },
        )
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(
            [item["id"] for item in listed.json()["data"]],
            [request_id],
        )

        updated = self.client.patch(
            f"/api/service-requests/{request_id}",
            json={
                "status": "in_progress",
                "recommendedName": "  Alex  ",
                "recommendedPhone": "  123  ",
                "adminNote": "  Scheduled  ",
                "actor": "admin",
                "note": "Assigned",
            },
        )
        self.assertEqual(updated.status_code, 200)
        updated_request = updated.json()["data"]
        self.assertEqual(updated_request["status"], "in_progress")
        self.assertEqual(updated_request["recommendedName"], "Alex")
        self.assertEqual(updated_request["recommendedPhone"], "123")
        self.assertEqual(updated_request["adminNote"], "Scheduled")
        self.assertEqual(len(updated_request["history"]), 2)
        self.assertEqual(
            updated_request["history"][-1]["recommendedPerson"],
            {"name": "Alex", "phone": "123"},
        )

        detail = self.client.get(f"/api/service-requests/{request_id}")
        history = self.client.get(f"/api/service-requests/{request_id}/history")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["data"], updated_request)
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.json()["data"], updated_request["history"])

    def test_create_validation_and_missing_record_envelopes(self) -> None:
        invalid = self.client.post(
            "/api/service-requests",
            json={
                "serviceType": "plumber",
                "customerName": " ",
                "customerPhone": " ",
                "description": " ",
            },
        )
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(
            invalid.json(),
            {
                "success": False,
                "data": {
                    "errors": [
                        "customerName is required",
                        "customerPhone is required",
                        "description is required",
                    ]
                },
                "error": "Service request validation failed",
            },
        )

        missing_id = str(uuid4())
        missing = self.client.get(f"/api/service-requests/{missing_id}")
        history = self.client.get(
            f"/api/service-requests/{missing_id}/history"
        )
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(history.status_code, 404)
        self.assertEqual(
            missing.json(),
            {
                "success": False,
                "data": None,
                "error": "Service request not found",
            },
        )

    def test_history_is_persisted_in_the_same_record(self) -> None:
        created = self.client.post(
            "/api/service-requests",
            json={
                "serviceType": "plumber",
                "customerName": f"Customer {self.suffix}",
                "customerPhone": "9876543210",
                "description": "Repair a leak",
            },
        )
        request_id = created.json()["data"]["id"]
        updated = self.client.patch(
            f"/api/service-requests/{request_id}",
            json={"status": "completed"},
        )
        self.assertEqual(updated.status_code, 200)

        with Session(self.connection) as session:
            record = session.scalar(
                select(ServiceRequest).where(ServiceRequest.id == request_id)
            )
            self.assertIsNotNone(record)
            self.assertEqual(len(record.history), 2)
