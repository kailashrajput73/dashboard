import asyncio

import bcrypt

from backend_refactor.services import auth_service


class FakeAdminTokens:
    async def insert_one(self, *args, **kwargs):
        return None


class FakeUsers:
    def __init__(self):
        self.user = {
            "id": "team-user-1",
            "role": "store_manager",
            "contactNumber": "9999999999",
            "companyName": "Demo Store",
            "passcodeHash": bcrypt.hashpw(b"secret123", bcrypt.gensalt()).decode(),
        }

    async def find_one(self, query, *args, **kwargs):
        if query.get("role") == "admin":
            raise AssertionError("admin login should not hard-code role=admin")
        if query.get("contactNumber") == "9999999999":
            return self.user
        return None


class FakeDB:
    users = FakeUsers()
    admin_tokens = FakeAdminTokens()

def test_admin_login_accepts_team_user_contact(monkeypatch):
    monkeypatch.setattr(auth_service, "db", FakeDB())

    body = type("Body", (), {"contactNumber": "9999999999", "passcode": "secret123"})()
    response = asyncio.run(auth_service.admin_login(body))

    assert isinstance(response, dict)
    assert response["success"] is True
    assert response["data"]["contactNumber"] == "9999999999"
    assert response["data"]["companyName"] == "Demo Store"
