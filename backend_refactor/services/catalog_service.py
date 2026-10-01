from typing import Any, List, Optional
from fastapi.responses import JSONResponse, Response
from utils import *

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
    q: dict = {}
    if category and category.lower() != "all":
        q["category"] = category
    if search and search.strip():
        term = re.escape(search.strip())
        q["$or"] = [
            {"name": {"$regex": term, "$options": "i"}},
            {"productCode": {"$regex": term, "$options": "i"}},
            {"brand": {"$regex": term, "$options": "i"}},
            {"aliases": {"$elemMatch": {"$regex": term, "$options": "i"}}},
        ]
    if group_id:
        q["productGroupIds"] = group_id
    if type:
        q["type"] = {"$regex": f"^{re.escape(type.strip())}$", "$options": "i"}
    if brand:
        q["brand"] = {"$regex": f"^{re.escape(brand.strip())}$", "$options": "i"}
    if product_group:
        q["productGroup"] = product_group
    if subcategory:
        q["subcategory"] = {"$regex": f"^{re.escape(subcategory.strip())}$", "$options": "i"}
    if product_class:
        q["productClass"] = {"$regex": f"^{re.escape(product_class.strip())}$", "$options": "i"}
    if size_mm is not None:
        q["sizeMm"] = size_mm
    brand_names = {b["id"]: b["name"] async for b in db.brands.find({}, {"_id": 0, "id": 1, "name": 1})}
    cursor = db.catalog.find(q, {"_id": 0}).sort("name", 1)
    items = []
    async for catalog_item in cursor:
        item = dict(catalog_item)
        pc = item.get("productCode")
        if pc and not item.get("qrCode"):
            item["qrCode"] = pc
        if not item.get("brand"):
            item["brand"] = brand_names.get(item.get("brandId"))
        inferred_class = infer_product_class(item.get("productClass"), item.get("name"), item.get("productName"))
        if inferred_class and item.get("productClass") != inferred_class:
            item["productClass"] = inferred_class
            await db.catalog.update_one({"id": item.get("id")}, {"$set": {"productClass": inferred_class}})
        resolved_type, resolved_class = resolve_product_taxonomy(
            item.get("type"),
            item.get("subcategory"),
            item.get("productClass"),
            item.get("name"),
            item.get("productName"),
        )
        type_updates = {}
        if resolved_type and item.get("type") != resolved_type:
            item["type"] = resolved_type
            type_updates["type"] = resolved_type
        if resolved_class and item.get("productClass") != resolved_class:
            item["productClass"] = resolved_class
            type_updates["productClass"] = resolved_class
        if type_updates:
            await db.catalog.update_one({"id": item.get("id")}, {"$set": type_updates})
            if resolved_type:
                await ensure_product_type(resolved_type)
        pricing = await db.pricing.find_one({"productCode": item.get("productCode")}, {"_id": 0})
        if pricing:
            item.update({
                "mrp": pricing.get("mrp"),
                "sellingPrice": pricing.get("sellingPrice"),
                "purchasePrice": pricing.get("purchasePrice"),
                "discount": pricing.get("discount"),
                "standardRate": pricing.get("sellingPrice", item.get("standardRate")),
                "priceUpdatedAt": pricing.get("updatedAt"),
            })
            # Pricing row may have mrp but selling 0 — partner app needs a sell price.
            sp = float(item.get("sellingPrice") or 0)
            mrp_v = item.get("mrp")
            if sp <= 0 and mrp_v is not None:
                derived = selling_from(mrp_v, item.get("discount"), None, item.get("standardRate") or 0)
                item["sellingPrice"] = derived
                item["standardRate"] = derived
        items.append(item)
    return envelope(items)


async def create_catalog(body: CatalogItemIn):
    brand = await db.brands.find_one({"id": body.brandId}) if body.brandId else None
    if not brand and body.brand:
        brand = await db.brands.find_one({"name": {"$regex": f"^{re.escape(body.brand.strip())}$", "$options": "i"}})
        if not brand:
            brand = {"id": new_id(), "name": body.brand.strip(), "isActive": True}
            await db.brands.insert_one(brand.copy())
    if body.brandId and not brand:
        return JSONResponse(status_code=400, content=envelope(None, False, "Brand not found"))
    product_code = (body.productCode or "").strip() or f"PRD-{uuid.uuid4().hex[:10].upper()}"
    selling = selling_from(body.mrp, body.discount, body.sellingPrice, body.standardRate)
    resolved_type, resolved_class = resolve_product_taxonomy(
        body.type, body.subcategory, body.productClass, body.name, body.productName
    )
    doc = {
        "id": new_id(),
        "name": body.name.strip(),
        "category": body.category.strip(),
        "unit": body.unit.strip(),
        "standardRate": selling,
        "mrp": body.mrp,
        "sellingPrice": selling,
        "purchasePrice": body.purchasePrice,
        "discount": body.discount,
        "stock": body.stock if body.stock is not None else 0,
        "brandId": brand["id"] if brand else None,
        "brand": brand["name"] if brand else None,
        "productCode": product_code,
        "productName": body.productName or body.name.strip(),
        "type": resolved_type,
        "productClass": resolved_class or body.productClass,
        "productGroup": body.productGroup,
        "subcategory": body.subcategory,
        "subcategoryId": body.subcategoryId,
        "size": body.size or (str(body.sizeCm) if body.sizeCm is not None else (f"{body.sizeMm} mm" if body.sizeMm is not None else None)),
        "sizeMm": body.sizeMm,
        "sizeCm": body.sizeCm,
        "sizeInch": body.sizeInch,
        "length": body.length,
        "aliases": [alias.strip() for alias in body.aliases if alias.strip()],
        "multilingualNames": body.multilingualNames,
        "displaySequence": body.displaySequence,
        "reorderLevel": body.reorderLevel,
        "regularDiscount": body.regularDiscount,
        "subcategoryId": body.subcategoryId,
        "productGroupIds": body.productGroupIds,
        "imageUrl": body.imageUrl,
        "imageName": body.imageName,
        "stdPkg": body.stdPkg,
        "isActive": body.isActive,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    doc["qrCode"] = doc["productCode"]
    await db.catalog.insert_one(doc.copy())
    await upsert_pricing(product_code, body.mrp, selling, body.purchasePrice, body.discount)
    # Ensure category exists too
    if not await db.categories.find_one({"name": doc["category"]}):
        await db.categories.insert_one({"id": new_id(), "name": doc["category"], "isDefault": False, "isActive": True})
    await ensure_product_type(doc.get("type"))
    return envelope({k: v for k, v in doc.items()})


async def update_catalog(item_id: str, body: CatalogItemIn):
    brand = await db.brands.find_one({"id": body.brandId}) if body.brandId else None
    if not brand and body.brand:
        brand = await db.brands.find_one({"name": {"$regex": f"^{re.escape(body.brand.strip())}$", "$options": "i"}})
    if body.brandId and not brand:
        return JSONResponse(status_code=400, content=envelope(None, False, "Brand not found"))
    existing = await db.catalog.find_one({"id": item_id})
    if not existing:
        return JSONResponse(status_code=404, content=envelope(None, False, "Item not found"))
    selling = selling_from(body.mrp, body.discount, body.sellingPrice, body.standardRate)
    def keep(value, key):
        return value if value is not None else existing.get(key)
    updates = {
        "name": body.name.strip(),
        "category": body.category.strip(),
        "unit": body.unit.strip(),
        "standardRate": selling,
        "mrp": body.mrp,
        "sellingPrice": selling,
        "purchasePrice": body.purchasePrice,
        "discount": body.discount,
        "brandId": brand["id"] if brand else None,
        "brand": brand["name"] if brand else None,
        "productName": body.productName or body.name.strip(),
        "type": keep(body.type, "type"),
        "productClass": keep(body.productClass, "productClass"),
        "productGroup": keep(body.productGroup, "productGroup"),
        "subcategory": keep(body.subcategory, "subcategory"),
        "subcategoryId": keep(body.subcategoryId, "subcategoryId"),
        "size": body.size or (
            f"{keep(body.sizeCm, 'sizeCm')} cm" if keep(body.sizeCm, "sizeCm") is not None
            else (f"{body.sizeMm} mm" if body.sizeMm is not None else existing.get("size"))
        ),
        "sizeMm": keep(body.sizeMm, "sizeMm"),
        "sizeCm": keep(body.sizeCm, "sizeCm"),
        "sizeInch": keep(body.sizeInch, "sizeInch"),
        "length": keep(body.length, "length"),
        "aliases": [alias.strip() for alias in body.aliases if alias.strip()],
        "multilingualNames": body.multilingualNames,
        "displaySequence": body.displaySequence,
        "reorderLevel": body.reorderLevel,
        "regularDiscount": body.regularDiscount,
        "productGroupIds": body.productGroupIds or existing.get("productGroupIds") or [],
        "imageUrl": body.imageUrl,
        "imageName": body.imageName,
        "stdPkg": keep(body.stdPkg, "stdPkg"),
        "isActive": body.isActive,
        "updatedAt": now_iso(),
    }
    resolved_type, resolved_class = resolve_product_taxonomy(
        updates.get("type"),
        updates.get("subcategory"),
        updates.get("productClass"),
        updates.get("productName"),
        body.name,
    )
    if resolved_type:
        updates["type"] = resolved_type
    if resolved_class:
        updates["productClass"] = resolved_class
    if body.stock is not None:
        updates["stock"] = body.stock
    result = await db.catalog.update_one({"id": item_id}, {"$set": updates})
    if result.matched_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Item not found"))
    if not await db.categories.find_one({"name": updates["category"]}):
        await db.categories.insert_one({"id": new_id(), "name": updates["category"], "isDefault": False})
    await ensure_product_type(updates.get("type"))
    doc = await db.catalog.find_one({"id": item_id}, {"_id": 0})
    await upsert_pricing(doc.get("productCode"), body.mrp, selling, body.purchasePrice, body.discount)
    return envelope(doc)


async def update_catalog_pricing(item_id: str, body: CatalogPricingIn):
    current = await db.catalog.find_one({"id": item_id}, {"_id": 0})
    if not current:
        return JSONResponse(status_code=404, content=envelope(None, False, "Item not found"))
    mrp = body.mrp if body.mrp is not None else current.get("mrp")
    discount = body.discount if body.discount is not None else current.get("discount")
    selling = selling_from(mrp, discount, body.sellingPrice, current.get("sellingPrice") or current.get("standardRate") or 0)
    updates = {
        "mrp": mrp,
        "discount": discount,
        "sellingPrice": selling,
        "standardRate": selling,
        "updatedAt": now_iso(),
    }
    if body.purchasePrice is not None:
        updates["purchasePrice"] = body.purchasePrice
    if body.stock is not None:
        updates["stock"] = body.stock
    await db.catalog.update_one({"id": item_id}, {"$set": updates})
    await upsert_pricing(
        current.get("productCode"),
        mrp,
        selling,
        updates.get("purchasePrice", current.get("purchasePrice")),
        discount,
    )
    doc = await db.catalog.find_one({"id": item_id}, {"_id": 0})
    return envelope(doc)


async def update_catalog_pricing_bulk(body: CatalogBulkPricingIn):
    updated = 0
    skipped = 0
    for item_id in body.itemIds:
        current = await db.catalog.find_one({"id": item_id}, {"_id": 0})
        if not current:
            skipped += 1
            continue
        mrp = body.mrp if body.mrp is not None else current.get("mrp")
        discount = body.discount if body.discount is not None else current.get("discount")
        keep_selling = body.mrp is None and body.discount is None
        selling = selling_from(
            mrp,
            discount,
            current.get("sellingPrice") if keep_selling else None,
            current.get("standardRate") or 0,
        )
        updates = {
            "mrp": mrp,
            "discount": discount,
            "sellingPrice": selling,
            "standardRate": selling,
            "updatedAt": now_iso(),
        }
        if body.stock is not None:
            updates["stock"] = body.stock
        await db.catalog.update_one({"id": item_id}, {"$set": updates})
        await upsert_pricing(
            current.get("productCode"),
            mrp,
            selling,
            current.get("purchasePrice"),
            discount,
        )
        updated += 1
    return envelope({"updated": updated, "skipped": skipped})


async def delete_catalog(item_id: str):
    result = await db.catalog.delete_one({"id": item_id})
    if result.deleted_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Item not found"))
    return envelope({"deleted": True, "id": item_id})


async def delete_catalog_secured(item_id: str, body: AdminPasscodeIn):
    if not await verify_admin_passcode(body):
        return passcode_denied()
    result = await db.catalog.delete_one({"id": item_id})
    if result.deleted_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Item not found"))
    return envelope({"deleted": True, "id": item_id})


async def purge_catalog_by_field(body: CatalogFieldPurgeIn):
    if not await verify_admin_passcode(body):
        return passcode_denied()
    value = body.value.strip()
    if not value:
        return JSONResponse(status_code=400, content=envelope(None, False, "Value is required"))
    if body.field == "type":
        result = await db.catalog.delete_many({"type": {"$regex": f"^{re.escape(value)}$", "$options": "i"}})
    elif body.field == "productClass":
        result = await db.catalog.delete_many({"productClass": {"$regex": f"^{re.escape(value)}$", "$options": "i"}})
    else:
        result = await db.catalog.delete_many({"productGroup": {"$regex": f"^{re.escape(value)}$", "$options": "i"}})
    return envelope({"productsRemoved": result.deleted_count, "field": body.field, "value": value})


async def clear_catalog():
    deleted = await reset_catalog_tree()
    return envelope({"deleted": deleted["catalog"], **deleted})


async def wipe_catalog_all(body: AdminPasscodeIn):
    if not await verify_admin_passcode(body):
        return passcode_denied()
    deleted = await reset_catalog_tree()
    return envelope(deleted)


async def import_catalog(body: CatalogImportIn):
    if body.replaceExisting:
        await reset_catalog_tree()
    mode = body.categoryMode
    override = (body.overrideCategory or "").strip()
    inserted = 0
    skipped = 0
    categories_created: set = set()
    updated = 0
    group_cache: dict = {}
    brand_cache: dict = {}
    subcategory_cache: dict = {}
    for it in body.items:
        # Determine final category
        if mode == "overrideExisting":
            cat = override or "General"
        elif mode == "overrideNew":
            cat = override if not (it.category and it.category.strip()) else it.category.strip()
        else:  # fromCsv
            cat = (it.category or "").strip() or "General"

        if not it.name or not it.unit:
            skipped += 1
            continue
        product_code = (it.productCode or "").strip().rstrip("^")
        brand = None
        if it.brand and it.brand.strip():
            brand_key = it.brand.strip().lower()
            brand = brand_cache.get(brand_key)
            if not brand:
                brand = await db.brands.find_one({"name": {"$regex": f"^{re.escape(it.brand.strip())}$", "$options": "i"}})
                if not brand:
                    brand = {"id": new_id(), "name": it.brand.strip(), "isActive": True, "createdAt": now_iso(), "updatedAt": now_iso()}
                    await db.brands.insert_one(brand.copy())
                brand_cache[brand_key] = brand
        if not product_code:
            product_code = slug_product_code(
                it.brand,
                it.type,
                it.productClass,
                it.size or it.sizeInch or it.sizeCm or it.sizeMm,
                it.length,
            ) or f"PRD-{uuid.uuid4().hex[:10].upper()}"
        existing = await db.catalog.find_one({"productCode": product_code}) if product_code else None
        selling = selling_from(it.mrp, it.discount, it.sellingPrice, it.standardRate or 0)
        if existing:
            stock = float(existing.get("stock", 0))
        else:
            stock = it.stock if it.stock is not None else 0
        group_ids = list((existing or {}).get("productGroupIds") or [])
        if it.productGroup and it.productGroup.strip():
            group_key = it.productGroup.strip().lower()
            group = group_cache.get(group_key)
            if not group:
                group = await db.product_groups.find_one({"name": {"$regex": f"^{re.escape(it.productGroup.strip())}$", "$options": "i"}})
                if not group:
                    group = {"id": new_id(), "name": it.productGroup.strip(), "productIds": [], "productCount": 0}
                    await db.product_groups.insert_one(group.copy())
                group_cache[group_key] = group
            if group["id"] not in group_ids:
                group_ids.append(group["id"])
        sub_name = (it.subcategory or "").strip()
        subcategory_doc = None
        if sub_name:
            sub_key = f"{cat.lower()}::{sub_name.lower()}"
            subcategory_doc = subcategory_cache.get(sub_key)
            if not subcategory_doc:
                parent_cat = await db.categories.find_one({"name": {"$regex": f"^{re.escape(cat)}$", "$options": "i"}})
                if not parent_cat:
                    parent_cat = {"id": new_id(), "name": cat, "isDefault": False, "isActive": True}
                    await db.categories.insert_one(parent_cat.copy())
                    categories_created.add(cat)
                subcategory_doc = await db.subcategories.find_one({
                    "categoryId": parent_cat["id"],
                    "name": {"$regex": f"^{re.escape(sub_name)}$", "$options": "i"},
                })
                if not subcategory_doc:
                    subcategory_doc = {
                        "id": new_id(),
                        "name": sub_name,
                        "categoryId": parent_cat["id"],
                        "category": parent_cat["name"],
                        "createdAt": now_iso(),
                        "updatedAt": now_iso(),
                    }
                    await db.subcategories.insert_one(subcategory_doc.copy())
                subcategory_cache[sub_key] = subcategory_doc
        resolved_type, resolved_class = resolve_product_taxonomy(
            it.type, it.subcategory, it.productClass, it.name, it.productName
        )
        if existing:
            resolved_type = resolved_type or existing.get("type")
            resolved_class = resolved_class or existing.get("productClass")
        doc = {
            "id": existing.get("id") if existing else new_id(),
            "name": it.name.strip(),
            "productName": it.productName or it.name.strip(),
            "category": cat,
            "unit": it.unit.strip(),
            "standardRate": selling,
            "mrp": it.mrp,
            "sellingPrice": selling,
            "purchasePrice": it.purchasePrice,
            "discount": it.discount,
            "stock": stock,
            "brandId": brand["id"] if brand else (existing.get("brandId") if existing else None),
            "brand": brand["name"] if brand else (existing.get("brand") if existing else None),
            "productCode": product_code or (existing.get("productCode") if existing else f"PRD-{uuid.uuid4().hex[:10].upper()}"),
            "type": resolved_type,
            "productClass": resolved_class or infer_product_class(it.productClass, it.name, it.productName),
            "subcategory": subcategory_doc["name"] if subcategory_doc else (existing.get("subcategory") if existing else None),
            "subcategoryId": subcategory_doc["id"] if subcategory_doc else (existing.get("subcategoryId") if existing else None),
            "productGroup": it.productGroup,
            "productGroupIds": group_ids,
            "size": it.size or (f"{it.sizeCm} cm" if it.sizeCm is not None else (str(it.sizeMm) if it.sizeMm is not None else None)),
            "sizeMm": it.sizeMm,
            "sizeCm": it.sizeCm,
            "sizeInch": it.sizeInch,
            "length": it.length,
            "stdPkg": it.stdPkg if it.stdPkg is not None else (existing.get("stdPkg") if existing else None),
            "reorderLevel": it.reorderLevel if it.reorderLevel is not None else (existing.get("reorderLevel", 0) if existing else 0),
            "imageUrl": (it.imageUrl or "").strip() or None,
            "isActive": True if it.isActive is None else it.isActive,
            "createdAt": existing.get("createdAt") if existing else now_iso(),
            "updatedAt": now_iso(),
        }
        doc["qrCode"] = doc["productCode"]
        if existing:
            await db.catalog.replace_one({"id": existing["id"]}, {**existing, **doc, "id": existing["id"]})
            updated += 1
        else:
            await db.catalog.insert_one(doc.copy())
            inserted += 1
        if it.productGroup and it.productGroup.strip():
            group = group_cache[it.productGroup.strip().lower()]
            ids = list(group.get("productIds") or [])
            if doc["id"] not in ids:
                ids.append(doc["id"])
                group["productIds"] = ids
        await upsert_pricing(doc["productCode"], it.mrp, selling, it.purchasePrice, it.discount)
        if cat not in categories_created and not await db.categories.find_one({"name": cat}):
            await db.categories.insert_one({"id": new_id(), "name": cat, "isDefault": False, "isActive": True})
            categories_created.add(cat)
        await ensure_product_type(doc.get("type"))

    for group in group_cache.values():
        ids = list(dict.fromkeys(group.get("productIds") or []))
        await db.product_groups.update_one({"id": group["id"]}, {"$set": {"productIds": ids, "productCount": len(ids)}})

    return envelope({"inserted": inserted, "updated": updated, "skipped": skipped, "categoryMode": mode})


async def _run_master_catalog_import(body: CatalogMasterImportIn):
    mode = body.categoryMode
    override = (body.overrideCategory or "").strip()
    inserted = 0
    skipped = 0
    categories_created: set = set()
    updated = 0
    group_cache: dict = {}
    brand_cache: dict = {}
    subcategory_cache: dict = {}
    for it in body.items:
        if mode == "overrideExisting":
            cat = override or "General"
        elif mode == "overrideNew":
            cat = override if not (it.category and it.category.strip()) else it.category.strip()
        else:
            cat = (it.category or "").strip() or "General"

        if not it.name or not it.name.strip():
            skipped += 1
            continue
        product_code = (it.productCode or "").strip().rstrip("^")
        brand = None
        if it.brand and it.brand.strip():
            brand_key = it.brand.strip().lower()
            brand = brand_cache.get(brand_key)
            if not brand:
                brand = await db.brands.find_one({"name": {"$regex": f"^{re.escape(it.brand.strip())}$", "$options": "i"}})
                if not brand:
                    brand = {"id": new_id(), "name": it.brand.strip(), "isActive": True, "createdAt": now_iso(), "updatedAt": now_iso()}
                    await db.brands.insert_one(brand.copy())
                brand_cache[brand_key] = brand
        if not product_code:
            product_code = slug_product_code(
                it.brand,
                it.type,
                it.productClass,
                it.size or it.sizeInch or it.sizeCm or it.sizeMm,
                it.length,
            ) or f"PRD-{uuid.uuid4().hex[:10].upper()}"
        existing = await db.catalog.find_one({"productCode": product_code}) if product_code else None
        if existing:
            selling = float(existing.get("standardRate") or existing.get("sellingPrice") or 0)
            mrp = existing.get("mrp")
            discount = existing.get("discount")
            stock = float(existing.get("stock", 0))
            purchase_price = existing.get("purchasePrice")
        else:
            mrp = it.mrp
            discount = it.discount
            selling = float(it.sellingPrice) if it.sellingPrice is not None else None
            if selling is None and mrp is not None:
                disc = float(discount or 0)
                selling = round(float(mrp) * (1 - disc / 100), 2)
            if selling is None:
                selling = 0.0
            stock = 0.0
            purchase_price = None
        group_ids = list((existing or {}).get("productGroupIds") or [])
        if it.productGroup and it.productGroup.strip():
            group_key = it.productGroup.strip().lower()
            group = group_cache.get(group_key)
            if not group:
                group = await db.product_groups.find_one({"name": {"$regex": f"^{re.escape(it.productGroup.strip())}$", "$options": "i"}})
                if not group:
                    group = {"id": new_id(), "name": it.productGroup.strip(), "productIds": [], "productCount": 0}
                    await db.product_groups.insert_one(group.copy())
                group_cache[group_key] = group
            if group["id"] not in group_ids:
                group_ids.append(group["id"])
        sub_name = (it.subcategory or "").strip()
        subcategory_doc = None
        if sub_name:
            sub_key = f"{cat.lower()}::{sub_name.lower()}"
            subcategory_doc = subcategory_cache.get(sub_key)
            if not subcategory_doc:
                parent_cat = await db.categories.find_one({"name": {"$regex": f"^{re.escape(cat)}$", "$options": "i"}})
                if not parent_cat:
                    parent_cat = {"id": new_id(), "name": cat, "isDefault": False, "isActive": True}
                    await db.categories.insert_one(parent_cat.copy())
                    categories_created.add(cat)
                subcategory_doc = await db.subcategories.find_one({
                    "categoryId": parent_cat["id"],
                    "name": {"$regex": f"^{re.escape(sub_name)}$", "$options": "i"},
                })
                if not subcategory_doc:
                    subcategory_doc = {
                        "id": new_id(),
                        "name": sub_name,
                        "categoryId": parent_cat["id"],
                        "category": parent_cat["name"],
                        "createdAt": now_iso(),
                        "updatedAt": now_iso(),
                    }
                    await db.subcategories.insert_one(subcategory_doc.copy())
                subcategory_cache[sub_key] = subcategory_doc
        resolved_type, resolved_class = resolve_product_taxonomy(
            it.type, it.subcategory, it.productClass, it.name, it.productName
        )
        if existing:
            resolved_type = resolved_type or existing.get("type")
            resolved_class = resolved_class or existing.get("productClass")
        doc = {
            "id": existing.get("id") if existing else new_id(),
            "name": it.name.strip(),
            "productName": it.productName or it.name.strip(),
            "category": cat,
            "unit": (it.unit or "pcs").strip(),
            "standardRate": selling,
            "mrp": mrp,
            "sellingPrice": selling,
            "purchasePrice": purchase_price,
            "discount": discount,
            "stock": stock,
            "brandId": brand["id"] if brand else (existing.get("brandId") if existing else None),
            "brand": brand["name"] if brand else (existing.get("brand") if existing else None),
            "productCode": product_code,
            "type": resolved_type,
            "productClass": resolved_class or infer_product_class(it.productClass, it.name, it.productName),
            "subcategory": subcategory_doc["name"] if subcategory_doc else (existing.get("subcategory") if existing else None),
            "subcategoryId": subcategory_doc["id"] if subcategory_doc else (existing.get("subcategoryId") if existing else None),
            "productGroup": it.productGroup,
            "productGroupIds": group_ids,
            "size": it.size or (f"{it.sizeCm} cm" if it.sizeCm is not None else (str(it.sizeMm) if it.sizeMm is not None else None)),
            "sizeMm": it.sizeMm,
            "sizeCm": it.sizeCm,
            "sizeInch": it.sizeInch,
            "length": it.length,
            "stdPkg": it.stdPkg if it.stdPkg is not None else (existing.get("stdPkg") if existing else None),
            "reorderLevel": it.reorderLevel if it.reorderLevel is not None else (existing.get("reorderLevel", 0) if existing else 0),
            "hsnCode": (it.hsnCode or "").strip() or (existing.get("hsnCode") if existing else None),
            "gstRate": it.gstRate if it.gstRate is not None else (existing.get("gstRate") if existing else None),
            "mrpPkg": it.mrpPkg if it.mrpPkg is not None else (existing.get("mrpPkg") if existing else None),
            "imageUrl": (it.imageUrl or "").strip() or (existing.get("imageUrl") if existing else None),
            "isActive": True if it.isActive is None else it.isActive,
            "createdAt": existing.get("createdAt") if existing else now_iso(),
            "updatedAt": now_iso(),
        }
        doc["qrCode"] = doc["productCode"]
        if existing:
            await db.catalog.replace_one({"id": existing["id"]}, {**existing, **doc, "id": existing["id"]})
            updated += 1
        else:
            await db.catalog.insert_one(doc.copy())
            inserted += 1
            await upsert_pricing(doc["productCode"], mrp, selling, None, discount or 0)
        if it.productGroup and it.productGroup.strip():
            group = group_cache[it.productGroup.strip().lower()]
            ids = list(group.get("productIds") or [])
            if doc["id"] not in ids:
                ids.append(doc["id"])
                group["productIds"] = ids
        if cat not in categories_created and not await db.categories.find_one({"name": cat}):
            await db.categories.insert_one({"id": new_id(), "name": cat, "isDefault": False, "isActive": True})
            categories_created.add(cat)
        await ensure_product_type(doc.get("type"))

    for group in group_cache.values():
        ids = list(dict.fromkeys(group.get("productIds") or []))
        await db.product_groups.update_one({"id": group["id"]}, {"$set": {"productIds": ids, "productCount": len(ids)}})

    return {"inserted": inserted, "updated": updated, "skipped": skipped, "categoryMode": mode}


async def import_catalog_master(body: CatalogMasterImportIn):
    result = await _run_master_catalog_import(body)
    return envelope(result)


async def import_catalog_pricing(body: CatalogPricingImportIn):
    updated = 0
    skipped = 0
    warnings: List[str] = []
    for index, row in enumerate(body.items, start=1):
        code = (row.productCode or "").strip().rstrip("^")
        if not code:
            skipped += 1
            continue
        current = await db.catalog.find_one({"productCode": code}, {"_id": 0})
        if not current:
            skipped += 1
            continue
        mrp = row.mrp if row.mrp is not None else current.get("mrp")
        discount = row.discount if row.discount is not None else current.get("discount")
        if mrp is None and discount is None and row.sellingPrice is None:
            skipped += 1
            continue
        selling = selling_from(mrp, discount, row.sellingPrice, current.get("standardRate") or 0)
        if row.mrp is not None and row.discount is not None and row.sellingPrice is not None:
            expected = selling_from(mrp, discount, None, 0)
            if abs(float(row.sellingPrice) - expected) > 0.02:
                warnings.append(f"Row {index} ({code}): selling price adjusted to {expected} from MRP and discount")
                selling = expected
        elif row.mrp is not None and row.discount is not None:
            selling = selling_from(mrp, discount, None, 0)
        updates = {
            "mrp": mrp,
            "discount": discount,
            "sellingPrice": selling,
            "standardRate": selling,
            "updatedAt": now_iso(),
        }
        await db.catalog.update_one({"id": current["id"]}, {"$set": updates})
        await upsert_pricing(code, mrp, selling, current.get("purchasePrice"), discount)
        updated += 1
    return envelope({"updated": updated, "skipped": skipped, "warnings": warnings[:50]})


async def import_catalog_stock(body: CatalogStockImportIn):
    updated = 0
    skipped = 0
    for row in body.items:
        code = (row.productCode or "").strip().rstrip("^")
        if not code or row.stock is None:
            skipped += 1
            continue
        try:
            qty = float(row.stock)
        except (TypeError, ValueError):
            skipped += 1
            continue
        if qty < 0:
            skipped += 1
            continue
        result = await db.catalog.update_one({"productCode": code}, {"$set": {"stock": qty, "updatedAt": now_iso()}})
        if result.matched_count:
            updated += 1
        else:
            skipped += 1
    return envelope({"updated": updated, "skipped": skipped})
