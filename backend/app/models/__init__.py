from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _new_id() -> str:
    return str(uuid4())


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("users_role_contact", "role", "contact_number"),
        Index("users_contact", "contact_number"),
        Index("users_role_name_sort", "role", "name"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    gstin: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    passcode_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    permissions: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool | None] = mapped_column(Boolean, nullable=True)


class AdminToken(TimestampMixin, Base):
    __tablename__ = "admin_tokens"
    __table_args__ = (
        UniqueConstraint("token", name="admin_tokens_token_uq"),
        Index("admin_tokens_admin_id", "admin_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    token: Mapped[str] = mapped_column(Text, nullable=False)
    admin_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT", name="fk_admin_tokens_admin_id_users"),
        nullable=False,
    )


class Partner(TimestampMixin, Base):
    __tablename__ = "partners"
    __table_args__ = (
        Index(
            "partners_phone_uq",
            "phone",
            unique=True,
            postgresql_where=text("phone IS NOT NULL"),
        ),
        Index("partners_kyc_name_sort", "kyc_status", "name"),
        Index("partners_sales_manager", "sales_manager"),
        Index("partners_name_sort", "name"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    pincode: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    area: Mapped[str | None] = mapped_column(Text, nullable=True)
    sales_manager: Mapped[str | None] = mapped_column(Text, nullable=True)
    documents: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    kyc_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_verified: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    app_active: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    kyc_history: Mapped[list[dict[str, object]] | None] = mapped_column(
        JSONB, nullable=True
    )
    reward_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    passcode_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    registered_via: Mapped[str | None] = mapped_column(Text, nullable=True)
    login_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_app_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reviewed_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class PartnerToken(TimestampMixin, Base):
    __tablename__ = "partner_tokens"
    __table_args__ = (
        UniqueConstraint("token", name="partner_tokens_token_uq"),
        Index("partner_tokens_partner_id", "partner_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    token: Mapped[str] = mapped_column(Text, nullable=False)
    partner_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "partners.id",
            ondelete="RESTRICT",
            name="fk_partner_tokens_partner_id_partners",
        ),
        nullable=False,
    )


class MoneyConfig(TimestampMixin, Base):
    __tablename__ = "money_config"
    __table_args__ = (
        UniqueConstraint("admin_id", name="money_config_admin_id_uq"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    admin_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT", name="fk_money_config_admin_id_users"),
        nullable=False,
    )
    discount_percent: Mapped[float] = mapped_column(
        Float, nullable=False, server_default=text("0")
    )
    gst_percent: Mapped[float] = mapped_column(
        Float, nullable=False, server_default=text("18")
    )
    special_discount_percent: Mapped[float] = mapped_column(
        Float, nullable=False, server_default=text("0")
    )
    show_discount: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    show_gst: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    show_special_discount: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )


class Category(TimestampMixin, Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("name", name="categories_name_uq"),
        Index("categories_name_sort", "name"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    is_default: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    product_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)


class Subcategory(TimestampMixin, Base):
    __tablename__ = "subcategories"
    __table_args__ = (
        UniqueConstraint("category_id", "name", name="subcategories_category_name_uq"),
        Index("subcategories_category_id", "category_id"),
        Index("subcategories_category_name_sort", "category_id", "name"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    category_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "categories.id",
            ondelete="RESTRICT",
            name="fk_subcategories_category_id_categories",
        ),
        nullable=False,
    )


class Brand(TimestampMixin, Base):
    __tablename__ = "brands"
    __table_args__ = (
        UniqueConstraint("name", name="brands_name_uq"),
        Index("brands_name_sort", "name"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    product_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)


class ProductType(TimestampMixin, Base):
    __tablename__ = "product_types"
    __table_args__ = (
        UniqueConstraint("name", name="product_types_name_uq"),
        Index("product_types_name_sort", "name"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )


__all__ = [
    "AdminToken",
    "Base",
    "Brand",
    "Category",
    "MoneyConfig",
    "Partner",
    "PartnerToken",
    "ProductType",
    "Subcategory",
    "User",
]
