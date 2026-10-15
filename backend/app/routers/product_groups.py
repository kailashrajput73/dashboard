from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.schemas.taxonomy import AdminPasscodeIn, ProductGroupIn
from app.services import product_groups_service as service
from app.services._common import error_response

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
AdminPrincipal = Annotated[AuthenticatedPrincipal, Depends(get_current_admin)]


def _require_product_admin(
    admin: AuthenticatedPrincipal,
) -> JSONResponse | None:
    if admin.role != "admin":
        return error_response(403, "Insufficient permissions")
    return None


@router.get("/product-groups")
def list_product_groups(
    session: DbSession,
    admin: AdminPrincipal,
):
    if admin.role not in {"admin", "store_manager", "staff"}:
        return error_response(403, "Insufficient permissions")
    return service.list_product_groups(session)


@router.post("/product-groups")
def create_product_group(
    body: ProductGroupIn,
    session: DbSession,
    admin: AdminPrincipal,
):
    denied = _require_product_admin(admin)
    if denied is not None:
        return denied
    return service.create_product_group(session, body)


@router.put("/product-groups/{group_id}")
def update_product_group(
    group_id: str,
    body: ProductGroupIn,
    session: DbSession,
    admin: AdminPrincipal,
):
    denied = _require_product_admin(admin)
    if denied is not None:
        return denied
    return service.update_product_group(session, group_id=group_id, body=body)


@router.delete("/product-groups/{group_id}")
def delete_product_group(
    group_id: str,
    session: DbSession,
    admin: AdminPrincipal,
):
    denied = _require_product_admin(admin)
    if denied is not None:
        return denied
    return service.delete_product_group(session, group_id=group_id)


@router.post("/product-groups/{group_id}/delete-cascade")
def delete_product_group_cascade(
    group_id: str,
    body: AdminPasscodeIn,
    session: DbSession,
    admin: AdminPrincipal,
):
    denied = _require_product_admin(admin)
    if denied is not None:
        return denied
    return service.delete_product_group_cascade(
        session,
        group_id=group_id,
        body=body,
    )
