from __future__ import annotations

from pydantic import BaseModel


class CategoryIn(BaseModel):
    name: str
    imageUrl: str | None = None


class CategoryUpdateIn(BaseModel):
    name: str
    isActive: bool
    imageUrl: str | None = None


class BrandIn(BaseModel):
    name: str
    logoUrl: str | None = None


class BrandUpdateIn(BaseModel):
    name: str
    isActive: bool
    logoUrl: str | None = None


class ProductTypeIn(BaseModel):
    name: str
    imageUrl: str | None = None


class ProductTypeUpdateIn(BaseModel):
    name: str
    isActive: bool
    imageUrl: str | None = None


class AdminPasscodeIn(BaseModel):
    contactNumber: str
    passcode: str


class SubcategoryIn(BaseModel):
    name: str
    categoryId: str


class SubcategoryUpdateIn(BaseModel):
    name: str
    categoryId: str


class SubcategoryImportRow(BaseModel):
    name: str
    categoryId: str | None = None
    category: str | None = None


class SubcategoryImportIn(BaseModel):
    items: list[SubcategoryImportRow]
