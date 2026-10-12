from __future__ import annotations

from pydantic import BaseModel, Field


class RequesterRegisterIn(BaseModel):
    name: str
    phone: str
    address: str


class AdminRegisterIn(BaseModel):
    companyName: str
    gstin: str
    contactNumber: str
    passcode: str


class AdminLoginIn(BaseModel):
    contactNumber: str
    passcode: str


class PartnerIn(BaseModel):
    name: str
    phone: str
    address: str = ""
    businessName: str = ""
    pincode: str = ""
    city: str = ""
    area: str = ""
    salesManager: str = ""
    documents: list[str] = Field(default_factory=list)


class PartnerLoginIn(BaseModel):
    phone: str
    passcode: str


class PartnerRegisterIn(PartnerIn):
    passcode: str = Field(min_length=4)


class PartnerReviewIn(BaseModel):
    approved: bool
    locationVerified: bool = False
    rejectionReason: str | None = None


class TeamUserIn(BaseModel):
    name: str
    contactNumber: str
    role: str = Field(default="staff", pattern="^(admin|store_manager|staff)$")
    passcode: str
    permissions: list[str] = Field(default_factory=list)


class TeamUserUpdateIn(BaseModel):
    name: str
    contactNumber: str
    role: str = Field(pattern="^(admin|store_manager|staff)$")
    isActive: bool
    permissions: list[str] = Field(default_factory=list)
