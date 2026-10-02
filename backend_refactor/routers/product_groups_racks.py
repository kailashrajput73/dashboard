from fastapi import APIRouter
try:
    from ..services import product_groups_racks_service as svc
    from ..utils import ProductGroupIn, RackIn, RackAssignmentIn, AdminPasscodeIn
except ImportError:
    import services.product_groups_racks_service as svc
    from utils import ProductGroupIn, RackIn, RackAssignmentIn, AdminPasscodeIn

router = APIRouter(prefix="/api")


@router.get("/catalog/tree")
async def catalog_tree(active_only: bool = True):
    return await svc.catalog_tree(active_only)


@router.get("/product-groups")
async def list_product_groups():
    return await svc.list_product_groups()


@router.post("/product-groups")
async def create_product_group(body: ProductGroupIn):
    return await svc.create_product_group(body)


@router.put("/product-groups/{group_id}")
async def update_product_group(group_id: str, body: ProductGroupIn):
    return await svc.update_product_group(group_id, body)


@router.delete("/product-groups/{group_id}")
async def delete_product_group(group_id: str):
    return await svc.delete_product_group(group_id)


@router.post("/product-groups/{group_id}/delete-cascade")
async def delete_product_group_cascade(group_id: str, body: AdminPasscodeIn):
    return await svc.delete_product_group_cascade(group_id, body)


@router.get("/racks")
async def list_racks():
    return await svc.list_racks()


@router.post("/racks")
async def create_rack(body: RackIn):
    return await svc.create_rack(body)


@router.delete("/racks/{rack_id}")
async def delete_rack(rack_id: str):
    return await svc.delete_rack(rack_id)


@router.put("/racks/{rack_id}/assign")
async def assign_rack_slot(rack_id: str, body: RackAssignmentIn):
    return await svc.assign_rack_slot(rack_id, body)


@router.get("/racks/{rack_id}/products")
async def rack_products(rack_id: str):
    return await svc.rack_products(rack_id)
