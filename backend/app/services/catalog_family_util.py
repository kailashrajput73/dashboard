"""Product family keys, normalization, and SKU display names (locked rules)."""

from __future__ import annotations

import re
from typing import Any


def normalize_label(value: str | None) -> str:
    if value is None:
        return ""
    cleaned = re.sub(r"\s+", " ", str(value).strip())
    return cleaned.casefold()


def canonical_label(value: str | None) -> str:
    """First-seen display form: trim and collapse spaces, preserve casing."""
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip())


# Sheet / legacy category labels that must share one family_key.
_CATEGORY_KEY_ALIASES: dict[str, str] = {
    "pipe & fittings": "pipes & fitting",
    "pipes & fittings": "pipes & fitting",
    "pipes and fittings": "pipes & fitting",
    "electricals": "electrical",
}

# Canonical display after alias fold (extend when new top-level categories are added).
_CATEGORY_DISPLAY: dict[str, str] = {
    "pipes & fitting": "Pipes & Fittings",
    "electrical": "Electrical",
}


def is_electrical_category_label(category: str | None) -> bool:
    return normalize_category_for_key(category or "") == "electrical"


def _collapse_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value).strip())


def _title_case_words(value: str) -> str:
    text = _collapse_spaces(value)
    if not text:
        return ""
    words: list[str] = []
    for chunk in re.split(r"(\s+|&)", text):
        if not chunk or chunk.isspace():
            continue
        if chunk == "&":
            words.append("&")
            continue
        words.append(chunk[0].upper() + chunk[1:].lower() if chunk else chunk)
    return " ".join(words)


def normalize_category_for_key(category: str) -> str:
    normalized = normalize_label(category)
    return _CATEGORY_KEY_ALIASES.get(normalized, normalized)


def canonical_category_label(value: str | None) -> str:
    collapsed = _collapse_spaces(str(value or ""))
    if not collapsed:
        return ""
    key = normalize_category_for_key(collapsed)
    display = _CATEGORY_DISPLAY.get(key)
    if display:
        return display
    return _title_case_words(collapsed)


def canonical_subcategory_label(value: str | None) -> str:
    return _title_case_words(str(value or ""))


def canonical_type_label(value: str | None) -> str:
    return _collapse_spaces(str(value or "")).upper()


def canonical_class_label(value: str | None) -> str:
    return _collapse_spaces(str(value or "")).upper()


def canonical_brand_label(value: str | None) -> str:
    return _title_case_words(str(value or ""))


def canonical_product_family_label(value: str | None) -> str:
    return _collapse_spaces(str(value or "")).upper()


def canonical_conductor_core_pair_label(value: str | None) -> str:
    """Electrical Conductor/Core/Pair — preserve wording, normalize spaces."""
    return _collapse_spaces(str(value or "")).upper()


def canonicalize_electrical_master_taxonomy(
    *,
    category: str,
    type_name: str,
    subcategory: str,
    conductor_core_pair: str,
    brand: str,
    product_family: str,
) -> tuple[str, str, str, str, str, str]:
    return (
        canonical_category_label(category),
        canonical_type_label(type_name),
        canonical_subcategory_label(subcategory),
        canonical_conductor_core_pair_label(conductor_core_pair),
        canonical_brand_label(brand),
        canonical_product_family_label(product_family),
    )


def canonicalize_pipes_master_taxonomy(
    *,
    category: str,
    type_name: str,
    subcategory: str,
    product_class: str,
    brand: str,
    product_family: str,
) -> tuple[str, str, str, str, str, str]:
    """Normalize messy sheet text to stable display + family_key values (no errors)."""
    return (
        canonical_category_label(category),
        canonical_type_label(type_name),
        canonical_subcategory_label(subcategory),
        canonical_class_label(product_class),
        canonical_brand_label(brand),
        canonical_product_family_label(product_family),
    )


def build_family_key(
    *,
    category: str,
    type_name: str,
    subcategory: str,
    product_class: str,
    brand: str,
    product_family: str,
) -> str:
    parts = [
        normalize_category_for_key(category),
        normalize_label(type_name),
        normalize_label(subcategory),
        normalize_label(product_class),
        normalize_label(brand),
        normalize_label(product_family),
    ]
    return "|".join(parts)


def normalize_gst_rate(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if 0 < number <= 1:
        return round(number * 100, 4)
    return round(number, 4)


def normalize_uom(value: str | None) -> str:
    text = canonical_label(value) or "pcs"
    return text


def normalize_hsn(value: Any) -> str:
    if value is None or value == "":
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    text = str(value).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return text


def normalize_discount(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if 0 < number < 1:
        return round(number * 100, 4)
    return number


def format_size_and_length(size: str | None, length: str | None) -> str:
    """Match Excel: IF(AND(size<>"", length<>""), size & " (" & length & ")", size & length)."""
    size_text = canonical_label(size) if size else ""
    length_text = canonical_label(length) if length else ""
    if size_text and length_text:
        return f"{size_text} ({length_text})"
    return f"{size_text}{length_text}"


def generate_sku_display_name(
    *,
    type_name: str | None,
    product_family: str | None,
    product_class: str | None,
    size: str | None,
    brand: str | None,
    length: str | None = None,
) -> str:
    """
    Same order as the client Excel TEXTJOIN:
    Type, product_family, class, size(+length), Brand — comma-separated.
    """
    size_part = format_size_and_length(size, length)
    parts: list[str] = []
    for piece in (type_name, product_family, product_class, size_part, brand):
        text = canonical_label(piece) if piece else ""
        if text:
            parts.append(text)
    return ", ".join(parts) if parts else "Product"


def normalize_header(header: str) -> str:
    text = header.replace("\ufeff", "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")
