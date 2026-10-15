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


class RackRequest(BaseModel):
    name: str
    rows: int
    columns: int


class RackAssignmentRequest(BaseModel):
    productId: str
    slotCode: str


class ServiceRequestCreateRequest(BaseModel):
    serviceType: str = Field(..., pattern="^(plumber|electrician)$")
    customerName: str
    customerPhone: str
    description: str
    address: str = ""
    pincode: str = ""
    city: str = ""
    area: str = ""


class ServiceRequestUpdateRequest(BaseModel):
    status: str | None = Field(
        default=None,
        pattern="^(pending|in_progress|completed|cancelled)$",
    )
    recommendedName: str | None = None
    recommendedPhone: str | None = None
    adminNote: str | None = None
    actor: str | None = "admin"
    note: str | None = None


class MoneyConfigRequest(BaseModel):
    discountPercent: float = 0
    gstPercent: float = 0
    specialDiscountPercent: float = 0
    showDiscount: bool = True
    showGst: bool = True
    showSpecialDiscount: bool = False
