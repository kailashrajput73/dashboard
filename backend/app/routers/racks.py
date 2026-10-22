from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal
from app.deps.module_access import module_read, module_write
from app.schemas.operational import RackAssignmentRequest, RackRequest
from app.services import rack_service as service

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
RacksRead = Annotated[AuthenticatedPrincipal, Depends(module_read("racks"))]
RacksWrite = Annotated[AuthenticatedPrincipal, Depends(module_write("racks"))]


@router.get("/racks")
def list_racks(
    session: DbSession,
    _admin: RacksRead,
):
    return service.list_racks(session)


@router.post("/racks")
def create_rack(
    body: RackRequest,
    session: DbSession,
    _admin: RacksWrite,
):
    return service.create_rack(session, body)


@router.delete("/racks/{rack_id}")
def delete_rack(
    rack_id: str,
    session: DbSession,
    _admin: RacksWrite,
):
    return service.delete_rack(session, rack_id=rack_id)


@router.put("/racks/{rack_id}/assign")
def assign_rack_slot(
    rack_id: str,
    body: RackAssignmentRequest,
    session: DbSession,
    _admin: RacksWrite,
):
    return service.assign_rack_slot(session, rack_id=rack_id, body=body)


@router.get("/racks/{rack_id}/products")
def rack_products(
    rack_id: str,
    session: DbSession,
    _admin: RacksRead,
):
    return service.rack_products(session, rack_id=rack_id)
