from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.schemas.taxonomy import (
    AdminPasscodeIn,
    BrandIn,
    BrandUpdateIn,
    CategoryIn,
    CategoryUpdateIn,
    ProductTypeIn,
    ProductTypeUpdateIn,
)
from app.services import taxonomy_service as service

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
AdminPrincipal = Annotated[AuthenticatedPrincipal, Depends(get_current_admin)]


@router.get("/categories")
def list_categories(
    session: DbSession,
    _admin: AdminPrincipal,
    active_only: bool = False,
):
    return service.list_categories(session, active_only=active_only)


@router.post("/categories")
def create_category(
    body: CategoryIn,
    session: DbSession,
    _admin: AdminPrincipal,
):
    return service.create_category(session, body)


@router.put("/categories/{category_id}")
def update_category(
    category_id: str,
    body: CategoryUpdateIn,
    session: DbSession,
    _admin: AdminPrincipal,
):
    return service.update_category(
        session,
        category_id=category_id,
        body=body,
    )


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: str,
    session: DbSession,
    _admin: AdminPrincipal,
):
    return service.delete_category(session, category_id=category_id)


@router.post("/categories/{category_id}/delete-cascade")
def delete_category_cascade(
    category_id: str,
    body: AdminPasscodeIn,
    session: DbSession,
):
    return service.delete_category_cascade(
        session,
        category_id=category_id,
        body=body,
    )


@router.get("/brands")
def list_brands(session: DbSession, _admin: AdminPrincipal):
    return service.list_brands(session)


@router.post("/brands")
def create_brand(
    body: BrandIn,
    session: DbSession,
    _admin: AdminPrincipal,
):
    return service.create_brand(session, body)


@router.put("/brands/{brand_id}")
def update_brand(
    brand_id: str,
    body: BrandUpdateIn,
    session: DbSession,
    _admin: AdminPrincipal,
):
    return service.update_brand(session, brand_id=brand_id, body=body)


@router.post("/brands/{brand_id}/delete-cascade")
def delete_brand_cascade(
    brand_id: str,
    body: AdminPasscodeIn,
    session: DbSession,
):
    return service.delete_brand_cascade(
        session,
        brand_id=brand_id,
        body=body,
    )


@router.get("/product-types")
def list_product_types(
    session: DbSession,
    _admin: AdminPrincipal,
    active_only: bool = False,
):
    return service.list_product_types(session, active_only=active_only)


@router.post("/product-types")
def create_product_type(
    body: ProductTypeIn,
    session: DbSession,
    _admin: AdminPrincipal,
):
    return service.create_product_type(session, body)


@router.put("/product-types/{type_id}")
def update_product_type(
    type_id: str,
    body: ProductTypeUpdateIn,
    session: DbSession,
    _admin: AdminPrincipal,
):
    return service.update_product_type(session, type_id=type_id, body=body)
