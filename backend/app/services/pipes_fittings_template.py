"""Pipes & fittings v1 spreadsheet template (see migration-db/CATALOG-DESIGN-RULES.md)."""

from __future__ import annotations

from typing import Any

from app.services.catalog_family_util import normalize_header

TEMPLATE_ID = "pipes_fittings_v1"

# Required headers (normalized form -> canonical label for errors)
REQUIRED_HEADERS: dict[str, str] = {
    "category": "Category",
    "type": "Type",
    "sub_category": "Sub-Category",
    "class": "class",
    "brand": "Brand",
    "hsn_code": "HSN Code",
    "gst": "GST",
    "uom": "UoM",
    "product_family": "product_family",
    "size_mm_cm_in": "Size (mm,cm,in)",
    "length": "Length",
    "product_code": "product code",
    "mrp_rs_per_nos": "MRP (Rs) per nos",
    "discount": "discount",
    "selling_price": "Selling Price",
    "pack_size": "Pack Size",
    "mrp_pkg": "MRP Pkg",
    "rol": "ROL",
}

# Legacy alias: sheet may still use "product"
PRODUCT_FAMILY_ALIASES = ("product_family", "product")

OPTIONAL_HEADERS = {
    "product_name": "Product Name",
    "status": "status",
}

ACTIVE_STATUS_TOKENS = frozenset({"active", "yes", "y", "1", "true", "live"})


def parse_product_status(value: str | None) -> bool:
    """Empty status → inactive; explicit active tokens → active."""
    text = normalize_header(str(value or "")).replace("_", " ").strip().lower()
    if not text:
        return False
    if text in ACTIVE_STATUS_TOKENS:
        return True
    return False


def validate_headers(raw_headers: list[str]) -> tuple[dict[str, str], list[dict[str, str | int | None]]]:
    """
    Map normalized header -> original column label in file.
    Returns (column_map, errors). column_map keys are normalized names.
    """
    errors: list[dict[str, str | int | None]] = []
    seen: dict[str, str] = {}
    for raw in raw_headers:
        norm = normalize_header(raw)
        if not norm:
            continue
        if norm in seen:
            continue
        seen[norm] = raw.strip()

    column_map: dict[str, str] = {}
    for norm, display in REQUIRED_HEADERS.items():
        if norm in seen:
            column_map[norm] = seen[norm]
            continue
        if norm == "product_family":
            matched = False
            for alias in PRODUCT_FAMILY_ALIASES:
                if alias in seen:
                    column_map["product_family"] = seen[alias]
                    matched = True
                    break
            if matched:
                continue
        errors.append(
            {
                "row": 1,
                "column": display,
                "message": f"Missing required column: {display}",
            }
        )

    allowed_norms = (
        set(REQUIRED_HEADERS)
        | set(OPTIONAL_HEADERS)
        | set(PRODUCT_FAMILY_ALIASES)
        | {"product_name"}
    )
    for norm, original in seen.items():
        if norm not in allowed_norms:
            errors.append(
                {
                    "row": 1,
                    "column": original,
                    "message": f"Unexpected column (not part of {TEMPLATE_ID}): {original}",
                }
            )

    return column_map, errors


def row_get(row: dict[str, Any], column_map: dict[str, str], norm_key: str) -> str:
    header = column_map.get(norm_key)
    if not header:
        return ""
    for key, value in row.items():
        if normalize_header(str(key)) == norm_key or key == header:
            return str(value or "").strip()
    return str(row.get(header, "") or "").strip()
