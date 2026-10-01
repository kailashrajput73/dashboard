from typing import Optional
from fastapi import APIRouter
import services.purchases_rfq_service as svc
from utils import PurchaseIn, RfqIn, RfqApprovalIn

router = APIRouter(prefix="/api")


@router.get("/purchases")
async def list_purchases():
    return await svc.list_purchases()


@router.post("/purchases")
async def create_purchase(body: PurchaseIn):
    return await svc.create_purchase(body)


@router.post("/purchases/import")
async def import_purchases(body: PurchaseIn):
    return await svc.import_purchases(body)


@router.get("/rfqs")
async def list_rfqs(partner_id: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None):
    return await svc.list_rfqs(partner_id, status, search)


@router.post("/rfqs")
async def create_rfq(body: RfqIn):
    return await svc.create_rfq(body)


@router.put("/rfqs/{rfq_id}")
async def update_rfq(rfq_id: str, body: RfqIn):
    return await svc.update_rfq(rfq_id, body)


@router.post("/rfqs/{rfq_id}/approve")
async def approve_rfq(rfq_id: str, body: RfqApprovalIn):
    return await svc.approve_rfq(rfq_id, body)


@router.get("/partners/{partner_id}/rewards")
async def partner_rewards(partner_id: str):
    return await svc.partner_rewards(partner_id)


@router.get("/rfqs/{rfq_id}/history")
async def rfq_history(rfq_id: str):
    return await svc.rfq_history(rfq_id)
