from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.access_modules import assert_module_read, assert_module_write
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.errors import AuthenticationError
from app.schemas.operational import MoneyConfigRequest
from app.services import money_config_service as service
from app.services._common import error_response

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
AdminPrincipal = Annotated[AuthenticatedPrincipal, Depends(get_current_admin)]


def _require_owner_admin(
    admin_id: str,
    admin: AuthenticatedPrincipal,
    *,
    write: bool,
) -> JSONResponse | None:
    try:
        if write:
            assert_module_write(admin, "settings")
        else:
            assert_module_read(admin, "settings")
    except AuthenticationError:
        return error_response(403, "Insufficient permissions")
    if admin.role != "admin" or admin.id != admin_id:
        return error_response(403, "Insufficient permissions")
    return None


@router.get("/money-config/{admin_id}")
def get_money_config(
    admin_id: str,
    session: DbSession,
    admin: AdminPrincipal,
):
    denied = _require_owner_admin(admin_id, admin, write=False)
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
    denied = _require_owner_admin(admin_id, admin, write=True)
    if denied is not None:
        return denied
    return service.update_money_config(
        session,
        admin_id=admin_id,
        body=body,
    )
