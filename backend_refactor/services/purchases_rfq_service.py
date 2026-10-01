from typing import Any, List, Optional
from fastapi.responses import JSONResponse, Response
from utils import *

async def validate_purchase_lines(lines: List[PurchaseLineIn]):
    errors = []
    prepared = []
    for index, line in enumerate(lines, start=1):
        product = await db.catalog.find_one({"productCode": line.productCode.strip()})
        if not product:
            errors.append(f"Line {index}: product code not found")
            continue
        if line.quantity <= 0 or line.listPrice < 0 or line.purchaseDiscount < 0:
            errors.append(f"Line {index}: quantity, price, and discount values are invalid")
            continue
        rack = None
        if line.rackId:
            rack = await db.racks.find_one({"id": line.rackId})
            if not rack or not line.rackSlot or not any(slot["code"] == line.rackSlot for slot in rack.get("slots", [])):
                errors.append(f"Line {index}: rack location is invalid")
                continue
        prepared.append({"product": product, "line": line, "rack": rack})
    return errors, prepared


async def list_purchases():
    cursor = db.purchases.find({}, {"_id": 0}).sort("createdAt", -1)
    return envelope([purchase async for purchase in cursor])


async def create_purchase(body: PurchaseIn):
    errors, prepared = await validate_purchase_lines(body.lines)
    if errors or not prepared:
        return JSONResponse(status_code=400, content=envelope({"errors": errors or ["At least one purchase line is required"]}, False, "Purchase validation failed"))
    transaction = {"id": new_id(), "lines": [], "createdAt": now_iso()}
    for entry in prepared:
        product, line, rack = entry["product"], entry["line"], entry["rack"]
        transaction["lines"].append({**line.model_dump(), "productId": product["id"], "productName": product["name"]})
        await db.catalog.update_one({"id": product["id"]}, {"$inc": {"stock": line.quantity}, "$set": {"lastPurchasePrice": line.listPrice, "lastPurchaseDiscount": line.purchaseDiscount}})
        if rack:
            await db.racks.update_one({"id": rack["id"]}, {"$set": {"slots.$[slot].productId": product["id"]}}, {"array_filters": [{"slot.code": line.rackSlot}]})
            await db.catalog.update_one({"id": product["id"]}, {"$set": {"rackId": rack["id"], "rackName": rack["name"], "rackSlot": line.rackSlot}})
    await db.purchases.insert_one(transaction.copy())
    return envelope(transaction)


async def import_purchases(body: PurchaseIn):
    return await create_purchase(body)


# ---------- RFQs ----------

async def prepare_rfq_lines(lines: List[RfqLineIn]):
    errors = []
    prepared = []
    for index, line in enumerate(lines, start=1):
        product = await db.catalog.find_one({"productCode": line.productCode.strip()})
        if not product or line.quantity <= 0:
            errors.append(f"Line {index}: valid product code and positive quantity are required")
        else:
            prepared.append({"productId": product["id"], "productCode": product["productCode"], "productName": product["name"], "quantity": line.quantity, "unitPrice": product.get("standardRate", 0)})
    return errors, prepared
async def list_rfqs(partner_id: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if partner_id: query["partnerId"] = partner_id
    if status: query["status"] = status
    if search and search.strip(): query["$or"] = [{"partnerId": {"$regex": re.escape(search.strip()), "$options": "i"}}, {"lines.productCode": {"$regex": re.escape(search.strip()), "$options": "i"}}, {"lines.productName": {"$regex": re.escape(search.strip()), "$options": "i"}}]
    cursor = db.rfqs.find(query, {"_id": 0}).sort("createdAt", -1)
    return envelope([rfq async for rfq in cursor])


async def create_rfq(body: RfqIn):
    errors, lines = await prepare_rfq_lines(body.lines)
    if errors or not body.partnerId.strip() or not lines:
        return JSONResponse(status_code=400, content=envelope({"errors": errors or ["Partner and at least one valid line are required"]}, False, "RFQ validation failed"))
    grand_total = sum(line["quantity"] * line["unitPrice"] for line in lines)
    doc = {"id": new_id(), "partnerId": body.partnerId.strip(), "lines": lines, "status": "pending", "grandTotal": grand_total, "specialDiscountPercent": 0, "rewardPoints": 0, "deliveryMode": body.deliveryMode, "scheduledAt": body.scheduledAt, "createdAt": now_iso(), "updatedAt": now_iso(), "history": [rfq_event("created", "system", {"lineCount": len(lines)})]}
    await db.rfqs.insert_one(doc.copy())
    return envelope(doc)


async def update_rfq(rfq_id: str, body: RfqIn):
    current = await db.rfqs.find_one({"id": rfq_id})
    if not current: return JSONResponse(status_code=404, content=envelope(None, False, "RFQ not found"))
    if current.get("status") in {"dispatched", "cancelled"}: return JSONResponse(status_code=409, content=envelope(None, False, "RFQ is no longer editable"))
    errors, lines = await prepare_rfq_lines(body.lines)
    if errors or not lines: return JSONResponse(status_code=400, content=envelope({"errors": errors or ["At least one valid line is required"]}, False, "RFQ validation failed"))
    grand_total = sum(line["quantity"] * line["unitPrice"] for line in lines)
    history = current.get("history", []) + [rfq_event("updated", "admin", {"previousLines": current.get("lines", []), "newLines": lines})]
    await db.rfqs.update_one({"id": rfq_id}, {"$set": {"partnerId": body.partnerId.strip(), "lines": lines, "deliveryMode": body.deliveryMode, "scheduledAt": body.scheduledAt, "grandTotal": grand_total, "updatedAt": now_iso(), "history": history}})
    return envelope(await db.rfqs.find_one({"id": rfq_id}, {"_id": 0}))


async def approve_rfq(rfq_id: str, body: RfqApprovalIn):
    current = await db.rfqs.find_one({"id": rfq_id})
    if not current: return JSONResponse(status_code=404, content=envelope(None, False, "RFQ not found"))
    if current.get("status") in {"dispatched", "cancelled"}: return JSONResponse(status_code=409, content=envelope(None, False, "RFQ can no longer be approved"))
    status = "approved" if body.approved else "rejected"
    grand_total = sum(line.get("quantity", 0) * line.get("unitPrice", 0) for line in current.get("lines", []))
    special_discount = max(0, body.specialDiscountPercent)
    grand_total = grand_total * (1 - special_discount / 100)
    calculated_points = int(grand_total // 100) if body.approved else 0
    updates = {"status": status, "specialDiscountPercent": special_discount, "rewardPoints": calculated_points, "grandTotal": grand_total, "updatedAt": now_iso()}
    if body.deliveryMode: updates["deliveryMode"] = body.deliveryMode
    if body.scheduledAt is not None: updates["scheduledAt"] = body.scheduledAt
    history = current.get("history", []) + [rfq_event(status, "admin", {"specialDiscountPercent": special_discount, "rewardPoints": calculated_points, "grandTotal": grand_total, "deliveryMode": updates.get("deliveryMode"), "scheduledAt": updates.get("scheduledAt")})]
    updates["history"] = history
    await db.rfqs.update_one({"id": rfq_id}, {"$set": updates})
    if body.approved and not await db.reward_ledger.find_one({"quotationId": rfq_id, "type": "earned"}):
        await db.reward_ledger.insert_one({"id": new_id(), "requesterId": current["partnerId"], "quotationId": rfq_id, "points": calculated_points, "type": "earned", "createdAt": now_iso()})
    return envelope(await db.rfqs.find_one({"id": rfq_id}, {"_id": 0}))


async def partner_rewards(partner_id: str):
    entries = [entry async for entry in db.reward_ledger.find({"requesterId": partner_id}, {"_id": 0}).sort("createdAt", -1)]
    return envelope({"balance": await reward_balance(partner_id), "entries": entries})


async def rfq_history(rfq_id: str):
    rfq = await db.rfqs.find_one({"id": rfq_id}, {"_id": 0, "history": 1})
    if not rfq: return JSONResponse(status_code=404, content=envelope(None, False, "RFQ not found"))
    return envelope(rfq.get("history", []))
