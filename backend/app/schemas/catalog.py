from __future__ import annotations

from typing import Any

from pydantic import AliasChoices, BaseModel, Field, field_validator

from app.schemas.taxonomy import AdminPasscodeIn


def _parse_size(value: Any) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    import re

    match = re.search(r"[-+]?\d*\.?\d+", str(value).replace(",", ""))
    return float(match.group(0)) if match else None


class CatalogItemIn(BaseModel):
    name: str
    category: str
    unit: str
    standardRate: float
    productCode: str | None = None
    productName: str | None = None
    type: str | None = None
    productClass: str | None = None
    productGroup: str | None = None
    size: str | None = None
    sizeMm: float | None = None
    sizeInch: str | None = None
    sizeCm: float | None = None
    length: str | None = None
    brand: str | None = None
    brandId: str | None = None
    subcategory: str | None = None
    subcategoryId: str | None = None
    aliases: list[str] = Field(default_factory=list)
    multilingualNames: dict[str, str] = Field(default_factory=dict)
    displaySequence: int = 0
    reorderLevel: float = 0
    regularDiscount: float = 0
    productGroupIds: list[str] = Field(default_factory=list)
    imageUrl: str | None = None
    imageName: str | None = None
    stdPkg: float | None = None
    mrp: float | None = None
    sellingPrice: float | None = None
    purchasePrice: float | None = None
    discount: float | None = None
    stock: float | None = None
    isActive: bool = True

    @field_validator("sizeMm", "sizeCm", mode="before")
    @classmethod
    def coerce_size(cls, value: Any) -> float | None:
        return _parse_size(value)


class CatalogPricingIn(BaseModel):
    mrp: float | None = None
    sellingPrice: float | None = None
    discount: float | None = None
    purchasePrice: float | None = None
    stock: float | None = None


class CatalogActiveIn(BaseModel):
    isActive: bool


class CatalogBulkPricingIn(BaseModel):
    itemIds: list[str]
    mrp: float | None = None
    discount: float | None = None
    stock: float | None = None


class CatalogFieldPurgeIn(AdminPasscodeIn):
    field: str = Field(pattern="^(type|productClass|productGroup)$")
    value: str


class CatalogImportRow(BaseModel):
    name: str
    category: str | None = None
    unit: str
    standardRate: float
    type: str | None = None
    productClass: str | None = None
    productGroup: str | None = None
    brand: str | None = None
    productName: str | None = None
    subcategory: str | None = None
    size: str | None = None
    sizeMm: float | None = None
    sizeCm: float | None = None
    sizeInch: str | None = None
    productCode: str | None = None
    length: str | None = None
    stdPkg: float | None = None
    mrp: float | None = None
    sellingPrice: float | None = None
    purchasePrice: float | None = None
    discount: float | None = None
    stock: float | None = None
    reorderLevel: float | None = None
    imageUrl: str | None = None
    isActive: bool = True

    @field_validator("sizeMm", "sizeCm", mode="before")
    @classmethod
    def coerce_size(cls, value: Any) -> float | None:
        return _parse_size(value)

    @field_validator("discount", mode="before")
    @classmethod
    def coerce_discount(cls, value: Any) -> Any:
        if value is None or value == "":
            return None
        try:
            number = float(value)
        except (TypeError, ValueError):
            return value
        return round(number * 100, 4) if 0 < number < 1 else number


class CatalogImportIn(BaseModel):
    items: list[CatalogImportRow]
    categoryMode: str = Field(pattern="^(fromCsv|overrideExisting|overrideNew)$")
    overrideCategory: str | None = ""
    replaceExisting: bool = False


class CatalogMasterImportRow(BaseModel):
    name: str
    unit: str = "pcs"
    category: str | None = None
    type: str | None = None
    productClass: str | None = None
    productGroup: str | None = None
    brand: str | None = None
    productName: str | None = None
    subcategory: str | None = None
    size: str | None = None
    sizeMm: float | None = None
    sizeCm: float | None = None
    sizeInch: str | None = None
    productCode: str | None = None
    length: str | None = None
    imageUrl: str | None = None
    hsnCode: str | None = None
    gstRate: float | None = None
    stdPkg: float | None = None
    mrpPkg: float | None = None
    mrp: float | None = None
    discount: float | None = None
    sellingPrice: float | None = None
    reorderLevel: float | None = None
    isActive: bool = True

    @field_validator("sizeMm", "sizeCm", mode="before")
    @classmethod
    def coerce_size(cls, value: Any) -> float | None:
        return _parse_size(value)

    @field_validator("gstRate", "discount", mode="before")
    @classmethod
    def coerce_percent(cls, value: Any) -> Any:
        if value is None or value == "":
            return None
        try:
            number = float(value)
        except (TypeError, ValueError):
            return value
        return round(number * 100, 4) if 0 < number <= 1 else number


class CatalogMasterImportIn(BaseModel):
    items: list[CatalogMasterImportRow]
    categoryMode: str = Field(
        default="fromCsv",
        pattern="^(fromCsv|overrideExisting|overrideNew)$",
    )
    overrideCategory: str | None = ""


class CatalogPricingImportRow(BaseModel):
    productCode: str
    mrp: float | None = None
    discount: float | None = None
    sellingPrice: float | None = None

    @field_validator("discount", mode="before")
    @classmethod
    def coerce_discount(cls, value: Any) -> Any:
        if value is None or value == "":
            return None
        try:
            number = float(value)
        except (TypeError, ValueError):
            return value
        return round(number * 100, 4) if 0 < number < 1 else number


class CatalogPricingImportIn(BaseModel):
    items: list[CatalogPricingImportRow]


class CatalogStockImportRow(BaseModel):
    productCode: str
    stock: float


class CatalogStockImportIn(BaseModel):
    items: list[CatalogStockImportRow]


class PipesFittingsImportIn(BaseModel):
    rows: list[dict[str, Any]]


class PipesFittingsImageRow(BaseModel):
    brand: str | None = None
    product_family: str | None = None
    product: str | None = None
    type: str | None = None
    Type: str | None = None
    class_: str | None = Field(default=None, alias="class")
    product_class: str | None = None
    image_url: str | None = None
    imageUrl: str | None = None

    model_config = {"populate_by_name": True}


class PipesFittingsImagesImportIn(BaseModel):
    items: list[PipesFittingsImageRow]


class ElectricalFamilyImageIn(BaseModel):
    subcategory: str
    colours: str = Field(validation_alias=AliasChoices("colours", "colors", "color"))
    compound: str
    brand: str
    product_family: str = Field(validation_alias=AliasChoices("productFamily", "product"))
    image_url: str = Field(validation_alias=AliasChoices("imageUrl", "image_url"))
    conductor_core_pair: str | None = Field(
        default=None,
        validation_alias=AliasChoices("conductorCorePair", "conductor"),
    )

    model_config = {"populate_by_name": True}


__all__ = [
    "AdminPasscodeIn",
    "CatalogBulkPricingIn",
    "CatalogFieldPurgeIn",
    "CatalogImportIn",
    "CatalogItemIn",
    "CatalogMasterImportIn",
    "CatalogPricingIn",
    "CatalogPricingImportIn",
    "CatalogStockImportIn",
    "PipesFittingsImportIn",
    "PipesFittingsImagesImportIn",
    "ElectricalFamilyImageIn",
]
