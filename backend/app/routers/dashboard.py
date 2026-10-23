from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal
from app.deps.module_access import module_read
from app.services import dashboard_service

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
DashboardRead = Annotated[AuthenticatedPrincipal, Depends(module_read("dashboard"))]


@router.get("/dashboard/snapshot")
def dashboard_snapshot(session: DbSession, _admin: DashboardRead):
    return dashboard_service.dashboard_snapshot(session)
