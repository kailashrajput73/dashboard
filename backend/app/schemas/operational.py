from __future__ import annotations

from pydantic import BaseModel, Field


class PurchaseLineRequest(BaseModel):
    productCode: str
    quantity: float
    listPrice: float
    purchaseDiscount: float = 0
    rackId: str | None = None
    rackSlot: str | None = None


class PurchaseRequest(BaseModel):
    partnerId: str | None = None
    lines: list[PurchaseLineRequest]


class RfqLineRequest(BaseModel):
    productCode: str
    quantity: float


class RfqRequest(BaseModel):
    partnerId: str
    lines: list[RfqLineRequest]
    deliveryMode: str = Field(
        default="storePickup",
        pattern="^(storePickup|homeDelivery)$",
    )
    scheduledAt: str | None = None


class DispatchLineRequest(BaseModel):
    productCode: str
    quantity: float


class DispatchRequest(BaseModel):
    lines: list[DispatchLineRequest]
    sourceRfqId: str | None = None
    customerName: str | None = None
    customerPhone: str | None = None
