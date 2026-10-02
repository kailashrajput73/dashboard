from typing import Any, List, Optional
from fastapi.responses import JSONResponse, Response
try:
    from ..utils import *
except ImportError:
    from utils import *

def subcategory_response(doc: dict, product_count: int = 0) -> dict:
    result = strip_mongo(doc)
    result["productCount"] = product_count
    return result


async def resolve_category(category_id: str):
    return await db.categories.find_one({"id": category_id})


async def list_subcategories(category_id: Optional[str] = None):
    query = {"categoryId": category_id} if category_id else {}
    cursor = db.subcategories.find(query, {"_id": 0}).sort("name", 1)
    items = []
    async for subcategory in cursor:
        count = await db.catalog.count_documents({
            "$or": [
                {"subcategoryId": subcategory.get("id")},
                {
                    "category": {"$regex": f"^{re.escape(subcategory.get('category') or '')}$", "$options": "i"},
                    "subcategory": {"$regex": f"^{re.escape(subcategory.get('name') or '')}$", "$options": "i"},
                },
                {
                    "category": {"$regex": f"^{re.escape(subcategory.get('category') or '')}$", "$options": "i"},
                    "type": {"$regex": f"^{re.escape(subcategory.get('name') or '')}$", "$options": "i"},
                },
            ]
        })
        items.append(subcategory_response(subcategory, count))
    return envelope(items)


async def create_subcategory(body: SubcategoryIn):
    name = body.name.strip()
    category = await resolve_category(body.categoryId)
    if not name:
        return JSONResponse(status_code=400, content=envelope(None, False, "Name required"))
    if not category:
        return JSONResponse(status_code=400, content=envelope(None, False, "Parent category not found"))
    duplicate = await db.subcategories.find_one({
        "categoryId": body.categoryId,
        "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
    })
    if duplicate:
        return JSONResponse(status_code=409, content=envelope(None, False, "Subcategory already exists under this category"))
    doc = {
        "id": new_id(),
        "name": name,
        "categoryId": body.categoryId,
        "category": category["name"],
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    await db.subcategories.insert_one(doc.copy())
    return envelope(subcategory_response(doc))


async def update_subcategory(subcategory_id: str, body: SubcategoryUpdateIn):
    name = body.name.strip()
    category = await resolve_category(body.categoryId)
    if not name:
        return JSONResponse(status_code=400, content=envelope(None, False, "Name required"))
    if not category:
        return JSONResponse(status_code=400, content=envelope(None, False, "Parent category not found"))
    duplicate = await db.subcategories.find_one({
        "id": {"$ne": subcategory_id},
        "categoryId": body.categoryId,
        "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
    })
    if duplicate:
        return JSONResponse(status_code=409, content=envelope(None, False, "Subcategory already exists under this category"))
    result = await db.subcategories.update_one(
        {"id": subcategory_id},
        {"$set": {"name": name, "categoryId": body.categoryId, "category": category["name"], "updatedAt": now_iso()}},
    )
    if result.matched_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Subcategory not found"))
    doc = await db.subcategories.find_one({"id": subcategory_id}, {"_id": 0})
    return envelope(subcategory_response(doc))


async def delete_subcategory(subcategory_id: str):
    result = await db.subcategories.delete_one({"id": subcategory_id})
    if result.deleted_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Subcategory not found"))
    return envelope({"deleted": True, "id": subcategory_id})


async def delete_subcategory_cascade(subcategory_id: str, body: AdminPasscodeIn):
    if not await verify_admin_passcode(body):
        return passcode_denied()
    sub = await db.subcategories.find_one({"id": subcategory_id})
    if not sub:
        return JSONResponse(status_code=404, content=envelope(None, False, "Subcategory not found"))
    sub_name = sub.get("name")
    cat_name = sub.get("category")
    removed = await db.catalog.delete_many({
        "$or": [
            {"subcategoryId": subcategory_id},
            {"$and": [
                {"category": cat_name},
                {"$or": [
                    {"subcategory": sub_name},
                    {"type": sub_name},
                ]},
            ]},
        ]
    })
    await db.subcategories.delete_one({"id": subcategory_id})
    return envelope({"deleted": True, "id": subcategory_id, "productsRemoved": removed.deleted_count})


async def import_subcategories(body: SubcategoryImportIn):
    errors = []
    prepared = []
    seen = set()
    for index, row in enumerate(body.items, start=2):
        name = row.name.strip()
        category = await resolve_category(row.categoryId or "")
        if not category and row.category:
            category = await db.categories.find_one({"name": {"$regex": f"^{re.escape(row.category.strip())}$", "$options": "i"}})
        if not name or not category:
            errors.append(f"Row {index}: name and a valid category are required")
            continue
        key = (category["id"], name.casefold())
        if key in seen or await db.subcategories.find_one({"categoryId": category["id"], "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
            errors.append(f"Row {index}: duplicate subcategory '{name}' under '{category['name']}'")
            continue
        seen.add(key)
        prepared.append({
            "id": new_id(), "name": name, "categoryId": category["id"], "category": category["name"],
            "createdAt": now_iso(), "updatedAt": now_iso(),
        })
    if errors:
        return JSONResponse(status_code=400, content=envelope({"errors": errors}, False, "Import validation failed"))
    if prepared:
        await db.subcategories.insert_many(prepared)
    return envelope({"inserted": len(prepared), "skipped": 0})
