from fastapi import APIRouter
import services.taxonomy_service as svc
from utils import CategoryIn, CategoryUpdateIn, BrandIn, BrandUpdateIn, ProductTypeIn, ProductTypeUpdateIn, AdminPasscodeIn

router = APIRouter(prefix="/api")


@router.get("/categories")
async def list_categories(active_only: bool = False):
    return await svc.list_categories(active_only)


@router.post("/categories")
async def create_category(body: CategoryIn):
    return await svc.create_category(body)


@router.put("/categories/{category_id}")
async def update_category(category_id: str, body: CategoryUpdateIn):
    return await svc.update_category(category_id, body)


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    return await svc.delete_category(category_id)


@router.post("/categories/{category_id}/delete-cascade")
async def delete_category_cascade(category_id: str, body: AdminPasscodeIn):
    return await svc.delete_category_cascade(category_id, body)


@router.get("/brands")
async def list_brands():
    return await svc.list_brands()


@router.post("/brands")
async def create_brand(body: BrandIn):
    return await svc.create_brand(body)


@router.put("/brands/{brand_id}")
async def update_brand(brand_id: str, body: BrandUpdateIn):
    return await svc.update_brand(brand_id, body)


@router.post("/brands/{brand_id}/delete-cascade")
async def delete_brand_cascade(brand_id: str, body: AdminPasscodeIn):
    return await svc.delete_brand_cascade(brand_id, body)


@router.get("/product-types")
async def list_product_types(active_only: bool = False):
    return await svc.list_product_types(active_only)


@router.post("/product-types")
async def create_product_type(body: ProductTypeIn):
    return await svc.create_product_type(body)


@router.put("/product-types/{type_id}")
async def update_product_type(type_id: str, body: ProductTypeUpdateIn):
    return await svc.update_product_type(type_id, body)
