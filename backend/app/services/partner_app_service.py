from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import uuid4

from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Partner
from app.schemas.partner_app import PartnerAppKycIn, PartnerAppProfileUpdateIn
from app.services._common import constraint_name, envelope, error_response, isoformat
from app.services.firebase_auth import VerifiedFirebaseIdentity, normalize_phone

_PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")


class KycNotApprovedError(Exception):
    pass


class PhoneLinkedConflictError(Exception):
    pass


def public_app_partner(partner: Partner) -> dict[str, object]:
    return {
        "id": partner.id,
        "name": partner.name or "",
        "phone": partner.phone,
        "address": partner.address,
        "businessName": partner.business_name,
        "pincode": partner.pincode,
        "city": partner.city,
        "area": partner.area,
        "salesManager": partner.sales_manager,
        "documents": partner.documents or [],
        "kycStatus": partner.kyc_status,
        "kycSubmitted": bool(partner.kyc_submitted),
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
        "kycSubmittedAt": isoformat(partner.kyc_submitted_at),
        "panNumber": partner.pan_number,
        "aadhaarLast4": partner.aadhaar_last4,
        "kycMethod": partner.kyc_method,
        "createdAt": isoformat(partner.created_at),
        "updatedAt": isoformat(partner.updated_at),
    }


def _new_partner_defaults(*, phone: str, firebase_uid: str) -> Partner:
    now = datetime.now(timezone.utc)
    return Partner(
        id=str(uuid4()),
        name="",
        phone=phone,
        firebase_uid=firebase_uid,
        address=None,
        business_name=None,
        pincode=None,
        city=None,
        area=None,
        sales_manager=None,
        documents=[],
        kyc_status="pending",
        kyc_submitted=False,
        location_verified=False,
        app_active=False,
        kyc_history=[],
        reward_points=None,
        registered_via="firebase",
        login_count=0,
        created_at=now,
        updated_at=now,
    )


def _touch_login(partner: Partner, now: datetime) -> None:
    partner.last_app_login_at = now
    partner.login_count = (partner.login_count or 0) + 1
    partner.updated_at = now


def _find_or_create_partner_once(
    session: Session,
    identity: VerifiedFirebaseIdentity,
    now: datetime,
) -> Partner:
    partner = session.scalar(
        select(Partner)
        .where(
            Partner.firebase_uid == identity.firebase_uid,
            Partner.deleted_at.is_(None),
        )
        .with_for_update()
    )
    if partner is not None:
        _touch_login(partner, now)
        session.flush()
        return partner

    partner = session.scalar(
        select(Partner)
        .where(
            Partner.phone == identity.phone_storage,
            Partner.deleted_at.is_(None),
        )
        .with_for_update()
    )
    if partner is not None:
        if partner.firebase_uid and partner.firebase_uid != identity.firebase_uid:
            raise PhoneLinkedConflictError()
        partner.firebase_uid = identity.firebase_uid
        _touch_login(partner, now)
        session.flush()
        return partner

    partner = _new_partner_defaults(
        phone=identity.phone_storage,
        firebase_uid=identity.firebase_uid,
    )
    session.add(partner)
    _touch_login(partner, now)
    session.flush()
    return partner


def find_or_create_partner(
    session: Session,
    identity: VerifiedFirebaseIdentity,
) -> Partner:
    now = datetime.now(timezone.utc)
    for attempt in range(2):
        try:
            with session.begin():
                return _find_or_create_partner_once(session, identity, now)
        except IntegrityError as error:
            if attempt == 0 and constraint_name(error) in {
                "partners_phone_uq",
                "partners_firebase_uid_uq",
            }:
                continue
            raise
    raise RuntimeError("find_or_create_partner failed after retry")


def establish_session(
    session: Session,
    identity: VerifiedFirebaseIdentity,
) -> dict[str, object] | JSONResponse:
    try:
        partner = find_or_create_partner(session, identity)
    except PhoneLinkedConflictError:
        return error_response(
            409,
            "Partner phone is linked to another account",
        )
    return envelope(public_app_partner(partner))


def load_partner_by_identity(
    session: Session,
    *,
    identity: VerifiedFirebaseIdentity,
) -> Partner | None:
    return session.scalar(
        select(Partner).where(
            Partner.firebase_uid == identity.firebase_uid,
            Partner.deleted_at.is_(None),
        )
    )


def get_me(
    session: Session,
    *,
    identity: VerifiedFirebaseIdentity,
) -> dict[str, object] | JSONResponse:
    partner = load_partner_by_identity(session, identity=identity)
    if partner is None:
        return error_response(404, "Partner not found")
    return envelope(public_app_partner(partner))


def update_profile(
    session: Session,
    *,
    identity: VerifiedFirebaseIdentity,
    body: PartnerAppProfileUpdateIn,
) -> dict[str, object] | JSONResponse:
    with session.begin():
        partner = session.scalar(
            select(Partner)
            .where(
                Partner.firebase_uid == identity.firebase_uid,
                Partner.deleted_at.is_(None),
            )
            .with_for_update()
        )
        if partner is None:
            return error_response(404, "Partner not found")
        if body.name is not None:
            partner.name = body.name.strip()
        if body.businessName is not None:
            partner.business_name = body.businessName.strip()
        if body.address is not None:
            partner.address = body.address.strip()
        if body.pincode is not None:
            partner.pincode = body.pincode.strip()
        if body.city is not None:
            partner.city = body.city.strip()
        if body.area is not None:
            partner.area = body.area.strip()
        partner.updated_at = datetime.now(timezone.utc)
        session.flush()
        return envelope(public_app_partner(partner))


def submit_kyc(
    session: Session,
    *,
    identity: VerifiedFirebaseIdentity,
    body: PartnerAppKycIn,
) -> dict[str, object] | JSONResponse:
    pan = body.panNumber.strip().upper()
    if not _PAN_RE.match(pan):
        return error_response(400, "Invalid PAN format")

    now = datetime.now(timezone.utc)
    with session.begin():
        partner = session.scalar(
            select(Partner)
            .where(
                Partner.firebase_uid == identity.firebase_uid,
                Partner.deleted_at.is_(None),
            )
            .with_for_update()
        )
        if partner is None:
            return error_response(404, "Partner not found")

        can_submit = (
            partner.kyc_status == "rejected"
            or (
                partner.kyc_status == "pending"
                and not partner.kyc_submitted
            )
        )
        if not can_submit:
            return error_response(400, "KYC cannot be submitted in the current state")

        partner.pan_number = pan
        partner.aadhaar_last4 = body.aadhaarLast4
        partner.documents = body.documents
        partner.kyc_method = body.kycMethod
        partner.kyc_submitted = True
        partner.kyc_status = "pending"
        partner.kyc_submitted_at = now
        partner.rejection_reason = None
        partner.updated_at = now
        session.flush()
        return envelope(public_app_partner(partner))


def require_approved_partner(partner: Partner) -> None:
    if partner.kyc_status != "approved":
        raise KycNotApprovedError()


