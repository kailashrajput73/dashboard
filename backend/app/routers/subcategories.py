from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.schemas.taxonomy import (
    AdminPasscodeIn,
    SubcategoryImportIn,
    SubcategoryIn,
    SubcategoryUpdateIn,
)
from app.services import subcategories_service as service

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
AdminPrincipal = Annotated[AuthenticatedPrincipal, Depends(get_current_admin)]


@router.get("/subcategories")
def list_subcategories(
    session: DbSession,
    _admin: AdminPrincipal,
    category_id: str | None = None,
):
    return service.list_subcategories(session, category_id=category_id)


@router.post("/subcategories")
def create_subcategory(
    body: SubcategoryIn,
    session: DbSession,
    _admin: AdminPrincipal,
):
    return service.create_subcategory(session, body)


@router.put("/subcategories/{subcategory_id}")
def update_subcategory(
    subcategory_id: str,
    body: SubcategoryUpdateIn,
    session: DbSession,
    _admin: AdminPrincipal,
):
    return service.update_subcategory(
        session,
        subcategory_id=subcategory_id,
        body=body,
    )


@router.delete("/subcategories/{subcategory_id}")
def delete_subcategory(
    subcategory_id: str,
    session: DbSession,
    _admin: AdminPrincipal,
):
    return service.delete_subcategory(session, subcategory_id=subcategory_id)


@router.post("/subcategories/{subcategory_id}/delete-cascade")
def delete_subcategory_cascade(
    subcategory_id: str,
    body: AdminPasscodeIn,
    session: DbSession,
):
    return service.delete_subcategory_cascade(
        session,
        subcategory_id=subcategory_id,
        body=body,
    )


@router.post("/subcategories/import")
def import_subcategories(
    body: SubcategoryImportIn,
    session: DbSession,
    _admin: AdminPrincipal,
):
    return service.import_subcategories(session, body)
