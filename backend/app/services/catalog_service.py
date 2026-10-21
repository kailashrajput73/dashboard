from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Callable
from uuid import uuid4

import bcrypt
from fastapi.responses import JSONResponse
from sqlalchemy import cast, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.sql.sqltypes import Text

from app.models import (
    Brand,
    Catalog,
    Category,
    Pricing,
    PricingHistory,
    ProductFamily,
    ProductGroup,
    ProductGroupItem,
    ProductType,
    RackSlot,
    Subcategory,
    User,
)
from app.services.catalog_family_util import generate_sku_display_name
from app.schemas.catalog import (
    CatalogBulkPricingIn,
    CatalogFieldPurgeIn,
    CatalogImportIn,
    CatalogItemIn,
    CatalogMasterImportIn,
    CatalogPricingImportIn,
    CatalogPricingIn,
    CatalogStockImportIn,
)
from app.schemas.taxonomy import AdminPasscodeIn
from app.services._common import envelope, error_response, escaped_like, isoformat
from app.services.taxonomy_service import (
    _infer_product_class,
    _resolve_product_taxonomy,
    _sync_product_types,
    _verify_admin_passcode,
)


class CatalogServiceError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        self.status_code = status_code
        self.message = message
        super().__init__(message)


def _run_transaction(
    session: Session,
    operation: Callable[[], dict[str, Any]],
) -> dict[str, Any] | JSONResponse:
    try:
        with session.begin():
            return operation()
    except CatalogServiceError as error:
        return error_response(error.status_code, error.message)
    except IntegrityError as error:
        constraint = getattr(getattr(error.orig, "diag", None), "constraint_name", None)
        if constraint == "catalog_product_code_uq":
            return error_response(409, "Product code already exists")
        if constraint in {
            "categories_name_ci_uq",
            "brands_name_ci_uq",
            "product_types_name_ci_uq",
            "subcategories_category_name_ci_uq",
            "product_groups_name_uq",
            "product_groups_name_ci",
        }:
            return error_response(409, "A taxonomy or product group name already exists")
        raise


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _clean(value: str | None) -> str | None:
    return value.strip() if value and value.strip() else None


def _selling_from(
    mrp: float | None,
    discount: float | None,
    selling: float | None,
    fallback: float = 0,
) -> float:
    if selling is not None:
        return float(selling)
    if mrp is not None and discount is not None:
        return round(float(mrp) * (1 - max(0, float(discount)) / 100), 2)
    if mrp is not None:
        return float(mrp)
    return float(fallback)


def _parse_size(value: float | None) -> float | None:
    return float(value) if value is not None else None


def _get_category(session: Session, name: str) -> Category:
    cleaned = name.strip()
    if not cleaned:
        raise CatalogServiceError(400, "Category is required")
    category = session.scalar(
        select(Category)
        .where(func.lower(Category.name) == cleaned.lower())
        .order_by(Category.deleted_at.is_(None).desc())
        .limit(1)
    )
    now = _now()
    if category is None:
        category = Category(
            name=cleaned,
            is_default=False,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        session.add(category)
        session.flush()
    elif category.deleted_at is not None:
        category.deleted_at = None
        category.is_active = True
        category.updated_at = now
    return category


def _get_brand(
    session: Session,
    brand_id: str | None,
    brand_name: str | None,
    *,
    create_by_name: bool,
) -> Brand | None:
    if brand_id:
        brand = session.scalar(
            select(Brand).where(
                Brand.id == brand_id,
                Brand.deleted_at.is_(None),
            )
        )
        if brand is None:
            raise CatalogServiceError(400, "Brand not found")
        return brand
    cleaned = _clean(brand_name)
    if cleaned is None:
        return None
    brand = session.scalar(
        select(Brand)
        .where(func.lower(Brand.name) == cleaned.lower())
        .order_by(Brand.deleted_at.is_(None).desc())
        .limit(1)
    )
    now = _now()
    if brand is None and create_by_name:
        brand = Brand(
            name=cleaned,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        session.add(brand)
        session.flush()
    elif brand is not None and brand.deleted_at is not None:
        brand.deleted_at = None
        brand.is_active = True
        brand.updated_at = now
    return brand


def _get_product_type(session: Session, name: str | None) -> ProductType | None:
    cleaned = _clean(name)
    if cleaned is None:
        return None
    product_type = session.scalar(
        select(ProductType)
        .where(func.lower(ProductType.name) == cleaned.lower())
        .order_by(ProductType.deleted_at.is_(None).desc())
        .limit(1)
    )
    now = _now()
    if product_type is None:
        product_type = ProductType(
            name=cleaned,
            is_active=True,
            image_url=None,
            created_at=now,
            updated_at=now,
        )
        session.add(product_type)
        session.flush()
    elif product_type.deleted_at is not None:
        product_type.deleted_at = None
        product_type.is_active = True
        product_type.updated_at = now
    return product_type


def _get_subcategory(
    session: Session,
    category: Category,
    subcategory_id: str | None,
    subcategory_name: str | None,
    *,
    create_by_name: bool = False,
) -> Subcategory | None:
    if subcategory_id:
        subcategory = session.scalar(
            select(Subcategory).where(
                Subcategory.id == subcategory_id,
                Subcategory.deleted_at.is_(None),
            )
        )
        if subcategory is None:
            raise CatalogServiceError(400, "Subcategory not found")
        parent = session.get(Category, subcategory.category_id)
        if parent is None or parent.id != category.id:
            raise CatalogServiceError(400, "Subcategory does not belong to category")
        return subcategory
    cleaned = _clean(subcategory_name)
    if cleaned is None:
        return None
    subcategory = session.scalar(
        select(Subcategory)
        .where(
            Subcategory.category_id == category.id,
            func.lower(Subcategory.name) == cleaned.lower(),
        )
        .order_by(Subcategory.deleted_at.is_(None).desc())
        .limit(1)
    )
    if subcategory is None and create_by_name:
        subcategory = Subcategory(
            name=cleaned,
            category_id=category.id,
            created_at=_now(),
            updated_at=_now(),
        )
        session.add(subcategory)
        session.flush()
    elif subcategory is not None and subcategory.deleted_at is not None:
        subcategory.deleted_at = None
        subcategory.updated_at = _now()
    return subcategory


def _get_product_group(session: Session, name: str) -> ProductGroup:
    cleaned = name.strip()
    group = session.scalar(
        select(ProductGroup)
        .where(func.lower(ProductGroup.name) == cleaned.lower())
        .order_by(ProductGroup.deleted_at.is_(None).desc())
        .limit(1)
    )
    now = _now()
    if group is None:
        group = ProductGroup(
            name=cleaned,
            product_count=0,
            created_at=now,
            updated_at=now,
        )
        session.add(group)
        session.flush()
    elif group.deleted_at is not None:
        group.deleted_at = None
        group.updated_at = now
    return group


def _replace_group_links(
    session: Session,
    product: Catalog,
    group_ids: list[str],
    *,
    append: bool = False,
) -> None:
    ids = list(dict.fromkeys(group_ids))
    groups = session.scalars(
        select(ProductGroup).where(
            ProductGroup.id.in_(ids),
            ProductGroup.deleted_at.is_(None),
        )
    ).all() if ids else []
    if len(groups) != len(ids):
        raise CatalogServiceError(400, "Product group not found")
    now = _now()
    current = session.scalars(
        select(ProductGroupItem).where(ProductGroupItem.product_id == product.id)
    ).all()
    active_ids = {link.product_group_id for link in current if link.deleted_at is None}
    target_ids = active_ids | set(ids) if append else set(ids)
    lock_ids = active_ids | target_ids
    if lock_ids:
        session.scalars(
            select(ProductGroup)
            .where(ProductGroup.id.in_(lock_ids))
            .with_for_update()
        ).all()
    for link in current:
        if link.product_group_id in target_ids:
            if link.deleted_at is not None:
                link.deleted_at = None
                link.updated_at = now
        elif link.deleted_at is None:
            link.deleted_at = now
            link.updated_at = now
    existing_ids = {link.product_group_id for link in current}
    for group_id in target_ids - existing_ids:
        session.add(
            ProductGroupItem(
                product_group_id=group_id,
                product_id=product.id,
                created_at=now,
                updated_at=now,
            )
        )
    session.flush()
    _refresh_group_counts(session, active_ids | target_ids)


def _refresh_group_counts(session: Session, group_ids: set[str]) -> None:
    if not group_ids:
        return
    counts = dict(
        session.execute(
            select(ProductGroupItem.product_group_id, func.count(Catalog.id))
            .join(Catalog, Catalog.id == ProductGroupItem.product_id)
            .where(
                ProductGroupItem.product_group_id.in_(group_ids),
                ProductGroupItem.deleted_at.is_(None),
                Catalog.deleted_at.is_(None),
            )
            .group_by(ProductGroupItem.product_group_id)
        ).all()
    )
    session.execute(
        update(ProductGroup)
        .where(
            ProductGroup.id.in_(group_ids),
            ProductGroup.deleted_at.is_(None),
        )
        .values(product_count=0, updated_at=_now())
    )
    for group_id, count in counts.items():
        session.execute(
            update(ProductGroup)
            .where(
                ProductGroup.id == group_id,
                ProductGroup.deleted_at.is_(None),
            )
            .values(product_count=count, updated_at=_now())
        )


def _group_ids(session: Session, product_id: str) -> list[str]:
    return list(
        session.scalars(
            select(ProductGroupItem.product_group_id)
            .join(ProductGroup, ProductGroup.id == ProductGroupItem.product_group_id)
            .where(
                ProductGroupItem.product_id == product_id,
                ProductGroupItem.deleted_at.is_(None),
                ProductGroup.deleted_at.is_(None),
            )
            .order_by(ProductGroupItem.product_group_id)
        ).all()
    )


def _pricing_write(
    session: Session,
    product_code: str | None,
    mrp: float | None,
    selling: float | None,
    purchase: float | None,
    discount: float | None,
) -> None:
    if not product_code:
        return
    now = _now()
    history = PricingHistory(
        product_code=product_code,
        mrp=mrp,
        selling_price=selling,
        purchase_price=purchase,
        discount=discount,
        created_at=now,
        updated_at=now,
    )
    session.add(history)
    current = session.scalar(
        select(Pricing)
        .where(Pricing.product_code == product_code)
        .order_by(Pricing.deleted_at.is_(None).desc())
        .limit(1)
    )
    if current is None:
        current = Pricing(
            product_code=product_code,
            mrp=mrp,
            selling_price=selling,
            purchase_price=purchase,
            discount=discount,
            created_at=now,
            updated_at=now,
        )
        session.add(current)
    else:
        current.deleted_at = None
        current.mrp = mrp
        current.selling_price = selling
        current.purchase_price = purchase
        current.discount = discount
        current.updated_at = now


def _catalog_json(
    session: Session,
    product: Catalog,
    pricing: Pricing | None = None,
) -> dict[str, Any]:
    family: ProductFamily | None = None
    if product.family_id:
        family = session.get(ProductFamily, product.family_id)

    display_name = product.name
    display_product_name = product.product_name
    if family is not None and family.deleted_at is None:
        display_name = generate_sku_display_name(
            type_name=product.type_name,
            product_family=family.name,
            product_class=product.product_class,
            size=product.size,
            brand=product.brand,
            length=product.length,
        )
        display_product_name = display_name

    unit = product.unit
    hsn_code = product.hsn_code
    gst_rate = product.gst_rate
    image_url = product.image_url
    if family is not None and family.deleted_at is None:
        unit = family.unit or unit
        hsn_code = family.hsn_code or hsn_code
        gst_rate = family.gst_rate if family.gst_rate is not None else gst_rate
        image_url = family.image_url or image_url

    item: dict[str, Any] = {
        "id": product.id,
        "name": display_name,
        "productName": display_product_name,
        "category": product.category,
        "unit": unit,
        "standardRate": product.standard_rate,
        "mrp": product.mrp,
        "sellingPrice": product.selling_price,
        "purchasePrice": product.purchase_price,
        "discount": product.discount,
        "stock": product.stock,
        "brandId": product.brand_id,
        "brand": product.brand
        or (
            session.scalar(
                select(Brand.name).where(
                    Brand.id == product.brand_id,
                    Brand.deleted_at.is_(None),
                )
            )
            if product.brand_id
            else None
        ),
        "productCode": product.product_code,
        "qrCode": product.qr_code or product.product_code,
        "type": product.type_name,
        "productClass": product.product_class,
        "productGroup": product.product_group,
        "productGroupIds": _group_ids(session, product.id),
        "subcategory": product.subcategory,
        "subcategoryId": product.subcategory_id,
        "size": product.size,
        "sizeMm": product.size_mm,
        "sizeCm": product.size_cm,
        "sizeInch": product.size_inch,
        "length": product.length,
        "aliases": product.aliases or [],
        "multilingualNames": product.multilingual_names or {},
        "displaySequence": product.display_sequence,
        "reorderLevel": product.reorder_level,
        "regularDiscount": product.regular_discount,
        "imageUrl": image_url,
        "imageName": product.image_name,
        "stdPkg": product.std_pkg,
        "mrpPkg": product.mrp_pkg,
        "hsnCode": hsn_code,
        "gstRate": gst_rate,
        "productFamily": family.name if family and family.deleted_at is None else None,
        "familyId": product.family_id,
        "rackId": product.rack_id,
        "rackName": product.rack_name,
        "rackSlot": product.rack_slot,
        "isActive": product.is_active,
        "createdAt": isoformat(product.created_at),
        "updatedAt": isoformat(product.updated_at),
    }
    if pricing is not None and pricing.deleted_at is None:
        item.update(
            {
                "mrp": pricing.mrp,
                "sellingPrice": pricing.selling_price,
                "purchasePrice": pricing.purchase_price,
                "discount": pricing.discount,
                "standardRate": pricing.selling_price
                if pricing.selling_price is not None
                else product.standard_rate,
                "priceUpdatedAt": isoformat(pricing.updated_at),
            }
        )
        if (item["sellingPrice"] or 0) <= 0 and item["mrp"] is not None:
            derived = _selling_from(
                item["mrp"],
                item["discount"],
                None,
                item["standardRate"] or 0,
            )
            item["sellingPrice"] = derived
            item["standardRate"] = derived
    return item


def _pricing_for(
    session: Session,
    product_code: str | None,
) -> Pricing | None:
    if not product_code:
        return None
    return session.scalar(
        select(Pricing).where(
            Pricing.product_code == product_code,
            Pricing.deleted_at.is_(None),
        )
    )


def _product_payload(
    session: Session,
    product: Catalog,
    *,
    category_name: str,
    brand_id: str | None,
    brand_name: str | None,
    type_name: str | None,
    subcategory: Subcategory | None,
    values: dict[str, Any],
    group_ids: list[str],
) -> dict[str, Any]:
    resolved_type, resolved_class = _resolve_product_taxonomy(
        type_name,
        values.get("subcategory"),
        values.get("product_class"),
        values.get("name"),
        values.get("product_name"),
    )
    product.name = values["name"]
    product.product_name = values["product_name"]
    product.category = category_name
    product.category_id = values["category_id"]
    product.unit = values["unit"]
    product.standard_rate = values["standard_rate"]
    product.mrp = values.get("mrp")
    product.selling_price = values.get("selling_price")
    product.purchase_price = values.get("purchase_price")
    product.discount = values.get("discount")
    product.stock = values.get("stock", 0)
    product.brand_id = brand_id
    product.brand = brand_name
    product.product_code = values.get("product_code")
    product.qr_code = values.get("product_code")
    product.type_name = resolved_type
    product.product_type_id = (
        _get_product_type(session, resolved_type).id
        if resolved_type
        else None
    )
    product.product_class = resolved_class or values.get("product_class")
    product.product_group = values.get("product_group")
    product.subcategory_id = subcategory.id if subcategory else None
    product.subcategory = subcategory.name if subcategory else values.get("subcategory")
    product.size = values.get("size")
    product.size_mm = _parse_size(values.get("size_mm"))
    product.size_cm = _parse_size(values.get("size_cm"))
    product.size_inch = values.get("size_inch")
    product.length = values.get("length")
    product.aliases = values.get("aliases", [])
    product.multilingual_names = values.get("multilingual_names", {})
    product.display_sequence = values.get("display_sequence", 0)
    product.reorder_level = values.get("reorder_level", 0)
    product.regular_discount = values.get("regular_discount", 0)
    product.image_url = values.get("image_url")
    product.image_name = values.get("image_name")
    product.std_pkg = values.get("std_pkg")
    product.mrp_pkg = values.get("mrp_pkg")
    product.hsn_code = values.get("hsn_code")
    product.gst_rate = values.get("gst_rate")
    product.is_active = values.get("is_active", True)
    product.deleted_at = None
    product.updated_at = _now()
    session.add(product)
    session.flush()
    _replace_group_links(session, product, group_ids)
    return _catalog_json(session, product, _pricing_for(session, product.product_code))


def _verify_passcode(session: Session, body: AdminPasscodeIn) -> bool:
    return _verify_admin_passcode(session, body)


def _category_for_import(session: Session, row_category: str | None, mode: str, override: str) -> Category:
    if mode == "overrideExisting":
        name = override or "General"
    elif mode == "overrideNew":
        name = (row_category or "").strip() or override or "General"
    else:
        name = (row_category or "").strip() or "General"
    return _get_category(session, name)


def _brand_for_import(session: Session, brand_name: str | None) -> Brand | None:
    return _get_brand(session, None, brand_name, create_by_name=True)


def _catalog_by_code(session: Session, code: str | None) -> Catalog | None:
    if not code:
        return None
    return session.scalar(
        select(Catalog)
        .where(Catalog.product_code == code)
        .order_by(Catalog.deleted_at.is_(None).desc())
        .limit(1)
        .with_for_update()
    )


def _add_import_row(
    session: Session,
    row: Any,
    *,
    mode: str,
    override: str,
    master: bool,
) -> tuple[bool, bool]:
    name = _clean(row.name)
    unit_value = _clean(row.unit)
    if name is None or (not master and unit_value is None):
        return False, False
    unit = unit_value or "pcs"
    category = _category_for_import(session, row.category, mode, override)
    brand = _brand_for_import(session, row.brand)
    code = (row.productCode or "").strip().rstrip("^")
    if not code:
        parts = [
            row.brand,
            row.type,
            row.productClass,
            row.size or row.sizeInch or row.sizeCm or row.sizeMm,
            row.length,
        ]
        code = "-".join(str(part).strip() for part in parts if part and str(part).strip())
        code = re.sub(r"[^A-Za-z0-9]+", "-", code).strip("-").upper()[:48]
        if not code:
            code = f"PRD-{uuid4().hex[:10].upper()}"
    existing = _catalog_by_code(session, code)
    was_deleted = existing is not None and existing.deleted_at is not None
    group_ids = _group_ids(session, existing.id) if existing else []
    group_name = _clean(row.productGroup)
    if group_name:
        group = _get_product_group(session, group_name)
        group_ids.append(group.id)

    subcategory_name = _clean(row.subcategory)
    if subcategory_name:
        subcategory = _get_subcategory(
            session,
            category,
            None,
            subcategory_name,
            create_by_name=True,
        )
    else:
        subcategory = (
            session.get(Subcategory, existing.subcategory_id)
            if existing is not None and existing.subcategory_id
            else None
        )
    type_name, product_class = _resolve_product_taxonomy(
        row.type,
        subcategory_name,
        row.productClass,
        name,
        row.productName,
    )
    if existing is not None and not was_deleted:
        type_name = type_name or existing.type_name
        product_class = product_class or existing.product_class

    if master and existing is not None and not was_deleted:
        mrp = existing.mrp
        discount = existing.discount
        selling = float(existing.standard_rate or existing.selling_price or 0)
        stock = float(existing.stock or 0)
        purchase_price = existing.purchase_price
    elif master:
        mrp = row.mrp
        discount = row.discount
        selling = _selling_from(mrp, discount, row.sellingPrice)
        stock = 0.0
        purchase_price = None
    else:
        mrp = row.mrp
        discount = row.discount
        selling = _selling_from(
            mrp,
            discount,
            row.sellingPrice,
            row.standardRate or 0,
        )
        stock = (
            float(existing.stock or 0)
            if existing is not None and not was_deleted
            else float(row.stock or 0)
        )
        purchase_price = row.purchasePrice

    final_name = _clean(row.productName) or name
    size = row.size
    if not size and getattr(row, "sizeCm", None) is not None:
        size = f"{row.sizeCm} cm" if not master else str(row.sizeCm)
    elif not size and getattr(row, "sizeMm", None) is not None:
        size = f"{row.sizeMm} mm" if not master else str(row.sizeMm)

    values = {
        "name": name,
        "product_name": final_name,
        "category_id": category.id,
        "unit": unit,
        "standard_rate": selling,
        "mrp": mrp,
        "selling_price": selling,
        "purchase_price": purchase_price,
        "discount": discount,
        "stock": stock,
        "product_code": code,
        "product_class": product_class or _infer_product_class(
            row.productClass,
            name,
            row.productName,
        ),
        "product_group": row.productGroup,
        "subcategory": subcategory_name
        if subcategory_name is not None
        else (existing.subcategory if existing else None),
        "size": size,
        "size_mm": row.sizeMm,
        "size_cm": row.sizeCm,
        "size_inch": row.sizeInch,
        "length": row.length,
        "reorder_level": (
            row.reorderLevel
            if row.reorderLevel is not None
            else (existing.reorder_level if existing else 0)
        ),
        "std_pkg": (
            row.stdPkg
            if row.stdPkg is not None
            else (existing.std_pkg if existing else None)
        ),
        "mrp_pkg": (
            row.mrpPkg
            if master and row.mrpPkg is not None
            else (existing.mrp_pkg if existing else None)
        ),
        "hsn_code": (
            _clean(row.hsnCode)
            if master and row.hsnCode is not None
            else (existing.hsn_code if existing else None)
        ),
        "gst_rate": (
            row.gstRate
            if master and row.gstRate is not None
            else (existing.gst_rate if existing else None)
        ),
        "image_url": (
            _clean(row.imageUrl) or (existing.image_url if existing else None)
            if master
            else _clean(row.imageUrl)
        ),
        "image_name": existing.image_name if existing else None,
        "aliases": existing.aliases if existing else [],
        "multilingual_names": existing.multilingual_names if existing else {},
        "display_sequence": existing.display_sequence if existing else 0,
        "regular_discount": existing.regular_discount if existing else 0,
        "is_active": getattr(row, "isActive", True),
    }
    product = existing or Catalog(
        created_at=_now(),
        updated_at=_now(),
    )
    _product_payload(
        session,
        product,
        category_name=category.name,
        brand_id=brand.id if brand else (existing.brand_id if existing else None),
        brand_name=brand.name if brand else (existing.brand if existing else None),
        type_name=type_name,
        subcategory=subcategory,
        values=values,
        group_ids=group_ids,
    )
    if not master or existing is None or was_deleted:
        _pricing_write(
            session,
            code,
            mrp,
            selling,
            purchase_price if not master else None,
            discount or 0 if master else discount,
        )
    return existing is None or was_deleted, existing is not None and not was_deleted


def list_catalog(
    session: Session,
    *,
    category: str | None = None,
    search: str | None = None,
    group_id: str | None = None,
    type_name: str | None = None,
    brand: str | None = None,
    product_group: str | None = None,
    subcategory: str | None = None,
    product_class: str | None = None,
    size_mm: float | None = None,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        now = _now()
        filters = [Catalog.deleted_at.is_(None)]
        if category and category.lower() != "all":
            filters.append(Catalog.category == category)
        if search and search.strip():
            pattern = f"%{escaped_like(search.strip())}%"
            filters.append(
                Catalog.name.ilike(pattern, escape="\\")
                | Catalog.product_code.ilike(pattern, escape="\\")
                | Catalog.brand.ilike(pattern, escape="\\")
                | cast(Catalog.aliases, Text).ilike(pattern, escape="\\")
            )
        if type_name:
            filters.append(func.lower(Catalog.type_name) == type_name.strip().lower())
        if brand:
            filters.append(func.lower(Catalog.brand) == brand.strip().lower())
        if product_group:
            filters.append(Catalog.product_group == product_group)
        if subcategory:
            filters.append(func.lower(Catalog.subcategory) == subcategory.strip().lower())
        if product_class:
            filters.append(func.lower(Catalog.product_class) == product_class.strip().lower())
        if size_mm is not None:
            filters.append(Catalog.size_mm == size_mm)
        query = select(Catalog).where(*filters).order_by(Catalog.name)
        if group_id:
            query = query.join(
                ProductGroupItem,
                ProductGroupItem.product_id == Catalog.id,
            ).join(
                ProductGroup,
                ProductGroup.id == ProductGroupItem.product_group_id,
            ).where(
                ProductGroupItem.product_group_id == group_id,
                ProductGroupItem.deleted_at.is_(None),
                ProductGroup.deleted_at.is_(None),
            )
        selected = session.scalars(query).unique().all()
        for product in selected:
            resolved_type, resolved_class = _resolve_product_taxonomy(
                product.type_name,
                product.subcategory,
                product.product_class,
                product.name,
                product.product_name,
            )
            if resolved_type and product.type_name != resolved_type:
                product.type_name = resolved_type
                product.updated_at = now
            if resolved_class and product.product_class != resolved_class:
                product.product_class = resolved_class
                product.updated_at = now
            if resolved_type:
                product_type = _get_product_type(session, resolved_type)
                if product_type and product.product_type_id != product_type.id:
                    product.product_type_id = product_type.id
                    product.updated_at = now
        session.flush()
        return envelope(
            [
                _catalog_json(session, product, _pricing_for(session, product.product_code))
                for product in selected
            ]
        )

    return _run_transaction(session, operation)


def create_catalog(
    session: Session,
    body: CatalogItemIn,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        name = body.name.strip()
        category = _get_category(session, body.category)
        brand = _get_brand(
            session,
            body.brandId,
            body.brand,
            create_by_name=True,
        )
        subcategory = _get_subcategory(
            session,
            category,
            body.subcategoryId,
            body.subcategory,
        )
        product_code = _clean(body.productCode) or f"PRD-{uuid4().hex[:10].upper()}"
        selling = _selling_from(body.mrp, body.discount, body.sellingPrice, body.standardRate)
        type_name, product_class = _resolve_product_taxonomy(
            body.type,
            body.subcategory,
            body.productClass,
            name,
            body.productName,
        )
        product = Catalog(created_at=_now(), updated_at=_now())
        result = _product_payload(
            session,
            product,
            category_name=category.name,
            brand_id=brand.id if brand else None,
            brand_name=brand.name if brand else None,
            type_name=type_name,
            subcategory=subcategory,
            group_ids=body.productGroupIds,
            values={
                "name": name,
                "product_name": _clean(body.productName) or name,
                "category_id": category.id,
                "unit": body.unit.strip(),
                "standard_rate": selling,
                "mrp": body.mrp,
                "selling_price": selling,
                "purchase_price": body.purchasePrice,
                "discount": body.discount,
                "stock": body.stock if body.stock is not None else 0,
                "product_code": product_code,
                "product_class": product_class or body.productClass,
                "product_group": body.productGroup,
                "subcategory": body.subcategory,
                "size": body.size
                or (
                    str(body.sizeCm)
                    if body.sizeCm is not None
                    else f"{body.sizeMm} mm" if body.sizeMm is not None else None
                ),
                "size_mm": body.sizeMm,
                "size_cm": body.sizeCm,
                "size_inch": body.sizeInch,
                "length": body.length,
                "aliases": [value.strip() for value in body.aliases if value.strip()],
                "multilingual_names": body.multilingualNames,
                "display_sequence": body.displaySequence,
                "reorder_level": body.reorderLevel,
                "regular_discount": body.regularDiscount,
                "image_url": body.imageUrl,
                "image_name": body.imageName,
                "std_pkg": body.stdPkg,
                "is_active": body.isActive,
            },
        )
        _pricing_write(
            session,
            product_code,
            body.mrp,
            selling,
            body.purchasePrice,
            body.discount,
        )
        return envelope(result)

    return _run_transaction(session, operation)


def update_catalog(
    session: Session,
    item_id: str,
    body: CatalogItemIn,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        product = session.scalar(
            select(Catalog)
            .where(Catalog.id == item_id, Catalog.deleted_at.is_(None))
            .with_for_update()
        )
        if product is None:
            raise CatalogServiceError(404, "Item not found")
        category = _get_category(session, body.category)
        brand = _get_brand(
            session,
            body.brandId,
            body.brand,
            create_by_name=False,
        )
        subcategory_id = body.subcategoryId
        if subcategory_id is None and body.subcategory is None:
            subcategory_id = product.subcategory_id
        subcategory_name = body.subcategory if body.subcategory is not None else product.subcategory
        subcategory = _get_subcategory(
            session,
            category,
            subcategory_id,
            subcategory_name,
        )
        selling = _selling_from(body.mrp, body.discount, body.sellingPrice, body.standardRate)
        type_name, product_class = _resolve_product_taxonomy(
            body.type if body.type is not None else product.type_name,
            subcategory_name,
            body.productClass
            if body.productClass is not None
            else product.product_class,
            body.productName or body.name,
        )
        size_cm = body.sizeCm if body.sizeCm is not None else product.size_cm
        size_mm = body.sizeMm if body.sizeMm is not None else product.size_mm
        size = body.size or (
            f"{size_cm} cm"
            if size_cm is not None
            else f"{body.sizeMm} mm"
            if body.sizeMm is not None
            else product.size
        )
        code = product.product_code
        group_ids = body.productGroupIds or _group_ids(session, product.id)
        result = _product_payload(
            session,
            product,
            category_name=category.name,
            brand_id=brand.id if brand else None,
            brand_name=brand.name if brand else None,
            type_name=type_name,
            subcategory=subcategory,
            group_ids=group_ids,
            values={
                "name": body.name.strip(),
                "product_name": body.productName or body.name.strip(),
                "category_id": category.id,
                "unit": body.unit.strip(),
                "standard_rate": selling,
                "mrp": body.mrp,
                "selling_price": selling,
                "purchase_price": body.purchasePrice,
                "discount": body.discount,
                "stock": body.stock if body.stock is not None else product.stock,
                "product_code": code,
                "product_class": product_class or body.productClass,
                "product_group": body.productGroup
                if body.productGroup is not None
                else product.product_group,
                "subcategory": subcategory_name,
                "size": size,
                "size_mm": size_mm,
                "size_cm": size_cm,
                "size_inch": body.sizeInch
                if body.sizeInch is not None
                else product.size_inch,
                "length": body.length if body.length is not None else product.length,
                "aliases": [value.strip() for value in body.aliases if value.strip()],
                "multilingual_names": body.multilingualNames,
                "display_sequence": body.displaySequence,
                "reorder_level": body.reorderLevel,
                "regular_discount": body.regularDiscount,
                "image_url": body.imageUrl,
                "image_name": body.imageName,
                "std_pkg": body.stdPkg if body.stdPkg is not None else product.std_pkg,
                "mrp_pkg": product.mrp_pkg,
                "hsn_code": product.hsn_code,
                "gst_rate": product.gst_rate,
                "is_active": body.isActive,
            },
        )
        _pricing_write(
            session,
            code,
            body.mrp,
            selling,
            body.purchasePrice,
            body.discount,
        )
        return envelope(result)

    return _run_transaction(session, operation)


def update_catalog_pricing(
    session: Session,
    item_id: str,
    body: CatalogPricingIn,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        product = session.scalar(
            select(Catalog)
            .where(Catalog.id == item_id, Catalog.deleted_at.is_(None))
            .with_for_update()
        )
        if product is None:
            raise CatalogServiceError(404, "Item not found")
        mrp = body.mrp if body.mrp is not None else product.mrp
        discount = body.discount if body.discount is not None else product.discount
        selling = _selling_from(
            mrp,
            discount,
            body.sellingPrice,
            product.selling_price or product.standard_rate or 0,
        )
        purchase = (
            body.purchasePrice
            if body.purchasePrice is not None
            else product.purchase_price
        )
        product.mrp = mrp
        product.discount = discount
        product.selling_price = selling
        product.standard_rate = selling
        product.purchase_price = purchase
        if body.stock is not None:
            product.stock = body.stock
        product.updated_at = _now()
        _pricing_write(
            session,
            product.product_code,
            mrp,
            selling,
            purchase,
            discount,
        )
        session.flush()
        return envelope(_catalog_json(session, product, _pricing_for(session, product.product_code)))

    return _run_transaction(session, operation)


def update_catalog_pricing_bulk(
    session: Session,
    body: CatalogBulkPricingIn,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        updated = 0
        skipped = 0
        for item_id in body.itemIds:
            product = session.scalar(
                select(Catalog)
                .where(Catalog.id == item_id, Catalog.deleted_at.is_(None))
                .with_for_update()
            )
            if product is None:
                skipped += 1
                continue
            mrp = body.mrp if body.mrp is not None else product.mrp
            discount = body.discount if body.discount is not None else product.discount
            selling = _selling_from(
                mrp,
                discount,
                None if body.mrp is not None or body.discount is not None else product.selling_price,
                product.standard_rate or 0,
            )
            product.mrp = mrp
            product.discount = discount
            product.selling_price = selling
            product.standard_rate = selling
            if body.stock is not None:
                product.stock = body.stock
            product.updated_at = _now()
            _pricing_write(
                session,
                product.product_code,
                mrp,
                selling,
                product.purchase_price,
                discount,
            )
            updated += 1
        return envelope({"updated": updated, "skipped": skipped})

    return _run_transaction(session, operation)


def _soft_delete_products(session: Session, products: list[Catalog]) -> int:
    now = _now()
    count = 0
    for product in products:
        if product.deleted_at is None:
            product.deleted_at = now
            product.updated_at = now
            count += 1
    if products:
        ids = [product.id for product in products]
        affected_group_ids = set(
            session.scalars(
                select(ProductGroupItem.product_group_id).where(
                    ProductGroupItem.product_id.in_(ids),
                    ProductGroupItem.deleted_at.is_(None),
                )
            ).all()
        )
        session.execute(
            update(ProductGroupItem)
            .where(
                ProductGroupItem.product_id.in_(ids),
                ProductGroupItem.deleted_at.is_(None),
            )
            .values(deleted_at=now, updated_at=now)
        )
        session.execute(
            update(RackSlot)
            .where(RackSlot.product_id.in_(ids))
            .values(product_id=None, updated_at=now)
        )
        _refresh_group_counts(session, affected_group_ids)
    return count


def delete_catalog(
    session: Session,
    item_id: str,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        product = session.scalar(
            select(Catalog)
            .where(Catalog.id == item_id, Catalog.deleted_at.is_(None))
            .with_for_update()
        )
        if product is None:
            raise CatalogServiceError(404, "Item not found")
        _soft_delete_products(session, [product])
        return envelope({"deleted": True, "id": item_id})

    return _run_transaction(session, operation)


def delete_catalog_secured(
    session: Session,
    item_id: str,
    body: AdminPasscodeIn,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        if not _verify_passcode(session, body):
            raise CatalogServiceError(401, "Invalid admin contact or passcode")
        product = session.scalar(
            select(Catalog)
            .where(Catalog.id == item_id, Catalog.deleted_at.is_(None))
            .with_for_update()
        )
        if product is None:
            raise CatalogServiceError(404, "Item not found")
        _soft_delete_products(session, [product])
        return envelope({"deleted": True, "id": item_id})

    return _run_transaction(session, operation)


def purge_catalog_by_field(
    session: Session,
    body: CatalogFieldPurgeIn,
) -> dict[str, Any] | JSONResponse:
    value = body.value.strip()

    def operation() -> dict[str, Any]:
        if not _verify_passcode(session, body):
            raise CatalogServiceError(401, "Invalid admin contact or passcode")
        if not value:
            raise CatalogServiceError(400, "Value is required")
        field = {
            "type": Catalog.type_name,
            "productClass": Catalog.product_class,
            "productGroup": Catalog.product_group,
        }[body.field]
        products = session.scalars(
            select(Catalog)
            .where(
                field.is_not(None),
                func.lower(field) == value.lower(),
                Catalog.deleted_at.is_(None),
            )
            .with_for_update()
        ).all()
        removed = _soft_delete_products(session, list(products))
        return envelope(
            {"productsRemoved": removed, "field": body.field, "value": value}
        )

    return _run_transaction(session, operation)


def _reset_catalog_tree(session: Session) -> dict[str, int]:
    now = _now()
    products = session.scalars(
        select(Catalog).where(Catalog.deleted_at.is_(None)).with_for_update()
    ).all()
    product_count = _soft_delete_products(session, list(products))

    entity_models: tuple[tuple[str, Any], ...] = (
        ("categories", Category),
        ("subcategories", Subcategory),
        ("productTypes", ProductType),
        ("productGroups", ProductGroup),
        ("brands", Brand),
        ("pricing", Pricing),
        ("pricingHistory", PricingHistory),
    )
    counts: dict[str, int] = {"catalog": product_count}
    for key, model in entity_models:
        result = session.execute(
            update(model)
            .where(model.deleted_at.is_(None))
            .values(deleted_at=now, updated_at=now)
        )
        counts[key] = result.rowcount or 0
    session.execute(
        update(RackSlot)
        .where(RackSlot.product_id.is_not(None))
        .values(product_id=None, updated_at=now)
    )
    return counts


def clear_catalog(session: Session) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        deleted = _reset_catalog_tree(session)
        return envelope({"deleted": deleted["catalog"], **deleted})

    return _run_transaction(session, operation)


def wipe_catalog_all(
    session: Session,
    body: AdminPasscodeIn,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        if not _verify_passcode(session, body):
            raise CatalogServiceError(401, "Invalid admin contact or passcode")
        return envelope(_reset_catalog_tree(session))

    return _run_transaction(session, operation)


def import_catalog(
    session: Session,
    body: CatalogImportIn,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        if body.replaceExisting:
            _reset_catalog_tree(session)
        inserted = updated = skipped = 0
        for row in body.items:
            was_inserted, was_updated = _add_import_row(
                session,
                row,
                mode=body.categoryMode,
                override=(body.overrideCategory or "").strip(),
                master=False,
            )
            if was_inserted:
                inserted += 1
            elif was_updated:
                updated += 1
            else:
                skipped += 1
        return envelope(
            {
                "inserted": inserted,
                "updated": updated,
                "skipped": skipped,
                "categoryMode": body.categoryMode,
            }
        )

    return _run_transaction(session, operation)


def import_catalog_master(
    session: Session,
    body: CatalogMasterImportIn,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        inserted = updated = skipped = 0
        for row in body.items:
            was_inserted, was_updated = _add_import_row(
                session,
                row,
                mode=body.categoryMode,
                override=(body.overrideCategory or "").strip(),
                master=True,
            )
            if was_inserted:
                inserted += 1
            elif was_updated:
                updated += 1
            else:
                skipped += 1
        return envelope(
            {
                "inserted": inserted,
                "updated": updated,
                "skipped": skipped,
                "categoryMode": body.categoryMode,
            }
        )

    return _run_transaction(session, operation)


def import_catalog_pricing(
    session: Session,
    body: CatalogPricingImportIn,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        updated = skipped = 0
        warnings: list[str] = []
        for index, row in enumerate(body.items, start=1):
            code = row.productCode.strip().rstrip("^")
            product = _catalog_by_code(session, code)
            if not code or product is None or product.deleted_at is not None:
                skipped += 1
                continue
            mrp = row.mrp if row.mrp is not None else product.mrp
            discount = row.discount if row.discount is not None else product.discount
            if mrp is None and discount is None and row.sellingPrice is None:
                skipped += 1
                continue
            selling = _selling_from(
                mrp,
                discount,
                row.sellingPrice,
                product.standard_rate or 0,
            )
            if row.mrp is not None and row.discount is not None:
                expected = _selling_from(mrp, discount, None, 0)
                if row.sellingPrice is not None and abs(row.sellingPrice - expected) > 0.02:
                    warnings.append(
                        f"Row {index} ({code}): selling price adjusted to {expected} from MRP and discount"
                    )
                selling = expected
            product.mrp = mrp
            product.discount = discount
            product.selling_price = selling
            product.standard_rate = selling
            product.updated_at = _now()
            _pricing_write(
                session,
                code,
                mrp,
                selling,
                product.purchase_price,
                discount,
            )
            updated += 1
        return envelope(
            {"updated": updated, "skipped": skipped, "warnings": warnings[:50]}
        )

    return _run_transaction(session, operation)


def import_catalog_stock(
    session: Session,
    body: CatalogStockImportIn,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        updated = skipped = 0
        for row in body.items:
            code = row.productCode.strip().rstrip("^")
            product = _catalog_by_code(session, code)
            if not code or product is None or product.deleted_at is not None or row.stock < 0:
                skipped += 1
                continue
            product.stock = float(row.stock)
            product.updated_at = _now()
            updated += 1
        return envelope({"updated": updated, "skipped": skipped})

    return _run_transaction(session, operation)


def catalog_tree(
    session: Session,
    *,
    active_only: bool = True,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        _sync_product_types(session, _now())
        products = session.scalars(
            select(Catalog).where(Catalog.deleted_at.is_(None))
        ).all()
        for product in products:
            if product.type_name:
                product_type = _get_product_type(session, product.type_name)
                if product_type and product.product_type_id != product_type.id:
                    product.product_type_id = product_type.id
                    product.updated_at = _now()
        categories = session.scalars(
            select(Category)
            .where(
                Category.deleted_at.is_(None),
                *([Category.is_active.is_(True)] if active_only else []),
            )
            .order_by(Category.name)
        ).all()
        types = session.scalars(
            select(ProductType).where(ProductType.deleted_at.is_(None))
        ).all()
        type_by_name = {value.name.strip().lower(): value for value in types}
        tree = []
        for category in categories:
            rows = session.execute(
                select(Catalog.type_name, func.count(Catalog.id))
                .where(
                    Catalog.deleted_at.is_(None),
                    Catalog.is_active.is_(True),
                    func.lower(Catalog.category) == category.name.lower(),
                )
                .group_by(Catalog.type_name)
            ).all()
            type_rows = []
            for name, count in rows:
                clean_name = name.strip() if isinstance(name, str) else ""
                if not clean_name:
                    continue
                product_type = type_by_name.get(clean_name.lower())
                if active_only and product_type is not None and not product_type.is_active:
                    continue
                type_rows.append(
                    {
                        "id": product_type.id if product_type else None,
                        "name": product_type.name if product_type else clean_name,
                        "imageUrl": product_type.image_url if product_type else None,
                        "productCount": count,
                    }
                )
            type_rows.sort(key=lambda value: value["name"].lower())
            tree.append(
                {
                    "id": category.id,
                    "name": category.name,
                    "imageUrl": category.image_url,
                    "isActive": category.is_active,
                    "productCount": sum(value["productCount"] for value in type_rows),
                    "types": type_rows,
                }
            )
        return envelope({"categories": tree})

    return _run_transaction(session, operation)
