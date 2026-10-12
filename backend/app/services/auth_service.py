from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import bcrypt
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import AdminToken, MoneyConfig, Partner, PartnerToken, RewardLedger, User
from app.schemas.auth import (
    AdminLoginIn,
    AdminRegisterIn,
    PartnerIn,
    PartnerLoginIn,
    PartnerRegisterIn,
    RequesterRegisterIn,
)
from app.services._common import constraint_name, envelope, error_response, isoformat


def _public_partner(partner: Partner) -> dict[str, object]:
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


def _invalid_credentials() -> JSONResponse:
    return error_response(401, "Invalid credentials")


def requester_register(
    session: Session,
    body: RequesterRegisterIn,
) -> dict[str, object]:
    now = datetime.now(timezone.utc)
    user_id = str(uuid4())
    user = User(
        id=user_id,
        role="requester",
        name=body.name.strip(),
        phone=body.phone.strip(),
        address=body.address.strip(),
        created_at=now,
    )
    with session.begin():
        session.add(user)
        session.flush()
    return envelope(
        {
            "id": user_id,
            "role": "requester",
            "name": user.name,
            "phone": user.phone,
            "address": user.address,
            "createdAt": now.isoformat(),
        }
    )


def admin_register(
    session: Session,
    body: AdminRegisterIn,
) -> dict[str, object] | JSONResponse:
    contact_number = body.contactNumber.strip()
    admin_id = str(uuid4())
    now = datetime.now(timezone.utc)
    password_hash = bcrypt.hashpw(body.passcode.encode(), bcrypt.gensalt()).decode()

    try:
        with session.begin():
            if session.scalar(
                select(User.id).where(
                    User.role == "admin",
                    User.contact_number == contact_number,
                    User.deleted_at.is_(None),
                )
            ):
                return error_response(400, "Contact number already registered")

            session.add(
                User(
                    id=admin_id,
                    role="admin",
                    company_name=body.companyName.strip(),
                    gstin=body.gstin.strip(),
                    contact_number=contact_number,
                    passcode_hash=password_hash,
                    created_at=now,
                )
            )
            session.flush()
            session.add(
                MoneyConfig(
                    id=str(uuid4()),
                    admin_id=admin_id,
                    discount_percent=0,
                    gst_percent=18,
                    special_discount_percent=0,
                    show_discount=True,
                    show_gst=True,
                    show_special_discount=False,
                )
            )
    except IntegrityError as error:
        if constraint_name(error) in {
            "money_config_admin_id_uq",
            "users_contact_number_uq",
        }:
            return error_response(400, "Contact number already registered")
        raise

    return envelope(
        {
            "id": admin_id,
            "adminId": admin_id,
            "companyName": body.companyName.strip(),
            "contactNumber": contact_number,
            "gstin": body.gstin.strip(),
        }
    )


def admin_login(
    session: Session,
    body: AdminLoginIn,
) -> dict[str, object] | JSONResponse:
    contact_number = body.contactNumber.strip()
    with session.begin():
        user = session.scalar(
            select(User).where(
                User.contact_number == contact_number,
                User.role.in_(("admin", "store_manager", "staff")),
                User.deleted_at.is_(None),
            )
        )
        if user is None:
            return _invalid_credentials()
        if user.is_active is False:
            return error_response(401, "Account is inactive")
        if not user.passcode_hash:
            return _invalid_credentials()
        try:
            valid_passcode = bcrypt.checkpw(
                body.passcode.encode(),
                user.passcode_hash.encode(),
            )
        except (ValueError, TypeError):
            return _invalid_credentials()
        if not valid_passcode:
            return _invalid_credentials()

        token = str(uuid4())
        now = datetime.now(timezone.utc)
        session.add(
            AdminToken(
                id=str(uuid4()),
                token=token,
                admin_id=user.id,
                created_at=now,
            )
        )
        session.flush()
        response = {
            "token": token,
            "adminId": user.id,
            "role": user.role,
            "companyName": user.company_name or user.name,
            "contactNumber": user.contact_number,
            "gstin": user.gstin,
        }
    return envelope(response)


def _partner_defaults(body: PartnerIn) -> dict[str, object]:
    return {
        "name": body.name.strip(),
        "phone": body.phone.strip(),
        "address": body.address,
        "business_name": body.businessName,
        "pincode": body.pincode,
        "city": body.city,
        "area": body.area,
        "sales_manager": body.salesManager,
        "documents": body.documents,
        "kyc_status": "pending",
        "location_verified": False,
        "app_active": False,
        "kyc_history": [],
        "reward_points": None,
    }


def register_partner(
    session: Session,
    body: PartnerIn,
    *,
    passcode_hash: str | None = None,
    mobile_app: bool = False,
    direct_approval: bool = False,
) -> Partner | JSONResponse:
    if not body.name.strip() or not body.phone.strip():
        return error_response(400, "Name and phone are required")

    now = datetime.now(timezone.utc)
    values = _partner_defaults(body)
    if mobile_app:
        values.update(
            passcode_hash=passcode_hash,
            registered_via="mobile_app",
            login_count=0,
        )
    if direct_approval:
        values.update(
            kyc_status="approved",
            location_verified=True,
            app_active=True,
            approved_at=now,
            approved_by="admin",
            kyc_history=[
                {
                    "status": "approved",
                    "reviewedBy": "admin",
                    "reviewedAt": now.isoformat(),
                    "locationVerified": True,
                }
            ],
        )
    partner = Partner(
        id=str(uuid4()),
        **values,
        created_at=now,
        updated_at=now,
    )
    try:
        with session.begin():
            existing = session.scalar(
                select(Partner.id).where(
                    Partner.phone == partner.phone,
                    Partner.deleted_at.is_(None),
                )
            )
            if existing is not None:
                return error_response(409, "Partner phone already registered")
            session.add(partner)
            session.flush()
    except IntegrityError as error:
        if constraint_name(error) == "partners_phone_uq":
            return error_response(409, "Partner phone already registered")
        raise
    return partner


def partner_app_register(
    session: Session,
    body: PartnerRegisterIn,
) -> dict[str, object] | JSONResponse:
    password_hash = bcrypt.hashpw(body.passcode.encode(), bcrypt.gensalt()).decode()
    partner = register_partner(
        session,
        body,
        passcode_hash=password_hash,
        mobile_app=True,
    )
    if isinstance(partner, JSONResponse):
        return partner
    return envelope(_public_partner(partner))


def partner_app_login(
    session: Session,
    body: PartnerLoginIn,
) -> dict[str, object] | JSONResponse:
    with session.begin():
        partner = session.scalar(
            select(Partner)
            .where(
                Partner.phone == body.phone.strip(),
                Partner.deleted_at.is_(None),
            )
            .with_for_update()
        )
        if partner is None or not partner.passcode_hash:
            return error_response(401, "Invalid phone or passcode")
        try:
            valid_passcode = bcrypt.checkpw(
                body.passcode.encode(),
                partner.passcode_hash.encode(),
            )
        except (ValueError, TypeError):
            return error_response(401, "Invalid phone or passcode")
        if not valid_passcode:
            return error_response(401, "Invalid phone or passcode")

        now = datetime.now(timezone.utc)
        token = str(uuid4())
        session.add(
            PartnerToken(
                id=str(uuid4()),
                token=token,
                partner_id=partner.id,
                created_at=now,
            )
        )
        partner.last_app_login_at = now
        partner.updated_at = now
        partner.login_count = (partner.login_count or 0) + 1
        session.flush()
        response_partner = _public_partner(partner)

    return envelope(
        {
            "token": token,
            "partnerId": partner.id,
            "partner": response_partner,
        }
    )


def partner_app_me(
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
    result = _public_partner(partner)
    result["rewardBalance"] = int(earned or 0) - int(redeemed or 0)
    return envelope(result)
