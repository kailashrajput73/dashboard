from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query

from app.services import media_proxy_service

router = APIRouter(prefix="/api")


@router.get("/media/proxy")
async def media_proxy(url: Annotated[str, Query()]):
    return await media_proxy_service.media_proxy(url)
