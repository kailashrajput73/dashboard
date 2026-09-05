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

from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Any, List, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
import bcrypt
import logging
import re

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

def envelope(data: Any = None, success: bool = True, error: Optional[str] = None):
    return {"success": success, "data": data, "error": error}


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
    productGroup: Optional[str] = None
    sizeMm: Optional[float] = None
    sizeInch: Optional[str] = None
    length: Optional[str] = None
    brand: Optional[str] = None
    brandId: Optional[str] = None
    subcategoryId: Optional[str] = None
    aliases: List[str] = []
    multilingualNames: dict[str, str] = {}
    displaySequence: int = 0
    reorderLevel: float = 0
    regularDiscount: float = 0
    productGroupIds: List[str] = []
    imageUrl: Optional[str] = None
    imageName: Optional[str] = None
    mrp: Optional[float] = None
    sellingPrice: Optional[float] = None
    purchasePrice: Optional[float] = None
    discount: Optional[float] = None
    isActive: bool = True


class CategoryIn(BaseModel):
    name: str


class CategoryUpdateIn(BaseModel):
    name: str
    isActive: bool


class BrandIn(BaseModel):
    name: str


class BrandUpdateIn(BaseModel):
    name: str
    isActive: bool


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
    productGroup: Optional[str] = None
    brand: Optional[str] = None
    productName: Optional[str] = None
    sizeMm: Optional[float] = None
    sizeInch: Optional[str] = None
    productCode: Optional[str] = None
    length: Optional[str] = None
    mrp: Optional[float] = None
    sellingPrice: Optional[float] = None
    purchasePrice: Optional[float] = None
    discount: Optional[float] = None
    imageUrl: Optional[str] = None
    isActive: bool = True


class CatalogImportIn(BaseModel):
    items: List[ImportItem]
    categoryMode: str = Field(..., pattern="^(fromCsv|overrideExisting|overrideNew)$")
    overrideCategory: Optional[str] = ""


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


# ---------- Referral Partners and KYC ----------

def public_partner(partner: dict) -> dict:
    result = dict(partner)
    result.pop("_id", None)
    return result


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


# ---------- Categories ----------

DEFAULT_CATEGORIES = ["General", "Materials", "Labor", "Services", "Equipment"]


async def ensure_default_categories():
    count = await db.categories.count_documents({})
    if count == 0:
        for name in DEFAULT_CATEGORIES:
            await db.categories.insert_one({
                "id": new_id(),
                "name": name,
                "isDefault": True,
                "isActive": True,
            })


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
    doc = {"id": new_id(), "name": name, "isDefault": False, "isActive": True, "productCount": 0}
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
    result = await db.categories.update_one(
        {"id": category_id},
        {"$set": {"name": name, "isActive": body.isActive}},
    )
    if current["name"] != name:
        await db.catalog.update_many({"category": current["name"]}, {"$set": {"category": name}})
        await db.subcategories.update_many({"categoryId": category_id}, {"$set": {"category": name}})
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    category.setdefault("isActive", True)
    category["productCount"] = await db.catalog.count_documents({"category": category["name"]})
    return envelope(category)


# ---------- Brands ----------

@api.get("/brands")
async def list_brands():
    cursor = db.brands.find({}, {"_id": 0}).sort("name", 1)
    items = []
    async for brand in cursor:
        brand.setdefault("isActive", True)
        brand["productCount"] = await db.catalog.count_documents({"brandId": brand["id"]})
        items.append(brand)
    return envelope(items)


@api.post("/brands")
async def create_brand(body: BrandIn):
    name = body.name.strip()
    if not name:
        return JSONResponse(status_code=400, content=envelope(None, False, "Name required"))
    if await db.brands.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
        return JSONResponse(status_code=409, content=envelope(None, False, "Brand name already exists"))
    doc = {"id": new_id(), "name": name, "isActive": True, "productCount": 0, "createdAt": now_iso(), "updatedAt": now_iso()}
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
    await db.brands.update_one({"id": brand_id}, {"$set": {"name": name, "isActive": body.isActive, "updatedAt": now_iso()}})
    if current["name"] != name:
        await db.catalog.update_many({"brandId": brand_id}, {"$set": {"brand": name}})
    brand = await db.brands.find_one({"id": brand_id}, {"_id": 0})
    brand["productCount"] = await db.catalog.count_documents({"brandId": brand_id})
    return envelope(brand)


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
    history = current.get("history", []) + [rfq_event("updated", "admin", {"previousLines": current.get("lines", []), "newLines": lines})]
    await db.rfqs.update_one({"id": rfq_id}, {"$set": {"partnerId": body.partnerId.strip(), "lines": lines, "deliveryMode": body.deliveryMode, "scheduledAt": body.scheduledAt, "updatedAt": now_iso(), "history": history}})
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
        items.append(subcategory_response(subcategory))
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
        q["type"] = type
    if brand:
        q["brand"] = brand
    if product_group:
        q["productGroup"] = product_group
    if size_mm is not None:
        q["sizeMm"] = size_mm
    cursor = db.catalog.find(q, {"_id": 0}).sort("name", 1)
    items = []
    async for catalog_item in cursor:
        item = dict(catalog_item)
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
    doc = {
        "id": new_id(),
        "name": body.name.strip(),
        "category": body.category.strip(),
        "unit": body.unit.strip(),
        "standardRate": float(body.sellingPrice if body.sellingPrice is not None else body.standardRate),
        "brandId": brand["id"] if brand else None,
        "brand": brand["name"] if brand else None,
        "productCode": product_code,
        "productName": body.productName or body.name.strip(),
        "type": body.type,
        "productGroup": body.productGroup,
        "sizeMm": body.sizeMm,
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
        "isActive": body.isActive,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    doc["qrCode"] = doc["productCode"]
    await db.catalog.insert_one(doc.copy())
    if any(value is not None for value in (body.mrp, body.sellingPrice, body.purchasePrice, body.discount)):
        await db.pricing_history.insert_one({
            "productCode": product_code, "mrp": body.mrp,
            "sellingPrice": body.sellingPrice if body.sellingPrice is not None else body.standardRate,
            "purchasePrice": body.purchasePrice, "discount": body.discount, "updatedAt": now_iso(),
        })
        await db.pricing.update_one(
            {"productCode": product_code},
            {"$set": {
                "productCode": product_code,
                "mrp": body.mrp,
                "sellingPrice": body.sellingPrice if body.sellingPrice is not None else body.standardRate,
                "purchasePrice": body.purchasePrice,
                "discount": body.discount,
                "updatedAt": now_iso(),
            }},
            upsert=True,
        )
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
    updates = {
        "name": body.name.strip(),
        "category": body.category.strip(),
        "unit": body.unit.strip(),
        "standardRate": float(body.sellingPrice if body.sellingPrice is not None else body.standardRate),
        "brandId": brand["id"] if brand else None,
        "brand": brand["name"] if brand else None,
        "productName": body.productName or body.name.strip(),
        "type": body.type,
        "productGroup": body.productGroup,
        "sizeMm": body.sizeMm,
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
        "isActive": body.isActive,
        "updatedAt": now_iso(),
    }
    result = await db.catalog.update_one({"id": item_id}, {"$set": updates})
    if result.matched_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Item not found"))
    if not await db.categories.find_one({"name": updates["category"]}):
        await db.categories.insert_one({"id": new_id(), "name": updates["category"], "isDefault": False})
    doc = await db.catalog.find_one({"id": item_id}, {"_id": 0})
    if any(value is not None for value in (body.mrp, body.sellingPrice, body.purchasePrice, body.discount)):
        product_code = doc.get("productCode")
        await db.pricing_history.insert_one({
            "productCode": product_code, "mrp": body.mrp,
            "sellingPrice": body.sellingPrice if body.sellingPrice is not None else body.standardRate,
            "purchasePrice": body.purchasePrice, "discount": body.discount, "updatedAt": now_iso(),
        })
        await db.pricing.update_one(
            {"productCode": product_code},
            {"$set": {
                "productCode": product_code,
                "mrp": body.mrp,
                "sellingPrice": body.sellingPrice if body.sellingPrice is not None else body.standardRate,
                "purchasePrice": body.purchasePrice,
                "discount": body.discount,
                "updatedAt": now_iso(),
            }},
            upsert=True,
        )
    return envelope(doc)


@api.delete("/catalog/{item_id}")
async def delete_catalog(item_id: str):
    result = await db.catalog.delete_one({"id": item_id})
    if result.deleted_count == 0:
        return JSONResponse(status_code=404, content=envelope(None, False, "Item not found"))
    return envelope({"deleted": True, "id": item_id})


@api.post("/catalog/import")
async def import_catalog(body: CatalogImportIn):
    mode = body.categoryMode
    override = (body.overrideCategory or "").strip()
    inserted = 0
    skipped = 0
    categories_created: set = set()
    updated = 0
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
        product_code = (it.productCode or "").strip()
        brand = None
        if it.brand:
            brand = await db.brands.find_one({"name": {"$regex": f"^{re.escape(it.brand.strip())}$", "$options": "i"}})
            if not brand:
                brand = {"id": new_id(), "name": it.brand.strip(), "isActive": True}
                await db.brands.insert_one(brand.copy())
        existing = await db.catalog.find_one({"productCode": product_code}) if product_code else None
        doc = {
            "id": existing.get("id") if existing else new_id(),
            "name": it.name.strip(),
            "productName": it.productName or it.name.strip(),
            "category": cat,
            "unit": it.unit.strip(),
            "standardRate": float(it.sellingPrice if it.sellingPrice is not None else (it.standardRate or 0)),
            "brandId": brand["id"] if brand else (existing.get("brandId") if existing else None),
            "brand": brand["name"] if brand else (existing.get("brand") if existing else None),
            "productCode": product_code or (existing.get("productCode") if existing else f"PRD-{uuid.uuid4().hex[:10].upper()}"),
            "type": it.type,
            "productGroup": it.productGroup,
            "sizeMm": it.sizeMm,
            "sizeInch": it.sizeInch,
            "length": it.length,
            "imageUrl": it.imageUrl,
            "isActive": it.isActive,
            "createdAt": existing.get("createdAt") if existing else now_iso(),
            "updatedAt": now_iso(),
        }
        if existing:
            await db.catalog.replace_one({"id": existing["id"]}, doc)
            updated += 1
        else:
            await db.catalog.insert_one(doc.copy())
            inserted += 1
        if any(value is not None for value in (it.mrp, it.sellingPrice, it.purchasePrice, it.discount)):
            await db.pricing_history.insert_one({
                "productCode": doc["productCode"], "mrp": it.mrp,
                "sellingPrice": it.sellingPrice if it.sellingPrice is not None else it.standardRate,
                "purchasePrice": it.purchasePrice, "discount": it.discount, "updatedAt": now_iso(),
            })
            await db.pricing.update_one(
                {"productCode": doc["productCode"]},
                {"$set": {
                    "productCode": doc["productCode"],
                    "mrp": it.mrp,
                    "sellingPrice": it.sellingPrice if it.sellingPrice is not None else it.standardRate,
                    "purchasePrice": it.purchasePrice,
                    "discount": it.discount,
                    "updatedAt": now_iso(),
                }},
                upsert=True,
            )
        if cat not in categories_created and not await db.categories.find_one({"name": cat}):
            await db.categories.insert_one({"id": new_id(), "name": cat, "isDefault": False, "isActive": True})
            categories_created.add(cat)

    return envelope({"inserted": inserted, "updated": updated, "skipped": skipped, "categoryMode": mode})


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


# ---------- Health ----------

@api.get("/")
async def root():
    return envelope({"service": "quotation-mirror", "ok": True})


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
    await ensure_default_categories()
    logger.info("Quotation mirror backend started")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
