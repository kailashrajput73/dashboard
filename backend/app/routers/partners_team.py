from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal
from app.deps.module_access import AdminRolePrincipal, module_read, module_write
from app.schemas.auth import (
    PartnerIn,
    PartnerReviewIn,
    TeamUserIn,
    TeamUserUpdateIn,
)
from app.services import partners_team_service as service

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
PartnersRead = Annotated[AuthenticatedPrincipal, Depends(module_read("partners"))]
PartnersWrite = Annotated[AuthenticatedPrincipal, Depends(module_write("partners"))]


@router.post("/partners/register")
def register_partner(body: PartnerIn, session: DbSession):
    return service.register_partner(session, body)


@router.post("/partners")
def create_partner_direct(
    body: PartnerIn,
    session: DbSession,
    _admin: PartnersWrite,
):
    return service.create_partner_direct(session, body)


@router.get("/partners")
def list_partners(
    session: DbSession,
    _admin: PartnersRead,
    search: str | None = None,
    kyc_status: str | None = None,
    sales_manager: str | None = None,
):
    return service.list_partners(
        session,
        search=search,
        kyc_status=kyc_status,
        sales_manager=sales_manager,
    )


@router.get("/partners/{partner_id}")
def get_partner(
    partner_id: str,
    session: DbSession,
    _admin: PartnersRead,
):
    return service.get_partner(session, partner_id=partner_id)


@router.put("/partners/{partner_id}/kyc")
def review_partner_kyc(
    partner_id: str,
    body: PartnerReviewIn,
    session: DbSession,
    _admin: PartnersWrite,
):
    return service.review_partner_kyc(session, partner_id=partner_id, body=body)


@router.get("/team/users")
def list_team_users(session: DbSession, _admin: AdminRolePrincipal):
    return service.list_team_users(session)


@router.post("/team/users")
def create_team_user(
    body: TeamUserIn,
    session: DbSession,
    _admin: AdminRolePrincipal,
):
    return service.create_team_user(session, body)


@router.put("/team/users/{user_id}")
def update_team_user(
    user_id: str,
    body: TeamUserUpdateIn,
    session: DbSession,
    _admin: AdminRolePrincipal,
):
    return service.update_team_user(session, user_id=user_id, body=body)
