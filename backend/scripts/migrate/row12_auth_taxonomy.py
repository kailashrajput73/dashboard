from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from pymongo import MongoClient
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.models import (
    AdminToken,
    Brand,
    Category,
    MoneyConfig,
    Partner,
    PartnerToken,
    ProductType,
    Subcategory,
    User,
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


def normalize_optional_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        return text or None
    return str(value)


def _get_collection(db, name: str):
    return db[name]


def _list_docs(db, name: str) -> list[dict[str, Any]]:
    return list(_get_collection(db, name).find({}, {"_id": 0}))


def _existing_ids(session: Session, model: Any) -> set[str]:
    try:
        return set(session.execute(select(model.id)).scalars().all())
    except Exception:
        return set()


def _row_payload(doc: dict[str, Any], field_map: dict[str, str]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for source_key, target_key in field_map.items():
        value = doc.get(source_key)
        if target_key.endswith("_at"):
            value = normalize_iso_datetime(value)
        elif target_key.endswith("_active") or target_key.endswith("_default"):
            value = normalize_bool(value)
        elif target_key == "permissions":
            value = value or []
        elif target_key in {"documents", "kyc_history"}:
            value = value or []
        out[target_key] = value
    return out


def copy_table(
    *,
    mongo_db,
    table_name: str,
    collection_name: str,
    model: Any,
    field_map: dict[str, str],
    fk_check: Callable[[dict[str, Any]], bool],
    engine,
    execute: bool,
    log: list[str],
) -> dict[str, int]:
    docs = _list_docs(mongo_db, collection_name)
    inserted = 0
    skipped = 0
    existing_ids: set[str] = set()
    if execute:
        with Session(engine) as session:
            existing_ids = _existing_ids(session, model)
            for doc in docs:
                payload = _row_payload(doc, field_map)
                record_id = payload.get("id")
                if not record_id:
                    skipped += 1
                    log.append(f"{table_name}: missing id for {doc!r}")
                    continue
                if record_id in existing_ids:
                    skipped += 1
                    continue
                if not fk_check(doc):
                    skipped += 1
                    log.append(f"{table_name}: skipped id={record_id}: FK target missing")
                    continue
                try:
                    session.add(model(**payload))
                    session.flush()
                    existing_ids.add(record_id)
                    inserted += 1
                except IntegrityError:
                    session.rollback()
                    skipped += 1
                    log.append(f"{table_name}: duplicate or integrity issue for id={record_id}")
            session.commit()
    else:
        with Session(engine) as session:
            existing_ids = _existing_ids(session, model)
        for doc in docs:
            payload = _row_payload(doc, field_map)
            record_id = payload.get("id")
            if not record_id:
                skipped += 1
                continue
            if record_id in existing_ids:
                skipped += 1
                continue
            if not fk_check(doc):
                skipped += 1
                continue
            inserted += 1
    return {"mongo_count": len(docs), "inserted": inserted, "skipped": skipped}


def build_summary(*, execute: bool, mongo_db, engine) -> tuple[dict[str, dict[str, int]], list[str]]:
    log: list[str] = []
    summary: dict[str, dict[str, int]] = {}

    def user_fk_ok(doc: dict[str, Any]) -> bool:
        return True

    summary["users"] = copy_table(
        mongo_db=mongo_db,
        table_name="users",
        collection_name="users",
        model=User,
        field_map={
            "id": "id",
            "role": "role",
            "name": "name",
            "phone": "phone",
            "address": "address",
            "companyName": "company_name",
            "gstin": "gstin",
            "contactNumber": "contact_number",
            "passcodeHash": "passcode_hash",
            "permissions": "permissions",
            "isActive": "is_active",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
        },
        fk_check=user_fk_ok,
        engine=engine,
        execute=execute,
        log=log,
    )

    summary["categories"] = copy_table(
        mongo_db=mongo_db,
        table_name="categories",
        collection_name="categories",
        model=Category,
        field_map={
            "id": "id",
            "name": "name",
            "isDefault": "is_default",
            "isActive": "is_active",
            "productCount": "product_count",
            "imageUrl": "image_url",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
        },
        fk_check=lambda doc: True,
        engine=engine,
        execute=execute,
        log=log,
    )

    summary["brands"] = copy_table(
        mongo_db=mongo_db,
        table_name="brands",
        collection_name="brands",
        model=Brand,
        field_map={
            "id": "id",
            "name": "name",
            "isActive": "is_active",
            "productCount": "product_count",
            "logoUrl": "logo_url",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
        },
        fk_check=lambda doc: True,
        engine=engine,
        execute=execute,
        log=log,
    )

    summary["product_types"] = copy_table(
        mongo_db=mongo_db,
        table_name="product_types",
        collection_name="product_types",
        model=ProductType,
        field_map={
            "id": "id",
            "name": "name",
            "isActive": "is_active",
            "imageUrl": "image_url",
            "productCount": "product_count",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
        },
        fk_check=lambda doc: True,
        engine=engine,
        execute=execute,
        log=log,
    )

    summary["partners"] = copy_table(
        mongo_db=mongo_db,
        table_name="partners",
        collection_name="partners",
        model=Partner,
        field_map={
            "id": "id",
            "name": "name",
            "phone": "phone",
            "address": "address",
            "businessName": "business_name",
            "pincode": "pincode",
            "city": "city",
            "area": "area",
            "salesManager": "sales_manager",
            "documents": "documents",
            "kycStatus": "kyc_status",
            "locationVerified": "location_verified",
            "appActive": "app_active",
            "kycHistory": "kyc_history",
            "rewardPoints": "reward_points",
            "passcodeHash": "passcode_hash",
            "registeredVia": "registered_via",
            "loginCount": "login_count",
            "lastAppLoginAt": "last_app_login_at",
            "approvedAt": "approved_at",
            "approvedBy": "approved_by",
            "reviewedAt": "reviewed_at",
            "reviewedBy": "reviewed_by",
            "rejectionReason": "rejection_reason",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
        },
        fk_check=lambda doc: True,
        engine=engine,
        execute=execute,
        log=log,
    )

    summary["money_config"] = copy_table(
        mongo_db=mongo_db,
        table_name="money_config",
        collection_name="money_config",
        model=MoneyConfig,
        field_map={
            "id": "id",
            "adminId": "admin_id",
            "discountPercent": "discount_percent",
            "gstPercent": "gst_percent",
            "specialDiscountPercent": "special_discount_percent",
            "showDiscount": "show_discount",
            "showGst": "show_gst",
            "showSpecialDiscount": "show_special_discount",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
        },
        fk_check=lambda doc: bool(doc.get("adminId")),
        engine=engine,
        execute=execute,
        log=log,
    )

    summary["admin_tokens"] = copy_table(
        mongo_db=mongo_db,
        table_name="admin_tokens",
        collection_name="admin_tokens",
        model=AdminToken,
        field_map={
            "id": "id",
            "token": "token",
            "adminId": "admin_id",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
        },
        fk_check=lambda doc: bool(doc.get("adminId")),
        engine=engine,
        execute=execute,
        log=log,
    )

    summary["partner_tokens"] = copy_table(
        mongo_db=mongo_db,
        table_name="partner_tokens",
        collection_name="partner_tokens",
        model=PartnerToken,
        field_map={
            "id": "id",
            "token": "token",
            "partnerId": "partner_id",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
        },
        fk_check=lambda doc: bool(doc.get("partnerId")),
        engine=engine,
        execute=execute,
        log=log,
    )

    summary["subcategories"] = copy_table(
        mongo_db=mongo_db,
        table_name="subcategories",
        collection_name="subcategories",
        model=Subcategory,
        field_map={
            "id": "id",
            "name": "name",
            "categoryId": "category_id",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
        },
        fk_check=lambda doc: bool(doc.get("categoryId")),
        engine=engine,
        execute=execute,
        log=log,
    )

    return summary, log


def run_migration(*, execute: bool) -> tuple[dict[str, dict[str, int]], list[str]]:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is required. Set it in backend/.env or environment.")
    mongo_client = MongoClient(MONGO_URI)
    mongo_db = mongo_client[MONGO_DB_NAME]
    engine = create_engine(DATABASE_URL)
    summary, log = build_summary(execute=execute, mongo_db=mongo_db, engine=engine)
    return summary, log


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate Mongo auth + taxonomy rows into Postgres.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="Inspect Mongo data and report what would be inserted without writing.")
    group.add_argument("--execute", action="store_true", help="Actually insert the row 12 auth + taxonomy data into Postgres.")
    parser.add_argument("--truncate-target", action="store_true", help="Warns instead of truncating because destructive table resets are intentionally disabled for this migration row.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.truncate_target:
        print("WARNING: --truncate-target was requested. This script intentionally does not run destructive truncates; it performs safe, FK-aware inserts only.")
    summary, log = run_migration(execute=args.execute)
    print("ROW 12: Mongo -> Postgres auth + taxonomy summary")
    for table_name, counts in summary.items():
        print(f"{table_name}: mongo_count={counts['mongo_count']} inserted={counts['inserted']} skipped={counts['skipped']}")
    if log:
        print("\nSkipped / warnings:")
        for item in log[:25]:
            print(f"- {item}")
    if args.execute:
        print("\nExecuted row 12 migration to PostgreSQL.")
    else:
        print("\nDry run complete; no PostgreSQL writes were made.")


if __name__ == "__main__":
    main()
