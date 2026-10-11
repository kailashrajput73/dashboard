from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import RewardLedger, Rfq, RfqLine


class RfqApprovalInput(BaseModel):
    approved: bool
    specialDiscountPercent: float = 0
    deliveryMode: str | None = Field(
        default=None, pattern="^(storePickup|homeDelivery)$"
    )
    scheduledAt: str | None = None


class RfqApprovalError(Exception):
    status_code: int

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)

    def envelope(self) -> dict[str, Any]:
        return {"success": False, "data": None, "error": self.message}


class RfqNotFoundError(RfqApprovalError):
    status_code = 404


class RfqApprovalConflict(RfqApprovalError):
    status_code = 409


def _rfq_response(rfq: Rfq, lines: list[RfqLine]) -> dict[str, Any]:
    return {
        "id": rfq.id,
        "partnerId": rfq.partner_id,
        "lines": [
            {
                "productId": line.product_id,
                "productCode": line.product_code,
                "productName": line.product_name,
                "quantity": line.quantity,
                "unitPrice": line.unit_price,
            }
            for line in lines
        ],
        "status": rfq.status,
        "grandTotal": rfq.grand_total,
        "specialDiscountPercent": rfq.special_discount_percent,
        "rewardPoints": rfq.reward_points,
        "deliveryMode": rfq.delivery_mode,
        "scheduledAt": rfq.scheduled_at,
        "createdAt": rfq.created_at.isoformat(),
        "updatedAt": rfq.updated_at.isoformat(),
        "history": rfq.history,
    }


def approve_rfq(
    session: Session, *, rfq_id: str, body: RfqApprovalInput
) -> dict[str, Any]:
    with session.begin():
        rfq = session.scalar(
            select(Rfq).where(Rfq.id == rfq_id).with_for_update()
        )
        if rfq is None:
            raise RfqNotFoundError("RFQ not found")
        if rfq.status in {"dispatched", "cancelled"}:
            raise RfqApprovalConflict("RFQ can no longer be approved")

        lines = list(
            session.scalars(
                select(RfqLine)
                .where(RfqLine.rfq_id == rfq_id)
                .order_by(RfqLine.created_at, RfqLine.id)
            )
        )
        status = "approved" if body.approved else "rejected"
        grand_total = sum(line.quantity * line.unit_price for line in lines)
        special_discount = max(0, body.specialDiscountPercent)
        grand_total *= 1 - special_discount / 100
        reward_points = int(grand_total // 100) if body.approved else 0

        rfq.status = status
        rfq.special_discount_percent = special_discount
        rfq.reward_points = reward_points
        rfq.grand_total = grand_total
        rfq.updated_at = datetime.now(timezone.utc)
        if body.deliveryMode:
            rfq.delivery_mode = body.deliveryMode
        if body.scheduledAt is not None:
            rfq.scheduled_at = body.scheduledAt

        history = list(rfq.history or [])
        history.append(
            {
                "action": status,
                "actor": "admin",
                "details": {
                    "specialDiscountPercent": special_discount,
                    "rewardPoints": reward_points,
                    "grandTotal": grand_total,
                    "deliveryMode": rfq.delivery_mode,
                    "scheduledAt": rfq.scheduled_at,
                },
                "at": datetime.now(timezone.utc).isoformat(),
            }
        )
        rfq.history = history

        if body.approved:
            existing_earned = session.scalar(
                select(RewardLedger.id).where(
                    RewardLedger.quotation_id == rfq_id,
                    RewardLedger.type == "earned",
                    RewardLedger.deleted_at.is_(None),
                )
            )
            if existing_earned is None:
                session.add(
                    RewardLedger(
                        id=str(uuid4()),
                        requester_id=rfq.partner_id,
                        quotation_id=rfq_id,
                        points=reward_points,
                        type="earned",
                    )
                )

        session.flush()
        return {
            "success": True,
            "data": _rfq_response(rfq, lines),
            "error": None,
        }
