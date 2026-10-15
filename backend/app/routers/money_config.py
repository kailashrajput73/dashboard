from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.schemas.operational import MoneyConfigRequest
from app.services import money_config_service as service
from app.services._common import error_response

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
AdminPrincipal = Annotated[AuthenticatedPrincipal, Depends(get_current_admin)]


def _require_owner_admin(
    admin_id: str,
    admin: AuthenticatedPrincipal,
) -> JSONResponse | None:
    if admin.role != "admin" or admin.id != admin_id:
        return error_response(403, "Insufficient permissions")
    return None


@router.get("/money-config/{admin_id}")
def get_money_config(
    admin_id: str,
    session: DbSession,
    admin: AdminPrincipal,
):
    denied = _require_owner_admin(admin_id, admin)
    if denied is not None:
        return denied
    return service.get_money_config(session, admin_id=admin_id)


@router.put("/money-config/{admin_id}")
def update_money_config(
    admin_id: str,
    body: MoneyConfigRequest,
    session: DbSession,
    admin: AdminPrincipal,
):
    denied = _require_owner_admin(admin_id, admin)
    if denied is not None:
        return denied
    return service.update_money_config(
        session,
        admin_id=admin_id,
        body=body,
    )
