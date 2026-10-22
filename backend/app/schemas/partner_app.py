from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PartnerAppProfileUpdateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = None
    businessName: str | None = None
    address: str | None = None
    pincode: str | None = None
    city: str | None = None
    area: str | None = None


class PartnerAppKycIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    panNumber: str
    aadhaarLast4: str | None = None
    documents: list[str] = Field(default_factory=list, max_length=5)
    kycMethod: Literal["manual"] = "manual"

    @field_validator("documents")
    @classmethod
    def cap_documents(cls, value: list[str]) -> list[str]:
        if len(value) > 5:
            raise ValueError("At most 5 documents")
        return value

    @field_validator("aadhaarLast4")
    @classmethod
    def validate_aadhaar_last4(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        if len(value) != 4 or not value.isdigit():
            raise ValueError("aadhaarLast4 must be exactly 4 digits")
        return value
