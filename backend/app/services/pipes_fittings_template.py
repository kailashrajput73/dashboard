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


_COLUMN_NORMS = {**REQUIRED_HEADERS, **OPTIONAL_HEADERS}


def cell_looks_like_column_header(cell: str, norm_key: str) -> bool:
    """True when a data cell repeats the row-1 column title (duplicate header row)."""
    if not str(cell).strip():
        return False
    display = _COLUMN_NORMS.get(norm_key)
    if not display:
        return False
    cell_norm = normalize_header(str(cell)).replace("_", " ")
    key_norm = normalize_header(display).replace("_", " ")
    return normalize_header(str(cell)) == norm_key or cell_norm == key_norm


def count_header_like_cells(row: dict[str, Any], column_map: dict[str, str]) -> int:
    return sum(
        1
        for norm_key in _COLUMN_NORMS
        if cell_looks_like_column_header(row_get(row, column_map, norm_key), norm_key)
    )


def is_duplicate_header_data_row(row: dict[str, Any], column_map: dict[str, str]) -> bool:
    """Detect a second header row or header text pasted into a data row."""
    if count_header_like_cells(row, column_map) >= 3:
        return True
    code = row_get(row, column_map, "product_code")
    if cell_looks_like_column_header(code, "product_code"):
        return True
    if (
        cell_looks_like_column_header(row_get(row, column_map, "category"), "category")
        and cell_looks_like_column_header(row_get(row, column_map, "type"), "type")
    ):
        return True
    if (
        cell_looks_like_column_header(row_get(row, column_map, "category"), "category")
        and cell_looks_like_column_header(row_get(row, column_map, "product_family"), "product_family")
    ):
        return True
    return False


def product_code_looks_like_header_label(code: str) -> bool:
    """Product code cell contains a column title instead of a SKU."""
    text = str(code or "").strip()
    if not text:
        return False
    if cell_looks_like_column_header(text, "product_code"):
        return True
    blocked = {
        normalize_header("Category"),
        normalize_header("Type"),
        normalize_header("Brand"),
        normalize_header("product_family"),
        normalize_header("product"),
        normalize_header("Product Name"),
        normalize_header("status"),
        normalize_header("ROL"),
        normalize_header("HSN Code"),
    }
    return normalize_header(text) in blocked


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

    for norm in OPTIONAL_HEADERS:
        if norm in seen:
            column_map[norm] = seen[norm]

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
