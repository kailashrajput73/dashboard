from typing import Optional
from fastapi import APIRouter

try:
    from ..services import service_requests_service as svc
    from ..utils import ServiceRequestIn, ServiceRequestUpdateIn
except ImportError:
    import services.service_requests_service as svc
    from utils import ServiceRequestIn, ServiceRequestUpdateIn

router = APIRouter(prefix="/api")


@router.post("/service-requests")
async def create_service_request(body: ServiceRequestIn):
    return await svc.create_service_request(body)


@router.get("/service-requests")
async def list_service_requests(
    service_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    created_from: Optional[str] = None,
    created_to: Optional[str] = None,
):
    return await svc.list_service_requests(service_type, status, search, created_from, created_to)


@router.get("/service-requests/{request_id}")
async def get_service_request(request_id: str):
    return await svc.get_service_request(request_id)


@router.patch("/service-requests/{request_id}")
async def update_service_request(request_id: str, body: ServiceRequestUpdateIn):
    return await svc.update_service_request(request_id, body)


@router.get("/service-requests/{request_id}/history")
async def list_service_request_history(request_id: str):
    return await svc.list_service_request_history(request_id)
