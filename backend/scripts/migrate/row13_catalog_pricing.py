from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pymongo import MongoClient
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.models import (
    Brand,
    Catalog,
    Category,
    Pricing,
    PricingHistory,
    ProductGroupItem,
    ProductType,
    Rack,
    RackSlot,
    Subcategory,
)

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "quotation_db")
DATABASE_URL = os.getenv("DATABASE_URL")


def normalize_iso_datetime(value: Any) -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        text = str(value).strip()
        if not text:
            return None
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        dt = datetime.fromisoformat(text)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def normalize_bool(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value).strip().lower()
    if text in {"true", "yes", "1", "y"}:
        return True
    if text in {"false", "no", "0", "n"}:
        return False
    return None


def normalize_product_code(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _existing_id_map(session: Session, model: Any) -> set[str]:
    return set(session.execute(select(model.id)).scalars().all())


def _existing_product_code_map(session: Session, model: Any) -> set[str]:
    return set(
        session.execute(select(model.product_code)).where(model.product_code.is_not(None)).scalars().all()
    )


def _slugged_product_code(product_code: Any) -> str | None:
    return normalize_product_code(product_code)


def load_pg_lookup(session: Session, model: Any, field: str) -> dict[str, str]:
    rows = session.execute(select(getattr(model, field), model.id)).all()
    lookup: dict[str, str] = {}
    for value, row_id in rows:
        if value is not None:
            lookup[str(value)] = str(row_id)
    return lookup


def _catalog_payload(doc: dict[str, Any], *, category_id_lookup: dict[str, str], brand_lookup: dict[str, str], product_type_lookup: dict[str, str], subcategory_lookup: dict[str, str], rack_lookup: dict[str, str]) -> dict[str, Any]:
    product_code = normalize_product_code(doc.get("productCode"))
    category_name = (doc.get("category") or "").strip()
    brand_name = (doc.get("brand") or "").strip()
    product_type_name = (doc.get("type") or "").strip()
    subcategory_id = doc.get("subcategoryId")
    rack_id = doc.get("rackId")
    payload = {
        "id": str(doc.get("id")),
        "name": str(doc.get("name") or doc.get("productName") or ""),
        "product_name": str(doc.get("productName") or doc.get("name") or ""),
        "category_id": category_id_lookup.get(category_name) or doc.get("categoryId") or None,
        "category": category_name or "",
        "unit": str(doc.get("unit") or ""),
        "standard_rate": float(doc.get("standardRate") or 0),
        "mrp": doc.get("mrp"),
        "selling_price": doc.get("sellingPrice"),
        "purchase_price": doc.get("purchasePrice"),
        "discount": doc.get("discount"),
        "stock": float(doc.get("stock") or 0),
        "brand_id": brand_lookup.get(str(doc.get("brandId") or doc.get("brand") or "")) or (brand_lookup.get(brand_name) if brand_name else None),
        "brand": brand_name or None,
        "product_code": product_code,
        "qr_code": normalize_product_code(doc.get("qrCode")) or product_code,
        "type_name": product_type_name or None,
        "product_type_id": product_type_lookup.get(product_type_name) if product_type_name else None,
        "product_class": doc.get("productClass") or None,
        "product_group": doc.get("productGroup") or None,
        "subcategory_id": str(subcategory_id) if subcategory_id else subcategory_lookup.get(str(doc.get("subcategory") or "")),
        "subcategory": str(doc.get("subcategory") or None),
        "size": doc.get("size") or None,
        "size_mm": doc.get("sizeMm"),
        "size_cm": doc.get("sizeCm"),
        "size_inch": doc.get("sizeInch") or None,
        "length": doc.get("length") or None,
        "aliases": list(doc.get("aliases") or []),
        "multilingual_names": dict(doc.get("multilingualNames") or {}),
        "display_sequence": int(doc.get("displaySequence") or 0),
        "reorder_level": float(doc.get("reorderLevel") or 0),
        "regular_discount": float(doc.get("regularDiscount") or 0),
        "image_url": doc.get("imageUrl") or None,
        "image_name": doc.get("imageName") or None,
        "std_pkg": doc.get("stdPkg"),
        "mrp_pkg": doc.get("mrpPkg"),
        "hsn_code": doc.get("hsnCode") or None,
        "gst_rate": doc.get("gstRate"),
        "last_purchase_price": doc.get("lastPurchasePrice"),
        "last_purchase_discount": doc.get("lastPurchaseDiscount"),
        "rack_id": rack_id if rack_id in rack_lookup.values() else None,
        "rack_name": doc.get("rackName") or None,
        "rack_slot": doc.get("rackSlot") or None,
        "is_active": normalize_bool(doc.get("isActive")) if doc.get("isActive") is not None else True,
        "created_at": normalize_iso_datetime(doc.get("createdAt")) or normalize_iso_datetime(doc.get("updatedAt")) or datetime.now(timezone.utc),
        "updated_at": normalize_iso_datetime(doc.get("updatedAt")) or normalize_iso_datetime(doc.get("createdAt")) or datetime.now(timezone.utc),
    }
    return payload


def _copy_catalog_rows(*, mongo_db, engine, execute: bool, log: list[str]) -> tuple[dict[str, int], list[str]]:
    docs = list(mongo_db["catalog"].find({}, {"_id": 0}))
    summary: dict[str, int] = {"mongo_count": len(docs), "inserted": 0, "skipped": 0}
    warnings: list[str] = []
    if execute:
        with Session(engine) as session:
            category_lookup = {name: model_id for name, model_id in session.execute(select(Category.name, Category.id)).all()}
            brand_lookup = {name: model_id for name, model_id in session.execute(select(Brand.name, Brand.id)).all()}
            product_type_lookup = {name: model_id for name, model_id in session.execute(select(ProductType.name, ProductType.id)).all()}
            subcategory_lookup = {name: model_id for name, model_id in session.execute(select(Subcategory.name, Subcategory.id)).all()}
            rack_lookup = {name: model_id for name, model_id in session.execute(select(Rack.name, Rack.id)).all()}
            existing_ids = _existing_id_map(session, Catalog)
            for doc in docs:
                category_name = (doc.get("category") or "").strip()
                if not category_name:
                    summary["skipped"] += 1
                    warnings.append(f"catalog: skipped {doc.get('id')}: missing category name")
                    continue
                if doc.get("id") in existing_ids:
                    summary["skipped"] += 1
                    continue
                try:
                    payload = _catalog_payload(doc, category_id_lookup=category_lookup, brand_lookup=brand_lookup, product_type_lookup=product_type_lookup, subcategory_lookup=subcategory_lookup, rack_lookup=rack_lookup)
                    session.add(Catalog(**payload))
                    session.flush()
                    existing_ids.add(str(payload["id"]))
                    summary["inserted"] += 1
                except Exception as exc:  # pragma: no cover - defensive guard
                    session.rollback()
                    summary["skipped"] += 1
                    warnings.append(f"catalog: skipped {doc.get('id')}: {exc}")
            session.commit()
    else:
        with Session(engine) as session:
            category_lookup = {name: model_id for name, model_id in session.execute(select(Category.name, Category.id)).all()}
            brand_lookup = {name: model_id for name, model_id in session.execute(select(Brand.name, Brand.id)).all()}
            product_type_lookup = {name: model_id for name, model_id in session.execute(select(ProductType.name, ProductType.id)).all()}
            subcategory_lookup = {name: model_id for name, model_id in session.execute(select(Subcategory.name, Subcategory.id)).all()}
            rack_lookup = {name: model_id for name, model_id in session.execute(select(Rack.name, Rack.id)).all()}
            existing_ids = _existing_id_map(session, Catalog)
        for doc in docs:
            if doc.get("id") in existing_ids:
                summary["skipped"] += 1
                continue
            category_name = (doc.get("category") or "").strip()
            if not category_name:
                summary["skipped"] += 1
                continue
            summary["inserted"] += 1
    return summary, warnings


def _copy_pricing_rows(*, mongo_db, engine, execute: bool, log: list[str]) -> tuple[dict[str, int], list[str], list[str]]:
    pricing_docs = list(mongo_db["pricing"].find({}, {"_id": 0}))
    history_docs = list(mongo_db["pricing_history"].find({}, {"_id": 0}))
    summary = {"pricing_mongo_count": len(pricing_docs), "pricing_inserted": 0, "pricing_skipped": 0, "history_mongo_count": len(history_docs), "history_inserted": 0, "history_skipped": 0}
    orphans: list[str] = []
    warnings: list[str] = []
    if execute:
        with Session(engine) as session:
            catalog_codes = set(session.execute(select(Catalog.product_code)).where(Catalog.product_code.is_not(None)).scalars().all())
            for doc in pricing_docs:
                code = normalize_product_code(doc.get("productCode"))
                if not code:
                    summary["pricing_skipped"] += 1
                    continue
                if code not in catalog_codes:
                    orphans.append(code)
                    summary["pricing_skipped"] += 1
                    continue
                payload = {
                    "id": str(doc.get("id") or f"pricing-{code}"),
                    "product_code": code,
                    "mrp": doc.get("mrp"),
                    "selling_price": doc.get("sellingPrice"),
                    "purchase_price": doc.get("purchasePrice"),
                    "discount": doc.get("discount"),
                    "created_at": normalize_iso_datetime(doc.get("updatedAt")) or datetime.now(timezone.utc),
                    "updated_at": normalize_iso_datetime(doc.get("updatedAt")) or datetime.now(timezone.utc),
                }
                try:
                    session.add(Pricing(**payload))
                    session.flush()
                    summary["pricing_inserted"] += 1
                except IntegrityError:
                    session.rollback()
                    summary["pricing_skipped"] += 1
            for doc in history_docs:
                code = normalize_product_code(doc.get("productCode"))
                if not code:
                    summary["history_skipped"] += 1
                    continue
                if code not in catalog_codes:
                    summary["history_skipped"] += 1
                    continue
                payload = {
                    "id": str(doc.get("id") or f"pricing-history-{code}-{doc.get('updatedAt')}"),
                    "product_code": code,
                    "mrp": doc.get("mrp"),
                    "selling_price": doc.get("sellingPrice"),
                    "purchase_price": doc.get("purchasePrice"),
                    "discount": doc.get("discount"),
                    "created_at": normalize_iso_datetime(doc.get("updatedAt")) or datetime.now(timezone.utc),
                    "updated_at": normalize_iso_datetime(doc.get("updatedAt")) or datetime.now(timezone.utc),
                }
                try:
                    session.add(PricingHistory(**payload))
                    session.flush()
                    summary["history_inserted"] += 1
                except IntegrityError:
                    session.rollback()
                    summary["history_skipped"] += 1
            session.commit()
    else:
        with Session(engine) as session:
            catalog_codes = set(session.execute(select(Catalog.product_code)).where(Catalog.product_code.is_not(None)).scalars().all())
        for doc in pricing_docs:
            code = normalize_product_code(doc.get("productCode"))
            if code and code in catalog_codes:
                summary["pricing_inserted"] += 1
            else:
                summary["pricing_skipped"] += 1
                if code:
                    orphans.append(code)
        for doc in history_docs:
            code = normalize_product_code(doc.get("productCode"))
            if code and code in catalog_codes:
                summary["history_inserted"] += 1
            else:
                summary["history_skipped"] += 1
    return summary, warnings, orphans


def _copy_group_membership(*, mongo_db, engine, execute: bool, log: list[str]) -> dict[str, int]:
    summary = {"mongo_count": 0, "inserted": 0, "skipped": 0}
    product_ids = set()
    with Session(engine) as session:
        product_ids = set(session.execute(select(Catalog.id)).scalars().all())
    for group in mongo_db["product_groups"].find({}, {"_id": 0}):
        summary["mongo_count"] += 1
        for product_id in group.get("productIds") or []:
            if product_id in product_ids:
                if execute:
                    with Session(engine) as session:
                        try:
                            session.add(ProductGroupItem(product_group_id=str(group.get("id")), product_id=str(product_id)))
                            session.flush()
                            summary["inserted"] += 1
                        except IntegrityError:
                            session.rollback()
                            summary["skipped"] += 1
                else:
                    summary["inserted"] += 1
            else:
                summary["skipped"] += 1
    return summary


def _copy_rack_slots(*, mongo_db, engine, execute: bool) -> dict[str, int]:
    summary = {"mongo_count": 0, "inserted": 0, "skipped": 0}
    valid_products = set()
    with Session(engine) as session:
        valid_products = set(session.execute(select(Catalog.id)).scalars().all())
    for rack in mongo_db["racks"].find({}, {"_id": 0}):
        summary["mongo_count"] += len(rack.get("slots") or [])
        for slot in rack.get("slots") or []:
            product_id = slot.get("productId")
            if not product_id or product_id not in valid_products:
                summary["skipped"] += 1
                continue
            if execute:
                with Session(engine) as session:
                    try:
                        session.add(RackSlot(rack_id=str(rack.get("id")), slot_code=str(slot.get("code")), product_id=str(product_id)))
                        session.flush()
                        summary["inserted"] += 1
                    except IntegrityError:
                        session.rollback()
                        summary["skipped"] += 1
            else:
                summary["inserted"] += 1
    return summary


def run_migration(*, execute: bool) -> tuple[dict[str, dict[str, int]], dict[str, Any], list[str]]:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is required. Set it in backend/.env or environment.")
    mongo_client = MongoClient(MONGO_URI)
    mongo_db = mongo_client[MONGO_DB_NAME]
    engine = create_engine(DATABASE_URL)
    catalog_summary, catalog_warnings = _copy_catalog_rows(mongo_db=mongo_db, engine=engine, execute=execute, log=[])
    pricing_summary, pricing_warnings, orphans = _copy_pricing_rows(mongo_db=mongo_db, engine=engine, execute=execute, log=[])
    group_summary = _copy_group_membership(mongo_db=mongo_db, engine=engine, execute=execute, log=[])
    rack_summary = _copy_rack_slots(mongo_db=mongo_db, engine=engine, execute=execute)
    report = {
        "catalog": catalog_summary,
        "pricing": pricing_summary,
        "product_group_items": group_summary,
        "rack_slots": rack_summary,
        "orphans": {"count": len(orphans), "samples": sorted(set(orphans))[:20]},
    }
    return {"catalog": catalog_summary, "pricing": pricing_summary, "product_group_items": group_summary, "rack_slots": rack_summary}, report, catalog_warnings + pricing_warnings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate Mongo catalog + pricing rows into Postgres.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="Check the catalog/pricing migration without writing Postgres.")
    group.add_argument("--execute", action="store_true", help="Apply the catalog/pricing migration to the Postgres database.")
    parser.add_argument("--truncate-target", action="store_true", help="Warn rather than truncate; destructive resets are intentionally disabled.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.truncate_target:
        print("WARNING: --truncate-target was requested. This script intentionally does not truncate target tables; it only does safe, FK-aware inserts.")
    summary, report, warnings = run_migration(execute=args.execute)
    print("ROW 13: Mongo -> Postgres catalog + pricing summary")
    for table_name, counts in summary.items():
        print(f"{table_name}: {counts}")
    print(f"orphans: count={report['orphans']['count']} samples={report['orphans']['samples']}")
    if warnings:
        print("Warnings / skips:")
        for warning in warnings[:25]:
            print(f"- {warning}")
    if args.execute:
        print("\nExecuted row 13 migration to PostgreSQL.")
    else:
        print("\nDry run complete; no PostgreSQL writes were made.")


if __name__ == "__main__":
    main()
