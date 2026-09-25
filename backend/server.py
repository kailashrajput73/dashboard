"""
Quotation Generator — Mirror Backend.

Implements the EXACT API contract used by the teammate's FastAPI + MongoDB backend.
Field names, collections, and endpoints match the schema in the problem statement 1:1
so the mobile app can hit either this preview backend or the teammate's laptop backend
without any code change (just switch API_BASE_URL on the client).

Collections & documents (mirrored):
- users          { _id, role, name, phone, address, companyName, gstin, contactNumber, passcodeHash, createdAt }
- catalog        { _id, name, category, unit, standardRate, createdAt, updatedAt }
- categories     { _id, name, isDefault }
- money_config   { _id, adminId, discountPercent, gstPercent, specialDiscountPercent,
                   showDiscount, showGst, showSpecialDiscount }

Response envelope for every endpoint: { success: bool, data: any, error: str|None }
"""

from fastapi import FastAPI, APIRouter, HTTPException, Header
from fastapi.responses import JSONResponse, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, field_validator
from typing import Any, List, Optional
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
import bcrypt
import logging
import re
import asyncio
import ipaddress
from urllib.parse import urlparse
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
db_name = os.getenv("DB_NAME", "quotation_db")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="Quotation Generator API (Mirror)")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("quotation-api")

# ---------- Helpers ----------

def selling_from(mrp: Optional[float], discount: Optional[float], selling: Optional[float], fallback: float = 0) -> float:
    if selling is not None:
        return float(selling)
    if mrp is not None and discount is not None:
        return round(float(mrp) * (1 - max(0, float(discount)) / 100), 2)
    if mrp is not None:
        return float(mrp)
    return float(fallback)


async def upsert_pricing(product_code: Optional[str], mrp, selling, purchase, discount):
    if not product_code:
        return
    await db.pricing_history.insert_one({
        "productCode": product_code,
        "mrp": mrp,
        "sellingPrice": selling,
        "purchasePrice": purchase,
        "discount": discount,
        "updatedAt": now_iso(),
    })
    await db.pricing.update_one(
        {"productCode": product_code},
        {"$set": {
            "productCode": product_code,
            "mrp": mrp,
            "sellingPrice": selling,
            "purchasePrice": purchase,
            "discount": discount,
            "updatedAt": now_iso(),
        }},
        upsert=True,
    )


def envelope(data: Any = None, success: bool = True, error: Optional[str] = None):
    return {"success": success, "data": data, "error": error}


def parse_size_mm(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    match = re.search(r"[-+]?\d*\.?\d+", str(value).replace(",", ""))
    return float(match.group(0)) if match else None


def slug_product_code(*parts) -> str:
    raw = "-".join(str(p).strip() for p in parts if p and str(p).strip())
    raw = re.sub(r"[^A-Za-z0-9]+", "-", raw).strip("-").upper()
    return raw[:48]


def infer_product_class(*texts) -> Optional[str]:
    blob = " ".join(str(t) for t in texts if t)
    if not blob.strip():
        return None
    patterns = [
        (r"SDR\s*13\.?5", "SDR13.5"),
        (r"SDR\s*11", "SDR11"),
        (r"SCH(?:EDULE)?\s*80", "Sch 80"),
        (r"SCH(?:EDULE)?\s*40", "Sch 40"),
    ]
    for pattern, label in patterns:
        if re.search(pattern, blob, re.I):
            return label
    return None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def strip_mongo(doc: dict) -> dict:
    """Ensure Mongo _id is always a plain string; never leak ObjectId."""
    if not doc:
        return doc
    d = dict(doc)
    d.pop("_id", None)
    return d


# ---------- Models ----------

class RequesterRegisterIn(BaseModel):
    name: str
    phone: str
    address: str


class AdminRegisterIn(BaseModel):
    companyName: str
    gstin: str
    contactNumber: str
    passcode: str


class AdminLoginIn(BaseModel):
    contactNumber: str
    passcode: str


class PartnerIn(BaseModel):
    name: str
    phone: str
    address: str = ""
    businessName: str = ""
    pincode: str = ""
    city: str = ""
    area: str = ""
    salesManager: str = ""
    documents: List[str] = []


class PartnerLoginIn(BaseModel):
    phone: str
    passcode: str


class PartnerRegisterIn(PartnerIn):
    passcode: str = Field(min_length=4)


class PartnerReviewIn(BaseModel):
    approved: bool
    locationVerified: bool = False
    rejectionReason: Optional[str] = None


class TeamUserIn(BaseModel):
    name: str
    contactNumber: str
    role: str = Field(default="staff", pattern="^(admin|store_manager|staff)$")
    passcode: str
    permissions: List[str] = []


class TeamUserUpdateIn(BaseModel):
    name: str
    contactNumber: str
    role: str = Field(pattern="^(admin|store_manager|staff)$")
    isActive: bool
    permissions: List[str] = []


class CatalogItemIn(BaseModel):
    name: str
    category: str
    unit: str
    standardRate: float
    productCode: Optional[str] = None
    productName: Optional[str] = None
    type: Optional[str] = None
    productClass: Optional[str] = None
    productGroup: Optional[str] = None
    size: Optional[str] = None
    sizeMm: Optional[float] = None
    sizeInch: Optional[str] = None
    sizeCm: Optional[float] = None
    length: Optional[str] = None
    brand: Optional[str] = None
    brandId: Optional[str] = None
    subcategory: Optional[str] = None
    subcategoryId: Optional[str] = None
    aliases: List[str] = []
    multilingualNames: dict[str, str] = {}
    displaySequence: int = 0
    reorderLevel: float = 0
    regularDiscount: float = 0
    productGroupIds: List[str] = []
    imageUrl: Optional[str] = None
    imageName: Optional[str] = None
    stdPkg: Optional[float] = None
    mrp: Optional[float] = None
    sellingPrice: Optional[float] = None
    purchasePrice: Optional[float] = None
    discount: Optional[float] = None
    stock: Optional[float] = None
    isActive: bool = True

    @field_validator("sizeMm", "sizeCm", mode="before")
    @classmethod
    def coerce_size_mm(cls, value):
        return parse_size_mm(value)


class CategoryIn(BaseModel):
    name: str
    imageUrl: Optional[str] = None


class CategoryUpdateIn(BaseModel):
    name: str
    isActive: bool
    imageUrl: Optional[str] = None


class BrandIn(BaseModel):
    name: str
    logoUrl: Optional[str] = None


class BrandUpdateIn(BaseModel):
    name: str
    isActive: bool
    logoUrl: Optional[str] = None


class ProductGroupIn(BaseModel):
    name: str
    productIds: List[str]


class RackIn(BaseModel):
    name: str
    rows: int
    columns: int


class RackAssignmentIn(BaseModel):
    productId: str
    slotCode: str


class PurchaseLineIn(BaseModel):
    productCode: str
    quantity: float
    listPrice: float
    purchaseDiscount: float = 0
    rackId: Optional[str] = None
    rackSlot: Optional[str] = None


class PurchaseIn(BaseModel):
    lines: List[PurchaseLineIn]


class RfqLineIn(BaseModel):
    productCode: str
    quantity: float


class RfqIn(BaseModel):
    partnerId: str
    lines: List[RfqLineIn]
    deliveryMode: str = Field(default="storePickup", pattern="^(storePickup|homeDelivery)$")
    scheduledAt: Optional[str] = None


class RfqApprovalIn(BaseModel):
    approved: bool
    specialDiscountPercent: float = 0
    deliveryMode: Optional[str] = Field(default=None, pattern="^(storePickup|homeDelivery)$")
    scheduledAt: Optional[str] = None


class DispatchLineIn(BaseModel):
    productCode: str
    quantity: float


class DispatchIn(BaseModel):
    lines: List[DispatchLineIn]
    sourceRfqId: Optional[str] = None
    customerName: Optional[str] = None
    customerPhone: Optional[str] = None


class SubcategoryIn(BaseModel):
    name: str
    categoryId: str


class SubcategoryUpdateIn(BaseModel):
    name: str
    categoryId: str


class SubcategoryImportRow(BaseModel):
    name: str
    categoryId: Optional[str] = None
    category: Optional[str] = None


class SubcategoryImportIn(BaseModel):
    items: List[SubcategoryImportRow]


class ImportItem(BaseModel):
    name: str
    category: Optional[str] = None
    unit: str
    standardRate: float
    type: Optional[str] = None
    productClass: Optional[str] = None
    productGroup: Optional[str] = None
    brand: Optional[str] = None
    productName: Optional[str] = None
    subcategory: Optional[str] = None
    size: Optional[str] = None
    sizeMm: Optional[float] = None
    sizeCm: Optional[float] = None
    sizeInch: Optional[str] = None
    productCode: Optional[str] = None
    length: Optional[str] = None
    stdPkg: Optional[float] = None
    mrp: Optional[float] = None
    sellingPrice: Optional[float] = None
    purchasePrice: Optional[float] = None
    discount: Optional[float] = None
    stock: Optional[float] = None
    imageUrl: Optional[str] = None
    isActive: bool = True

    @field_validator("sizeMm", "sizeCm", mode="before")
    @classmethod
    def coerce_import_size_mm(cls, value):
        return parse_size_mm(value)

    @field_validator("discount", mode="before")
    @classmethod
    def coerce_import_discount_percent(cls, value):
        if value is None or value == "":
            return None
        try:
            n = float(value)
        except (TypeError, ValueError):
            return value
        if 0 < n < 1:
            return round(n * 100, 4)
        return n


class CatalogPricingIn(BaseModel):
    mrp: Optional[float] = None
    sellingPrice: Optional[float] = None
    discount: Optional[float] = None
    purchasePrice: Optional[float] = None
    stock: Optional[float] = None


class CatalogBulkPricingIn(BaseModel):
    itemIds: List[str]
    mrp: Optional[float] = None
    discount: Optional[float] = None
    stock: Optional[float] = None


class CatalogImportIn(BaseModel):
    items: List[ImportItem]
    categoryMode: str = Field(..., pattern="^(fromCsv|overrideExisting|overrideNew)$")
    overrideCategory: Optional[str] = ""
    replaceExisting: bool = False


class MasterImportRow(BaseModel):
    name: str
    unit: str = "pcs"
    category: Optional[str] = None
    type: Optional[str] = None
    productClass: Optional[str] = None
    productGroup: Optional[str] = None
    brand: Optional[str] = None
    productName: Optional[str] = None
    subcategory: Optional[str] = None
    size: Optional[str] = None
    sizeMm: Optional[float] = None
    sizeCm: Optional[float] = None
    sizeInch: Optional[str] = None
    productCode: Optional[str] = None
    length: Optional[str] = None
    imageUrl: Optional[str] = None
    isActive: bool = True

    @field_validator("sizeMm", "sizeCm", mode="before")
    @classmethod
    def coerce_master_size(cls, value):
        return parse_size_mm(value)


class CatalogMasterImportIn(BaseModel):
    items: List[MasterImportRow]
    categoryMode: str = Field(default="fromCsv", pattern="^(fromCsv|overrideExisting|overrideNew)$")
    overrideCategory: Optional[str] = ""


class PricingImportRow(BaseModel):
    productCode: str
    mrp: Optional[float] = None
    discount: Optional[float] = None
    sellingPrice: Optional[float] = None

    @field_validator("discount", mode="before")
    @classmethod
    def coerce_pricing_discount(cls, value):
        if value is None or value == "":
            return None
        try:
            n = float(value)
        except (TypeError, ValueError):
            return value
        if 0 < n < 1:
            return round(n * 100, 4)
        return n


class CatalogPricingImportIn(BaseModel):
    items: List[PricingImportRow]


class StockImportRow(BaseModel):
    productCode: str
    stock: float


class CatalogStockImportIn(BaseModel):
    items: List[StockImportRow]


class MoneyConfigIn(BaseModel):
    discountPercent: float = 0
    gstPercent: float = 0
    specialDiscountPercent: float = 0
    showDiscount: bool = True
    showGst: bool = True
    showSpecialDiscount: bool = False


ROLE_PERMISSIONS = {
    "admin": ["all"],
    "store_manager": ["catalog:read", "purchase:write", "inventory:read", "rfq:approve", "dispatch:write"],
    "staff": ["catalog:read", "inventory:read"],
}


# ---------- Auth ----------

@api.post("/auth/requester/register")
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


@api.post("/auth/admin/register")
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


@api.post("/auth/admin/login")
async def admin_login(body: AdminLoginIn):
    user = await db.users.find_one({"role": "admin", "contactNumber": body.contactNumber})
    if not user:
        return JSONResponse(status_code=401, content=envelope(None, False, "Invalid credentials"))
    if not bcrypt.checkpw(body.passcode.encode(), user["passcodeHash"].encode()):
        return JSONResponse(status_code=401, content=envelope(None, False, "Invalid credentials"))
    token = new_id()  # simple opaque token (mirror; teammate backend may use JWT)
    await db.admin_tokens.insert_one({"token": token, "adminId": user["id"], "createdAt": now_iso()})
    return envelope({
        "token": token,
        "adminId": user["id"],
        "companyName": user.get("companyName"),
        "contactNumber": user.get("contactNumber"),
        "gstin": user.get("gstin"),
    })


@api.post("/auth/partner/register")
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


@api.post("/auth/partner/login")
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


@api.get("/auth/partner/me")
async def partner_app_me(authorization: Optional[str] = Header(default=None)):
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


def public_partner(partner: dict) -> dict:
    result = dict(partner)
    result.pop("_id", None)
    result.pop("passcodeHash", None)
    return result


class AdminPasscodeIn(BaseModel):
    contactNumber: str
    passcode: str


async def verify_admin_passcode(body: AdminPasscodeIn) -> bool:
    user = await db.users.find_one({"role": "admin", "contactNumber": body.contactNumber.strip()})
    if not user or not user.get("passcodeHash"):
        return False
    try:
        return bcrypt.checkpw(body.passcode.encode(), user["passcodeHash"].encode())
    except ValueError:
        return False


def passcode_denied():
    return JSONResponse(status_code=401, content=envelope(None, False, "Invalid admin contact or passcode"))


class CatalogFieldPurgeIn(AdminPasscodeIn):
    field: str = Field(..., pattern="^(type|productClass|productGroup)$")
    value: str


# ---------- Referral Partners and KYC ----------

@api.post("/partners/register")
async def register_partner(body: PartnerIn):
    if not body.name.strip() or not body.phone.strip():
        return JSONResponse(status_code=400, content=envelope(None, False, "Name and phone are required"))
    if await db.partners.find_one({"phone": body.phone.strip()}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Partner phone already registered"))
    partner = {"id": new_id(), **body.model_dump(), "name": body.name.strip(), "phone": body.phone.strip(), "kycStatus": "pending", "locationVerified": False, "appActive": False, "kycHistory": [], "rewardPoints": None, "createdAt": now_iso(), "updatedAt": now_iso()}
    await db.partners.insert_one(partner.copy())
    return envelope(public_partner(partner))


@api.post("/partners")
async def create_partner_direct(body: PartnerIn):
    result = await register_partner(body)
    if isinstance(result, JSONResponse):
        return result
    partner = result["data"]
    reviewed_at = now_iso()
    await db.partners.update_one({"id": partner["id"]}, {"$set": {"kycStatus": "approved", "locationVerified": True, "appActive": True, "approvedAt": reviewed_at, "approvedBy": "admin"}, "$push": {"kycHistory": {"status": "approved", "reviewedBy": "admin", "reviewedAt": reviewed_at, "locationVerified": True}}})
    return envelope(public_partner(await db.partners.find_one({"id": partner["id"]})))


@api.get("/partners")
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


@api.get("/partners/{partner_id}")
async def get_partner(partner_id: str):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner: return JSONResponse(status_code=404, content=envelope(None, False, "Partner not found"))
    partner["rewardBalance"] = await reward_balance(partner_id)
    partner["rfqCount"] = await db.rfqs.count_documents({"partnerId": partner_id})
    approved = [rfq async for rfq in db.rfqs.find({"partnerId": partner_id, "status": {"$in": ["approved", "dispatched"]}}, {"_id": 0, "grandTotal": 1})]
    partner["salesPerformance"] = {"approvedCount": len(approved), "approvedValue": sum(rfq.get("grandTotal", 0) for rfq in approved)}
    partner["purchaseHistory"] = [purchase async for purchase in db.purchases.find({"partnerId": partner_id}, {"_id": 0}).sort("createdAt", -1)]
    return envelope(partner)


@api.put("/partners/{partner_id}/kyc")
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


@api.get("/team/users")
async def list_team_users():
    cursor = db.users.find({"role": {"$in": ["admin", "store_manager", "staff"]}}, {"_id": 0}).sort("name", 1)
    return envelope([public_team_user(user) async for user in cursor])


@api.post("/team/users")
async def create_team_user(body: TeamUserIn):
    contact = body.contactNumber.strip()
    if not body.name.strip() or not contact or len(body.passcode) < 4:
        return JSONResponse(status_code=400, content=envelope(None, False, "Name, contact number, and a 4-character passcode are required"))
    if await db.users.find_one({"contactNumber": contact}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Contact number already registered"))
    user = {"id": new_id(), "name": body.name.strip(), "contactNumber": contact, "role": body.role, "permissions": body.permissions or ROLE_PERMISSIONS[body.role], "isActive": True, "passcodeHash": bcrypt.hashpw(body.passcode.encode(), bcrypt.gensalt()).decode(), "createdAt": now_iso(), "updatedAt": now_iso()}
    await db.users.insert_one(user.copy())
    return envelope(public_team_user(user))


@api.put("/team/users/{user_id}")
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


# ---------- MongoDB indexes ----------

async def ensure_indexes() -> None:
    """
    Create indexes for fields used in find/sort/count (not regex $or scans).
    Idempotent: safe on every startup; Mongo skips unchanged definitions.
    """
    try:
        await db.command("ping")
    except Exception as exc:
        logger.warning("MongoDB unavailable; skipping index ensure: %s", exc)
        return

    index_specs: list[tuple[Any, list[tuple[str, int]], dict]] = [
        (db.users, [("id", 1)], {"unique": True, "name": "users_id_uq"}),
        (db.users, [("role", 1), ("contactNumber", 1)], {"name": "users_role_contact"}),
        (db.users, [("contactNumber", 1)], {"name": "users_contact"}),
        (db.users, [("role", 1), ("name", 1)], {"name": "users_role_name_sort"}),
        (db.admin_tokens, [("token", 1)], {"unique": True, "name": "admin_tokens_token_uq"}),
        (db.admin_tokens, [("adminId", 1)], {"name": "admin_tokens_adminId"}),
        (db.partner_tokens, [("token", 1)], {"unique": True, "name": "partner_tokens_token_uq"}),
        (db.partner_tokens, [("partnerId", 1)], {"name": "partner_tokens_partnerId"}),
        (db.partners, [("id", 1)], {"unique": True, "name": "partners_id_uq"}),
        (db.partners, [("phone", 1)], {"unique": True, "sparse": True, "name": "partners_phone_uq"}),
        (db.partners, [("kycStatus", 1), ("name", 1)], {"name": "partners_kyc_name_sort"}),
        (db.partners, [("salesManager", 1)], {"name": "partners_salesManager"}),
        (db.partners, [("name", 1)], {"name": "partners_name_sort"}),
        (db.categories, [("id", 1)], {"unique": True, "name": "categories_id_uq"}),
        (db.categories, [("name", 1)], {"name": "categories_name"}),
        (db.subcategories, [("id", 1)], {"unique": True, "name": "subcategories_id_uq"}),
        (db.subcategories, [("categoryId", 1), ("name", 1)], {"name": "subcategories_cat_name"}),
        (db.subcategories, [("categoryId", 1)], {"name": "subcategories_categoryId"}),
        (db.brands, [("id", 1)], {"unique": True, "name": "brands_id_uq"}),
        (db.brands, [("name", 1)], {"name": "brands_name"}),
        (db.product_groups, [("id", 1)], {"unique": True, "name": "product_groups_id_uq"}),
        (db.product_groups, [("name", 1)], {"name": "product_groups_name"}),
        (db.racks, [("id", 1)], {"unique": True, "name": "racks_id_uq"}),
        (db.racks, [("name", 1)], {"name": "racks_name"}),
        (db.catalog, [("id", 1)], {"unique": True, "name": "catalog_id_uq"}),
        (db.catalog, [("productCode", 1)], {"unique": True, "sparse": True, "name": "catalog_productCode_uq"}),
        (db.catalog, [("category", 1), ("name", 1)], {"name": "catalog_category_name_sort"}),
        (db.catalog, [("brandId", 1)], {"name": "catalog_brandId"}),
        (db.catalog, [("brand", 1)], {"name": "catalog_brand"}),
        (db.catalog, [("rackId", 1), ("name", 1)], {"name": "catalog_rack_name_sort"}),
        (db.catalog, [("productGroupIds", 1)], {"name": "catalog_productGroupIds"}),
        (db.catalog, [("type", 1)], {"name": "catalog_type"}),
        (db.catalog, [("productGroup", 1)], {"name": "catalog_productGroup"}),
        (db.catalog, [("subcategory", 1)], {"name": "catalog_subcategory"}),
        (db.catalog, [("productClass", 1)], {"name": "catalog_productClass"}),
        (db.catalog, [("sizeMm", 1)], {"name": "catalog_sizeMm"}),
        (db.catalog, [("name", 1)], {"name": "catalog_name_sort"}),
        (db.catalog, [("stock", 1), ("reorderLevel", 1)], {"name": "catalog_stock_reorder"}),
        (db.pricing, [("productCode", 1)], {"unique": True, "name": "pricing_productCode_uq"}),
        (db.pricing_history, [("productCode", 1), ("updatedAt", -1)], {"name": "pricing_history_code_updated"}),
        (db.purchases, [("createdAt", -1)], {"name": "purchases_createdAt"}),
        (db.purchases, [("partnerId", 1), ("createdAt", -1)], {"name": "purchases_partner_created"}),
        (db.rfqs, [("id", 1)], {"unique": True, "name": "rfqs_id_uq"}),
        (db.rfqs, [("partnerId", 1)], {"name": "rfqs_partnerId"}),
        (db.rfqs, [("partnerId", 1), ("status", 1)], {"name": "rfqs_partner_status"}),
        (db.rfqs, [("status", 1), ("createdAt", -1)], {"name": "rfqs_status_created"}),
        (db.rfqs, [("createdAt", -1)], {"name": "rfqs_createdAt"}),
        (db.dispatches, [("createdAt", -1)], {"name": "dispatches_createdAt"}),
        (db.reward_ledger, [("requesterId", 1), ("createdAt", -1)], {"name": "reward_ledger_requester_created"}),
        (db.reward_ledger, [("requesterId", 1), ("type", 1)], {"name": "reward_ledger_requester_type"}),
        (db.reward_ledger, [("quotationId", 1), ("type", 1)], {"name": "reward_ledger_quotation_type"}),
        (db.money_config, [("adminId", 1)], {"unique": True, "name": "money_config_adminId_uq"}),
    ]
    for collection, keys, options in index_specs:
        try:
            await collection.create_index(keys, **options)
        except Exception as exc:
            logger.warning("Index %s on %s failed: %s", options.get("name"), collection.name, exc)
    logger.info("MongoDB indexes ensured (%d definitions)", len(index_specs))


# ---------- Categories ----------

DEFAULT_CATEGORIES = []


async def ensure_default_categories():
    return


async def reset_catalog_tree():
    """Wipe products and the tree the sheet rebuilds: categories, subcategories, groups, prices."""
    catalog = await db.catalog.delete_many({})
    categories = await db.categories.delete_many({})
    subcategories = await db.subcategories.delete_many({})
    groups = await db.product_groups.delete_many({})
    brands = await db.brands.delete_many({})
    pricing = await db.pricing.delete_many({})
    history = await db.pricing_history.delete_many({})
    async for rack in db.racks.find({}):
        slots = rack.get("slots") or []
        dirty = False
        for slot in slots:
            if slot.get("productId"):
                slot["productId"] = None
                dirty = True
        if dirty:
            await db.racks.update_one({"id": rack["id"]}, {"$set": {"slots": slots}})
    return {
        "catalog": catalog.deleted_count,
        "categories": categories.deleted_count,
        "subcategories": subcategories.deleted_count,
        "productGroups": groups.deleted_count,
        "brands": brands.deleted_count,
        "pricing": pricing.deleted_count,
        "pricingHistory": history.deleted_count,
    }


@api.get("/categories")
async def list_categories():
    await ensure_default_categories()
    cursor = db.categories.find({}, {"_id": 0}).sort("name", 1)
    items = []
    async for category in cursor:
        category.setdefault("isActive", True)
        category["productCount"] = await db.catalog.count_documents({"category": category["name"]})
        items.append(category)
    return envelope(items)


@api.post("/categories")
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


@api.put("/categories/{category_id}")
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


@api.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    current = await db.categories.find_one({"id": category_id})
    if not current:
        return JSONResponse(status_code=404, content=envelope(None, False, "Category not found"))
    await db.subcategories.delete_many({"categoryId": category_id})
    result = await db.categories.delete_one({"id": category_id})
    return envelope({"deleted": True, "id": category_id, "name": current.get("name")})


@api.post("/categories/{category_id}/delete-cascade")
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

@api.get("/brands")
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


@api.post("/brands")
async def create_brand(body: BrandIn):
    name = body.name.strip()
    if not name:
        return JSONResponse(status_code=400, content=envelope(None, False, "Name required"))
    if await db.brands.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Brand name already exists"))
    doc = {"id": new_id(), "name": name, "isActive": True, "productCount": 0, "logoUrl": (body.logoUrl or "").strip() or None, "createdAt": now_iso(), "updatedAt": now_iso()}
    await db.brands.insert_one(doc.copy())
    return envelope(doc)


@api.put("/brands/{brand_id}")
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


@api.post("/brands/{brand_id}/delete-cascade")
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


# ---------- Product Groups ----------

async def valid_product_ids(product_ids: List[str]) -> List[str]:
    unique_ids = list(dict.fromkeys(product_ids))
    if len(unique_ids) < 2:
        return []
    count = await db.catalog.count_documents({"id": {"$in": unique_ids}})
    return unique_ids if count == len(unique_ids) else []


@api.get("/product-groups")
async def list_product_groups():
    cursor = db.product_groups.find({}, {"_id": 0}).sort("name", 1)
    groups = []
    async for group in cursor:
        group["productCount"] = len(group.get("productIds", []))
        groups.append(group)
    return envelope(groups)


@api.post("/product-groups")
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


@api.put("/product-groups/{group_id}")
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


@api.delete("/product-groups/{group_id}")
async def delete_product_group(group_id: str):
    result = await db.product_groups.delete_one({"id": group_id})
    if result.deleted_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Product group not found"))
    await db.catalog.update_many({"productGroupIds": group_id}, {"$pull": {"productGroupIds": group_id}})
    return envelope({"deleted": True, "id": group_id})


@api.post("/product-groups/{group_id}/delete-cascade")
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


@api.get("/racks")
async def list_racks():
    cursor = db.racks.find({}, {"_id": 0}).sort("name", 1)
    return envelope([rack async for rack in cursor])


@api.post("/racks")
async def create_rack(body: RackIn):
    if not body.name.strip() or body.rows < 1 or body.rows > 26 or body.columns < 1 or body.columns > 100:
        return JSONResponse(status_code=400, content=envelope(None, False, "Rack needs a name and dimensions within 1-26 rows and 1-100 columns"))
    if await db.racks.find_one({"name": {"$regex": f"^{re.escape(body.name.strip())}$", "$options": "i"}}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Rack name already exists"))
    doc = {"id": new_id(), "name": body.name.strip(), "rows": body.rows, "columns": body.columns, "slots": rack_slots(body.rows, body.columns), "createdAt": now_iso()}
    await db.racks.insert_one(doc.copy())
    return envelope(doc)


@api.delete("/racks/{rack_id}")
async def delete_rack(rack_id: str):
    rack = await db.racks.find_one({"id": rack_id})
    if not rack:
        return JSONResponse(status_code=404, content=envelope(None, False, "Rack not found"))
    if any(slot.get("productId") for slot in rack.get("slots", [])):
        return JSONResponse(status_code=409, content=envelope(None, False, "Rack with assigned products cannot be deleted"))
    await db.racks.delete_one({"id": rack_id})
    return envelope({"deleted": True, "id": rack_id})


@api.put("/racks/{rack_id}/assign")
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


@api.get("/racks/{rack_id}/products")
async def rack_products(rack_id: str):
    if not await db.racks.find_one({"id": rack_id}):
        return JSONResponse(status_code=404, content=envelope(None, False, "Rack not found"))
    products = [product async for product in db.catalog.find({"rackId": rack_id}, {"_id": 0}).sort("name", 1)]
    return envelope(products)


# ---------- Purchases and Stock ----------

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


@api.get("/purchases")
async def list_purchases():
    cursor = db.purchases.find({}, {"_id": 0}).sort("createdAt", -1)
    return envelope([purchase async for purchase in cursor])


@api.post("/purchases")
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


@api.post("/purchases/import")
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


async def reward_balance(requester_id: str) -> int:
    earned = await db.reward_ledger.aggregate([
        {"$match": {"requesterId": requester_id, "type": "earned"}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}}},
    ]).to_list(length=1)
    redeemed = await db.reward_ledger.aggregate([
        {"$match": {"requesterId": requester_id, "type": "redeemed"}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}}},
    ]).to_list(length=1)
    return int((earned[0]["total"] if earned else 0) - (redeemed[0]["total"] if redeemed else 0))


def rfq_event(action: str, actor: str, details: dict):
    return {"action": action, "actor": actor, "details": details, "at": now_iso()}


@api.get("/rfqs")
async def list_rfqs(partner_id: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if partner_id: query["partnerId"] = partner_id
    if status: query["status"] = status
    if search and search.strip(): query["$or"] = [{"partnerId": {"$regex": re.escape(search.strip()), "$options": "i"}}, {"lines.productCode": {"$regex": re.escape(search.strip()), "$options": "i"}}, {"lines.productName": {"$regex": re.escape(search.strip()), "$options": "i"}}]
    cursor = db.rfqs.find(query, {"_id": 0}).sort("createdAt", -1)
    return envelope([rfq async for rfq in cursor])


@api.post("/rfqs")
async def create_rfq(body: RfqIn):
    errors, lines = await prepare_rfq_lines(body.lines)
    if errors or not body.partnerId.strip() or not lines:
        return JSONResponse(status_code=400, content=envelope({"errors": errors or ["Partner and at least one valid line are required"]}, False, "RFQ validation failed"))
    grand_total = sum(line["quantity"] * line["unitPrice"] for line in lines)
    doc = {"id": new_id(), "partnerId": body.partnerId.strip(), "lines": lines, "status": "pending", "grandTotal": grand_total, "specialDiscountPercent": 0, "rewardPoints": 0, "deliveryMode": body.deliveryMode, "scheduledAt": body.scheduledAt, "createdAt": now_iso(), "updatedAt": now_iso(), "history": [rfq_event("created", "system", {"lineCount": len(lines)})]}
    await db.rfqs.insert_one(doc.copy())
    return envelope(doc)


@api.put("/rfqs/{rfq_id}")
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


@api.post("/rfqs/{rfq_id}/approve")
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


@api.get("/partners/{partner_id}/rewards")
async def partner_rewards(partner_id: str):
    entries = [entry async for entry in db.reward_ledger.find({"requesterId": partner_id}, {"_id": 0}).sort("createdAt", -1)]
    return envelope({"balance": await reward_balance(partner_id), "entries": entries})


@api.get("/rfqs/{rfq_id}/history")
async def rfq_history(rfq_id: str):
    rfq = await db.rfqs.find_one({"id": rfq_id}, {"_id": 0, "history": 1})
    if not rfq: return JSONResponse(status_code=404, content=envelope(None, False, "RFQ not found"))
    return envelope(rfq.get("history", []))


# ---------- Dispatch and Billing ----------

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


@api.get("/dispatches")
async def list_dispatches():
    cursor = db.dispatches.find({}, {"_id": 0}).sort("createdAt", -1)
    return envelope([dispatch async for dispatch in cursor])


@api.post("/dispatches")
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

@api.get("/inventory")
async def inventory_view():
    products = []
    async for product in db.catalog.find({}, {"_id": 0}).sort("name", 1):
        stock = float(product.get("stock", 0))
        products.append({"productId": product["id"], "productCode": product.get("productCode"), "name": product["name"], "category": product.get("category"), "brand": product.get("brand"), "stock": stock, "reorderLevel": float(product.get("reorderLevel", 0)), "unitCost": float(product.get("lastPurchasePrice", product.get("standardRate", 0))), "valuation": stock * float(product.get("lastPurchasePrice", product.get("standardRate", 0))), "rackName": product.get("rackName"), "rackSlot": product.get("rackSlot")})
    return envelope(products)


@api.get("/inventory/low-stock")
async def low_stock_inventory():
    data = (await inventory_view())["data"]
    return envelope([item for item in data if item["stock"] <= item["reorderLevel"]])


@api.get("/inventory/transactions")
async def inventory_transactions():
    entries = []
    purchases = [purchase async for purchase in db.purchases.find({}, {"_id": 0})]
    dispatches = [dispatch async for dispatch in db.dispatches.find({}, {"_id": 0})]
    for transaction in purchases:
        for line in transaction.get("lines", []): entries.append({"type": "in", "referenceId": transaction["id"], "productCode": line["productCode"], "productName": line["productName"], "quantity": line["quantity"], "at": transaction["createdAt"]})
    for transaction in dispatches:
        for line in transaction.get("lines", []): entries.append({"type": "out", "referenceId": transaction["id"], "productCode": line["productCode"], "productName": line["productName"], "quantity": line["quantity"], "at": transaction["createdAt"]})
    return envelope(sorted(entries, key=lambda entry: entry["at"], reverse=True))


# ---------- Subcategories ----------

def subcategory_response(doc: dict, product_count: int = 0) -> dict:
    result = strip_mongo(doc)
    result["productCount"] = product_count
    return result


async def resolve_category(category_id: str):
    return await db.categories.find_one({"id": category_id})


@api.get("/subcategories")
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


@api.post("/subcategories")
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


@api.put("/subcategories/{subcategory_id}")
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


@api.delete("/subcategories/{subcategory_id}")
async def delete_subcategory(subcategory_id: str):
    result = await db.subcategories.delete_one({"id": subcategory_id})
    if result.deleted_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Subcategory not found"))
    return envelope({"deleted": True, "id": subcategory_id})


@api.post("/subcategories/{subcategory_id}/delete-cascade")
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


@api.post("/subcategories/import")
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


# ---------- Catalog ----------

@api.get("/catalog")
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
        items.append(item)
    return envelope(items)


@api.post("/catalog")
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
        "type": body.type,
        "productClass": body.productClass,
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
    return envelope({k: v for k, v in doc.items()})


@api.put("/catalog/{item_id}")
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
    if body.stock is not None:
        updates["stock"] = body.stock
    result = await db.catalog.update_one({"id": item_id}, {"$set": updates})
    if result.matched_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Item not found"))
    if not await db.categories.find_one({"name": updates["category"]}):
        await db.categories.insert_one({"id": new_id(), "name": updates["category"], "isDefault": False})
    doc = await db.catalog.find_one({"id": item_id}, {"_id": 0})
    await upsert_pricing(doc.get("productCode"), body.mrp, selling, body.purchasePrice, body.discount)
    return envelope(doc)


@api.patch("/catalog/{item_id}/pricing")
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


@api.post("/catalog/pricing-bulk")
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


@api.delete("/catalog/{item_id}")
async def delete_catalog(item_id: str):
    result = await db.catalog.delete_one({"id": item_id})
    if result.deleted_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Item not found"))
    return envelope({"deleted": True, "id": item_id})


@api.post("/catalog/{item_id}/delete-secured")
async def delete_catalog_secured(item_id: str, body: AdminPasscodeIn):
    if not await verify_admin_passcode(body):
        return passcode_denied()
    result = await db.catalog.delete_one({"id": item_id})
    if result.deleted_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Item not found"))
    return envelope({"deleted": True, "id": item_id})


@api.post("/catalog/purge-by-field")
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


@api.delete("/catalog")
async def clear_catalog():
    deleted = await reset_catalog_tree()
    return envelope({"deleted": deleted["catalog"], **deleted})


@api.post("/catalog/wipe-all")
async def wipe_catalog_all(body: AdminPasscodeIn):
    if not await verify_admin_passcode(body):
        return passcode_denied()
    deleted = await reset_catalog_tree()
    return envelope(deleted)


@api.post("/catalog/import")
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
            "type": it.type,
            "productClass": (it.productClass or "").strip() or infer_product_class(it.productClass, it.name, it.productName),
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
            selling = 0.0
            mrp = None
            discount = None
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
            "type": it.type,
            "productClass": (it.productClass or "").strip() or infer_product_class(it.productClass, it.name, it.productName),
            "subcategory": subcategory_doc["name"] if subcategory_doc else (existing.get("subcategory") if existing else None),
            "subcategoryId": subcategory_doc["id"] if subcategory_doc else (existing.get("subcategoryId") if existing else None),
            "productGroup": it.productGroup,
            "productGroupIds": group_ids,
            "size": it.size or (f"{it.sizeCm} cm" if it.sizeCm is not None else (str(it.sizeMm) if it.sizeMm is not None else None)),
            "sizeMm": it.sizeMm,
            "sizeCm": it.sizeCm,
            "sizeInch": it.sizeInch,
            "length": it.length,
            "stdPkg": existing.get("stdPkg") if existing else None,
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
            await upsert_pricing(doc["productCode"], None, 0, None, None)
        if it.productGroup and it.productGroup.strip():
            group = group_cache[it.productGroup.strip().lower()]
            ids = list(group.get("productIds") or [])
            if doc["id"] not in ids:
                ids.append(doc["id"])
                group["productIds"] = ids
        if cat not in categories_created and not await db.categories.find_one({"name": cat}):
            await db.categories.insert_one({"id": new_id(), "name": cat, "isDefault": False, "isActive": True})
            categories_created.add(cat)

    for group in group_cache.values():
        ids = list(dict.fromkeys(group.get("productIds") or []))
        await db.product_groups.update_one({"id": group["id"]}, {"$set": {"productIds": ids, "productCount": len(ids)}})

    return {"inserted": inserted, "updated": updated, "skipped": skipped, "categoryMode": mode}


@api.post("/catalog/import/master")
async def import_catalog_master(body: CatalogMasterImportIn):
    result = await _run_master_catalog_import(body)
    return envelope(result)


@api.post("/catalog/import/pricing")
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


@api.post("/catalog/import/stock")
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


# ---------- Money Config ----------

@api.get("/money-config/{admin_id}")
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


@api.put("/money-config/{admin_id}")
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


@api.get("/dashboard/snapshot")
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


# ---------- Health ----------

@api.get("/")
async def root():
    return envelope({"service": "quotation-mirror", "ok": True})


def _blocked_host(host: str) -> bool:
    if not host:
        return True
    h = host.lower().strip("[]")
    if h in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        return True
    try:
        ip = ipaddress.ip_address(h)
        return bool(ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved)
    except ValueError:
        return h.endswith(".local") or h.endswith(".internal")


@api.get("/media/proxy")
async def media_proxy(url: str):
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or _blocked_host(parsed.hostname or ""):
        return JSONResponse(status_code=400, content=envelope(None, False, "Invalid image URL"))

    def fetch():
        r = requests.get(
            url,
            timeout=20,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
        )
        r.raise_for_status()
        return r.content, r.headers.get("Content-Type", "image/jpeg")

    try:
        content, ctype = await asyncio.to_thread(fetch)
    except Exception:
        return JSONResponse(status_code=404, content=envelope(None, False, "Image could not be loaded"))
    ctype = (ctype or "image/jpeg").split(";")[0].strip()
    if not ctype.startswith("image/"):
        if content[:3] == b"\xff\xd8\xff":
            ctype = "image/jpeg"
        elif content[:8] == b"\x89PNG\r\n\x1a\n":
            ctype = "image/png"
        elif content[:6] in (b"GIF87a", b"GIF89a"):
            ctype = "image/gif"
        else:
            return JSONResponse(status_code=404, content=envelope(None, False, "URL is not an image"))
    return Response(content=content, media_type=ctype, headers={"Cache-Control": "public, max-age=86400"})


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()
    await ensure_default_categories()
    logger.info("Quotation mirror backend started")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
