from typing import Any, List, Optional
from fastapi.responses import JSONResponse, Response
from utils import *

async def register_partner(body: PartnerIn):
    if not body.name.strip() or not body.phone.strip():
        return JSONResponse(status_code=400, content=envelope(None, False, "Name and phone are required"))
    if await db.partners.find_one({"phone": body.phone.strip()}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Partner phone already registered"))
    partner = {"id": new_id(), **body.model_dump(), "name": body.name.strip(), "phone": body.phone.strip(), "kycStatus": "pending", "locationVerified": False, "appActive": False, "kycHistory": [], "rewardPoints": None, "createdAt": now_iso(), "updatedAt": now_iso()}
    await db.partners.insert_one(partner.copy())
    return envelope(public_partner(partner))


async def create_partner_direct(body: PartnerIn):
    result = await register_partner(body)
    if isinstance(result, JSONResponse):
        return result
    partner = result["data"]
    reviewed_at = now_iso()
    await db.partners.update_one({"id": partner["id"]}, {"$set": {"kycStatus": "approved", "locationVerified": True, "appActive": True, "approvedAt": reviewed_at, "approvedBy": "admin"}, "$push": {"kycHistory": {"status": "approved", "reviewedBy": "admin", "reviewedAt": reviewed_at, "locationVerified": True}}})
    return envelope(public_partner(await db.partners.find_one({"id": partner["id"]})))


async def list_partners(search: Optional[str] = None, kyc_status: Optional[str] = None, sales_manager: Optional[str] = None):
    query = {}
    if kyc_status: query["kycStatus"] = kyc_status
    if sales_manager: query["salesManager"] = sales_manager
    if search and search.strip():
        term = re.escape(search.strip())
        query["$or"] = [{"name": {"$regex": term, "$options": "i"}}, {"phone": {"$regex": term, "$options": "i"}}, {"pincode": {"$regex": term, "$options": "i"}}, {"city": {"$regex": term, "$options": "i"}}, {"area": {"$regex": term, "$options": "i"}}]
    partners = []
    async for partner in db.partners.find(query, {"_id": 0}).sort("name", 1):
        partner["rewardBalance"] = await reward_balance(partner["id"])
        partner["rfqCount"] = await db.rfqs.count_documents({"partnerId": partner["id"]})
        approved = [rfq async for rfq in db.rfqs.find({"partnerId": partner["id"], "status": {"$in": ["approved", "dispatched"]}}, {"_id": 0, "grandTotal": 1})]
        partner["salesPerformance"] = {"approvedCount": len(approved), "approvedValue": sum(rfq.get("grandTotal", 0) for rfq in approved)}
        partners.append(partner)
    return envelope(partners)


async def get_partner(partner_id: str):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner: return JSONResponse(status_code=404, content=envelope(None, False, "Partner not found"))
    partner["rewardBalance"] = await reward_balance(partner_id)
    partner["rfqCount"] = await db.rfqs.count_documents({"partnerId": partner_id})
    approved = [rfq async for rfq in db.rfqs.find({"partnerId": partner_id, "status": {"$in": ["approved", "dispatched"]}}, {"_id": 0, "grandTotal": 1})]
    partner["salesPerformance"] = {"approvedCount": len(approved), "approvedValue": sum(rfq.get("grandTotal", 0) for rfq in approved)}
    partner["purchaseHistory"] = [purchase async for purchase in db.purchases.find({"partnerId": partner_id}, {"_id": 0}).sort("createdAt", -1)]
    return envelope(partner)


async def review_partner_kyc(partner_id: str, body: PartnerReviewIn):
    status = "approved" if body.approved else "rejected"
    reviewed_at = now_iso()
    update = {"kycStatus": status, "locationVerified": body.locationVerified, "appActive": body.approved, "reviewedAt": reviewed_at, "reviewedBy": "admin", "rejectionReason": body.rejectionReason if not body.approved else None, "updatedAt": reviewed_at}
    update_history = {"status": status, "reviewedBy": "admin", "reviewedAt": reviewed_at, "locationVerified": body.locationVerified, "rejectionReason": body.rejectionReason}
    result = await db.partners.update_one({"id": partner_id}, {"$set": update, "$push": {"kycHistory": update_history}})
    if result.matched_count == 0: return JSONResponse(status_code=404, content=envelope(None, False, "Partner not found"))
    return envelope(public_partner(await db.partners.find_one({"id": partner_id})))


# ---------- Team Management ----------

def public_team_user(user: dict) -> dict:
    result = {key: value for key, value in user.items() if key not in {"_id", "passcodeHash"}}
    result.setdefault("isActive", True)
    result.setdefault("permissions", ROLE_PERMISSIONS.get(result.get("role", "staff"), []))
    return result


async def list_team_users():
    cursor = db.users.find({"role": {"$in": ["admin", "store_manager", "staff"]}}, {"_id": 0}).sort("name", 1)
    return envelope([public_team_user(user) async for user in cursor])


async def create_team_user(body: TeamUserIn):
    contact = body.contactNumber.strip()
    if not body.name.strip() or not contact or len(body.passcode) < 4:
        return JSONResponse(status_code=400, content=envelope(None, False, "Name, contact number, and a 4-character passcode are required"))
    if await db.users.find_one({"contactNumber": contact}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Contact number already registered"))
    user = {"id": new_id(), "name": body.name.strip(), "contactNumber": contact, "role": body.role, "permissions": body.permissions or ROLE_PERMISSIONS[body.role], "isActive": True, "passcodeHash": bcrypt.hashpw(body.passcode.encode(), bcrypt.gensalt()).decode(), "createdAt": now_iso(), "updatedAt": now_iso()}
    await db.users.insert_one(user.copy())
    return envelope(public_team_user(user))


async def update_team_user(user_id: str, body: TeamUserUpdateIn):
    if not body.name.strip() or not body.contactNumber.strip():
        return JSONResponse(status_code=400, content=envelope(None, False, "Name and contact number are required"))
    duplicate = await db.users.find_one({"contactNumber": body.contactNumber.strip(), "id": {"$ne": user_id}})
    if duplicate:
        return JSONResponse(status_code=409, content=envelope(None, False, "Contact number already registered"))
    update = {"name": body.name.strip(), "contactNumber": body.contactNumber.strip(), "role": body.role, "isActive": body.isActive, "permissions": body.permissions or ROLE_PERMISSIONS[body.role], "updatedAt": now_iso()}
    result = await db.users.update_one({"id": user_id, "role": {"$in": ["admin", "store_manager", "staff"]}}, {"$set": update})
    if result.matched_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Team user not found"))
    return envelope(public_team_user(await db.users.find_one({"id": user_id}, {"_id": 0})))
