from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.errors import AuthenticationError
from app.models import Partner
from app.schemas.partner_app import PartnerAppKycIn, PartnerAppProfileUpdateIn
from app.services import partner_app_service
from app.services.firebase_auth import VerifiedFirebaseIdentity, get_current_firebase_partner
from app.services.partner_app_service import KycNotApprovedError, require_approved_partner

router = APIRouter(prefix="/api/app")
DbSession = Annotated[Session, Depends(get_db_session)]
FirebaseIdentity = Annotated[
    VerifiedFirebaseIdentity,
    Depends(get_current_firebase_partner),
]


@router.post("/session")
def app_session(identity: FirebaseIdentity, session: DbSession):
    return partner_app_service.establish_session(session, identity)


@router.get("/me")
def app_me(identity: FirebaseIdentity, session: DbSession):
    return partner_app_service.get_me(session, identity=identity)


@router.put("/profile")
def app_profile(
    identity: FirebaseIdentity,
    session: DbSession,
    body: PartnerAppProfileUpdateIn,
):
    return partner_app_service.update_profile(
        session,
        identity=identity,
        body=body,
    )


@router.post("/kyc")
def app_kyc(
    identity: FirebaseIdentity,
    session: DbSession,
    body: PartnerAppKycIn,
):
    return partner_app_service.submit_kyc(
        session,
        identity=identity,
        body=body,
    )


def require_approved_app_partner(
    identity: FirebaseIdentity,
    session: DbSession,
) -> Partner:
    partner = partner_app_service.load_partner_by_identity(session, identity=identity)
    if partner is None:
        raise AuthenticationError(404, "Partner not found")
    try:
        require_approved_partner(partner)
    except KycNotApprovedError as exc:
        raise AuthenticationError(403, "KYC_NOT_APPROVED") from exc
    return partner
