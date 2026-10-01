from typing import Any, List, Optional
from fastapi.responses import JSONResponse, Response
from utils import *

async def get_money_config(admin_id: str):
    mc = await db.money_config.find_one({"adminId": admin_id}, {"_id": 0})
    if not mc:
        # Auto-provision defaults
        mc = {
            "id": new_id(),
            "adminId": admin_id,
            "discountPercent": 0,
            "gstPercent": 18,
            "specialDiscountPercent": 0,
            "showDiscount": True,
            "showGst": True,
            "showSpecialDiscount": False,
        }
        await db.money_config.insert_one(mc.copy())
    return envelope(mc)


async def update_money_config(admin_id: str, body: MoneyConfigIn):
    updates = body.model_dump()
    await db.money_config.update_one(
        {"adminId": admin_id},
        {"$set": updates, "$setOnInsert": {"id": new_id(), "adminId": admin_id}},
        upsert=True,
    )
    mc = await db.money_config.find_one({"adminId": admin_id}, {"_id": 0})
    return envelope(mc)


# ---------- Dashboard snapshot ----------

def _parse_iso_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


async def dashboard_snapshot():
    window_days = 30
    cutoff = datetime.now(timezone.utc) - timedelta(days=window_days)
    cutoff_7d = datetime.now(timezone.utc) - timedelta(days=7)

    catalog_count = await db.catalog.count_documents({})
    category_count = await db.categories.count_documents({})
    total_stock = 0.0
    low_stock = 0
    async for product in db.catalog.find({}, {"_id": 0, "stock": 1, "reorderLevel": 1}):
        stock = float(product.get("stock") or 0)
        total_stock += stock
        if stock <= float(product.get("reorderLevel") or 0):
            low_stock += 1

    rfq_counts: dict = {"pending": 0, "approved": 0, "rejected": 0, "dispatched": 0}
    pending_rfqs: List[dict] = []
    async for rfq in db.rfqs.find({}, {"_id": 0}).sort("createdAt", -1):
        status = rfq.get("status") or "pending"
        rfq_counts[status] = rfq_counts.get(status, 0) + 1
        if status == "pending" and len(pending_rfqs) < 5:
            pending_rfqs.append({
                "id": rfq.get("id"),
                "partnerId": rfq.get("partnerId"),
                "lineCount": len(rfq.get("lines") or []),
                "createdAt": rfq.get("createdAt"),
            })

    partners_total = await db.partners.count_documents({})
    partners_kyc_approved = await db.partners.count_documents({"kycStatus": "approved"})

    dispatch_qty_by_code: dict = {}
    dispatch_value_7d = 0.0
    dispatch_count_7d = 0
    async for dispatch in db.dispatches.find({}, {"_id": 0}):
        created = _parse_iso_dt(dispatch.get("createdAt"))
        in_window = created is not None and created >= cutoff
        in_7d = created is not None and created >= cutoff_7d
        if in_7d:
            dispatch_count_7d += 1
        for line in dispatch.get("lines") or []:
            code = (line.get("productCode") or "").strip()
            qty = float(line.get("quantity") or 0)
            unit_price = float(line.get("unitPrice") or 0)
            if in_window and code:
                dispatch_qty_by_code[code] = dispatch_qty_by_code.get(code, 0.0) + qty
            if in_7d:
                dispatch_value_7d += qty * unit_price

    top_moving = sorted(dispatch_qty_by_code.items(), key=lambda item: -item[1])[:5]
    top_products = []
    for code, qty in top_moving:
        catalog_item = await db.catalog.find_one({"productCode": code}, {"_id": 0, "name": 1})
        top_products.append({
            "productCode": code,
            "name": (catalog_item or {}).get("name") or code,
            "dispatchQty": qty,
        })

    slow_candidates = []
    async for product in db.catalog.find({"stock": {"$gt": 0}}, {"_id": 0, "productCode": 1, "name": 1, "stock": 1}):
        code = product.get("productCode")
        if not code:
            continue
        if dispatch_qty_by_code.get(code, 0) <= 0:
            slow_candidates.append({
                "productCode": code,
                "name": product.get("name") or code,
                "stock": float(product.get("stock") or 0),
            })
    slow_candidates.sort(key=lambda item: -item["stock"])
    slow_products = slow_candidates[:5]

    return envelope({
        "catalogCount": catalog_count,
        "categoryCount": category_count,
        "totalStockUnits": round(total_stock, 2),
        "lowStockCount": low_stock,
        "rfqCounts": rfq_counts,
        "pendingRfqs": pending_rfqs,
        "partnersTotal": partners_total,
        "partnersKycApproved": partners_kyc_approved,
        "dispatchValue7d": round(dispatch_value_7d, 2),
        "dispatchCount7d": dispatch_count_7d,
        "salesWindowDays": window_days,
        "topMovingProducts": top_products,
        "slowMovingProducts": slow_products,
    })
