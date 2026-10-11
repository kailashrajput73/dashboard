from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import Catalog, Partner, Purchase, PurchaseLine, Rack, RackSlot


class PurchaseLineInput(BaseModel):
    productCode: str
    quantity: float = Field(gt=0)
    listPrice: float = Field(ge=0)
    purchaseDiscount: float = Field(default=0, ge=0)
    rackId: str | None = None
    rackSlot: str | None = None


class PurchaseValidationError(ValueError):
    def __init__(self, errors: Sequence[str]) -> None:
        self.errors = list(errors)
        super().__init__("Purchase validation failed")


class PurchaseWriteConflict(RuntimeError):
    pass


def create_purchase(
    session: Session,
    *,
    partner_id: str | None,
    lines: Sequence[PurchaseLineInput],
) -> dict[str, Any]:
    with session.begin():
        if partner_id is None or not partner_id.strip():
            raise PurchaseValidationError(["Partner id is required"])

        partner = session.scalar(
            select(Partner.id).where(
                Partner.id == partner_id,
                Partner.deleted_at.is_(None),
            )
        )
        if partner is None:
            raise PurchaseValidationError(["Partner not found"])

        errors: list[str] = []
        prepared: list[tuple[PurchaseLineInput, Catalog, Rack | None, RackSlot | None]] = []
        for index, line in enumerate(lines, start=1):
            product = session.scalar(
                select(Catalog).where(
                    Catalog.product_code == line.productCode.strip(),
                    Catalog.deleted_at.is_(None),
                )
            )
            if product is None:
                errors.append(f"Line {index}: product code not found")
                continue
            if (
                line.quantity <= 0
                or line.listPrice < 0
                or line.purchaseDiscount < 0
            ):
                errors.append(
                    f"Line {index}: quantity, price, and discount values are invalid"
                )
                continue

            rack: Rack | None = None
            slot: RackSlot | None = None
            if line.rackId:
                rack = session.scalar(
                    select(Rack).where(
                        Rack.id == line.rackId,
                        Rack.deleted_at.is_(None),
                    )
                )
                if rack is not None and line.rackSlot:
                    slot = session.scalar(
                        select(RackSlot).where(
                            RackSlot.rack_id == rack.id,
                            RackSlot.slot_code == line.rackSlot,
                            RackSlot.deleted_at.is_(None),
                        )
                    )
                if rack is None or slot is None:
                    errors.append(f"Line {index}: rack location is invalid")
                    continue
            prepared.append((line, product, rack, slot))

        if errors or not prepared:
            raise PurchaseValidationError(
                errors or ["At least one purchase line is required"]
            )

        purchase_id = str(uuid4())
        created_at = datetime.now(timezone.utc)
        purchase = Purchase(
            id=purchase_id,
            partner_id=partner_id,
            created_at=created_at,
        )
        session.add(purchase)

        response_lines: list[dict[str, Any]] = []
        for line, product, rack, slot in prepared:
            session.add(
                PurchaseLine(
                    purchase_id=purchase_id,
                    product_id=product.id,
                    product_code=line.productCode,
                    product_name=product.name,
                    quantity=line.quantity,
                    list_price=line.listPrice,
                    purchase_discount=line.purchaseDiscount,
                    rack_id=rack.id if rack is not None else None,
                    rack_slot=line.rackSlot,
                )
            )
            response_lines.append(
                {
                    **line.model_dump(),
                    "productId": product.id,
                    "productName": product.name,
                }
            )

            stock_result = session.execute(
                update(Catalog)
                .where(
                    Catalog.id == product.id,
                    Catalog.deleted_at.is_(None),
                )
                .values(
                    stock=Catalog.stock + line.quantity,
                    last_purchase_price=line.listPrice,
                    last_purchase_discount=line.purchaseDiscount,
                )
            )
            if stock_result.rowcount != 1:
                raise PurchaseWriteConflict(
                    f"Catalog product {product.id} changed during purchase creation"
                )

            if rack is not None and slot is not None:
                session.execute(
                    update(RackSlot)
                    .where(
                        RackSlot.product_id == product.id,
                        RackSlot.id != slot.id,
                    )
                    .values(product_id=None)
                )
                slot_result = session.execute(
                    update(RackSlot)
                    .where(
                        RackSlot.id == slot.id,
                        RackSlot.deleted_at.is_(None),
                    )
                    .values(product_id=product.id)
                )
                if slot_result.rowcount != 1:
                    raise PurchaseWriteConflict(
                        f"Rack slot {rack.id}/{slot.slot_code} changed during "
                        "purchase creation"
                    )

                rack_result = session.execute(
                    update(Catalog)
                    .where(
                        Catalog.id == product.id,
                        Catalog.deleted_at.is_(None),
                    )
                    .values(
                        rack_id=rack.id,
                        rack_name=rack.name,
                        rack_slot=line.rackSlot,
                    )
                )
                if rack_result.rowcount != 1:
                    raise PurchaseWriteConflict(
                        f"Catalog product {product.id} changed during rack assignment"
                    )

        return {
            "success": True,
            "data": {
                "id": purchase_id,
                "lines": response_lines,
                "createdAt": created_at.isoformat(),
            },
            "error": None,
        }
