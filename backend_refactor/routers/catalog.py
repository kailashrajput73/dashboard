from typing import Optional
from fastapi import APIRouter
import services.catalog_service as svc
from utils import (
    CatalogItemIn,
    CatalogPricingIn,
    CatalogBulkPricingIn,
    AdminPasscodeIn,
    CatalogFieldPurgeIn,
    CatalogImportIn,
    CatalogMasterImportIn,
    CatalogPricingImportIn,
    CatalogStockImportIn,
)

router = APIRouter(prefix="/api")


@router.get("/catalog")
async def list_catalog(
    category: Optional[str] = None,
    search: Optional[str] = None,
    group_id: Optional[str] = None,
    type: Optional[str] = None,
    brand: Optional[str] = None,
    product_group: Optional[str] = None,
    subcategory: Optional[str] = None,
    product_class: Optional[str] = None,
    size_mm: Optional[float] = None,
):
    return await svc.list_catalog(
        category, search, group_id, type, brand, product_group, subcategory, product_class, size_mm,
    )


@router.post("/catalog")
async def create_catalog(body: CatalogItemIn):
    return await svc.create_catalog(body)


@router.put("/catalog/{item_id}")
async def update_catalog(item_id: str, body: CatalogItemIn):
    return await svc.update_catalog(item_id, body)


@router.patch("/catalog/{item_id}/pricing")
async def update_catalog_pricing(item_id: str, body: CatalogPricingIn):
    return await svc.update_catalog_pricing(item_id, body)


@router.post("/catalog/pricing-bulk")
async def update_catalog_pricing_bulk(body: CatalogBulkPricingIn):
    return await svc.update_catalog_pricing_bulk(body)


@router.delete("/catalog/{item_id}")
async def delete_catalog(item_id: str):
    return await svc.delete_catalog(item_id)


@router.post("/catalog/{item_id}/delete-secured")
async def delete_catalog_secured(item_id: str, body: AdminPasscodeIn):
    return await svc.delete_catalog_secured(item_id, body)


@router.post("/catalog/purge-by-field")
async def purge_catalog_by_field(body: CatalogFieldPurgeIn):
    return await svc.purge_catalog_by_field(body)


@router.delete("/catalog")
async def clear_catalog():
    return await svc.clear_catalog()


@router.post("/catalog/wipe-all")
async def wipe_catalog_all(body: AdminPasscodeIn):
    return await svc.wipe_catalog_all(body)


@router.post("/catalog/import")
async def import_catalog(body: CatalogImportIn):
    return await svc.import_catalog(body)


@router.post("/catalog/import/master")
async def import_catalog_master(body: CatalogMasterImportIn):
    return await svc.import_catalog_master(body)


@router.post("/catalog/import/pricing")
async def import_catalog_pricing(body: CatalogPricingImportIn):
    return await svc.import_catalog_pricing(body)


@router.post("/catalog/import/stock")
async def import_catalog_stock(body: CatalogStockImportIn):
    return await svc.import_catalog_stock(body)
