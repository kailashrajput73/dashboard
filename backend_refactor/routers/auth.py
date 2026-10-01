from typing import Optional
from fastapi import APIRouter, Header
import services.auth_service as svc
from utils import RequesterRegisterIn, AdminRegisterIn, AdminLoginIn, PartnerRegisterIn, PartnerLoginIn

router = APIRouter(prefix="/api")


@router.post("/auth/requester/register")
async def requester_register(body: RequesterRegisterIn):
    return await svc.requester_register(body)


@router.post("/auth/admin/register")
async def admin_register(body: AdminRegisterIn):
    return await svc.admin_register(body)


@router.post("/auth/admin/login")
async def admin_login(body: AdminLoginIn):
    return await svc.admin_login(body)


@router.post("/auth/partner/register")
async def partner_app_register(body: PartnerRegisterIn):
    return await svc.partner_app_register(body)


@router.post("/auth/partner/login")
async def partner_app_login(body: PartnerLoginIn):
    return await svc.partner_app_login(body)


@router.get("/auth/partner/me")
async def partner_app_me(authorization: Optional[str] = Header(default=None)):
    return await svc.partner_app_me(authorization)
