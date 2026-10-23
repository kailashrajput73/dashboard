from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.deps.auth import AuthenticatedPrincipal, get_current_admin
from app.deps.module_access import module_read, module_write
from app.schemas.catalog import (
    AdminPasscodeIn,
    CatalogBulkPricingIn,
    CatalogFieldPurgeIn,
    CatalogImportIn,
    CatalogItemIn,
    CatalogMasterImportIn,
    CatalogPricingImportIn,
    CatalogActiveIn,
    CatalogPricingIn,
    CatalogStockImportIn,
    PipesFittingsImagesImportIn,
    PipesFittingsImportIn,
)
from app.services import catalog_service as service
from app.services._common import envelope, error_response
from app.services.pipes_fittings_import import (
    import_pipes_fittings_images,
    import_pipes_fittings_rows,
    pipes_fittings_image_template_rows,
    validate_pipes_fittings_image_items,
    validate_pipes_fittings_rows,
)
from app.services.pipes_fittings_template import TEMPLATE_ID

router = APIRouter(prefix="/api")
DbSession = Annotated[Session, Depends(get_db_session)]
CatalogRead = Annotated[AuthenticatedPrincipal, Depends(module_read("product-management"))]
CatalogWrite = Annotated[AuthenticatedPrincipal, Depends(module_write("product-management"))]


@router.get("/catalog")
def list_catalog(
    session: DbSession,
    category: str | None = None,
    search: str | None = None,
    group_id: str | None = None,
    type: str | None = None,
    brand: str | None = None,
    product_group: str | None = None,
    subcategory: str | None = None,
    product_class: str | None = None,
    size_mm: float | None = None,
    page: int | None = None,
    limit: int | None = None,
    sort: str | None = None,
):
    return service.list_catalog(
        session,
        category=category,
        search=search,
        group_id=group_id,
        type_name=type,
        brand=brand,
        product_group=product_group,
        subcategory=subcategory,
        product_class=product_class,
        size_mm=size_mm,
        page=page,
        limit=limit,
        sort=sort,
    )


@router.get("/catalog/filter-options")
def catalog_filter_options(
    session: DbSession,
    category: str | None = None,
    subcategory: str | None = None,
):
    return service.catalog_filter_options(
        session,
        category=category,
        subcategory=subcategory,
    )


@router.get("/catalog/tree")
def get_catalog_tree(
    session: DbSession,
    active_only: bool = True,
):
    return service.catalog_tree(session, active_only=active_only)


@router.post("/catalog")
def create_catalog(
    body: CatalogItemIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.create_catalog(session, body)


@router.put("/catalog/{item_id}")
def update_catalog(
    item_id: str,
    body: CatalogItemIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.update_catalog(session, item_id, body)


@router.patch("/catalog/{item_id}/pricing")
def update_catalog_pricing(
    item_id: str,
    body: CatalogPricingIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.update_catalog_pricing(session, item_id, body)


@router.patch("/catalog/{item_id}/active")
def update_catalog_active(
    item_id: str,
    body: CatalogActiveIn,
    session: DbSession,
    _admin: AdminPrincipal,
):
    _require_catalog_write(_admin)
    return service.set_catalog_active(session, item_id, body.isActive)


@router.post("/catalog/pricing-bulk")
def update_catalog_pricing_bulk(
    body: CatalogBulkPricingIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.update_catalog_pricing_bulk(session, body)


@router.delete("/catalog/{item_id}")
def delete_catalog(
    item_id: str,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.delete_catalog(session, item_id)


@router.post("/catalog/{item_id}/delete-secured")
def delete_catalog_secured(
    item_id: str,
    body: AdminPasscodeIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.delete_catalog_secured(session, item_id, body)


@router.post("/catalog/purge-by-field")
def purge_catalog_by_field(
    body: CatalogFieldPurgeIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.purge_catalog_by_field(session, body)


@router.delete("/catalog")
def clear_catalog(
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.clear_catalog(session)


@router.post("/catalog/wipe-all")
def wipe_catalog_all(
    body: AdminPasscodeIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.wipe_catalog_all(session, body)


@router.post("/catalog/import")
def import_catalog(
    body: CatalogImportIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.import_catalog(session, body)


@router.post("/catalog/import/master")
def import_catalog_master(
    body: CatalogMasterImportIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.import_catalog_master(session, body)


@router.post("/catalog/import/pricing")
def import_catalog_pricing(
    body: CatalogPricingImportIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.import_catalog_pricing(session, body)


@router.post("/catalog/import/stock")
def import_catalog_stock(
    body: CatalogStockImportIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    return service.import_catalog_stock(session, body)


@router.post("/catalog/import/pipes-fittings/validate")
def validate_pipes_fittings_import(
    body: PipesFittingsImportIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    result = validate_pipes_fittings_rows(session, body.rows)
    return envelope(
        {
            "templateId": TEMPLATE_ID,
            "valid": result.ok,
            "errors": result.errors,
            "rowCount": len(result.rows),
            "skippedBlankRows": result.skipped_blank_rows,
            "rejectedHeaderRows": result.rejected_header_rows,
        },
    )


@router.post("/catalog/import/pipes-fittings")
def import_pipes_fittings(
    body: PipesFittingsImportIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    result = import_pipes_fittings_rows(session, body.rows)
    if isinstance(result, dict) and not result.get("success", True):
        return error_response(400, result.get("error") or "Import failed", result.get("data"))
    return result


@router.get("/catalog/import/pipes-fittings/images/template")
def pipes_fittings_images_template(
    session: DbSession,
    _admin: AdminPrincipal,
    subcategory: str | None = None,
):
    _require_catalog_write(_admin)
    items = pipes_fittings_image_template_rows(
        session,
        subcategory=subcategory,
        missing_image_only=True,
    )
    return envelope({"items": items, "rowCount": len(items)})


@router.post("/catalog/import/pipes-fittings/images/validate")
def validate_pipes_fittings_images_import(
    body: PipesFittingsImagesImportIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    items = [item.model_dump() for item in body.items]
    errors, match_count = validate_pipes_fittings_image_items(session, items)
    return envelope(
        {
            "valid": not errors,
            "errors": errors,
            "rowCount": len(items),
            "familyMatches": match_count,
        },
    )


@router.post("/catalog/import/pipes-fittings/images")
def import_pipes_fittings_images_route(
    body: PipesFittingsImagesImportIn,
    session: DbSession,
    _admin: CatalogWrite,
):
    items = [item.model_dump() for item in body.items]
    result = import_pipes_fittings_images(session, items)
    if isinstance(result, dict) and not result.get("success", True):
        return error_response(400, result.get("error") or "Import failed", result.get("data"))
    return result
