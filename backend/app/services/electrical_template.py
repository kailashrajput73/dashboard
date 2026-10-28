"""Electrical v1 spreadsheet template."""

from __future__ import annotations

from typing import Any

from app.services.catalog_family_util import normalize_header
from app.services.pipes_fittings_template import (
    ACTIVE_STATUS_TOKENS,
    parse_product_status,
    row_get,
)

TEMPLATE_ID = "electrical_v1"

REQUIRED_HEADERS: dict[str, str] = {
    "category": "Category",
    "type": "Type",
    "sub_category": "Sub-Category",
    "colours": "Colours",
    "compound": "Compound",
    "conductor_core_pair": "Conductor/Core/Pair",
    "brand": "Brand",
    "hsn_code": "HSN Code",
    "gst": "GST",
    "uom": "UoM",
    "product_family": "product_family",
    "size_mm_cm_in": "Size (mm,cm,in)",
    "length": "Length",
    "product_code": "Product Code",
    "mrp_rs_per_nos": "MRP (Rs) per nos",
    "discount": "discount",
    "selling_price": "Selling Price",
    "pack_size": "Pack Size",
    "mrp_pkg": "MRP Pkg",
    "rol": "ROL",
}

PRODUCT_FAMILY_ALIASES = ("product_family", "product")
PRODUCT_CODE_ALIASES = ("product_code", "product_code")

OPTIONAL_HEADERS = {
    "product_name": "Product Name",
    "status": "status",
}

_COLUMN_NORMS = {**REQUIRED_HEADERS, **OPTIONAL_HEADERS}


def cell_looks_like_column_header(cell: str, norm_key: str) -> bool:
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
        normalize_header("Product Name"),
        normalize_header("status"),
        normalize_header("Conductor/Core/Pair"),
        normalize_header("Colours"),
        normalize_header("Compound"),
    }
    return normalize_header(text) in blocked


def validate_headers(raw_headers: list[str]) -> tuple[dict[str, str], list[dict[str, str | int | None]]]:
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
        if norm == "product_code":
            for key, original in seen.items():
                if key == "product_code" or normalize_header(original) == "product_code":
                    column_map["product_code"] = original
                    break
            if "product_code" in column_map:
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
        if norm == "colours":
            for key, original in seen.items():
                if key in ("colours", "colors", "color"):
                    column_map["colours"] = original
                    break
            if "colours" in column_map:
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
        | {"product_name", "product_code", "colors", "color"}
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


__all__ = [
    "ACTIVE_STATUS_TOKENS",
    "TEMPLATE_ID",
    "is_duplicate_header_data_row",
    "parse_product_status",
    "product_code_looks_like_header_label",
    "row_get",
    "validate_headers",
]
