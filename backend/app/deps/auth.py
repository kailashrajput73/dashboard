from dataclasses import dataclass
from typing import Annotated, Mapping

from fastapi import Depends, Header
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db import get_db_session
from ..errors import AuthenticationError

ADMIN_TOKEN_SQL = text(
    """
    SELECT users.id AS user_id, users.role, users.is_active
    FROM admin_tokens
    JOIN users ON users.id = admin_tokens.admin_id
    WHERE admin_tokens.token = :token
    """
)

PARTNER_TOKEN_SQL = text(
    """
    SELECT partners.id AS partner_id
    FROM partner_tokens
    LEFT JOIN partners ON partners.id = partner_tokens.partner_id
    WHERE partner_tokens.token = :token
    """
)

ADMIN_ROLES = frozenset({"admin", "store_manager", "staff"})


@dataclass(frozen=True)
class AuthenticatedPrincipal:
    id: str
    role: str


def _bearer_token(authorization: str | None, missing_message: str) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthenticationError(401, missing_message)
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise AuthenticationError(401, missing_message)
    return token


def get_current_admin(
    authorization: Annotated[str | None, Header()] = None,
    session: Session = Depends(get_db_session),
) -> AuthenticatedPrincipal:
    """Resolve a team Bearer token through admin_tokens and its users row."""
    token = _bearer_token(authorization, "Missing admin token")
    user = session.execute(ADMIN_TOKEN_SQL, {"token": token}).mappings().first()
    if user is None:
        raise AuthenticationError(401, "Invalid or expired admin token")
    if user["is_active"] is False:
        raise AuthenticationError(401, "Account is inactive")

    role = user["role"]
    user_id = user["user_id"]
    if (
        not isinstance(user_id, str)
        or not isinstance(role, str)
        or role not in ADMIN_ROLES
    ):
        raise AuthenticationError(401, "Invalid or expired admin token")
    return AuthenticatedPrincipal(id=user_id, role=role)


def get_current_partner(
    authorization: Annotated[str | None, Header()] = None,
    session: Session = Depends(get_db_session),
) -> AuthenticatedPrincipal:
    """Resolve the same partner Bearer token flow used by RTE-06."""
    token = _bearer_token(authorization, "Missing partner token")
    partner = session.execute(PARTNER_TOKEN_SQL, {"token": token}).mappings().first()
    if partner is None:
        raise AuthenticationError(401, "Invalid or expired partner token")
    partner_id = partner["partner_id"]
    if not isinstance(partner_id, str):
        raise AuthenticationError(404, "Partner not found")
    return AuthenticatedPrincipal(id=partner_id, role="partner")
