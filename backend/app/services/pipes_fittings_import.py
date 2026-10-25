"""Validate and import pipes_fittings_v1 master sheets."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Brand, Catalog, Category, ProductFamily, ProductType, Subcategory
from app.services.catalog_family_util import (
    build_family_key,
    canonical_label,
    canonicalize_pipes_master_taxonomy,
    generate_sku_display_name,
    normalize_discount,
    normalize_gst_rate,
    normalize_hsn,
    normalize_label,
    normalize_uom,
)
from app.services._common import envelope
from app.services.catalog_service import (
    _catalog_by_code,
    _get_brand,
    _get_category,
    _get_product_type,
    _get_subcategory,
    _now,
    _pricing_write,
    _product_payload,
    _run_transaction,
    _selling_from,
)
from app.services.pipes_fittings_template import (
    TEMPLATE_ID,
    is_duplicate_header_data_row,
    parse_product_status,
    product_code_looks_like_header_label,
    row_get,
    validate_headers,
)
from fastapi.responses import JSONResponse


@dataclass
class ParsedRow:
    excel_row: int
    category: str
    type_name: str
    subcategory: str
    product_class: str
    brand: str
    product_family: str
    hsn_code: str
    gst_rate: float | None
    unit: str
    size: str
    length: str
    product_code: str
    mrp: float | None
    discount: float | None
    selling_price: float | None
    std_pkg: float | None
    mrp_pkg: float | None
    reorder_level: float
    family_key: str
    is_active: bool = False


@dataclass
class ValidationResult:
    errors: list[dict[str, Any]] = field(default_factory=list)
    rows: list[ParsedRow] = field(default_factory=list)
    skipped_blank_rows: int = 0
    rejected_header_rows: int = 0

    @property
    def ok(self) -> bool:
        return not self.errors


def _parse_float(value: str) -> float | None:
    if not value or not str(value).strip():
        return None
    text = str(value).replace(",", "").strip()
    try:
        return float(text)
    except ValueError:
        return None


def _err(row: int | None, column: str | None, message: str) -> dict[str, Any]:
    return {"row": row, "column": column, "message": message}


def parse_rows(
    raw_rows: list[dict[str, Any]],
    *,
    header_row: int = 1,
) -> ValidationResult:
    if not raw_rows:
        return ValidationResult(errors=[_err(None, None, "No data rows")])

    first_keys = [str(k) for k in raw_rows[0].keys()]
    column_map, header_errors = validate_headers(first_keys)
    result = ValidationResult(errors=list(header_errors))
    if header_errors:
        return result

    parsed: list[ParsedRow] = []
    codes: dict[str, int] = {}

    for index, raw in enumerate(raw_rows):
        excel_row = header_row + 1 + index
        row = {str(k): raw[k] for k in raw}

        category, type_name, subcategory, product_class, brand, product_family = (
            canonicalize_pipes_master_taxonomy(
                category=row_get(row, column_map, "category"),
                type_name=row_get(row, column_map, "type"),
                subcategory=row_get(row, column_map, "sub_category"),
                product_class=row_get(row, column_map, "class"),
                brand=row_get(row, column_map, "brand"),
                product_family=row_get(row, column_map, "product_family"),
            )
        )
        product_code = row_get(row, column_map, "product_code").strip().rstrip("^")
        size = canonical_label(row_get(row, column_map, "size_mm_cm_in"))
        length = canonical_label(row_get(row, column_map, "length"))

        if not any([category, type_name, product_family, product_code]):
            result.skipped_blank_rows += 1
            continue

        if is_duplicate_header_data_row(row, column_map):
            result.rejected_header_rows += 1
            result.errors.append(
                _err(
                    excel_row,
                    None,
                    (
                        "This row looks like a duplicate header row (column titles pasted as data). "
                        "Keep headers on row 1 only; delete or fix this row."
                    ),
                )
            )
            continue

        if not product_code:
            result.errors.append(
                _err(excel_row, "product code", "Product code is required")
            )
            continue

        if product_code_looks_like_header_label(product_code):
            result.rejected_header_rows += 1
            result.errors.append(
                _err(
                    excel_row,
                    "product code",
                    (
                        f"Product code '{product_code}' looks like a column header, not a real SKU. "
                        "Remove duplicate header rows from the sheet."
                    ),
                )
            )
            continue

        if product_code and not category and not type_name:
            result.errors.append(
                _err(
                    excel_row,
                    "Category",
                    (
                        "Row has a product code but is missing Category and Type. "
                        "Check for incomplete rows or header text mixed into data."
                    ),
                )
            )
            continue
        if not size and not length:
            result.errors.append(
                _err(excel_row, "Size (mm,cm,in)", "Size or Length is required")
            )
            continue
        if not product_family:
            result.errors.append(
                _err(excel_row, "product_family", "product_family is required")
            )
            continue

        if product_code in codes:
            result.errors.append(
                _err(
                    excel_row,
                    "product code",
                    (
                        f"Duplicate product code '{product_code}' (first used on row {codes[product_code]}). "
                        f"This row: product_family='{product_family}', size='{size or length}'. "
                        "Each size/SKU needs its own unique code."
                    ),
                )
            )
        else:
            codes[product_code] = excel_row

        hsn = normalize_hsn(row_get(row, column_map, "hsn_code"))
        gst = normalize_gst_rate(row_get(row, column_map, "gst") or None)
        unit = normalize_uom(row_get(row, column_map, "uom") or "pcs")
        mrp = _parse_float(row_get(row, column_map, "mrp_rs_per_nos"))
        discount = normalize_discount(row_get(row, column_map, "discount") or None)
        selling = _parse_float(row_get(row, column_map, "selling_price"))
        std_pkg = _parse_float(row_get(row, column_map, "pack_size"))
        mrp_pkg = _parse_float(row_get(row, column_map, "mrp_pkg"))
        rol_raw = _parse_float(row_get(row, column_map, "rol"))
        reorder = float(rol_raw if rol_raw is not None else 0)
        status_raw = row_get(row, column_map, "status") if "status" in column_map else ""
        is_active = parse_product_status(status_raw)

        family_key = build_family_key(
            category=category,
            type_name=type_name,
            subcategory=subcategory,
            product_class=product_class,
            brand=brand,
            product_family=product_family,
        )

        parsed.append(
            ParsedRow(
                excel_row=excel_row,
                category=category,
                type_name=type_name,
                subcategory=subcategory,
                product_class=product_class,
                brand=brand,
                product_family=product_family,
                hsn_code=hsn,
                gst_rate=gst,
                unit=unit,
                size=size,
                length=length,
                product_code=product_code,
                mrp=mrp,
                discount=discount,
                selling_price=selling,
                std_pkg=std_pkg,
                mrp_pkg=mrp_pkg,
                reorder_level=reorder,
                family_key=family_key,
                is_active=is_active,
            )
        )

    _check_family_consistency(parsed, result)
    _check_code_family_consistency(parsed, result)
    result.rows = parsed
    return result


def _check_family_consistency(parsed: list[ParsedRow], result: ValidationResult) -> None:
    by_family: dict[str, list[ParsedRow]] = {}
    for row in parsed:
        by_family.setdefault(row.family_key, []).append(row)

    for family_rows in by_family.values():
        hsns = {r.hsn_code for r in family_rows if r.hsn_code}
        if len(hsns) > 1:
            rows = ", ".join(str(r.excel_row) for r in family_rows[:5])
            result.errors.append(
                _err(
                    family_rows[0].excel_row,
                    "HSN Code",
                    f"Conflicting HSN for same family (rows include {rows}): {sorted(hsns)}",
                )
            )
        gsts = {r.gst_rate for r in family_rows if r.gst_rate is not None}
        if len(gsts) > 1:
            result.errors.append(
                _err(
                    family_rows[0].excel_row,
                    "GST",
                    f"Conflicting GST for same family: {sorted(gsts)}",
                )
            )
        uoms = {normalize_label(r.unit) for r in family_rows if r.unit}
        if len(uoms) > 1:
            result.errors.append(
                _err(
                    family_rows[0].excel_row,
                    "UoM",
                    f"Conflicting UoM for same family: {sorted(uoms)}",
                )
            )


def _check_code_family_consistency(parsed: list[ParsedRow], result: ValidationResult) -> None:
    by_code: dict[str, ParsedRow] = {}
    for row in parsed:
        existing = by_code.get(row.product_code)
        if existing and existing.family_key != row.family_key:
            result.errors.append(
                _err(
                    row.excel_row,
                    "product code",
                    (
                        f"Product code '{row.product_code}' already on row {existing.excel_row} "
                        f"(family '{existing.product_family}', size '{existing.size or existing.length}'). "
                        f"This row is family '{row.product_family}', size '{row.size or row.length}'. "
                        "Use one code per SKU or fix the family/size so they match."
                    ),
                )
            )
        by_code[row.product_code] = row


def _resolve_family_for_import_row(
    session: Session,
    row: ParsedRow,
    category: Category,
) -> ProductFamily:
    """Existing SKUs keep their DB family on re-upload; new SKUs use family_key upsert."""
    existing = _catalog_by_code(session, row.product_code)
    if existing is not None and existing.deleted_at is None and existing.family_id:
        family = session.get(ProductFamily, existing.family_id)
        if family is not None and family.deleted_at is None:
            return family
    return _upsert_family(session, row, category)


def validate_pipes_fittings_rows(
    session: Session,
    raw_rows: list[dict[str, Any]],
) -> ValidationResult:
    """Validate sheet; existing product codes may be updated on import (no family_key block)."""
    return parse_rows(raw_rows)


def _upsert_family(session: Session, row: ParsedRow, category: Category) -> ProductFamily:
    family = session.scalar(
        select(ProductFamily).where(
            ProductFamily.family_key == row.family_key,
            ProductFamily.deleted_at.is_(None),
        )
    )
    brand = _get_brand(session, None, row.brand, create_by_name=True)
    subcategory = (
        _get_subcategory(
            session,
            category,
            None,
            row.subcategory,
            create_by_name=True,
        )
        if row.subcategory
        else None
    )
    product_type = _get_product_type(session, row.type_name) if row.type_name else None

    now = _now()
    if family is None:
        family = ProductFamily(
            category_id=category.id,
            subcategory_id=subcategory.id if subcategory else None,
            brand_id=brand.id if brand else None,
            product_type_id=product_type.id if product_type else None,
            product_class=row.product_class or None,
            name=row.product_family,
            family_key=row.family_key,
            hsn_code=row.hsn_code or None,
            gst_rate=row.gst_rate,
            unit=row.unit,
            created_at=now,
            updated_at=now,
        )
        session.add(family)
        session.flush()
    else:
        family.deleted_at = None
        family.hsn_code = row.hsn_code or family.hsn_code
        family.gst_rate = row.gst_rate if row.gst_rate is not None else family.gst_rate
        family.unit = row.unit or family.unit
        family.updated_at = now
    return family


def import_pipes_fittings_rows(
    session: Session,
    raw_rows: list[dict[str, Any]],
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        validation = validate_pipes_fittings_rows(session, raw_rows)
        if not validation.ok:
            return envelope(
                {
                    "templateId": TEMPLATE_ID,
                    "valid": False,
                    "errors": validation.errors,
                },
                success=False,
                error="Sheet validation failed",
            )

        inserted = updated = 0
        for row in validation.rows:
            category = _get_category(session, row.category)
            family = _resolve_family_for_import_row(session, row, category)
            brand = session.get(Brand, family.brand_id) if family.brand_id else None
            subcategory = (
                session.get(Subcategory, family.subcategory_id)
                if family.subcategory_id
                else None
            )
            display = generate_sku_display_name(
                type_name=row.type_name,
                product_family=row.product_family,
                product_class=row.product_class,
                size=row.size,
                brand=row.brand,
                length=row.length,
            )
            selling = row.selling_price
            if selling is None:
                selling = _selling_from(row.mrp, row.discount, None, 0)
            if selling is None:
                selling = 0.0

            existing = _catalog_by_code(session, row.product_code)
            was_insert = existing is None or existing.deleted_at is not None

            values = {
                "name": display,
                "product_name": display,
                "category_id": category.id,
                "unit": row.unit,
                "standard_rate": selling,
                "mrp": row.mrp,
                "selling_price": selling,
                "discount": row.discount,
                "stock": float(existing.stock if existing and not was_insert else 0),
                "product_code": row.product_code,
                "product_class": row.product_class,
                "size": row.size or row.length,
                "length": row.length or None,
                "reorder_level": row.reorder_level,
                "std_pkg": row.std_pkg,
                "mrp_pkg": row.mrp_pkg,
                "hsn_code": None,
                "gst_rate": None,
                "image_url": None,
                "is_active": row.is_active,
            }
            product = existing or Catalog(created_at=_now(), updated_at=_now())
            _product_payload(
                session,
                product,
                category_name=category.name,
                brand_id=brand.id if brand else None,
                brand_name=brand.name if brand else row.brand,
                type_name=row.type_name,
                subcategory=subcategory,
                values=values,
                group_ids=[],
            )
            product.family_id = family.id
            product.qr_code = row.product_code
            session.flush()
            _pricing_write(
                session,
                row.product_code,
                row.mrp,
                selling,
                product.purchase_price,
                row.discount,
            )
            if was_insert:
                inserted += 1
            else:
                updated += 1

        return envelope(
            {
                "templateId": TEMPLATE_ID,
                "valid": True,
                "inserted": inserted,
                "updated": updated,
                "skipped": 0,
            }
        )

    return _run_transaction(session, operation)


def _family_needs_image(family: ProductFamily) -> bool:
    url = (family.image_url or "").strip()
    if not url:
        return True
    return not url.lower().startswith(("http://", "https://"))


def _family_type_and_brand(
    session: Session,
    family: ProductFamily,
) -> tuple[str, str]:
    brand_name = ""
    if family.brand_id:
        brand_name = (
            session.scalar(select(Brand.name).where(Brand.id == family.brand_id)) or ""
        )
    type_name = ""
    if family.product_type_id:
        type_name = (
            session.scalar(
                select(ProductType.name).where(ProductType.id == family.product_type_id)
            )
            or ""
        )
    return brand_name, type_name


def image_sidecar_row_key(
    *,
    brand: str,
    product_family: str,
    type_name: str,
    product_class: str,
) -> tuple[str, str, str, str]:
    """One logical family row in the image sidecar (brand + family + type + class)."""
    return (
        normalize_label(brand),
        normalize_label(product_family),
        normalize_label(type_name),
        normalize_label(product_class),
    )


def families_for_image_sidecar_item(
    session: Session,
    item: dict[str, Any],
) -> list[ProductFamily]:
    """Match DB families for an image sheet row (type/class aware)."""
    brand = canonical_label(str(item.get("brand") or ""))
    family_name = canonical_label(
        str(item.get("product_family") or item.get("product") or "")
    )
    type_name = canonical_label(str(item.get("type") or item.get("Type") or ""))
    product_class = canonical_label(
        str(item.get("class") or item.get("product_class") or item.get("productClass") or "")
    )
    if not family_name:
        return []

    candidates = session.scalars(
        select(ProductFamily).where(
            ProductFamily.deleted_at.is_(None),
            ProductFamily.name.ilike(family_name),
        )
    ).all()
    matched: list[ProductFamily] = []
    for family in candidates:
        fam_brand, fam_type = _family_type_and_brand(session, family)
        fam_class = canonical_label(family.product_class or "")
        if brand and normalize_label(fam_brand) != normalize_label(brand):
            continue
        if type_name and normalize_label(fam_type) != normalize_label(type_name):
            continue
        if product_class and normalize_label(fam_class) != normalize_label(product_class):
            continue
        matched.append(family)
    return matched


def pipes_fittings_image_template_rows(
    session: Session,
    *,
    subcategory: str | None = None,
    missing_image_only: bool = True,
) -> list[dict[str, str]]:
    """Rows for image sidecar CSV; optional subcategory filter and missing-image-only."""
    families = session.scalars(
        select(ProductFamily)
        .where(ProductFamily.deleted_at.is_(None))
        .order_by(ProductFamily.name)
    ).all()
    subcategory_key = normalize_label(subcategory) if subcategory and subcategory.strip() else ""
    rows: list[dict[str, str]] = []
    seen_keys: set[tuple[str, str, str, str]] = set()
    for family in families:
        if missing_image_only and not _family_needs_image(family):
            continue
        sub_name = ""
        if family.subcategory_id:
            sub_name = (
                session.scalar(
                    select(Subcategory.name).where(Subcategory.id == family.subcategory_id)
                )
                or ""
            )
        if subcategory_key and normalize_label(sub_name) != subcategory_key:
            continue
        brand_name, type_name = _family_type_and_brand(session, family)
        product_class = (family.product_class or "").strip()
        key = image_sidecar_row_key(
            brand=brand_name,
            product_family=family.name,
            type_name=type_name,
            product_class=product_class,
        )
        if key in seen_keys:
            continue
        seen_keys.add(key)
        rows.append(
            {
                "brand": brand_name,
                "product_family": family.name,
                "type": type_name,
                "class": product_class,
                "image_url": "",
            }
        )
    rows.sort(
        key=lambda row: (
            normalize_label(row["brand"]),
            normalize_label(row["type"]),
            normalize_label(row["class"]),
            normalize_label(row["product_family"]),
        )
    )
    return rows


def validate_pipes_fittings_image_items(
    session: Session,
    items: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], int]:
    """Returns (errors, match_count). Excel data rows start at row 2."""
    errors: list[dict[str, Any]] = []
    match_count = 0
    for excel_row, item in enumerate(items, start=2):
        brand = canonical_label(str(item.get("brand") or ""))
        family_name = canonical_label(
            str(item.get("product_family") or item.get("product") or "")
        )
        url = canonical_label(str(item.get("image_url") or item.get("imageUrl") or ""))
        type_name = canonical_label(str(item.get("type") or item.get("Type") or ""))
        product_class = canonical_label(
            str(item.get("class") or item.get("product_class") or item.get("productClass") or "")
        )
        if not family_name:
            errors.append(
                _err(excel_row, "product_family", "product_family is required")
            )
            continue
        if not url:
            errors.append(_err(excel_row, "image_url", "image_url is required"))
            continue
        families = families_for_image_sidecar_item(session, item)
        if not families:
            errors.append(
                _err(
                    excel_row,
                    "product_family",
                    (
                        f"No family in database for brand='{brand or '(any)'}' "
                        f"type='{type_name or '(any)'}' class='{product_class or '(any)'}' "
                        f"product_family='{family_name}'. "
                        "Import the pipes master sheet first (same spelling), then upload images."
                    ),
                )
            )
            continue
        match_count += len(families)
    return errors, match_count


def import_pipes_fittings_images(
    session: Session,
    items: list[dict[str, Any]],
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        errors, _match_count = validate_pipes_fittings_image_items(session, items)
        if errors:
            return envelope(
                {"updated": 0, "valid": False, "errors": errors},
                success=False,
                error="Image sheet validation failed",
            )

        updated = 0
        updated_ids: set[str] = set()
        for _excel_row, item in enumerate(items, start=2):
            url = canonical_label(str(item.get("image_url") or item.get("imageUrl") or ""))
            if not url:
                continue
            families = families_for_image_sidecar_item(session, item)
            for family in families:
                if family.id in updated_ids:
                    continue
                family.image_url = url
                family.updated_at = _now()
                updated_ids.add(family.id)
                updated += 1
        return envelope({"updated": updated, "valid": True, "errors": []})

    return _run_transaction(session, operation)
