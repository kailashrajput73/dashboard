from fastapi import APIRouter
import services.config_dashboard_service as svc
from utils import MoneyConfigIn

router = APIRouter(prefix="/api")


@router.get("/money-config/{admin_id}")
async def get_money_config(admin_id: str):
    return await svc.get_money_config(admin_id)


@router.put("/money-config/{admin_id}")
async def update_money_config(admin_id: str, body: MoneyConfigIn):
    return await svc.update_money_config(admin_id, body)


@router.get("/dashboard/snapshot")
async def dashboard_snapshot():
    return await svc.dashboard_snapshot()
