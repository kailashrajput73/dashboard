from fastapi import APIRouter
import services.dispatch_inventory_service as svc
from utils import DispatchIn

router = APIRouter(prefix="/api")


@router.get("/dispatches")
async def list_dispatches():
    return await svc.list_dispatches()


@router.post("/dispatches")
async def create_dispatch(body: DispatchIn):
    return await svc.create_dispatch(body)


@router.get("/inventory")
async def inventory_view():
    return await svc.inventory_view()


@router.get("/inventory/low-stock")
async def low_stock_inventory():
    return await svc.low_stock_inventory()


@router.get("/inventory/transactions")
async def inventory_transactions():
    return await svc.inventory_transactions()
