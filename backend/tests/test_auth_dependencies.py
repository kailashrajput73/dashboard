import json
import unittest
from collections.abc import Mapping
from typing import Any

from starlette.requests import Request

from app.deps.auth import (
    ADMIN_TOKEN_SQL,
    PARTNER_TOKEN_SQL,
    AuthenticatedPrincipal,
    get_current_admin,
    get_current_partner,
)
from app.errors import AuthenticationError
from app.main import authentication_error_response


class FakeResult:
    def __init__(self, row: Mapping[str, Any] | None) -> None:
        self.row = row

    def mappings(self) -> "FakeResult":
        return self

    def first(self) -> Mapping[str, Any] | None:
        return self.row


class FakeSession:
    def __init__(self, row: Mapping[str, Any] | None) -> None:
        self.row = row
        self.statement = None
        self.parameters = None

    def execute(self, statement: Any, parameters: dict[str, str]) -> FakeResult:
        self.statement = statement
        self.parameters = parameters
        return FakeResult(self.row)


def make_request() -> Request:
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": "/test",
            "raw_path": b"/test",
            "query_string": b"",
            "headers": [],
            "client": ("test", 1234),
            "server": ("test", 80),
        }
    )


class AuthDependencyTests(unittest.IsolatedAsyncioTestCase):
    async def assert_auth_error(
        self,
        call: Any,
        status_code: int,
        error: str,
    ) -> None:
        with self.assertRaises(AuthenticationError) as raised:
            call()

        response = await authentication_error_response(make_request(), raised.exception)
        self.assertEqual(response.status_code, status_code)
        self.assertEqual(
            json.loads(response.body),
            {"success": False, "data": None, "error": error},
        )

    async def test_admin_bearer_resolves_active_team_user(self) -> None:
        session = FakeSession(
            {"user_id": "u-1", "role": "staff", "is_active": True}
        )

        principal = get_current_admin("bEaReR opaque-token", session)

        self.assertEqual(principal, AuthenticatedPrincipal(id="u-1", role="staff"))
        self.assertIn("FROM admin_tokens", str(session.statement))
        self.assertIn("JOIN users", str(session.statement))
        self.assertEqual(session.parameters, {"token": "opaque-token"})

    async def test_admin_missing_header_is_enveloped_401(self) -> None:
        await self.assert_auth_error(
            lambda: get_current_admin(None, FakeSession(None)),
            401,
            "Missing admin token",
        )

    async def test_admin_invalid_token_or_missing_user_is_enveloped_401(self) -> None:
        session = FakeSession(None)
        await self.assert_auth_error(
            lambda: get_current_admin("Bearer unknown", session),
            401,
            "Invalid or expired admin token",
        )
        self.assertEqual(session.parameters, {"token": "unknown"})

    async def test_admin_rejects_inactive_user(self) -> None:
        session = FakeSession(
            {"user_id": "u-2", "role": "admin", "is_active": False}
        )
        await self.assert_auth_error(
            lambda: get_current_admin("Bearer inactive", session),
            401,
            "Account is inactive",
        )

    async def test_admin_rejects_non_team_role(self) -> None:
        session = FakeSession(
            {"user_id": "u-3", "role": "requester", "is_active": True}
        )
        await self.assert_auth_error(
            lambda: get_current_admin("Bearer requester", session),
            401,
            "Invalid or expired admin token",
        )

    async def test_admin_rejects_empty_bearer_value(self) -> None:
        await self.assert_auth_error(
            lambda: get_current_admin("Bearer   ", FakeSession(None)),
            401,
            "Missing admin token",
        )

    async def test_partner_bearer_matches_partner_token_flow(self) -> None:
        session = FakeSession({"partner_id": "p-1"})

        principal = get_current_partner("Bearer partner-token", session)

        self.assertEqual(principal, AuthenticatedPrincipal(id="p-1", role="partner"))
        self.assertIn("FROM partner_tokens", str(session.statement))
        self.assertIn("JOIN partners", str(session.statement))
        self.assertEqual(session.parameters, {"token": "partner-token"})

    async def test_partner_missing_header_preserves_rte06_error(self) -> None:
        await self.assert_auth_error(
            lambda: get_current_partner(None, FakeSession(None)),
            401,
            "Missing partner token",
        )

    async def test_partner_invalid_token_preserves_rte06_error(self) -> None:
        await self.assert_auth_error(
            lambda: get_current_partner("Bearer expired", FakeSession(None)),
            401,
            "Invalid or expired partner token",
        )

    async def test_partner_token_without_partner_row_preserves_rte06_not_found(self) -> None:
        await self.assert_auth_error(
            lambda: get_current_partner(
                "Bearer orphaned",
                FakeSession({"partner_id": None}),
            ),
            404,
            "Partner not found",
        )


if __name__ == "__main__":
    unittest.main()
