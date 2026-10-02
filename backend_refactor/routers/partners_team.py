from typing import Optional
from fastapi import APIRouter
try:
    from ..services import partners_team_service as svc
    from ..utils import PartnerIn, PartnerReviewIn, TeamUserIn, TeamUserUpdateIn
except ImportError:
    import services.partners_team_service as svc
    from utils import PartnerIn, PartnerReviewIn, TeamUserIn, TeamUserUpdateIn

router = APIRouter(prefix="/api")


@router.post("/partners/register")
async def register_partner(body: PartnerIn):
    return await svc.register_partner(body)


@router.post("/partners")
async def create_partner_direct(body: PartnerIn):
    return await svc.create_partner_direct(body)


@router.get("/partners")
async def list_partners(search: Optional[str] = None, kyc_status: Optional[str] = None, sales_manager: Optional[str] = None):
    return await svc.list_partners(search, kyc_status, sales_manager)


@router.get("/partners/{partner_id}")
async def get_partner(partner_id: str):
    return await svc.get_partner(partner_id)


@router.put("/partners/{partner_id}/kyc")
async def review_partner_kyc(partner_id: str, body: PartnerReviewIn):
    return await svc.review_partner_kyc(partner_id, body)


@router.get("/team/users")
async def list_team_users():
    return await svc.list_team_users()


@router.post("/team/users")
async def create_team_user(body: TeamUserIn):
    return await svc.create_team_user(body)


@router.put("/team/users/{user_id}")
async def update_team_user(user_id: str, body: TeamUserUpdateIn):
    return await svc.update_team_user(user_id, body)
