from typing import Optional
from fastapi import APIRouter
try:
    from ..services import subcategories_service as svc
    from ..utils import SubcategoryIn, SubcategoryUpdateIn, SubcategoryImportIn, AdminPasscodeIn
except ImportError:
    import services.subcategories_service as svc
    from utils import SubcategoryIn, SubcategoryUpdateIn, SubcategoryImportIn, AdminPasscodeIn

router = APIRouter(prefix="/api")


@router.get("/subcategories")
async def list_subcategories(category_id: Optional[str] = None):
    return await svc.list_subcategories(category_id)


@router.post("/subcategories")
async def create_subcategory(body: SubcategoryIn):
    return await svc.create_subcategory(body)


@router.put("/subcategories/{subcategory_id}")
async def update_subcategory(subcategory_id: str, body: SubcategoryUpdateIn):
    return await svc.update_subcategory(subcategory_id, body)


@router.delete("/subcategories/{subcategory_id}")
async def delete_subcategory(subcategory_id: str):
    return await svc.delete_subcategory(subcategory_id)


@router.post("/subcategories/{subcategory_id}/delete-cascade")
async def delete_subcategory_cascade(subcategory_id: str, body: AdminPasscodeIn):
    return await svc.delete_subcategory_cascade(subcategory_id, body)


@router.post("/subcategories/import")
async def import_subcategories(body: SubcategoryImportIn):
    return await svc.import_subcategories(body)
