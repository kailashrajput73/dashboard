from typing import Any, List, Optional
from fastapi.responses import JSONResponse, Response
try:
    from ..utils import *
except ImportError:
    from utils import *

async def list_categories(active_only: bool = False):
    await ensure_default_categories()
    query: dict = {"isActive": {"$ne": False}} if active_only else {}
    cursor = db.categories.find(query, {"_id": 0}).sort("name", 1)
    items = []
    async for category in cursor:
        category.setdefault("isActive", True)
        category["productCount"] = await db.catalog.count_documents({"category": category["name"]})
        items.append(category)
    return envelope(items)


async def create_category(body: CategoryIn):
    name = body.name.strip()
    if not name:
        return JSONResponse(status_code=400, content=envelope(None, False, "Name required"))
    existing = await db.categories.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if existing:
        return JSONResponse(status_code=409, content=envelope(None, False, "Category name already exists"))
    doc = {"id": new_id(), "name": name, "isDefault": False, "isActive": True, "productCount": 0, "imageUrl": (body.imageUrl or "").strip() or None}
    await db.categories.insert_one(doc.copy())
    return envelope({k: v for k, v in doc.items()})


async def update_category(category_id: str, body: CategoryUpdateIn):
    name = body.name.strip()
    if not name:
        return JSONResponse(status_code=400, content=envelope(None, False, "Name required"))
    existing = await db.categories.find_one({
        "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
        "id": {"$ne": category_id},
    })
    if existing:
        return JSONResponse(status_code=409, content=envelope(None, False, "Category name already exists"))
    current = await db.categories.find_one({"id": category_id})
    if not current:
        return JSONResponse(status_code=404, content=envelope(None, False, "Category not found"))
    updates = {"name": name, "isActive": body.isActive}
    if "imageUrl" in body.model_fields_set:
        updates["imageUrl"] = (body.imageUrl or "").strip() or None
    result = await db.categories.update_one(
        {"id": category_id},
        {"$set": updates},
    )
    if current["name"] != name:
        await db.catalog.update_many({"category": current["name"]}, {"$set": {"category": name}})
        await db.subcategories.update_many({"categoryId": category_id}, {"$set": {"category": name}})
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    category.setdefault("isActive", True)
    category["productCount"] = await db.catalog.count_documents({"category": category["name"]})
    return envelope(category)


async def delete_category(category_id: str):
    current = await db.categories.find_one({"id": category_id})
    if not current:
        return JSONResponse(status_code=404, content=envelope(None, False, "Category not found"))
    await db.subcategories.delete_many({"categoryId": category_id})
    result = await db.categories.delete_one({"id": category_id})
    return envelope({"deleted": True, "id": category_id, "name": current.get("name")})


async def delete_category_cascade(category_id: str, body: AdminPasscodeIn):
    if not await verify_admin_passcode(body):
        return passcode_denied()
    current = await db.categories.find_one({"id": category_id})
    if not current:
        return JSONResponse(status_code=404, content=envelope(None, False, "Category not found"))
    cat_name = current.get("name")
    products = await db.catalog.delete_many({"category": cat_name})
    await db.subcategories.delete_many({"categoryId": category_id})
    await db.categories.delete_one({"id": category_id})
    return envelope({"deleted": True, "id": category_id, "productsRemoved": products.deleted_count})


# ---------- Brands ----------

async def list_brands():
    cursor = db.brands.find({}, {"_id": 0}).sort("name", 1)
    items = []
    async for brand in cursor:
        brand.setdefault("isActive", True)
        brand["productCount"] = await db.catalog.count_documents({
            "$or": [
                {"brandId": brand["id"]},
                {"brand": {"$regex": f"^{re.escape(brand['name'])}$", "$options": "i"}},
            ]
        })
        items.append(brand)
    return envelope(items)


async def create_brand(body: BrandIn):
    name = body.name.strip()
    if not name:
        return JSONResponse(status_code=400, content=envelope(None, False, "Name required"))
    if await db.brands.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Brand name already exists"))
    doc = {"id": new_id(), "name": name, "isActive": True, "productCount": 0, "logoUrl": (body.logoUrl or "").strip() or None, "createdAt": now_iso(), "updatedAt": now_iso()}
    await db.brands.insert_one(doc.copy())
    return envelope(doc)


async def update_brand(brand_id: str, body: BrandUpdateIn):
    name = body.name.strip()
    if not name:
        return JSONResponse(status_code=400, content=envelope(None, False, "Name required"))
    if await db.brands.find_one({"id": {"$ne": brand_id}, "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Brand name already exists"))
    current = await db.brands.find_one({"id": brand_id})
    if not current:
        return JSONResponse(status_code=404, content=envelope(None, False, "Brand not found"))
    updates = {"name": name, "isActive": body.isActive, "updatedAt": now_iso()}
    if "logoUrl" in body.model_fields_set:
        updates["logoUrl"] = (body.logoUrl or "").strip() or None
    await db.brands.update_one({"id": brand_id}, {"$set": updates})
    if current["name"] != name:
        await db.catalog.update_many({"brandId": brand_id}, {"$set": {"brand": name}})
    brand = await db.brands.find_one({"id": brand_id}, {"_id": 0})
    brand["productCount"] = await db.catalog.count_documents({"brandId": brand_id})
    return envelope(brand)


async def delete_brand_cascade(brand_id: str, body: AdminPasscodeIn):
    if not await verify_admin_passcode(body):
        return passcode_denied()
    current = await db.brands.find_one({"id": brand_id})
    if not current:
        return JSONResponse(status_code=404, content=envelope(None, False, "Brand not found"))
    name = current.get("name")
    removed = await db.catalog.delete_many({
        "$or": [
            {"brandId": brand_id},
            {"brand": {"$regex": f"^{re.escape(name)}$", "$options": "i"}},
        ]
    })
    await db.brands.delete_one({"id": brand_id})
    return envelope({"deleted": True, "id": brand_id, "productsRemoved": removed.deleted_count})


# ---------- Product types (CPVC / PVC / UPVC tiles — photos set in admin, not Excel) ----------

async def list_product_types(active_only: bool = False):
    await sync_product_types_from_catalog()
    query: dict = {"isActive": {"$ne": False}} if active_only else {}
    items = []
    async for row in db.product_types.find(query, {"_id": 0}).sort("name", 1):
        row.setdefault("isActive", True)
        row["productCount"] = await db.catalog.count_documents({
            "type": {"$regex": f"^{re.escape(row['name'])}$", "$options": "i"},
        })
        items.append(row)
    return envelope(items)


async def create_product_type(body: ProductTypeIn):
    name = body.name.strip()
    if not name:
        return JSONResponse(status_code=400, content=envelope(None, False, "Name required"))
    if await db.product_types.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Product type already exists"))
    doc = {
        "id": new_id(),
        "name": name,
        "isActive": True,
        "imageUrl": (body.imageUrl or "").strip() or None,
        "productCount": 0,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    await db.product_types.insert_one(doc.copy())
    return envelope(doc)


async def update_product_type(type_id: str, body: ProductTypeUpdateIn):
    name = body.name.strip()
    if not name:
        return JSONResponse(status_code=400, content=envelope(None, False, "Name required"))
    if await db.product_types.find_one({"id": {"$ne": type_id}, "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Product type already exists"))
    current = await db.product_types.find_one({"id": type_id})
    if not current:
        return JSONResponse(status_code=404, content=envelope(None, False, "Product type not found"))
    updates = {"name": name, "isActive": body.isActive, "updatedAt": now_iso()}
    if "imageUrl" in body.model_fields_set:
        updates["imageUrl"] = (body.imageUrl or "").strip() or None
    await db.product_types.update_one({"id": type_id}, {"$set": updates})
    if current["name"] != name:
        await db.catalog.update_many(
            {"type": {"$regex": f"^{re.escape(current['name'])}$", "$options": "i"}},
            {"$set": {"type": name}},
        )
    row = await db.product_types.find_one({"id": type_id}, {"_id": 0})
    row["productCount"] = await db.catalog.count_documents({
        "type": {"$regex": f"^{re.escape(row['name'])}$", "$options": "i"},
    })
    return envelope(row)
