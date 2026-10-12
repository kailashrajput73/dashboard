import os
import unittest
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin, get_current_partner
from app.main import app


@unittest.skipUnless(
    os.getenv("TEST_DATABASE_URL"),
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database with alembic head applied.",
)
class AuthTaxonomyAPITests(unittest.TestCase):
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
        self.client = TestClient(app, raise_server_exceptions=False)

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.pop(get_db_session, None)
        app.dependency_overrides.pop(get_current_admin, None)
        app.dependency_overrides.pop(get_current_partner, None)
        self.outer_transaction.rollback()
        self.connection.close()

    def _register_and_login_admin(self) -> tuple[str, str]:
        suffix = uuid4().hex
        contact = f"TXN18-{suffix}"
        registered = self.client.post(
            "/api/auth/admin/register",
            json={
                "companyName": "TXN18 company",
                "gstin": f"GST-{suffix}",
                "contactNumber": contact,
                "passcode": "secret123",
            },
        )
        self.assertEqual(registered.status_code, 200, registered.text)
        self.assertTrue(registered.json()["success"])
        admin_id = registered.json()["data"]["adminId"]
        config = self.connection.execute(
            text(
                "SELECT gst_percent FROM money_config WHERE admin_id = :admin_id"
            ),
            {"admin_id": admin_id},
        ).scalar_one()
        self.assertEqual(config, 18)

        login = self.client.post(
            "/api/auth/admin/login",
            json={"contactNumber": contact, "passcode": "secret123"},
        )
        self.assertEqual(login.status_code, 200, login.text)
        self.assertTrue(login.json()["success"])
        return contact, login.json()["data"]["token"]

    def test_greenfield_admin_login_and_protected_category_list(self) -> None:
        _, token = self._register_and_login_admin()

        unauthenticated = self.client.get("/api/categories")
        self.assertEqual(unauthenticated.status_code, 401)
        self.assertEqual(
            unauthenticated.json(),
            {
                "success": False,
                "data": None,
                "error": "Missing admin token",
            },
        )
        app.dependency_overrides[get_current_admin] = (
            lambda: AuthenticatedPrincipal(id="test-admin", role="admin")
        )

        categories = self.client.get(
            "/api/categories",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(categories.status_code, 200, categories.text)
        self.assertEqual(
            categories.json(),
            {"success": True, "data": [], "error": None},
        )

    def test_partner_register_login_and_me(self) -> None:
        suffix = uuid4().hex
        registration = self.client.post(
            "/api/auth/partner/register",
            json={
                "name": "TXN18 partner",
                "phone": f"555-{suffix[:8]}",
                "passcode": "secret123",
            },
        )
        self.assertEqual(registration.status_code, 200, registration.text)
        self.assertNotIn("passcodeHash", registration.json()["data"])

        login = self.client.post(
            "/api/auth/partner/login",
            json={
                "phone": f"555-{suffix[:8]}",
                "passcode": "secret123",
            },
        )
        self.assertEqual(login.status_code, 200, login.text)
        token = login.json()["data"]["token"]
        partner_id = login.json()["data"]["partnerId"]
        app.dependency_overrides[get_current_partner] = (
            lambda: AuthenticatedPrincipal(id=partner_id, role="partner")
        )
        self.assertEqual(
            self.connection.execute(
                text("SELECT login_count FROM partners WHERE id = :id"),
                {"id": partner_id},
            ).scalar_one(),
            1,
        )

        me = self.client.get(
            "/api/auth/partner/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(me.status_code, 200, me.text)
        self.assertEqual(me.json()["data"]["id"], partner_id)
        self.assertEqual(me.json()["data"]["rewardBalance"], 0)

    def test_taxonomy_rename_duplicate_and_passcode_cascade(self) -> None:
        contact, token = self._register_and_login_admin()
        app.dependency_overrides[get_current_admin] = (
            lambda: AuthenticatedPrincipal(id="test-admin", role="admin")
        )
        headers = {"Authorization": f"Bearer {token}"}
        suffix = uuid4().hex
        category = self.client.post(
            "/api/categories",
            headers=headers,
            json={"name": f"TXN18 category {suffix}"},
        )
        self.assertEqual(category.status_code, 200, category.text)
        category_id = category.json()["data"]["id"]
        self.assertEqual(category.json()["data"]["productCount"], 0)

        category_name = f"TXN18 category {suffix}"
        duplicate = self.client.post(
            "/api/categories",
            headers=headers,
            json={"name": category_name.upper()},
        )
        self.assertEqual(duplicate.status_code, 409)

        subcategory = self.client.post(
            "/api/subcategories",
            headers=headers,
            json={"name": "Sub A", "categoryId": category_id},
        )
        self.assertEqual(subcategory.status_code, 200, subcategory.text)
        subcategory_id = subcategory.json()["data"]["id"]
        self.connection.execute(
            text(
                """
                INSERT INTO catalog
                    (id, name, product_name, category_id, category, unit,
                     standard_rate, product_code, stock, subcategory_id,
                     subcategory, type_name)
                VALUES
                    (:id, :name, :name, :category_id, :category, 'each',
                     10, :product_code, 1, :subcategory_id, 'Sub A',
                     :type_name)
                """
            ),
            {
                "id": str(uuid4()),
                "name": "TXN18 product",
                "category_id": category_id,
                "category": category_name,
                "product_code": f"TXN18-{suffix}",
                "subcategory_id": subcategory_id,
                "type_name": f"TXN18 type {suffix}",
            },
        )

        listed_types = self.client.get("/api/product-types", headers=headers)
        self.assertEqual(listed_types.status_code, 200, listed_types.text)
        product_type = next(
            item
            for item in listed_types.json()["data"]
            if item["name"] == f"TXN18 type {suffix}"
        )
        renamed_type = f"TXN18 renamed type {suffix}"
        type_update = self.client.put(
            f"/api/product-types/{product_type['id']}",
            headers=headers,
            json={"name": renamed_type, "isActive": True},
        )
        self.assertEqual(type_update.status_code, 200, type_update.text)
        self.assertEqual(type_update.json()["data"]["productCount"], 1)
        self.assertEqual(
            self.connection.execute(
                text("SELECT type_name FROM catalog WHERE product_code = :code"),
                {"code": f"TXN18-{suffix}"},
            ).scalar_one(),
            renamed_type,
        )

        renamed = f"TXN18 renamed {suffix}"
        update = self.client.put(
            f"/api/categories/{category_id}",
            headers=headers,
            json={"name": renamed, "isActive": True},
        )
        self.assertEqual(update.status_code, 200, update.text)
        self.assertEqual(update.json()["data"]["productCount"], 1)
        self.assertEqual(
            self.connection.execute(
                text("SELECT category FROM catalog WHERE category_id = :id"),
                {"id": category_id},
            ).scalar_one(),
            renamed,
        )
        subcategories = self.client.get(
            "/api/subcategories",
            headers=headers,
            params={"category_id": category_id},
        )
        self.assertEqual(subcategories.json()["data"][0]["category"], renamed)

        invalid_passcode = self.client.post(
            f"/api/categories/{category_id}/delete-cascade",
            json={"contactNumber": contact, "passcode": "wrong"},
        )
        self.assertEqual(invalid_passcode.status_code, 401)
        self.assertEqual(
            self.connection.execute(
                text(
                    "SELECT deleted_at FROM catalog WHERE category_id = :id"
                ),
                {"id": category_id},
            ).scalar_one(),
            None,
        )
        valid_passcode = self.client.post(
            f"/api/categories/{category_id}/delete-cascade",
            json={"contactNumber": contact, "passcode": "secret123"},
        )
        self.assertEqual(valid_passcode.status_code, 200, valid_passcode.text)
        self.assertEqual(valid_passcode.json()["data"]["productsRemoved"], 1)
        self.assertIsNotNone(
            self.connection.execute(
                text(
                    "SELECT deleted_at FROM catalog WHERE category_id = :id"
                ),
                {"id": category_id},
            ).scalar_one()
        )

    def test_failed_admin_register_rolls_back_user_and_money_config(self) -> None:
        self.connection.execute(
            text(
                """
                CREATE FUNCTION txn18_force_money_config_failure()
                RETURNS trigger
                LANGUAGE plpgsql AS $$
                BEGIN
                    RAISE EXCEPTION 'forced TXN-01 money config failure';
                END;
                $$
                """
            )
        )
        self.connection.execute(
            text(
                """
                CREATE TRIGGER txn18_force_money_config_failure
                BEFORE INSERT ON money_config
                FOR EACH ROW EXECUTE FUNCTION txn18_force_money_config_failure()
                """
            )
        )
        response = self.client.post(
            "/api/auth/admin/register",
            json={
                "companyName": "TXN18 failure",
                "gstin": "GST-TXN18-FAIL",
                "contactNumber": f"TXN18-{uuid4().hex}",
                "passcode": "secret123",
            },
        )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            self.connection.execute(
                text("SELECT count(*) FROM users WHERE role = 'admin'")
            ).scalar_one(),
            0,
        )
        self.assertEqual(
            self.connection.execute(
                text("SELECT count(*) FROM money_config")
            ).scalar_one(),
            0,
        )


if __name__ == "__main__":
    unittest.main()
