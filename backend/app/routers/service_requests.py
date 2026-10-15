from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.schemas.operational import (
    ServiceRequestCreateRequest,
    ServiceRequestUpdateRequest,
)
from app.services import service_requests_service as service
from app.services._common import error_response

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
AdminPrincipal = Annotated[AuthenticatedPrincipal, Depends(get_current_admin)]


def _require_admin(admin: AuthenticatedPrincipal) -> JSONResponse | None:
    if admin.role != "admin":
        return error_response(403, "Insufficient permissions")
    return None


@router.post("/service-requests")
def create_service_request(
    body: ServiceRequestCreateRequest,
    session: DbSession,
):
    return service.create_service_request(session, body)


@router.get("/service-requests")
def list_service_requests(
    session: DbSession,
    _: AdminPrincipal,
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
    _: AdminPrincipal,
):
    return service.get_service_request(session, request_id=request_id)


@router.patch("/service-requests/{request_id}")
def update_service_request(
    request_id: str,
    body: ServiceRequestUpdateRequest,
    session: DbSession,
    admin: AdminPrincipal,
):
    denied = _require_admin(admin)
    if denied is not None:
        return denied
    return service.update_service_request(
        session,
        request_id=request_id,
        body=body,
    )


@router.get("/service-requests/{request_id}/history")
def list_service_request_history(
    request_id: str,
    session: DbSession,
    _: AdminPrincipal,
):
    return service.list_service_request_history(session, request_id=request_id)
