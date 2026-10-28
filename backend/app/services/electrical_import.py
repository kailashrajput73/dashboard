"""Validate and import electrical_v1 master sheets + family images."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Brand, Catalog, Category, ProductFamily, ProductType, Subcategory
from app.services.catalog_family_util import (
    build_electrical_family_key,
    canonical_label,
    canonicalize_electrical_master_taxonomy,
    generate_electrical_sku_display_name,
    is_electrical_category_label,
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
from app.services.electrical_template import (
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
    colours: str
    compound: str
    conductor_core_pair: str
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

        category, type_name, subcategory, colours, compound, conductor_core_pair, brand, product_family = (
            canonicalize_electrical_master_taxonomy(
                category=row_get(row, column_map, "category"),
                type_name=row_get(row, column_map, "type"),
                subcategory=row_get(row, column_map, "sub_category"),
                colours=row_get(row, column_map, "colours"),
                compound=row_get(row, column_map, "compound"),
                conductor_core_pair=row_get(row, column_map, "conductor_core_pair"),
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
        if not colours:
            result.errors.append(
                _err(excel_row, "Colours", "Colours is required (e.g. Red, Black)")
            )
            continue
        if not compound:
            result.errors.append(
                _err(excel_row, "Compound", "Compound is required (e.g. FR-LSH LF)")
            )
            continue
        if not conductor_core_pair:
            result.errors.append(
                _err(
                    excel_row,
                    "Conductor/Core/Pair",
                    "Conductor/Core/Pair is required (e.g. Class-5, 2C)",
                )
            )
            continue
        if category and not is_electrical_category_label(category):
            result.errors.append(
                _err(
                    excel_row,
                    "Category",
                    f"Category '{category}' is not Electrical — use the Electrical upload, not Pipes & fittings",
                )
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

        family_key = build_electrical_family_key(
            category=category,
            type_name=type_name,
            subcategory=subcategory,
            colours=colours,
            compound=compound,
            conductor_core_pair=conductor_core_pair,
            brand=brand,
            product_family=product_family,
        )

        parsed.append(
            ParsedRow(
                excel_row=excel_row,
                category=category,
                type_name=type_name,
                subcategory=subcategory,
                colours=colours,
                compound=compound,
                conductor_core_pair=conductor_core_pair,
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


def validate_electrical_rows(
    session: Session,
    raw_rows: list[dict[str, Any]],
) -> ValidationResult:
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
            product_class=row.conductor_core_pair or None,
            colours=row.colours or None,
            compound=row.compound or None,
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
        family.colours = row.colours or family.colours
        family.compound = row.compound or family.compound
        family.product_class = row.conductor_core_pair or family.product_class
        family.hsn_code = row.hsn_code or family.hsn_code
        family.gst_rate = row.gst_rate if row.gst_rate is not None else family.gst_rate
        family.unit = row.unit or family.unit
        family.updated_at = now
    return family


def import_electrical_rows(
    session: Session,
    raw_rows: list[dict[str, Any]],
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        validation = validate_electrical_rows(session, raw_rows)
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
            display = generate_electrical_sku_display_name(
                type_name=row.type_name,
                product_family=row.product_family,
                colours=row.colours,
                compound=row.compound,
                conductor_core_pair=row.conductor_core_pair,
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
                "product_class": row.conductor_core_pair,
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


def _family_subcategory_name(session: Session, family: ProductFamily) -> str:
    if family.subcategory_id:
        return (
            session.scalar(
                select(Subcategory.name).where(Subcategory.id == family.subcategory_id)
            )
            or ""
        ).strip()
    catalog_sub = session.scalar(
        select(Catalog.subcategory)
        .where(
            Catalog.family_id == family.id,
            Catalog.deleted_at.is_(None),
        )
        .limit(1)
    )
    return (catalog_sub or "").strip()


def _family_brand_name(session: Session, family: ProductFamily) -> str:
    if family.brand_id:
        return (
            session.scalar(select(Brand.name).where(Brand.id == family.brand_id)) or ""
        ).strip()
    catalog_brand = session.scalar(
        select(Catalog.brand)
        .where(
            Catalog.family_id == family.id,
            Catalog.deleted_at.is_(None),
        )
        .limit(1)
    )
    return (catalog_brand or "").strip()


def _family_colours(session: Session, family: ProductFamily) -> str:
    value = (family.colours or "").strip()
    if value:
        return value
    return ""


def _family_compound(session: Session, family: ProductFamily) -> str:
    value = (family.compound or "").strip()
    if value:
        return value
    return ""


def _family_conductor(session: Session, family: ProductFamily) -> str:
    conductor = (family.product_class or "").strip()
    if conductor:
        return conductor
    catalog_class = session.scalar(
        select(Catalog.product_class)
        .where(
            Catalog.family_id == family.id,
            Catalog.deleted_at.is_(None),
        )
        .limit(1)
    )
    return (catalog_class or "").strip()


def _iter_electrical_families(session: Session) -> list[ProductFamily]:
    category_names = {
        row[0]: row[1]
        for row in session.execute(select(Category.id, Category.name)).all()
    }
    families = session.scalars(
        select(ProductFamily)
        .where(ProductFamily.deleted_at.is_(None))
        .order_by(ProductFamily.name)
    ).all()
    return [
        family
        for family in families
        if is_electrical_category_label(category_names.get(family.category_id, ""))
    ]


def electrical_image_filter_options(
    session: Session,
    *,
    subcategory: str | None = None,
    colours: str | None = None,
    compound: str | None = None,
    brand: str | None = None,
) -> dict[str, list[str]]:
    """Cascade dropdown values for the fill-image popup."""
    sub_key = normalize_label(subcategory) if subcategory and subcategory.strip() else ""
    colours_key = normalize_label(colours) if colours and colours.strip() else ""
    compound_key = normalize_label(compound) if compound and compound.strip() else ""
    brand_key = normalize_label(brand) if brand and brand.strip() else ""

    subcategories: set[str] = set()
    colour_values: set[str] = set()
    compounds: set[str] = set()
    brands: set[str] = set()
    product_families: set[str] = set()

    for family in _iter_electrical_families(session):
        sub_name = _family_subcategory_name(session, family)
        colour_name = _family_colours(session, family)
        compound_name = _family_compound(session, family)
        brand_name = _family_brand_name(session, family)
        if sub_key and normalize_label(sub_name) != sub_key:
            continue
        if sub_name.strip():
            subcategories.add(sub_name.strip())
        if not sub_key:
            continue
        if colours_key and normalize_label(colour_name) != colours_key:
            continue
        if colour_name.strip():
            colour_values.add(colour_name.strip())
        if not colours_key:
            continue
        if compound_key and normalize_label(compound_name) != compound_key:
            continue
        if compound_name.strip():
            compounds.add(compound_name.strip())
        if not compound_key:
            continue
        if brand_key and normalize_label(brand_name) != brand_key:
            continue
        if brand_name.strip():
            brands.add(brand_name.strip())
        if not brand_key:
            continue
        if family.name.strip():
            product_families.add(family.name.strip())

    sort_key = lambda value: normalize_label(value)
    return {
        "subcategories": sorted(subcategories, key=sort_key),
        "colours": sorted(colour_values, key=sort_key),
        "compounds": sorted(compounds, key=sort_key),
        "brands": sorted(brands, key=sort_key),
        "productFamilies": sorted(product_families, key=sort_key),
        # Legacy key for older web builds
        "conductors": sorted(compounds, key=sort_key),
    }


def resolve_electrical_family_for_image(
    session: Session,
    *,
    subcategory: str,
    colours: str,
    compound: str,
    brand: str,
    product_family: str,
) -> list[ProductFamily]:
    sub_key = normalize_label(subcategory)
    colours_key = normalize_label(colours)
    compound_key = normalize_label(compound)
    brand_key = normalize_label(brand)
    family_key = normalize_label(product_family)
    if not all([sub_key, colours_key, compound_key, brand_key, family_key]):
        return []

    matched: list[ProductFamily] = []
    for family in _iter_electrical_families(session):
        if normalize_label(family.name) != family_key:
            continue
        if normalize_label(_family_subcategory_name(session, family)) != sub_key:
            continue
        if normalize_label(_family_colours(session, family)) != colours_key:
            continue
        if normalize_label(_family_compound(session, family)) != compound_key:
            continue
        if normalize_label(_family_brand_name(session, family)) != brand_key:
            continue
        matched.append(family)
    return matched


def validate_electrical_family_image(
    session: Session,
    *,
    subcategory: str,
    colours: str,
    compound: str,
    brand: str,
    product_family: str,
    image_url: str,
) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    if not canonical_label(subcategory):
        errors.append(_err(None, "subcategory", "Sub-category is required"))
    if not canonical_label(colours):
        errors.append(_err(None, "colours", "Colours is required"))
    if not canonical_label(compound):
        errors.append(_err(None, "compound", "Compound is required"))
    if not canonical_label(brand):
        errors.append(_err(None, "brand", "Brand is required"))
    if not canonical_label(product_family):
        errors.append(_err(None, "product_family", "product_family is required"))
    url = canonical_label(image_url)
    if not url:
        errors.append(_err(None, "image_url", "image_url is required"))
    elif not url.lower().startswith(("http://", "https://")):
        errors.append(_err(None, "image_url", "image_url must start with http:// or https://"))
    if errors:
        return errors
    families = resolve_electrical_family_for_image(
        session,
        subcategory=subcategory,
        colours=colours,
        compound=compound,
        brand=brand,
        product_family=product_family,
    )
    if not families:
        errors.append(
            _err(
                None,
                "product_family",
                (
                    "No electrical family matches sub-category, colours, compound, brand, and product_family. "
                    "Import the electrical master sheet first (same spelling)."
                ),
            )
        )
    elif len(families) > 1:
        errors.append(
            _err(
                None,
                "product_family",
                "More than one family matches — contact support (data should be unique).",
            )
        )
    return errors


def import_electrical_family_image(
    session: Session,
    *,
    subcategory: str,
    colours: str,
    compound: str,
    brand: str,
    product_family: str,
    image_url: str,
    conductor_core_pair: str | None = None,
) -> dict[str, Any] | JSONResponse:
    def operation() -> dict[str, Any]:
        errors = validate_electrical_family_image(
            session,
            subcategory=subcategory,
            colours=colours,
            compound=compound,
            brand=brand,
            product_family=product_family,
            image_url=image_url,
        )
        if errors:
            return envelope(
                {"updated": 0, "valid": False, "errors": errors},
                success=False,
                error="Family image validation failed",
            )
        families = resolve_electrical_family_for_image(
            session,
            subcategory=subcategory,
            colours=colours,
            compound=compound,
            brand=brand,
            product_family=product_family,
        )
        family = families[0]
        family.image_url = canonical_label(image_url)
        family.updated_at = _now()
        return envelope({"updated": 1, "valid": True, "errors": [], "familyId": family.id})

    return _run_transaction(session, operation)
