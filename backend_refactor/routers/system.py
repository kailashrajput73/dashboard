from fastapi import APIRouter
try:
    from ..services import system_service as svc
except ImportError:
    import services.system_service as svc

router = APIRouter(prefix="/api")


@router.get("/")
async def root():
    return await svc.root()


@router.get("/media/proxy")
async def media_proxy(url: str):
    return await svc.media_proxy(url)
