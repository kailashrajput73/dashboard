"""Shared DB connection, helpers, and request models. Relocated from server.py."""
from fastapi.responses import JSONResponse
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
db_name = os.getenv("DB_NAME", "quotation_db")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("quotation-api")

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


def looks_like_schedule(value: Optional[str]) -> bool:
    return bool(re.match(r"^\s*(sch(?:edule)?\s*\d+|sdr\s*[\d.]+)\s*$", str(value or ""), re.I))


def infer_product_type(*texts) -> Optional[str]:
    """PVC / CPVC / UPVC from Type, Sub-Category, or product name. Match UPVC before PVC."""
    blob = " ".join(str(t) for t in texts if t)
    if not blob.strip():
        return None
    for label in ("UPVC", "CPVC", "PPR", "HDPE", "PVC", "PE", "PP"):
        if re.search(rf"\b{re.escape(label)}\b", blob, re.I):
            return label
    return None


def resolve_product_taxonomy(
    type_val: Optional[str],
    subcategory: Optional[str],
    product_class: Optional[str],
    *name_texts,
) -> tuple[Optional[str], Optional[str]]:
    """
    Sheet (final): Type = material (UPVC), Sub-Category = line under category, class = Sch 40 / SDR11.
    Legacy: if class empty and Type looks like Sch 40, infer from old swapped columns.
    """
    type_raw = (type_val or "").strip() or None
    sub_raw = (subcategory or "").strip() or None
    class_raw = (product_class or "").strip() or None
    names = name_texts

    if class_raw:
        out_type = infer_product_type(type_raw, sub_raw, *names) or type_raw
        return out_type, class_raw

    if looks_like_schedule(type_raw):
        out_class = infer_product_class(type_raw, class_raw, *names) or type_raw
        out_type = infer_product_type(sub_raw, *names)
        return out_type, out_class
    out_type = infer_product_type(type_raw) or infer_product_type(type_raw, sub_raw, *names) or type_raw
    out_class = class_raw or infer_product_class(class_raw, type_raw, *names)
    return out_type, out_class


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


class ServiceRequestIn(BaseModel):
    serviceType: str = Field(..., pattern="^(plumber|electrician)$")
    customerName: str
    customerPhone: str
    description: str
    address: str = ""
    pincode: str = ""
    city: str = ""
    area: str = ""


class ServiceRequestUpdateIn(BaseModel):
    status: Optional[str] = Field(default=None, pattern="^(pending|in_progress|completed|cancelled)$")
    recommendedName: Optional[str] = None
    recommendedPhone: Optional[str] = None
    adminNote: Optional[str] = None
    actor: Optional[str] = "admin"
    note: Optional[str] = None


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


class ProductTypeIn(BaseModel):
    name: str
    imageUrl: Optional[str] = None


class ProductTypeUpdateIn(BaseModel):
    name: str
    isActive: bool
    imageUrl: Optional[str] = None


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
    reorderLevel: Optional[float] = None
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
    hsnCode: Optional[str] = None
    gstRate: Optional[float] = None
    stdPkg: Optional[float] = None
    mrpPkg: Optional[float] = None
    mrp: Optional[float] = None
    discount: Optional[float] = None
    sellingPrice: Optional[float] = None
    reorderLevel: Optional[float] = None
    isActive: bool = True

    @field_validator("sizeMm", "sizeCm", mode="before")
    @classmethod
    def coerce_master_size(cls, value):
        return parse_size_mm(value)

    @field_validator("gstRate", "discount", mode="before")
    @classmethod
    def coerce_sheet_percent(cls, value):
        if value is None or value == "":
            return None
        try:
            n = float(value)
        except (TypeError, ValueError):
            return value
        if 0 < n <= 1:
            return round(n * 100, 4)
        return n


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

def public_partner(partner: dict) -> dict:
    result = dict(partner)
    result.pop("_id", None)
    result.pop("passcodeHash", None)
    return result


class AdminPasscodeIn(BaseModel):
    contactNumber: str
    passcode: str


async def verify_admin_passcode(body: AdminPasscodeIn) -> bool:
    contact_number = (body.contactNumber or "").strip()
    user = await db.users.find_one({
        "contactNumber": contact_number,
        "role": {"$in": ["admin", "store_manager", "staff"]},
    })
    if not user or not user.get("passcodeHash") or user.get("isActive") is False:
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

def public_team_user(user: dict) -> dict:
    result = {key: value for key, value in user.items() if key not in {"_id", "passcodeHash"}}
    result.setdefault("isActive", True)
    result.setdefault("permissions", ROLE_PERMISSIONS.get(result.get("role", "staff"), []))
    return result

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
        (db.product_types, [("id", 1)], {"unique": True, "name": "product_types_id_uq"}),
        (db.product_types, [("name", 1)], {"name": "product_types_name"}),
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
        (db.service_requests, [("id", 1)], {"unique": True, "name": "service_requests_id_uq"}),
        (db.service_requests, [("status", 1), ("serviceType", 1), ("createdAt", -1)], {"name": "service_requests_status_type_created"}),
        (db.service_requests, [("createdAt", -1)], {"name": "service_requests_createdAt"}),
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


async def ensure_product_type(name: Optional[str]) -> Optional[dict]:
    cleaned = (name or "").strip()
    if not cleaned:
        return None
    existing = await db.product_types.find_one({"name": {"$regex": f"^{re.escape(cleaned)}$", "$options": "i"}})
    if existing:
        return existing
    doc = {
        "id": new_id(),
        "name": cleaned,
        "isActive": True,
        "imageUrl": None,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    await db.product_types.insert_one(doc.copy())
    return doc


async def sync_product_types_from_catalog():
    async for item in db.catalog.find(
        {},
        {"_id": 0, "id": 1, "type": 1, "subcategory": 1, "productClass": 1, "name": 1, "productName": 1},
    ):
        resolved_type, resolved_class = resolve_product_taxonomy(
            item.get("type"),
            item.get("subcategory"),
            item.get("productClass"),
            item.get("name"),
            item.get("productName"),
        )
        updates = {}
        if resolved_type and item.get("type") != resolved_type:
            updates["type"] = resolved_type
        if resolved_class and item.get("productClass") != resolved_class:
            updates["productClass"] = resolved_class
        if updates:
            await db.catalog.update_one({"id": item["id"]}, {"$set": updates})
        await ensure_product_type(resolved_type or item.get("type"))
    for raw in await db.catalog.distinct("type"):
        await ensure_product_type(raw if isinstance(raw, str) else None)


async def reset_catalog_tree():
    """Wipe products and the tree the sheet rebuilds: categories, subcategories, groups, prices."""
    catalog = await db.catalog.delete_many({})
    categories = await db.categories.delete_many({})
    subcategories = await db.subcategories.delete_many({})
    product_types = await db.product_types.delete_many({})
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
        "productTypes": product_types.deleted_count,
        "productGroups": groups.deleted_count,
        "brands": brands.deleted_count,
        "pricing": pricing.deleted_count,
        "pricingHistory": history.deleted_count,
    }

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
