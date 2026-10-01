from typing import Any, List, Optional
from fastapi.responses import JSONResponse, Response
from utils import *

async def catalog_tree(active_only: bool = True):
    """Partner home browse: only categories/types that exist in DB (no mock tiles)."""
    await sync_product_types_from_catalog()
    type_docs: dict[str, dict] = {}
    async for row in db.product_types.find({}, {"_id": 0}):
        type_docs[(row.get("name") or "").strip().lower()] = row
    cat_query: dict = {"isActive": {"$ne": False}} if active_only else {}
    categories = []
    async for cat in db.categories.find(cat_query, {"_id": 0}).sort("name", 1):
        cat_name = cat.get("name") or ""
        pipeline = [
            {
                "$match": {
                    "category": {"$regex": f"^{re.escape(cat_name)}$", "$options": "i"},
                    "isActive": {"$ne": False},
                }
            },
            {"$group": {"_id": "$type", "count": {"$sum": 1}}},
        ]
        types = []
        async for grouped in db.catalog.aggregate(pipeline):
            raw = grouped.get("_id")
            tname = raw.strip() if isinstance(raw, str) else ""
            if not tname:
                continue
            tdoc = type_docs.get(tname.lower()) or {}
            if active_only and tdoc.get("isActive") is False:
                continue
            types.append({
                "id": tdoc.get("id"),
                "name": tdoc.get("name") or tname,
                "imageUrl": tdoc.get("imageUrl"),
                "productCount": grouped.get("count") or 0,
            })
        types.sort(key=lambda item: item["name"].lower())
        categories.append({
            "id": cat.get("id"),
            "name": cat_name,
            "imageUrl": cat.get("imageUrl"),
            "isActive": cat.get("isActive", True),
            "productCount": sum(item["productCount"] for item in types),
            "types": types,
        })
    return envelope({"categories": categories})


# ---------- Product Groups ----------

async def valid_product_ids(product_ids: List[str]) -> List[str]:
    unique_ids = list(dict.fromkeys(product_ids))
    if len(unique_ids) < 2:
        return []
    count = await db.catalog.count_documents({"id": {"$in": unique_ids}})
    return unique_ids if count == len(unique_ids) else []


async def list_product_groups():
    cursor = db.product_groups.find({}, {"_id": 0}).sort("name", 1)
    groups = []
    async for group in cursor:
        group["productCount"] = len(group.get("productIds", []))
        groups.append(group)
    return envelope(groups)


async def create_product_group(body: ProductGroupIn):
    name = body.name.strip()
    product_ids = await valid_product_ids(body.productIds)
    if not name or not product_ids:
        return JSONResponse(status_code=400, content=envelope(None, False, "Group needs a name and at least two valid products"))
    if await db.product_groups.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Product group name already exists"))
    doc = {"id": new_id(), "name": name, "productIds": product_ids, "createdAt": now_iso(), "updatedAt": now_iso()}
    await db.product_groups.insert_one(doc.copy())
    await db.catalog.update_many({"id": {"$in": product_ids}}, {"$addToSet": {"productGroupIds": doc["id"]}})
    doc["productCount"] = len(product_ids)
    return envelope(doc)


async def update_product_group(group_id: str, body: ProductGroupIn):
    name = body.name.strip()
    product_ids = await valid_product_ids(body.productIds)
    current = await db.product_groups.find_one({"id": group_id})
    if not current:
        return JSONResponse(status_code=404, content=envelope(None, False, "Product group not found"))
    if not name or not product_ids:
        return JSONResponse(status_code=400, content=envelope(None, False, "Group needs a name and at least two valid products"))
    if await db.product_groups.find_one({"id": {"$ne": group_id}, "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Product group name already exists"))
    await db.product_groups.update_one({"id": group_id}, {"$set": {"name": name, "productIds": product_ids, "updatedAt": now_iso()}})
    await db.catalog.update_many({"id": {"$in": current.get("productIds", [])}}, {"$pull": {"productGroupIds": group_id}})
    await db.catalog.update_many({"id": {"$in": product_ids}}, {"$addToSet": {"productGroupIds": group_id}})
    current.update({"name": name, "productIds": product_ids, "productCount": len(product_ids)})
    return envelope(strip_mongo(current))


async def delete_product_group(group_id: str):
    result = await db.product_groups.delete_one({"id": group_id})
    if result.deleted_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Product group not found"))
    await db.catalog.update_many({"productGroupIds": group_id}, {"$pull": {"productGroupIds": group_id}})
    return envelope({"deleted": True, "id": group_id})


async def delete_product_group_cascade(group_id: str, body: AdminPasscodeIn):
    if not await verify_admin_passcode(body):
        return passcode_denied()
    group = await db.product_groups.find_one({"id": group_id})
    if not group:
        return JSONResponse(status_code=404, content=envelope(None, False, "Product group not found"))
    name = (group.get("name") or "").strip()
    ids = list(group.get("productIds") or [])
    or_clauses: List[Any] = []
    if ids:
        or_clauses.append({"id": {"$in": ids}})
    if name:
        or_clauses.append({"productGroup": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    removed_count = 0
    if or_clauses:
        removed = await db.catalog.delete_many({"$or": or_clauses})
        removed_count = removed.deleted_count
    await db.catalog.update_many({"productGroupIds": group_id}, {"$pull": {"productGroupIds": group_id}})
    await db.product_groups.delete_one({"id": group_id})
    return envelope({"deleted": True, "id": group_id, "productsRemoved": removed_count})


# ---------- Rack Locations ----------

def rack_slots(rows: int, columns: int):
    return [{"code": f"{chr(65 + row)}{column + 1}", "productId": None} for row in range(rows) for column in range(columns)]


async def list_racks():
    cursor = db.racks.find({}, {"_id": 0}).sort("name", 1)
    return envelope([rack async for rack in cursor])


async def create_rack(body: RackIn):
    if not body.name.strip() or body.rows < 1 or body.rows > 26 or body.columns < 1 or body.columns > 100:
        return JSONResponse(status_code=400, content=envelope(None, False, "Rack needs a name and dimensions within 1-26 rows and 1-100 columns"))
    if await db.racks.find_one({"name": {"$regex": f"^{re.escape(body.name.strip())}$", "$options": "i"}}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Rack name already exists"))
    doc = {"id": new_id(), "name": body.name.strip(), "rows": body.rows, "columns": body.columns, "slots": rack_slots(body.rows, body.columns), "createdAt": now_iso()}
    await db.racks.insert_one(doc.copy())
    return envelope(doc)


async def delete_rack(rack_id: str):
    rack = await db.racks.find_one({"id": rack_id})
    if not rack:
        return JSONResponse(status_code=404, content=envelope(None, False, "Rack not found"))
    if any(slot.get("productId") for slot in rack.get("slots", [])):
        return JSONResponse(status_code=409, content=envelope(None, False, "Rack with assigned products cannot be deleted"))
    await db.racks.delete_one({"id": rack_id})
    return envelope({"deleted": True, "id": rack_id})


async def assign_rack_slot(rack_id: str, body: RackAssignmentIn):
    rack = await db.racks.find_one({"id": rack_id})
    product = await db.catalog.find_one({"id": body.productId})
    if not rack or not product:
        return JSONResponse(status_code=404, content=envelope(None, False, "Rack or product not found"))
    if not any(slot["code"] == body.slotCode for slot in rack.get("slots", [])):
        return JSONResponse(status_code=400, content=envelope(None, False, "Slot does not exist in this rack"))
    await db.racks.update_one({"id": rack_id}, {"$set": {"slots.$[slot].productId": body.productId}}, {"array_filters": [{"slot.code": body.slotCode}]})
    await db.racks.update_many({"id": {"$ne": rack_id}}, {"$set": {"slots.$[slot].productId": None}}, {"array_filters": [{"slot.productId": body.productId}]})
    await db.catalog.update_one({"id": body.productId}, {"$set": {"rackId": rack_id, "rackName": rack["name"], "rackSlot": body.slotCode}})
    return envelope({"rackId": rack_id, "rackName": rack["name"], "slotCode": body.slotCode, "productId": body.productId})


async def rack_products(rack_id: str):
    if not await db.racks.find_one({"id": rack_id}):
        return JSONResponse(status_code=404, content=envelope(None, False, "Rack not found"))
    products = [product async for product in db.catalog.find({"rackId": rack_id}, {"_id": 0}).sort("name", 1)]
    return envelope(products)
