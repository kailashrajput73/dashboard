from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError


def envelope(
    data: Any = None,
    success: bool = True,
    error: str | None = None,
) -> dict[str, Any]:
    return {"success": success, "data": data, "error": error}


def error_response(status_code: int, message: str, data: Any = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=envelope(data, False, message),
    )


def isoformat(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def constraint_name(error: IntegrityError) -> str | None:
    diagnostic = getattr(error.orig, "diag", None)
    return getattr(diagnostic, "constraint_name", None)


def escaped_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


ROLE_PERMISSIONS: dict[str, list[str]] = {
    "admin": ["all"],
    "store_manager": [
        "catalog:read",
        "purchase:write",
        "inventory:read",
        "rfq:approve",
        "dispatch:write",
    ],
    "staff": ["catalog:read", "inventory:read"],
}
