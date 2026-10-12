from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps.auth import AuthenticatedPrincipal, get_current_partner
from app.db import get_db_session
from app.schemas.auth import (
    AdminLoginIn,
    AdminRegisterIn,
    PartnerLoginIn,
    PartnerRegisterIn,
    RequesterRegisterIn,
)
from app.services import auth_service

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]


@router.post("/auth/requester/register")
def requester_register(body: RequesterRegisterIn, session: DbSession):
    return auth_service.requester_register(session, body)


@router.post("/auth/admin/register")
def admin_register(body: AdminRegisterIn, session: DbSession):
    return auth_service.admin_register(session, body)


@router.post("/auth/admin/login")
def admin_login(body: AdminLoginIn, session: DbSession):
    return auth_service.admin_login(session, body)


@router.post("/auth/partner/register")
def partner_app_register(body: PartnerRegisterIn, session: DbSession):
    return auth_service.partner_app_register(session, body)


@router.post("/auth/partner/login")
def partner_app_login(body: PartnerLoginIn, session: DbSession):
    return auth_service.partner_app_login(session, body)


@router.get("/auth/partner/me")
def partner_app_me(
    principal: Annotated[AuthenticatedPrincipal, Depends(get_current_partner)],
    session: DbSession,
):
    return auth_service.partner_app_me(session, partner_id=principal.id)
