from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.schemas.operational import PurchaseRequest, RfqRequest
from app.services import purchase_service, rfq_service
from app.services.purchase_service import (
    PurchaseLineInput,
    PurchaseValidationError,
    PurchaseWriteConflict,
)
from app.services.rfq_service import RfqApprovalError, RfqApprovalInput, RfqValidationError

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
AdminPrincipal = Annotated[AuthenticatedPrincipal, Depends(get_current_admin)]


def _purchase_error(error: PurchaseValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "data": {"errors": error.errors},
            "error": str(error),
        },
    )


@router.get("/purchases")
def list_purchases(session: DbSession, _admin: AdminPrincipal):
    return purchase_service.list_purchases(session)


@router.post("/purchases")
def create_purchase(
    body: PurchaseRequest,
    session: DbSession,
    _admin: AdminPrincipal,
):
    # Preserve the mirror's 400 response for range checks performed by the service.
    lines = [
        PurchaseLineInput.model_construct(
            productCode=line.productCode,
            quantity=line.quantity,
            listPrice=line.listPrice,
            purchaseDiscount=line.purchaseDiscount,
            rackId=line.rackId,
            rackSlot=line.rackSlot,
        )
        for line in body.lines
    ]
    try:
        return purchase_service.create_purchase(
            session,
            partner_id=body.partnerId,
            lines=lines,
        )
    except PurchaseValidationError as error:
        return _purchase_error(error)
    except PurchaseWriteConflict:
        return JSONResponse(
            status_code=409,
            content={
                "success": False,
                "data": None,
                "error": "Stock changed; please retry purchase",
            },
        )


@router.post("/purchases/import")
def import_purchases(
    body: PurchaseRequest,
    session: DbSession,
    _admin: AdminPrincipal,
):
    return create_purchase(body, session, _admin)


@router.get("/rfqs")
def list_rfqs(
    session: DbSession,
    _admin: AdminPrincipal,
    partner_id: str | None = None,
    status: str | None = None,
    search: str | None = None,
):
    return rfq_service.list_rfqs(
        session,
        partner_id=partner_id,
        status=status,
        search=search,
    )


@router.post("/rfqs")
def create_rfq(
    body: RfqRequest,
    session: DbSession,
    _admin: AdminPrincipal,
):
    try:
        return rfq_service.create_rfq(
            session,
            partner_id=body.partnerId,
            lines=body.lines,
            delivery_mode=body.deliveryMode,
            scheduled_at=body.scheduledAt,
        )
    except RfqValidationError as error:
        return JSONResponse(status_code=error.status_code, content=error.envelope())


@router.put("/rfqs/{rfq_id}")
def update_rfq(
    rfq_id: str,
    body: RfqRequest,
    session: DbSession,
    _admin: AdminPrincipal,
):
    try:
        return rfq_service.update_rfq(
            session,
            rfq_id=rfq_id,
            partner_id=body.partnerId,
            lines=body.lines,
            delivery_mode=body.deliveryMode,
            scheduled_at=body.scheduledAt,
        )
    except RfqApprovalError as error:
        return JSONResponse(status_code=error.status_code, content=error.envelope())


@router.post("/rfqs/{rfq_id}/approve")
def approve_rfq(
    rfq_id: str,
    body: RfqApprovalInput,
    session: DbSession,
    _admin: AdminPrincipal,
):
    try:
        return rfq_service.approve_rfq(session, rfq_id=rfq_id, body=body)
    except RfqApprovalError as error:
        return JSONResponse(status_code=error.status_code, content=error.envelope())


@router.get("/partners/{partner_id}/rewards")
def partner_rewards(
    partner_id: str,
    session: DbSession,
    _admin: AdminPrincipal,
):
    return rfq_service.partner_rewards(session, partner_id=partner_id)


@router.get("/rfqs/{rfq_id}/history")
def rfq_history(
    rfq_id: str,
    session: DbSession,
    _admin: AdminPrincipal,
):
    try:
        return rfq_service.rfq_history(session, rfq_id=rfq_id)
    except RfqApprovalError as error:
        return JSONResponse(status_code=error.status_code, content=error.envelope())
