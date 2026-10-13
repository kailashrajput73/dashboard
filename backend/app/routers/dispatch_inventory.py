from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.schemas.operational import DispatchRequest
from app.services import dispatch_service
from app.services.dispatch_service import DispatchLineInput, DispatchServiceError

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
AdminPrincipal = Annotated[AuthenticatedPrincipal, Depends(get_current_admin)]


@router.get("/dispatches")
def list_dispatches(session: DbSession, _admin: AdminPrincipal):
    return dispatch_service.list_dispatches(session)


@router.post("/dispatches")
def create_dispatch(
    body: DispatchRequest,
    session: DbSession,
    _admin: AdminPrincipal,
):
    # The service performs quantity checks to return the mirror's 400 envelope.
    lines = [
        DispatchLineInput.model_construct(
            productCode=line.productCode,
            quantity=line.quantity,
        )
        for line in body.lines
    ]
    try:
        return dispatch_service.create_dispatch(
            session,
            lines=lines,
            source_rfq_id=body.sourceRfqId,
            customer_name=body.customerName,
            customer_phone=body.customerPhone,
        )
    except DispatchServiceError as error:
        return JSONResponse(status_code=error.status_code, content=error.envelope())


@router.get("/inventory")
def inventory_view(session: DbSession, _admin: AdminPrincipal):
    return dispatch_service.inventory_view(session)


@router.get("/inventory/low-stock")
def low_stock_inventory(session: DbSession, _admin: AdminPrincipal):
    return dispatch_service.low_stock_inventory(session)


@router.get("/inventory/transactions")
def inventory_transactions(session: DbSession, _admin: AdminPrincipal):
    return dispatch_service.inventory_transactions(session)
