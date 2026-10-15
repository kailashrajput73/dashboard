from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.services import dashboard_service

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
AdminPrincipal = Annotated[AuthenticatedPrincipal, Depends(get_current_admin)]


@router.get("/dashboard/snapshot")
def dashboard_snapshot(session: DbSession, _admin: AdminPrincipal):
    return dashboard_service.dashboard_snapshot(session)
