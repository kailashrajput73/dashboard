import os
import unittest
import unittest.mock
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.errors import AuthenticationError
from app.main import app
from app.models import Partner
from app.routers.partner_app import require_approved_app_partner
from app.services.firebase_auth import validate_auth_config
from app.services.partner_app_service import require_approved_partner


@unittest.skipUnless(
    os.getenv("TEST_DATABASE_URL"),
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database with alembic head applied.",
)
class PartnerAppAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(os.environ["TEST_DATABASE_URL"])

    @classmethod
    def tearDownClass(cls) -> None:
        cls.engine.dispose()

    def setUp(self) -> None:
        os.environ["AUTH_MODE"] = "dev"
        os.environ["ENV"] = "development"
        self.connection = self.engine.connect()
        self.outer_transaction = self.connection.begin()

        def override_db_session():
            with Session(
                bind=self.connection,
                join_transaction_mode="create_savepoint",
            ) as session:
                yield session

        app.dependency_overrides[get_db_session] = override_db_session
        self.client = TestClient(app, raise_server_exceptions=False)

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.pop(get_db_session, None)
        app.dependency_overrides.pop(get_current_admin, None)
        self.outer_transaction.rollback()
        self.connection.close()

    def _dev_headers(self, phone: str) -> dict[str, str]:
        return {"Authorization": f"Bearer dev:{phone}"}

    def _unique_phone(self, leading: str = "9") -> str:
        return f"{leading}{uuid4().int % 1_000_000_000:09d}"

    def test_dev_session_creates_pending_partner(self) -> None:
        phone = self._unique_phone("9")
        response = self.client.post(
            "/api/app/session",
            headers=self._dev_headers(phone),
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertTrue(body["success"])
        data = body["data"]
        self.assertEqual(data["kycStatus"], "pending")
        self.assertFalse(data["kycSubmitted"])
        self.assertEqual(data["registeredVia"], "firebase")
        self.assertNotIn("firebaseUid", data)
        self.assertNotIn("passcodeHash", data)

    def test_session_twice_same_partner(self) -> None:
        phone = self._unique_phone("8")
        first = self.client.post(
            "/api/app/session",
            headers=self._dev_headers(phone),
        )
        second = self.client.post(
            "/api/app/session",
            headers=self._dev_headers(phone),
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()["data"]["id"], second.json()["data"]["id"])

    def test_phone_e164_links_existing_passcode_partner(self) -> None:
        storage_phone = "9876543210"
        registration = self.client.post(
            "/api/auth/partner/register",
            json={
                "name": "Legacy partner",
                "phone": storage_phone,
                "passcode": "secret123",
            },
        )
        self.assertEqual(registration.status_code, 200, registration.text)
        legacy_id = registration.json()["data"]["id"]

        linked = self.client.post(
            "/api/app/session",
            headers=self._dev_headers("+919876543210"),
        )
        self.assertEqual(linked.status_code, 200, linked.text)
        self.assertEqual(linked.json()["data"]["id"], legacy_id)
        row = self.connection.execute(
            text("SELECT firebase_uid FROM partners WHERE id = :id"),
            {"id": legacy_id},
        ).one()
        self.assertEqual(row.firebase_uid, "dev-9876543210")

        login = self.client.post(
            "/api/auth/partner/login",
            json={"phone": storage_phone, "passcode": "secret123"},
        )
        self.assertEqual(login.status_code, 200, login.text)

    def test_invalid_token_401_envelope(self) -> None:
        response = self.client.get(
            "/api/app/me",
            headers={"Authorization": "Bearer not-valid"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json(),
            {"success": False, "data": None, "error": "Invalid or missing token"},
        )

    def test_profile_update_ignores_forbidden_fields(self) -> None:
        phone = self._unique_phone("7")
        session = self.client.post(
            "/api/app/session",
            headers=self._dev_headers(phone),
        )
        partner_id = session.json()["data"]["id"]
        updated = self.client.put(
            "/api/app/profile",
            headers=self._dev_headers(phone),
            json={
                "name": "Updated Name",
                "kycStatus": "approved",
                "phone": "0000000000",
            },
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["data"]["name"], "Updated Name")
        self.assertEqual(updated.json()["data"]["kycStatus"], "pending")
        self.assertNotEqual(updated.json()["data"]["phone"], "0000000000")
        row = self.connection.execute(
            text("SELECT kyc_status, phone FROM partners WHERE id = :id"),
            {"id": partner_id},
        ).one()
        self.assertEqual(row.kyc_status, "pending")
        self.assertNotEqual(row.phone, "0000000000")

    def test_kyc_flow(self) -> None:
        phone = self._unique_phone("6")
        headers = self._dev_headers(phone)
        self.client.post("/api/app/session", headers=headers)

        bad_pan = self.client.post(
            "/api/app/kyc",
            headers=headers,
            json={"panNumber": "bad", "documents": []},
        )
        self.assertEqual(bad_pan.status_code, 400)

        good = self.client.post(
            "/api/app/kyc",
            headers=headers,
            json={"panNumber": "abcde1234f", "documents": ["https://example.com/a.pdf"]},
        )
        self.assertEqual(good.status_code, 200, good.text)
        self.assertTrue(good.json()["data"]["kycSubmitted"])
        self.assertEqual(good.json()["data"]["panNumber"], "ABCDE1234F")

        again = self.client.post(
            "/api/app/kyc",
            headers=headers,
            json={"panNumber": "ABCDE1234F", "documents": []},
        )
        self.assertEqual(again.status_code, 400)

    def test_kyc_resubmit_after_reject(self) -> None:
        phone = self._unique_phone("5")
        headers = self._dev_headers(phone)
        created = self.client.post("/api/app/session", headers=headers)
        partner_id = created.json()["data"]["id"]
        self.connection.execute(
            text(
                "UPDATE partners SET kyc_status = 'rejected', "
                "kyc_submitted = true, rejection_reason = 'bad doc' "
                "WHERE id = :id"
            ),
            {"id": partner_id},
        )
        resubmit = self.client.post(
            "/api/app/kyc",
            headers=headers,
            json={"panNumber": "FGHIJ5678K", "documents": []},
        )
        self.assertEqual(resubmit.status_code, 200, resubmit.text)
        self.assertEqual(resubmit.json()["data"]["kycStatus"], "pending")
        self.assertIsNone(resubmit.json()["data"]["rejectionReason"])

    def test_partners_scoped_by_token(self) -> None:
        phone_a = self._unique_phone("4")
        phone_b = self._unique_phone("3")
        self.client.post("/api/app/session", headers=self._dev_headers(phone_a))
        self.client.post("/api/app/session", headers=self._dev_headers(phone_b))
        self.client.put(
            "/api/app/profile",
            headers=self._dev_headers(phone_a),
            json={"name": "Partner A"},
        )
        me_b = self.client.get("/api/app/me", headers=self._dev_headers(phone_b))
        self.assertEqual(me_b.json()["data"]["name"], "")

    def test_firebase_partner_visible_and_admin_kyc(self) -> None:
        phone = self._unique_phone("2")
        session = self.client.post(
            "/api/app/session",
            headers=self._dev_headers(phone),
        )
        partner_id = session.json()["data"]["id"]
        app.dependency_overrides[get_current_admin] = (
            lambda: AuthenticatedPrincipal(id="admin-test", role="admin")
        )
        listed = self.client.get("/api/partners")
        self.assertEqual(listed.status_code, 200, listed.text)
        ids = [row["id"] for row in listed.json()["data"]]
        self.assertIn(partner_id, ids)

        approved = self.client.put(
            f"/api/partners/{partner_id}/kyc",
            json={"approved": True, "locationVerified": True},
        )
        self.assertEqual(approved.status_code, 200, approved.text)
        self.assertEqual(approved.json()["data"]["kycStatus"], "approved")

    def test_legacy_partner_routes_still_work(self) -> None:
        suffix = uuid4().hex[:8]
        phone = f"555{suffix}"
        self.client.post(
            "/api/auth/partner/register",
            json={"name": "Route check", "phone": phone, "passcode": "secret123"},
        )
        login = self.client.post(
            "/api/auth/partner/login",
            json={"phone": phone, "passcode": "secret123"},
        )
        self.assertEqual(login.status_code, 200, login.text)
        listed = self.client.get("/api/partners")
        self.assertEqual(listed.status_code, 401)


class PartnerAppUnitTests(unittest.TestCase):
    def test_validate_auth_config_rejects_dev_in_production(self) -> None:
        with unittest.mock.patch.dict(
            os.environ,
            {"AUTH_MODE": "dev", "ENV": "production"},
            clear=False,
        ):
            with self.assertRaises(RuntimeError):
                validate_auth_config()

    def test_require_approved_partner(self) -> None:
        pending = Partner(kyc_status="pending")
        approved = Partner(kyc_status="approved")
        with self.assertRaises(Exception):
            require_approved_partner(pending)
        require_approved_partner(approved)

    def test_require_approved_app_partner_raises_kyc_not_approved(self) -> None:
        pending = Partner(kyc_status="pending", firebase_uid="dev-test")
        session = unittest.mock.MagicMock()
        session.scalar.return_value = pending
        identity = unittest.mock.MagicMock(firebase_uid="dev-test")
        with self.assertRaises(AuthenticationError) as raised:
            require_approved_app_partner(identity, session)
        self.assertEqual(raised.exception.status_code, 403)
        self.assertEqual(raised.exception.detail, "KYC_NOT_APPROVED")
