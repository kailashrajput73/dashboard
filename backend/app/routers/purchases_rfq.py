from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal
from app.deps.module_access import module_read, module_write
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
PurchasesRead = Annotated[AuthenticatedPrincipal, Depends(module_read("purchases"))]
PurchasesWrite = Annotated[AuthenticatedPrincipal, Depends(module_write("purchases"))]
RfqsRead = Annotated[AuthenticatedPrincipal, Depends(module_read("rfqs"))]
RfqsWrite = Annotated[AuthenticatedPrincipal, Depends(module_write("rfqs"))]
PartnersRead = Annotated[AuthenticatedPrincipal, Depends(module_read("partners"))]


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
def list_purchases(session: DbSession, _admin: PurchasesRead):
    return purchase_service.list_purchases(session)


@router.post("/purchases")
def create_purchase(
    body: PurchaseRequest,
    session: DbSession,
    _admin: PurchasesWrite,
):
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
    admin: PurchasesWrite,
):
    return create_purchase(body, session, admin)


@router.get("/rfqs")
def list_rfqs(
    session: DbSession,
    _admin: RfqsRead,
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
    _admin: RfqsWrite,
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
    _admin: RfqsWrite,
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
    _admin: RfqsWrite,
):
    try:
        return rfq_service.approve_rfq(session, rfq_id=rfq_id, body=body)
    except RfqApprovalError as error:
        return JSONResponse(status_code=error.status_code, content=error.envelope())


@router.get("/partners/{partner_id}/rewards")
def partner_rewards(
    partner_id: str,
    session: DbSession,
    _admin: PartnersRead,
):
    return rfq_service.partner_rewards(session, partner_id=partner_id)


@router.get("/rfqs/{rfq_id}/history")
def rfq_history(
    rfq_id: str,
    session: DbSession,
    _admin: RfqsRead,
):
    try:
        return rfq_service.rfq_history(session, rfq_id=rfq_id)
    except RfqApprovalError as error:
        return JSONResponse(status_code=error.status_code, content=error.envelope())
