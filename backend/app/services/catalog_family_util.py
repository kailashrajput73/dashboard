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
        normalize_label(category),
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
