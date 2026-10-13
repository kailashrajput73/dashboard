from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field
from sqlalchemy import case, func, or_, select, update
from sqlalchemy.orm import Session

from app.models import Catalog, Partner, RewardLedger, Rfq, RfqLine
from app.schemas.operational import RfqLineRequest


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


class RfqValidationError(RfqApprovalError):
    status_code = 400

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__("RFQ validation failed")

    def envelope(self) -> dict[str, Any]:
        return {
            "success": False,
            "data": {"errors": self.errors},
            "error": self.message,
        }


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


def _prepare_rfq_lines(
    session: Session,
    lines: list[RfqLineRequest],
) -> tuple[list[str], list[tuple[RfqLineRequest, Catalog]]]:
    errors: list[str] = []
    prepared: list[tuple[RfqLineRequest, Catalog]] = []
    for index, line in enumerate(lines, start=1):
        product_code = line.productCode.strip()
        product = session.scalar(
            select(Catalog).where(
                Catalog.product_code == product_code,
                Catalog.deleted_at.is_(None),
            )
        )
        if product is None or line.quantity <= 0:
            errors.append(
                f"Line {index}: valid product code and positive quantity are required"
            )
        else:
            prepared.append((line, product))
    return errors, prepared


def _rfq_event(
    action: str,
    actor: str,
    details: dict[str, object],
    at: datetime,
) -> dict[str, object]:
    return {
        "action": action,
        "actor": actor,
        "details": details,
        "at": at.isoformat(),
    }


def _make_rfq_lines(
    *,
    rfq_id: str,
    prepared: list[tuple[RfqLineRequest, Catalog]],
    at: datetime,
) -> list[RfqLine]:
    return [
        RfqLine(
            id=str(uuid4()),
            rfq_id=rfq_id,
            product_id=product.id,
            product_code=product.product_code or "",
            product_name=product.name,
            quantity=line.quantity,
            unit_price=product.standard_rate,
            created_at=at + timedelta(microseconds=index),
            updated_at=at + timedelta(microseconds=index),
        )
        for index, (line, product) in enumerate(prepared)
    ]


def _fetch_rfq_lines(
    session: Session,
    rfq_ids: list[str],
) -> dict[str, list[RfqLine]]:
    lines_by_rfq: dict[str, list[RfqLine]] = {rfq_id: [] for rfq_id in rfq_ids}
    if not rfq_ids:
        return lines_by_rfq
    lines = session.scalars(
        select(RfqLine)
        .where(
            RfqLine.rfq_id.in_(rfq_ids),
            RfqLine.deleted_at.is_(None),
        )
        .order_by(RfqLine.created_at, RfqLine.id)
    )
    for line in lines:
        lines_by_rfq[line.rfq_id].append(line)
    return lines_by_rfq


def list_rfqs(
    session: Session,
    *,
    partner_id: str | None = None,
    status: str | None = None,
    search: str | None = None,
) -> dict[str, Any]:
    statement = select(Rfq).where(Rfq.deleted_at.is_(None))
    if partner_id:
        statement = statement.where(Rfq.partner_id == partner_id)
    if status:
        statement = statement.where(Rfq.status == status)
    if search and search.strip():
        term = search.strip()
        escape = "\\"
        escaped_term = (
            term.replace(escape, escape * 2)
            .replace("%", escape + "%")
            .replace("_", escape + "_")
        )
        pattern = f"%{escaped_term}%"
        matching_lines = (
            select(RfqLine.id)
            .where(
                RfqLine.rfq_id == Rfq.id,
                RfqLine.deleted_at.is_(None),
                or_(
                    RfqLine.product_code.ilike(pattern, escape=escape),
                    RfqLine.product_name.ilike(pattern, escape=escape),
                ),
            )
            .exists()
        )
        statement = statement.where(
            or_(Rfq.partner_id.ilike(pattern, escape=escape), matching_lines)
        )
    rfqs = list(session.scalars(statement.order_by(Rfq.created_at.desc())))
    lines_by_rfq = _fetch_rfq_lines(session, [rfq.id for rfq in rfqs])
    return {
        "success": True,
        "data": [_rfq_response(rfq, lines_by_rfq[rfq.id]) for rfq in rfqs],
        "error": None,
    }


def create_rfq(
    session: Session,
    *,
    partner_id: str,
    lines: list[RfqLineRequest],
    delivery_mode: str,
    scheduled_at: str | None,
) -> dict[str, Any]:
    with session.begin():
        errors, prepared = _prepare_rfq_lines(session, lines)
        normalized_partner_id = partner_id.strip()
        if errors or not normalized_partner_id or not prepared:
            raise RfqValidationError(
                errors or ["Partner and at least one valid line are required"]
            )
        partner = session.scalar(
            select(Partner.id).where(
                Partner.id == normalized_partner_id,
                Partner.deleted_at.is_(None),
            )
        )
        if partner is None:
            raise RfqValidationError(["Partner not found"])

        rfq_id = str(uuid4())
        created_at = datetime.now(timezone.utc)
        rfq_lines = _make_rfq_lines(
            rfq_id=rfq_id,
            prepared=prepared,
            at=created_at,
        )
        grand_total = sum(line.quantity * line.unit_price for line in rfq_lines)
        rfq = Rfq(
            id=rfq_id,
            partner_id=normalized_partner_id,
            status="pending",
            grand_total=grand_total,
            special_discount_percent=0,
            reward_points=0,
            delivery_mode=delivery_mode,
            scheduled_at=scheduled_at,
            created_at=created_at,
            updated_at=created_at,
            history=[
                _rfq_event(
                    "created",
                    "system",
                    {"lineCount": len(rfq_lines)},
                    created_at,
                )
            ],
        )
        session.add(rfq)
        session.add_all(rfq_lines)
        session.flush()
        return {
            "success": True,
            "data": _rfq_response(rfq, rfq_lines),
            "error": None,
        }


def update_rfq(
    session: Session,
    *,
    rfq_id: str,
    partner_id: str,
    lines: list[RfqLineRequest],
    delivery_mode: str,
    scheduled_at: str | None,
) -> dict[str, Any]:
    with session.begin():
        rfq = session.scalar(select(Rfq).where(Rfq.id == rfq_id).with_for_update())
        if rfq is None or rfq.deleted_at is not None:
            raise RfqNotFoundError("RFQ not found")
        if rfq.status in {"dispatched", "cancelled"}:
            raise RfqApprovalConflict("RFQ is no longer editable")

        errors, prepared = _prepare_rfq_lines(session, lines)
        normalized_partner_id = partner_id.strip()
        if errors or not prepared:
            raise RfqValidationError(errors or ["At least one valid line is required"])
        partner = session.scalar(
            select(Partner.id).where(
                Partner.id == normalized_partner_id,
                Partner.deleted_at.is_(None),
            )
        )
        if not normalized_partner_id or partner is None:
            raise RfqValidationError(["Partner not found"])

        old_lines = list(
            session.scalars(
                select(RfqLine)
                .where(
                    RfqLine.rfq_id == rfq_id,
                    RfqLine.deleted_at.is_(None),
                )
                .order_by(RfqLine.created_at, RfqLine.id)
            )
        )
        at = datetime.now(timezone.utc)
        new_lines = _make_rfq_lines(
            rfq_id=rfq_id,
            prepared=prepared,
            at=at,
        )
        rfq.partner_id = normalized_partner_id
        rfq.delivery_mode = delivery_mode
        rfq.scheduled_at = scheduled_at
        rfq.grand_total = sum(line.quantity * line.unit_price for line in new_lines)
        rfq.updated_at = at
        history = list(rfq.history or [])
        history.append(
            _rfq_event(
                "updated",
                "admin",
                {
                    "previousLines": [
                        {
                            "productId": line.product_id,
                            "productCode": line.product_code,
                            "productName": line.product_name,
                            "quantity": line.quantity,
                            "unitPrice": line.unit_price,
                        }
                        for line in old_lines
                    ],
                    "newLines": [
                        {
                            "productId": line.product_id,
                            "productCode": line.product_code,
                            "productName": line.product_name,
                            "quantity": line.quantity,
                            "unitPrice": line.unit_price,
                        }
                        for line in new_lines
                    ],
                },
                at,
            )
        )
        rfq.history = history
        session.execute(
            update(RfqLine)
            .where(
                RfqLine.rfq_id == rfq_id,
                RfqLine.deleted_at.is_(None),
            )
            .values(deleted_at=at)
        )
        session.add_all(new_lines)
        session.flush()
        return {
            "success": True,
            "data": _rfq_response(rfq, new_lines),
            "error": None,
        }


def partner_rewards(session: Session, *, partner_id: str) -> dict[str, Any]:
    entries = list(
        session.scalars(
            select(RewardLedger)
            .where(
                RewardLedger.requester_id == partner_id,
                RewardLedger.deleted_at.is_(None),
            )
            .order_by(RewardLedger.created_at.desc())
        )
    )
    balance = session.scalar(
        select(
            func.coalesce(
                func.sum(
                    case(
                        (RewardLedger.type == "earned", RewardLedger.points),
                        (RewardLedger.type == "redeemed", -RewardLedger.points),
                        else_=0,
                    )
                ),
                0,
            )
        ).where(
            RewardLedger.requester_id == partner_id,
            RewardLedger.deleted_at.is_(None),
        )
    )
    return {
        "success": True,
        "data": {
            "balance": int(balance or 0),
            "entries": [
                {
                    "id": entry.id,
                    "requesterId": entry.requester_id,
                    "quotationId": entry.quotation_id,
                    "points": entry.points,
                    "type": entry.type,
                    "createdAt": entry.created_at.isoformat(),
                }
                for entry in entries
            ],
        },
        "error": None,
    }


def rfq_history(session: Session, *, rfq_id: str) -> dict[str, Any]:
    rfq = session.scalar(
        select(Rfq).where(
            Rfq.id == rfq_id,
            Rfq.deleted_at.is_(None),
        )
    )
    if rfq is None:
        raise RfqNotFoundError("RFQ not found")
    return {"success": True, "data": rfq.history or [], "error": None}


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
                .where(
                    RfqLine.rfq_id == rfq_id,
                    RfqLine.deleted_at.is_(None),
                )
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
