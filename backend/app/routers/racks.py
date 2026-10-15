from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.schemas.operational import RackAssignmentRequest, RackRequest
from app.services import rack_service as service
from app.services._common import error_response

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
AdminPrincipal = Annotated[AuthenticatedPrincipal, Depends(get_current_admin)]


def _require_admin(admin: AuthenticatedPrincipal) -> JSONResponse | None:
    if admin.role != "admin":
        return error_response(403, "Insufficient permissions")
    return None


@router.get("/racks")
def list_racks(
    session: DbSession,
    admin: AdminPrincipal,
):
    if admin.role not in {"admin", "store_manager", "staff"}:
        return error_response(403, "Insufficient permissions")
    return service.list_racks(session)


@router.post("/racks")
def create_rack(
    body: RackRequest,
    session: DbSession,
    admin: AdminPrincipal,
):
    denied = _require_admin(admin)
    if denied is not None:
        return denied
    return service.create_rack(session, body)


@router.delete("/racks/{rack_id}")
def delete_rack(
    rack_id: str,
    session: DbSession,
    admin: AdminPrincipal,
):
    denied = _require_admin(admin)
    if denied is not None:
        return denied
    return service.delete_rack(session, rack_id=rack_id)


@router.put("/racks/{rack_id}/assign")
def assign_rack_slot(
    rack_id: str,
    body: RackAssignmentRequest,
    session: DbSession,
    admin: AdminPrincipal,
):
    denied = _require_admin(admin)
    if denied is not None:
        return denied
    return service.assign_rack_slot(session, rack_id=rack_id, body=body)


@router.get("/racks/{rack_id}/products")
def rack_products(
    rack_id: str,
    session: DbSession,
    admin: AdminPrincipal,
):
    if admin.role not in {"admin", "store_manager", "staff"}:
        return error_response(403, "Insufficient permissions")
    return service.rack_products(session, rack_id=rack_id)
