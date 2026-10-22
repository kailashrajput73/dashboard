from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal
from app.deps.module_access import module_read, module_write
from app.schemas.operational import (
    ServiceRequestCreateRequest,
    ServiceRequestUpdateRequest,
)
from app.services import service_requests_service as service

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
ServiceRead = Annotated[AuthenticatedPrincipal, Depends(module_read("service-requests"))]
ServiceWrite = Annotated[AuthenticatedPrincipal, Depends(module_write("service-requests"))]


@router.post("/service-requests")
def create_service_request(
    body: ServiceRequestCreateRequest,
    session: DbSession,
):
    return service.create_service_request(session, body)


@router.get("/service-requests")
def list_service_requests(
    session: DbSession,
    _: ServiceRead,
    service_type: str | None = None,
    status: str | None = None,
    search: str | None = None,
    created_from: str | None = None,
    created_to: str | None = None,
):
    return service.list_service_requests(
        session,
        service_type=service_type,
        status=status,
        search=search,
        created_from=created_from,
        created_to=created_to,
    )


@router.get("/service-requests/{request_id}")
def get_service_request(
    request_id: str,
    session: DbSession,
    _: ServiceRead,
):
    return service.get_service_request(session, request_id=request_id)


@router.patch("/service-requests/{request_id}")
def update_service_request(
    request_id: str,
    body: ServiceRequestUpdateRequest,
    session: DbSession,
    _admin: ServiceWrite,
):
    return service.update_service_request(
        session,
        request_id=request_id,
        body=body,
    )


@router.get("/service-requests/{request_id}/history")
def list_service_request_history(
    request_id: str,
    session: DbSession,
    _: ServiceRead,
):
    return service.list_service_request_history(session, request_id=request_id)
