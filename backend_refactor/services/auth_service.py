from typing import Any, List, Optional
from fastapi.responses import JSONResponse, Response
try:
    from ..utils import *
except ImportError:
    from utils import *

async def requester_register(body: RequesterRegisterIn):
    user_id = new_id()
    doc = {
        "id": user_id,
        "role": "requester",
        "name": body.name.strip(),
        "phone": body.phone.strip(),
        "address": body.address.strip(),
        "createdAt": now_iso(),
    }
    await db.users.insert_one(doc.copy())
    return envelope({"id": user_id, **{k: v for k, v in doc.items() if k != "id"}})


async def admin_register(body: AdminRegisterIn):
    existing = await db.users.find_one({"role": "admin", "contactNumber": body.contactNumber})
    if existing:
        return JSONResponse(status_code=400, content=envelope(None, False, "Contact number already registered"))
    passcode_hash = bcrypt.hashpw(body.passcode.encode(), bcrypt.gensalt()).decode()
    admin_id = new_id()
    doc = {
        "id": admin_id,
        "role": "admin",
        "companyName": body.companyName.strip(),
        "gstin": body.gstin.strip(),
        "contactNumber": body.contactNumber.strip(),
        "passcodeHash": passcode_hash,
        "createdAt": now_iso(),
    }
    await db.users.insert_one(doc.copy())
    # Seed default money config for this admin
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
    return envelope({
        "id": admin_id,
        "adminId": admin_id,
        "companyName": doc["companyName"],
        "contactNumber": doc["contactNumber"],
        "gstin": doc["gstin"],
    })


async def admin_login(body: AdminLoginIn):
    contact_number = (body.contactNumber or "").strip()
    user = await db.users.find_one({
        "contactNumber": contact_number,
        "role": {"$in": ["admin", "store_manager", "staff"]},
    })
    if not user:
        return JSONResponse(status_code=401, content=envelope(None, False, "Invalid credentials"))
    if user.get("isActive") is False:
        return JSONResponse(status_code=401, content=envelope(None, False, "Account is inactive"))
    try:
        if not bcrypt.checkpw(body.passcode.encode(), user["passcodeHash"].encode()):
            return JSONResponse(status_code=401, content=envelope(None, False, "Invalid credentials"))
    except ValueError:
        return JSONResponse(status_code=401, content=envelope(None, False, "Invalid credentials"))
    token = new_id()  # simple opaque token (mirror; teammate backend may use JWT)
    await db.admin_tokens.insert_one({"token": token, "adminId": user["id"], "createdAt": now_iso()})
    return envelope({
        "token": token,
        "adminId": user["id"],
        "role": user.get("role"),
        "companyName": user.get("companyName") or user.get("name"),
        "contactNumber": user.get("contactNumber"),
        "gstin": user.get("gstin"),
    })


async def partner_app_register(body: PartnerRegisterIn):
    if not body.name.strip() or not body.phone.strip():
        return JSONResponse(status_code=400, content=envelope(None, False, "Name and phone are required"))
    if await db.partners.find_one({"phone": body.phone.strip()}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Partner phone already registered"))
    passcode_hash = bcrypt.hashpw(body.passcode.encode(), bcrypt.gensalt()).decode()
    payload = body.model_dump(exclude={"passcode"})
    partner = {
        "id": new_id(),
        **payload,
        "name": body.name.strip(),
        "phone": body.phone.strip(),
        "passcodeHash": passcode_hash,
        "kycStatus": "pending",
        "locationVerified": False,
        "appActive": False,
        "kycHistory": [],
        "rewardPoints": None,
        "registeredVia": "mobile_app",
        "loginCount": 0,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    await db.partners.insert_one(partner.copy())
    return envelope(public_partner(partner))


async def partner_app_login(body: PartnerLoginIn):
    phone = body.phone.strip()
    partner = await db.partners.find_one({"phone": phone}, {"_id": 0})
    if not partner or not partner.get("passcodeHash"):
        return JSONResponse(status_code=401, content=envelope(None, False, "Invalid phone or passcode"))
    try:
        if not bcrypt.checkpw(body.passcode.encode(), partner["passcodeHash"].encode()):
            return JSONResponse(status_code=401, content=envelope(None, False, "Invalid phone or passcode"))
    except ValueError:
        return JSONResponse(status_code=401, content=envelope(None, False, "Invalid phone or passcode"))
    token = new_id()
    login_at = now_iso()
    await db.partner_tokens.insert_one({"token": token, "partnerId": partner["id"], "createdAt": login_at})
    await db.partners.update_one(
        {"id": partner["id"]},
        {
            "$set": {"lastAppLoginAt": login_at, "updatedAt": login_at},
            "$inc": {"loginCount": 1},
        },
    )
    refreshed = await db.partners.find_one({"id": partner["id"]}, {"_id": 0})
    return envelope({
        "token": token,
        "partnerId": partner["id"],
        "partner": public_partner(refreshed or partner),
    })


async def partner_app_me(authorization: Optional[str] = None):
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if not token:
        return JSONResponse(status_code=401, content=envelope(None, False, "Missing partner token"))
    session = await db.partner_tokens.find_one({"token": token})
    if not session:
        return JSONResponse(status_code=401, content=envelope(None, False, "Invalid or expired partner token"))
    partner = await db.partners.find_one({"id": session["partnerId"]}, {"_id": 0})
    if not partner:
        return JSONResponse(status_code=404, content=envelope(None, False, "Partner not found"))
    partner["rewardBalance"] = await reward_balance(partner["id"])
    return envelope(public_partner(partner))
