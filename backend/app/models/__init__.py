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
    PrimaryKeyConstraint,
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
        Index(
            "users_contact_number_uq",
            "contact_number",
            unique=True,
            postgresql_where=text(
                "contact_number IS NOT NULL AND deleted_at IS NULL"
            ),
        ),
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
    module_access: Mapped[dict[str, str] | None] = mapped_column(JSONB, nullable=True)
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
        Index(
            "categories_name_ci_uq",
            func.lower(text("name")),
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("categories_name_sort", "name"),
        Index(
            "categories_active_sort",
            "is_active",
            "name",
            postgresql_where=text("deleted_at IS NULL"),
        ),
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
        Index(
            "subcategories_category_name_ci_uq",
            "category_id",
            func.lower(text("name")),
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
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
        Index(
            "brands_name_ci_uq",
            func.lower(text("name")),
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
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


class ProductFamily(TimestampMixin, Base):
    __tablename__ = "product_families"
    __table_args__ = (
        UniqueConstraint("family_key", name="product_families_family_key_uq"),
        Index("product_families_category_id", "category_id"),
        Index("product_families_brand_id", "brand_id"),
        Index("product_families_deleted_at", "deleted_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    category_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "categories.id",
            ondelete="RESTRICT",
            name="fk_product_families_category_id_categories",
        ),
        nullable=False,
    )
    subcategory_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "subcategories.id",
            ondelete="RESTRICT",
            name="fk_product_families_subcategory_id_subcategories",
        ),
        nullable=True,
    )
    brand_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "brands.id",
            ondelete="RESTRICT",
            name="fk_product_families_brand_id_brands",
        ),
        nullable=True,
    )
    product_type_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "product_types.id",
            ondelete="RESTRICT",
            name="fk_product_families_product_type_id_product_types",
        ),
        nullable=True,
    )
    product_class: Mapped[str | None] = mapped_column(Text, nullable=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    family_key: Mapped[str] = mapped_column(Text, nullable=False)
    hsn_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    gst_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'pcs'")
    )
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)


class ProductType(TimestampMixin, Base):
    __tablename__ = "product_types"
    __table_args__ = (
        Index(
            "product_types_name_ci_uq",
            func.lower(text("name")),
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
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


class Catalog(TimestampMixin, Base):
    __tablename__ = "catalog"
    __table_args__ = (
        UniqueConstraint("product_code", name="catalog_product_code_uq"),
        Index("catalog_deleted_at", "deleted_at"),
        Index("catalog_category_id", "category_id"),
        Index("catalog_subcategory_id", "subcategory_id"),
        Index("catalog_brand_id", "brand_id"),
        Index("catalog_product_type_id", "product_type_id"),
        Index("catalog_rack_id", "rack_id"),
        Index("catalog_category_name_sort", "category", "name"),
        Index(
            "catalog_tree_category_active",
            func.lower(text("category")),
            "is_active",
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("catalog_brand", "brand"),
        Index("catalog_brand_ci", func.lower(text("brand"))),
        Index("catalog_rack_name_sort", "rack_id", "name"),
        Index("catalog_type_name", "type_name"),
        Index("catalog_type_name_ci", func.lower(text("type_name"))),
        Index("catalog_product_group", "product_group"),
        Index("catalog_subcategory", "subcategory"),
        Index("catalog_subcategory_ci", func.lower(text("subcategory"))),
        Index("catalog_product_class", "product_class"),
        Index("catalog_product_class_ci", func.lower(text("product_class"))),
        Index("catalog_size_mm", "size_mm"),
        Index("catalog_name_sort", "name"),
        Index(
            "catalog_name_trgm",
            text("name gin_trgm_ops"),
            postgresql_using="gin",
        ),
        Index(
            "catalog_product_code_trgm",
            text("product_code gin_trgm_ops"),
            postgresql_using="gin",
        ),
        Index(
            "catalog_brand_trgm",
            text("brand gin_trgm_ops"),
            postgresql_using="gin",
        ),
        Index(
            "catalog_aliases_trgm",
            text("(aliases::text) gin_trgm_ops"),
            postgresql_using="gin",
        ),
        Index("catalog_stock_reorder", "stock", "reorder_level"),
        Index("catalog_family_id", "family_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    family_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "product_families.id",
            ondelete="RESTRICT",
            name="fk_catalog_family_id_product_families",
        ),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    product_name: Mapped[str] = mapped_column(Text, nullable=False)
    category_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "categories.id",
            ondelete="RESTRICT",
            name="fk_catalog_category_id_categories",
        ),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    standard_rate: Mapped[float] = mapped_column(Float, nullable=False)
    mrp: Mapped[float | None] = mapped_column(Float, nullable=True)
    selling_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    purchase_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    discount: Mapped[float | None] = mapped_column(Float, nullable=True)
    stock: Mapped[float] = mapped_column(
        Float, nullable=False, server_default=text("0")
    )
    brand_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("brands.id", ondelete="RESTRICT", name="fk_catalog_brand_id_brands"),
        nullable=True,
    )
    brand: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    qr_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    type_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_type_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "product_types.id",
            ondelete="RESTRICT",
            name="fk_catalog_product_type_id_product_types",
        ),
        nullable=True,
    )
    product_class: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_group: Mapped[str | None] = mapped_column(Text, nullable=True)
    subcategory_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "subcategories.id",
            ondelete="RESTRICT",
            name="fk_catalog_subcategory_id_subcategories",
        ),
        nullable=True,
    )
    subcategory: Mapped[str | None] = mapped_column(Text, nullable=True)
    size: Mapped[str | None] = mapped_column(Text, nullable=True)
    size_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    size_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    size_inch: Mapped[str | None] = mapped_column(Text, nullable=True)
    length: Mapped[str | None] = mapped_column(Text, nullable=True)
    aliases: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    multilingual_names: Mapped[dict[str, str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    display_sequence: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    reorder_level: Mapped[float] = mapped_column(
        Float, nullable=False, server_default=text("0")
    )
    regular_discount: Mapped[float] = mapped_column(
        Float, nullable=False, server_default=text("0")
    )
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    std_pkg: Mapped[float | None] = mapped_column(Float, nullable=True)
    mrp_pkg: Mapped[float | None] = mapped_column(Float, nullable=True)
    hsn_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    gst_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_purchase_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_purchase_discount: Mapped[float | None] = mapped_column(Float, nullable=True)
    rack_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("racks.id", ondelete="RESTRICT", name="fk_catalog_rack_id_racks"),
        nullable=True,
    )
    rack_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    rack_slot: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )


class Pricing(TimestampMixin, Base):
    __tablename__ = "pricing"
    __table_args__ = (
        UniqueConstraint("product_code", name="pricing_product_code_uq"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    product_code: Mapped[str] = mapped_column(
        Text,
        ForeignKey(
            "catalog.product_code",
            ondelete="CASCADE",
            name="fk_pricing_product_code_catalog",
        ),
        nullable=False,
    )
    mrp: Mapped[float | None] = mapped_column(Float, nullable=True)
    selling_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    purchase_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    discount: Mapped[float | None] = mapped_column(Float, nullable=True)


class PricingHistory(TimestampMixin, Base):
    __tablename__ = "pricing_history"
    __table_args__ = (
        Index(
            "pricing_history_code_updated",
            "product_code",
            text("updated_at DESC"),
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    product_code: Mapped[str] = mapped_column(
        Text,
        ForeignKey(
            "catalog.product_code",
            ondelete="CASCADE",
            name="fk_pricing_history_product_code_catalog",
        ),
        nullable=False,
    )
    mrp: Mapped[float | None] = mapped_column(Float, nullable=True)
    selling_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    purchase_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    discount: Mapped[float | None] = mapped_column(Float, nullable=True)


class Purchase(TimestampMixin, Base):
    __tablename__ = "purchases"
    __table_args__ = (
        Index("purchases_createdAt", text("created_at DESC")),
        Index("purchases_partner_created", "partner_id", text("created_at DESC")),
        Index("purchases_deleted_at", "deleted_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    partner_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "partners.id",
            ondelete="RESTRICT",
            name="fk_purchases_partner_id_partners",
        ),
        nullable=True,
    )


class PurchaseLine(TimestampMixin, Base):
    __tablename__ = "purchase_lines"
    __table_args__ = (
        Index("purchase_lines_purchase_id", "purchase_id"),
        Index("purchase_lines_product_id", "product_id"),
        Index("purchase_lines_product_code", "product_code"),
        Index(
            "purchase_lines_purchase_created",
            "purchase_id",
            "created_at",
            "id",
        ),
        Index("purchase_lines_deleted_at", "deleted_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    purchase_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "purchases.id",
            ondelete="CASCADE",
            name="fk_purchase_lines_purchase_id_purchases",
        ),
        nullable=False,
    )
    product_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "catalog.id",
            ondelete="RESTRICT",
            name="fk_purchase_lines_product_id_catalog",
        ),
        nullable=False,
    )
    product_code: Mapped[str] = mapped_column(Text, nullable=False)
    product_name: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    list_price: Mapped[float] = mapped_column(Float, nullable=False)
    purchase_discount: Mapped[float] = mapped_column(
        Float, nullable=False, server_default=text("0")
    )
    rack_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "racks.id",
            ondelete="RESTRICT",
            name="fk_purchase_lines_rack_id_racks",
        ),
        nullable=True,
    )
    rack_slot: Mapped[str | None] = mapped_column(Text, nullable=True)


class Rfq(TimestampMixin, Base):
    __tablename__ = "rfqs"
    __table_args__ = (
        PrimaryKeyConstraint("id", name="rfqs_id_uq"),
        Index("rfqs_partner_id", "partner_id"),
        Index("rfqs_partner_status", "partner_id", "status"),
        Index("rfqs_status_created", "status", text("created_at DESC")),
        Index("rfqs_created_at", text("created_at DESC")),
        Index("rfqs_deleted_at", "deleted_at"),
        Index(
            "rfqs_partner_id_trgm",
            "partner_id",
            postgresql_using="gin",
            postgresql_ops={"partner_id": "gin_trgm_ops"},
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    partner_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "partners.id",
            ondelete="RESTRICT",
            name="fk_rfqs_partner_id_partners",
        ),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(Text, nullable=False)
    grand_total: Mapped[float] = mapped_column(Float, nullable=False)
    special_discount_percent: Mapped[float] = mapped_column(Float, nullable=False)
    reward_points: Mapped[int] = mapped_column(Integer, nullable=False)
    delivery_mode: Mapped[str] = mapped_column(Text, nullable=False)
    scheduled_at: Mapped[str | None] = mapped_column(Text, nullable=True)
    history: Mapped[list[dict[str, object]]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )


class RfqLine(TimestampMixin, Base):
    __tablename__ = "rfq_lines"
    __table_args__ = (
        Index("rfq_lines_rfq_id", "rfq_id"),
        Index("rfq_lines_product_id", "product_id"),
        Index("rfq_lines_product_code", "product_code"),
        Index("rfq_lines_rfq_created", "rfq_id", "created_at", "id"),
        Index("rfq_lines_deleted_at", "deleted_at"),
        Index(
            "rfq_lines_product_code_trgm",
            "product_code",
            postgresql_using="gin",
            postgresql_ops={"product_code": "gin_trgm_ops"},
        ),
        Index(
            "rfq_lines_product_name_trgm",
            "product_name",
            postgresql_using="gin",
            postgresql_ops={"product_name": "gin_trgm_ops"},
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    rfq_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("rfqs.id", ondelete="CASCADE", name="fk_rfq_lines_rfq_id_rfqs"),
        nullable=False,
    )
    product_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "catalog.id",
            ondelete="RESTRICT",
            name="fk_rfq_lines_product_id_catalog",
        ),
        nullable=False,
    )
    product_code: Mapped[str] = mapped_column(Text, nullable=False)
    product_name: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)


class RewardLedger(TimestampMixin, Base):
    __tablename__ = "reward_ledger"
    __table_args__ = (
        Index("reward_ledger_requester_created", "requester_id", text("created_at DESC")),
        Index("reward_ledger_requester_type", "requester_id", "type"),
        Index("reward_ledger_quotation_type", "quotation_id", "type"),
        Index("reward_ledger_deleted_at", "deleted_at"),
        Index(
            "reward_ledger_one_earned_per_quotation_uq",
            "quotation_id",
            unique=True,
            postgresql_where=text("type = 'earned' AND deleted_at IS NULL"),
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    requester_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "partners.id",
            ondelete="RESTRICT",
            name="fk_reward_ledger_requester_id_partners",
        ),
        nullable=False,
    )
    quotation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "rfqs.id",
            ondelete="RESTRICT",
            name="fk_reward_ledger_quotation_id_rfqs",
        ),
        nullable=False,
    )
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)


class Dispatch(TimestampMixin, Base):
    __tablename__ = "dispatches"
    __table_args__ = (
        Index("dispatches_createdAt", text("created_at DESC")),
        Index(
            "dispatches_source_rfq_id_uq",
            "source_rfq_id",
            unique=True,
            postgresql_where=text("source_rfq_id IS NOT NULL"),
        ),
        Index("dispatches_deleted_at", "deleted_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    source_rfq_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "rfqs.id",
            ondelete="RESTRICT",
            name="fk_dispatches_source_rfq_id_rfqs",
        ),
        nullable=True,
    )
    customer_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(Text, nullable=True)


class DispatchLine(TimestampMixin, Base):
    __tablename__ = "dispatch_lines"
    __table_args__ = (
        Index("dispatch_lines_dispatch_id", "dispatch_id"),
        Index("dispatch_lines_product_id", "product_id"),
        Index("dispatch_lines_product_code", "product_code"),
        Index(
            "dispatch_lines_dispatch_created",
            "dispatch_id",
            "created_at",
            "id",
        ),
        Index("dispatch_lines_deleted_at", "deleted_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    dispatch_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "dispatches.id",
            ondelete="CASCADE",
            name="fk_dispatch_lines_dispatch_id_dispatches",
        ),
        nullable=False,
    )
    product_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "catalog.id",
            ondelete="RESTRICT",
            name="fk_dispatch_lines_product_id_catalog",
        ),
        nullable=False,
    )
    product_code: Mapped[str] = mapped_column(Text, nullable=False)
    product_name: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)


class ServiceRequest(TimestampMixin, Base):
    __tablename__ = "service_requests"
    __table_args__ = (
        PrimaryKeyConstraint("id", name="service_requests_id_uq"),
        Index(
            "service_requests_status_type_created",
            "status",
            "service_type",
            text("created_at DESC"),
        ),
        Index("service_requests_service_type", "service_type"),
        Index("service_requests_createdAt", text("created_at DESC")),
        Index("service_requests_deleted_at", "deleted_at"),
        Index(
            "service_requests_customer_name_trgm",
            text("customer_name gin_trgm_ops"),
            postgresql_using="gin",
        ),
        Index(
            "service_requests_customer_phone_trgm",
            text("customer_phone gin_trgm_ops"),
            postgresql_using="gin",
        ),
        Index(
            "service_requests_service_type_trgm",
            text("service_type gin_trgm_ops"),
            postgresql_using="gin",
        ),
        Index(
            "service_requests_description_trgm",
            text("description gin_trgm_ops"),
            postgresql_using="gin",
        ),
        Index(
            "service_requests_city_trgm",
            text("city gin_trgm_ops"),
            postgresql_using="gin",
        ),
        Index(
            "service_requests_area_trgm",
            text("area gin_trgm_ops"),
            postgresql_using="gin",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    service_type: Mapped[str] = mapped_column(Text, nullable=False)
    customer_name: Mapped[str] = mapped_column(Text, nullable=False)
    customer_phone: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    pincode: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    city: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    area: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    status: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    history: Mapped[list[dict[str, object]]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )


class ProductGroup(TimestampMixin, Base):
    __tablename__ = "product_groups"
    __table_args__ = (
        UniqueConstraint("name", name="product_groups_name_uq"),
        Index("product_groups_name_sort", "name"),
        Index(
            "product_groups_name_ci",
            func.lower(text("name")),
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    product_count: Mapped[int | None] = mapped_column(Integer, nullable=True)


class ProductGroupItem(TimestampMixin, Base):
    __tablename__ = "product_group_items"
    __table_args__ = (
        Index("product_group_items_group_deleted", "product_group_id", "deleted_at"),
        Index("product_group_items_product_deleted", "product_id", "deleted_at"),
    )

    product_group_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "product_groups.id",
            ondelete="CASCADE",
            name="fk_product_group_items_product_group_id_product_groups",
        ),
        primary_key=True,
        nullable=False,
    )
    product_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "catalog.id",
            ondelete="CASCADE",
            name="fk_product_group_items_product_id_catalog",
        ),
        primary_key=True,
        nullable=False,
    )


class Rack(TimestampMixin, Base):
    __tablename__ = "racks"
    __table_args__ = (
        UniqueConstraint("name", name="racks_name_uq"),
        Index("racks_name_sort", "name"),
        Index(
            "racks_name_ci",
            func.lower(text("name")),
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False)
    column_count: Mapped[int] = mapped_column(Integer, nullable=False)


class RackSlot(TimestampMixin, Base):
    __tablename__ = "rack_slots"
    __table_args__ = (
        UniqueConstraint("rack_id", "slot_code", name="rack_slots_rack_code_uq"),
        Index("rack_slots_rack_id", "rack_id"),
        Index("rack_slots_product_id", "product_id"),
        Index(
            "rack_slots_product_id_uq",
            "product_id",
            unique=True,
            postgresql_where=text("product_id IS NOT NULL"),
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_new_id,
        server_default=text("gen_random_uuid()::text"),
    )
    rack_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("racks.id", ondelete="CASCADE", name="fk_rack_slots_rack_id_racks"),
        nullable=False,
    )
    slot_code: Mapped[str] = mapped_column(Text, nullable=False)
    product_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "catalog.id",
            ondelete="SET NULL",
            name="fk_rack_slots_product_id_catalog",
        ),
        nullable=True,
    )


__all__ = [
    "AdminToken",
    "Base",
    "Brand",
    "Category",
    "Catalog",
    "MoneyConfig",
    "Partner",
    "PartnerToken",
    "Pricing",
    "PricingHistory",
    "Purchase",
    "PurchaseLine",
    "Rfq",
    "RfqLine",
    "RewardLedger",
    "Dispatch",
    "DispatchLine",
    "ServiceRequest",
    "ProductGroup",
    "ProductGroupItem",
    "ProductType",
    "Rack",
    "RackSlot",
    "Subcategory",
    "User",
]
