from typing import Any, List, Optional
from fastapi.responses import JSONResponse, Response
from utils import *

async def prepare_dispatch_lines(lines: List[DispatchLineIn]):
    errors = []
    prepared = []
    for index, line in enumerate(lines, start=1):
        product = await db.catalog.find_one({"productCode": line.productCode.strip()})
        stock = float(product.get("stock", 0)) if product else 0
        if not product or line.quantity <= 0:
            errors.append(f"Line {index}: valid product code and positive quantity are required")
        elif stock < line.quantity:
            errors.append(f"Line {index}: insufficient stock for {product['name']} (available {stock})")
        else:
            prepared.append({"product": product, "quantity": line.quantity, "productCode": product["productCode"], "productName": product["name"], "unitPrice": product.get("standardRate", 0)})
    return errors, prepared


async def list_dispatches():
    cursor = db.dispatches.find({}, {"_id": 0}).sort("createdAt", -1)
    return envelope([dispatch async for dispatch in cursor])


async def create_dispatch(body: DispatchIn):
    if body.sourceRfqId:
        rfq = await db.rfqs.find_one({"id": body.sourceRfqId})
        if not rfq:
            return JSONResponse(status_code=404, content=envelope(None, False, "Source RFQ not found"))
        if rfq.get("status") != "approved":
            return JSONResponse(status_code=409, content=envelope(None, False, "Only approved RFQs can be dispatched"))
    errors, prepared = await prepare_dispatch_lines(body.lines)
    if errors or not prepared:
        return JSONResponse(status_code=400, content=envelope({"errors": errors or ["At least one valid dispatch line is required"]}, False, "Dispatch validation failed"))
    dispatch = {"id": new_id(), "sourceRfqId": body.sourceRfqId, "customerName": body.customerName, "customerPhone": body.customerPhone, "lines": [], "createdAt": now_iso()}
    for entry in prepared:
        product = entry["product"]
        dispatch["lines"].append({"productId": product["id"], "productCode": entry["productCode"], "productName": entry["productName"], "quantity": entry["quantity"], "unitPrice": entry["unitPrice"]})
        result = await db.catalog.update_one({"id": product["id"], "stock": {"$gte": entry["quantity"]}}, {"$inc": {"stock": -entry["quantity"]}})
        if result.modified_count != 1:
            return JSONResponse(status_code=409, content=envelope(None, False, "Stock changed; please retry dispatch"))
    await db.dispatches.insert_one(dispatch.copy())
    if body.sourceRfqId:
        await db.rfqs.update_one({"id": body.sourceRfqId}, {"$set": {"status": "dispatched", "updatedAt": now_iso()}, "$push": {"history": rfq_event("dispatched", "admin", {"dispatchId": dispatch["id"]})}})
    return envelope(dispatch)


# ---------- Inventory ----------

async def inventory_view():
    products = []
    async for product in db.catalog.find({}, {"_id": 0}).sort("name", 1):
        stock = float(product.get("stock", 0))
        products.append({"productId": product["id"], "productCode": product.get("productCode"), "name": product["name"], "category": product.get("category"), "brand": product.get("brand"), "stock": stock, "reorderLevel": float(product.get("reorderLevel", 0)), "unitCost": float(product.get("lastPurchasePrice", product.get("standardRate", 0))), "valuation": stock * float(product.get("lastPurchasePrice", product.get("standardRate", 0))), "rackName": product.get("rackName"), "rackSlot": product.get("rackSlot")})
    return envelope(products)


async def low_stock_inventory():
    data = (await inventory_view())["data"]
    return envelope([item for item in data if item["stock"] <= item["reorderLevel"]])


async def inventory_transactions():
    entries = []
    purchases = [purchase async for purchase in db.purchases.find({}, {"_id": 0})]
    dispatches = [dispatch async for dispatch in db.dispatches.find({}, {"_id": 0})]
    for transaction in purchases:
        for line in transaction.get("lines", []): entries.append({"type": "in", "referenceId": transaction["id"], "productCode": line["productCode"], "productName": line["productName"], "quantity": line["quantity"], "at": transaction["createdAt"]})
    for transaction in dispatches:
        for line in transaction.get("lines", []): entries.append({"type": "out", "referenceId": transaction["id"], "productCode": line["productCode"], "productName": line["productName"], "quantity": line["quantity"], "at": transaction["createdAt"]})
    return envelope(sorted(entries, key=lambda entry: entry["at"], reverse=True))
