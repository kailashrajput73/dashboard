from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import bcrypt
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    Partner,
    Purchase,
    PurchaseLine,
    RewardLedger,
    Rfq,
    User,
)
from app.schemas.auth import (
    PartnerIn,
    PartnerReviewIn,
    TeamUserIn,
    TeamUserUpdateIn,
)
from app.services import auth_service
from app.access_modules import public_module_access
from app.services._common import (
    ROLE_PERMISSIONS,
    constraint_name,
    envelope,
    error_response,
    escaped_like,
    isoformat,
)


def _partner_dict(partner: Partner) -> dict[str, object]:
    return {
        "id": partner.id,
        "name": partner.name,
        "phone": partner.phone,
        "address": partner.address,
        "businessName": partner.business_name,
        "pincode": partner.pincode,
        "city": partner.city,
        "area": partner.area,
        "salesManager": partner.sales_manager,
        "documents": partner.documents or [],
        "kycStatus": partner.kyc_status,
        "locationVerified": partner.location_verified,
        "appActive": partner.app_active,
        "kycHistory": partner.kyc_history or [],
        "rewardPoints": partner.reward_points,
        "registeredVia": partner.registered_via,
        "loginCount": partner.login_count,
        "lastAppLoginAt": isoformat(partner.last_app_login_at),
        "approvedAt": isoformat(partner.approved_at),
        "approvedBy": partner.approved_by,
        "reviewedAt": isoformat(partner.reviewed_at),
        "reviewedBy": partner.reviewed_by,
        "rejectionReason": partner.rejection_reason,
        "createdAt": isoformat(partner.created_at),
        "updatedAt": isoformat(partner.updated_at),
    }


def _public_team_user(user: User) -> dict[str, object]:
    stored_access = user.module_access if isinstance(user.module_access, dict) else None
    return {
        "id": user.id,
        "name": user.name,
        "contactNumber": user.contact_number,
        "role": user.role,
        "permissions": user.permissions or ROLE_PERMISSIONS.get(user.role, []),
        "moduleAccess": public_module_access(user.role, stored_access),
        "moduleAccessOverrides": stored_access,
        "isActive": user.is_active if user.is_active is not None else True,
        "createdAt": isoformat(user.created_at),
        "updatedAt": isoformat(user.updated_at),
    }


def _reward_balance(session: Session, partner_id: str) -> int:
    earned = session.scalar(
        select(func.coalesce(func.sum(RewardLedger.points), 0)).where(
            RewardLedger.requester_id == partner_id,
            RewardLedger.type == "earned",
            RewardLedger.deleted_at.is_(None),
        )
    )
    redeemed = session.scalar(
        select(func.coalesce(func.sum(RewardLedger.points), 0)).where(
            RewardLedger.requester_id == partner_id,
            RewardLedger.type == "redeemed",
            RewardLedger.deleted_at.is_(None),
        )
    )
    return int(earned or 0) - int(redeemed or 0)


def _sales_performance(session: Session, partner_id: str) -> dict[str, int | float]:
    approved_rfqs = list(
        session.scalars(
            select(Rfq).where(
                Rfq.partner_id == partner_id,
                Rfq.status.in_(("approved", "dispatched")),
                Rfq.deleted_at.is_(None),
            )
        )
    )
    return {
        "approvedCount": len(approved_rfqs),
        "approvedValue": sum(rfq.grand_total for rfq in approved_rfqs),
    }


def _add_partner_metrics(session: Session, partner: Partner) -> dict[str, object]:
    result = _partner_dict(partner)
    result["rewardBalance"] = _reward_balance(session, partner.id)
    result["rfqCount"] = session.scalar(
        select(func.count(Rfq.id)).where(
            Rfq.partner_id == partner.id,
            Rfq.deleted_at.is_(None),
        )
    ) or 0
    result["salesPerformance"] = _sales_performance(session, partner.id)
    return result


def register_partner(
    session: Session,
    body: PartnerIn,
) -> dict[str, object] | JSONResponse:
    partner = auth_service.register_partner(session, body)
    if isinstance(partner, JSONResponse):
        return partner
    return envelope(_partner_dict(partner))


def create_partner_direct(
    session: Session,
    body: PartnerIn,
) -> dict[str, object] | JSONResponse:
    partner = auth_service.register_partner(
        session,
        body,
        direct_approval=True,
    )
    if isinstance(partner, JSONResponse):
        return partner
    return envelope(_partner_dict(partner))


def list_partners(
    session: Session,
    *,
    search: str | None = None,
    kyc_status: str | None = None,
    sales_manager: str | None = None,
) -> dict[str, object]:
    query = select(Partner).where(Partner.deleted_at.is_(None))
    if kyc_status:
        query = query.where(Partner.kyc_status == kyc_status)
    if sales_manager:
        query = query.where(Partner.sales_manager == sales_manager)
    if search and search.strip():
        term = escaped_like(search.strip())
        pattern = f"%{term}%"
        query = query.where(
            or_(
                Partner.name.ilike(pattern, escape="\\"),
                Partner.phone.ilike(pattern, escape="\\"),
                Partner.pincode.ilike(pattern, escape="\\"),
                Partner.city.ilike(pattern, escape="\\"),
                Partner.area.ilike(pattern, escape="\\"),
            )
        )

    partners = session.scalars(query.order_by(Partner.name)).all()
    return envelope([_add_partner_metrics(session, partner) for partner in partners])


def get_partner(
    session: Session,
    *,
    partner_id: str,
) -> dict[str, object] | JSONResponse:
    partner = session.scalar(
        select(Partner).where(
            Partner.id == partner_id,
            Partner.deleted_at.is_(None),
        )
    )
    if partner is None:
        return error_response(404, "Partner not found")

    result = _add_partner_metrics(session, partner)
    purchases = session.scalars(
        select(Purchase)
        .where(
            Purchase.partner_id == partner_id,
            Purchase.deleted_at.is_(None),
        )
        .order_by(Purchase.created_at.desc())
    ).all()
    result["purchaseHistory"] = [
        {
            "id": purchase.id,
            "lines": [
                {
                    "productId": line.product_id,
                    "productCode": line.product_code,
                    "productName": line.product_name,
                    "quantity": line.quantity,
                    "listPrice": line.list_price,
                    "purchaseDiscount": line.purchase_discount,
                    "rackId": line.rack_id,
                    "rackSlot": line.rack_slot,
                }
                for line in session.scalars(
                    select(PurchaseLine)
                    .where(
                        PurchaseLine.purchase_id == purchase.id,
                        PurchaseLine.deleted_at.is_(None),
                    )
                    .order_by(PurchaseLine.created_at, PurchaseLine.id)
                )
            ],
            "createdAt": isoformat(purchase.created_at),
        }
        for purchase in purchases
    ]
    return envelope(result)


def review_partner_kyc(
    session: Session,
    *,
    partner_id: str,
    body: PartnerReviewIn,
) -> dict[str, object] | JSONResponse:
    now = datetime.now(timezone.utc)
    status = "approved" if body.approved else "rejected"
    history_event: dict[str, object] = {
        "status": status,
        "reviewedBy": "admin",
        "reviewedAt": now.isoformat(),
        "locationVerified": body.locationVerified,
        "rejectionReason": body.rejectionReason,
    }

    with session.begin():
        partner = session.scalar(
            select(Partner)
            .where(
                Partner.id == partner_id,
                Partner.deleted_at.is_(None),
            )
            .with_for_update()
        )
        if partner is None:
            return error_response(404, "Partner not found")

        partner.kyc_status = status
        partner.location_verified = body.locationVerified
        partner.app_active = body.approved
        partner.reviewed_at = now
        partner.reviewed_by = "admin"
        partner.rejection_reason = body.rejectionReason if not body.approved else None
        partner.updated_at = now
        if body.approved:
            partner.approved_at = now
            partner.approved_by = "admin"
        partner.kyc_history = [*(partner.kyc_history or []), history_event]
        session.flush()
    return envelope(_partner_dict(partner))


def list_team_users(session: Session) -> dict[str, object]:
    users = session.scalars(
        select(User)
        .where(
            User.role.in_(("admin", "store_manager", "staff")),
            User.deleted_at.is_(None),
        )
        .order_by(User.name)
    ).all()
    return envelope([_public_team_user(user) for user in users])


def create_team_user(
    session: Session,
    body: TeamUserIn,
) -> dict[str, object] | JSONResponse:
    name = body.name.strip()
    contact = body.contactNumber.strip()
    if not name or not contact or len(body.passcode) < 4:
        return error_response(
            400,
            "Name, contact number, and a 4-character passcode are required",
        )

    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid4()),
        name=name,
        contact_number=contact,
        role=body.role,
        permissions=body.permissions or ROLE_PERMISSIONS[body.role],
        module_access=body.moduleAccess,
        is_active=True,
        passcode_hash=bcrypt.hashpw(
            body.passcode.encode(),
            bcrypt.gensalt(),
        ).decode(),
        created_at=now,
        updated_at=now,
    )
    try:
        with session.begin():
            duplicate = session.scalar(
                select(User.id).where(
                    User.contact_number == contact,
                    User.deleted_at.is_(None),
                )
            )
            if duplicate is not None:
                return error_response(409, "Contact number already registered")
            session.add(user)
            session.flush()
    except IntegrityError as error:
        if constraint_name(error) == "users_contact_number_uq":
            return error_response(409, "Contact number already registered")
        raise
    return envelope(_public_team_user(user))


def update_team_user(
    session: Session,
    *,
    user_id: str,
    body: TeamUserUpdateIn,
) -> dict[str, object] | JSONResponse:
    name = body.name.strip()
    contact = body.contactNumber.strip()
    if not name or not contact:
        return error_response(400, "Name and contact number are required")

    now = datetime.now(timezone.utc)
    try:
        with session.begin():
            duplicate = session.scalar(
                select(User.id).where(
                    User.contact_number == contact,
                    User.id != user_id,
                    User.deleted_at.is_(None),
                )
            )
            if duplicate is not None:
                return error_response(409, "Contact number already registered")

            user = session.scalar(
                select(User)
                .where(
                    User.id == user_id,
                    User.role.in_(("admin", "store_manager", "staff")),
                    User.deleted_at.is_(None),
                )
                .with_for_update()
            )
            if user is None:
                return error_response(404, "Team user not found")
            user.name = name
            user.contact_number = contact
            user.role = body.role
            user.is_active = body.isActive
            user.permissions = body.permissions or ROLE_PERMISSIONS[body.role]
            if body.moduleAccess is not None:
                user.module_access = body.moduleAccess
            user.updated_at = now
            session.flush()
    except IntegrityError as error:
        if constraint_name(error) == "users_contact_number_uq":
            return error_response(409, "Contact number already registered")
        raise
    return envelope(_public_team_user(user))
