from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.main import app


class ModuleAccessApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_hidden_module_blocks_catalog_read(self) -> None:
        app.dependency_overrides[get_current_admin] = lambda: AuthenticatedPrincipal(
            id="hidden-user",
            role="staff",
            module_access={"product-management": "hidden"},
        )
        response = self.client.get("/api/catalog")
        self.assertEqual(response.status_code, 403)

    def test_read_module_allows_catalog_list_but_not_import(self) -> None:
        app.dependency_overrides[get_current_admin] = lambda: AuthenticatedPrincipal(
            id="reader",
            role="staff",
            module_access={"product-management": "read"},
        )
        listed = self.client.get("/api/catalog")
        self.assertEqual(listed.status_code, 200, listed.text)

        imported = self.client.post(
            "/api/catalog/import/master",
            json={"items": [{"name": "Forbidden", "productCode": "FORBIDDEN"}]},
        )
        self.assertEqual(imported.status_code, 403)


if __name__ == "__main__":
    unittest.main()
