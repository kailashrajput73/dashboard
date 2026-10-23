from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal
from app.deps.module_access import module_read, module_write
from app.schemas.taxonomy import AdminPasscodeIn, ProductGroupIn
from app.services import product_groups_service as service

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
CatalogRead = Annotated[AuthenticatedPrincipal, Depends(module_read("product-management"))]
CatalogWrite = Annotated[AuthenticatedPrincipal, Depends(module_write("product-management"))]


@router.get("/product-groups")
def list_product_groups(
    session: DbSession,
):
    return service.list_product_groups(session)


@router.post("/product-groups")
def create_product_group(
    body: ProductGroupIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.create_product_group(session, body)


@router.put("/product-groups/{group_id}")
def update_product_group(
    group_id: str,
    body: ProductGroupIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.update_product_group(session, group_id=group_id, body=body)


@router.delete("/product-groups/{group_id}")
def delete_product_group(
    group_id: str,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.delete_product_group(session, group_id=group_id)


@router.post("/product-groups/{group_id}/delete-cascade")
def delete_product_group_cascade(
    group_id: str,
    body: AdminPasscodeIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.delete_product_group_cascade(
        session,
        group_id=group_id,
        body=body,
    )
