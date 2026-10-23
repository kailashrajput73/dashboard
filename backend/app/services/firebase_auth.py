from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.errors import AuthenticationError

def _auth_mode() -> str:
    return os.getenv("AUTH_MODE", "dev").strip().lower()


def _env_name() -> str:
    return os.getenv("ENV", "development").strip().lower()


def _service_account_path() -> str:
    return os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "").strip()

_DEV_PHONE_RE = re.compile(r"^dev:(.+)$", re.IGNORECASE)
_firebase_initialized = False


@dataclass(frozen=True)
class VerifiedFirebaseIdentity:
    firebase_uid: str
    phone_e164: str
    phone_storage: str


def validate_auth_config() -> None:
    auth_mode = _auth_mode()
    if auth_mode not in {"firebase", "dev"}:
        raise RuntimeError("AUTH_MODE must be 'firebase' or 'dev'")
    if auth_mode == "dev" and _env_name() == "production":
        raise RuntimeError("Refusing to start: AUTH_MODE=dev with ENV=production")
    service_account_path = _service_account_path()
    if auth_mode == "firebase" and not service_account_path:
        raise RuntimeError(
            "AUTH_MODE=firebase requires FIREBASE_SERVICE_ACCOUNT_PATH"
        )
    if auth_mode == "firebase" and not os.path.isfile(service_account_path):
        raise RuntimeError(
            f"FIREBASE_SERVICE_ACCOUNT_PATH file not found: "
            f"{service_account_path}"
        )


def normalize_phone(raw: str) -> str:
    """Canonical 10-digit India mobile for DB match; accepts +91 and separators."""
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) != 10:
        raise ValueError("Invalid phone number")
    return digits


def phone_to_e164(storage_phone: str) -> str:
    return f"+91{normalize_phone(storage_phone)}"


def _init_firebase_admin() -> None:
    global _firebase_initialized
    if _firebase_initialized:
        return
    import firebase_admin
    from firebase_admin import credentials

    if firebase_admin._apps:
        _firebase_initialized = True
        return
    cred = credentials.Certificate(_service_account_path())
    firebase_admin.initialize_app(cred)
    _firebase_initialized = True


def verify_bearer_token(token: str) -> VerifiedFirebaseIdentity:
    if _auth_mode() == "dev":
        match = _DEV_PHONE_RE.match(token.strip())
        if not match:
            raise AuthenticationError(401, "Invalid or missing token")
        try:
            storage = normalize_phone(match.group(1))
        except ValueError as exc:
            raise AuthenticationError(401, "Invalid or missing token") from exc
        return VerifiedFirebaseIdentity(
            firebase_uid=f"dev-{storage}",
            phone_e164=phone_to_e164(storage),
            phone_storage=storage,
        )

    _init_firebase_admin()
    from firebase_admin import auth as firebase_auth

    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception as exc:
        raise AuthenticationError(401, "Invalid or missing token") from exc

    uid = decoded.get("uid")
    phone = decoded.get("phone_number")
    if not isinstance(uid, str) or not uid:
        raise AuthenticationError(401, "Invalid or missing token")
    if not isinstance(phone, str) or not phone.strip():
        raise AuthenticationError(401, "Invalid or missing token")
    try:
        storage = normalize_phone(phone)
    except ValueError as exc:
        raise AuthenticationError(401, "Invalid or missing token") from exc
    return VerifiedFirebaseIdentity(
        firebase_uid=uid,
        phone_e164=phone_to_e164(storage),
        phone_storage=storage,
    )


def _bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthenticationError(401, "Invalid or missing token")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise AuthenticationError(401, "Invalid or missing token")
    return token


def get_current_firebase_partner(
    authorization: Annotated[str | None, Header()] = None,
    session: Session = Depends(get_db_session, use_cache=False),
) -> VerifiedFirebaseIdentity:
    """Verify Firebase (or dev) token; does not load the partner row."""
    del session
    return verify_bearer_token(_bearer_token(authorization))
