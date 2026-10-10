"""Create catalog schema and complete product references.

Revision ID: 0006_catalog_schema
Revises: 0005_racks_schema
Create Date: 2026-10-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_catalog_schema"
down_revision: str | None = "0005_racks_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _id_column() -> sa.Column[str]:
    return sa.Column(
        "id",
        sa.String(length=36),
        server_default=sa.text("gen_random_uuid()::text"),
        nullable=False,
    )


def _timestamps() -> tuple[sa.Column[object], ...]:
    return (
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def upgrade() -> None:
    op.create_table(
        "catalog",
        _id_column(),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("product_name", sa.Text(), nullable=False),
        sa.Column("category_id", sa.String(length=36), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("standard_rate", sa.Float(), nullable=False),
        sa.Column("mrp", sa.Float(), nullable=True),
        sa.Column("selling_price", sa.Float(), nullable=True),
        sa.Column("purchase_price", sa.Float(), nullable=True),
        sa.Column("discount", sa.Float(), nullable=True),
        sa.Column("stock", sa.Float(), server_default=sa.text("0"), nullable=False),
        sa.Column("brand_id", sa.String(length=36), nullable=True),
        sa.Column("brand", sa.Text(), nullable=True),
        sa.Column("product_code", sa.Text(), nullable=True),
        sa.Column("qr_code", sa.Text(), nullable=True),
        sa.Column("type_name", sa.Text(), nullable=True),
        sa.Column("product_type_id", sa.String(length=36), nullable=True),
        sa.Column("product_class", sa.Text(), nullable=True),
        sa.Column("product_group", sa.Text(), nullable=True),
        sa.Column("subcategory_id", sa.String(length=36), nullable=True),
        sa.Column("subcategory", sa.Text(), nullable=True),
        sa.Column("size", sa.Text(), nullable=True),
        sa.Column("size_mm", sa.Float(), nullable=True),
        sa.Column("size_cm", sa.Float(), nullable=True),
        sa.Column("size_inch", sa.Text(), nullable=True),
        sa.Column("length", sa.Text(), nullable=True),
        sa.Column(
            "aliases",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "multilingual_names",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "display_sequence",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "reorder_level",
            sa.Float(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "regular_discount",
            sa.Float(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("image_name", sa.Text(), nullable=True),
        sa.Column("std_pkg", sa.Float(), nullable=True),
        sa.Column("mrp_pkg", sa.Float(), nullable=True),
        sa.Column("hsn_code", sa.Text(), nullable=True),
        sa.Column("gst_rate", sa.Float(), nullable=True),
        sa.Column("last_purchase_price", sa.Float(), nullable=True),
        sa.Column("last_purchase_discount", sa.Float(), nullable=True),
        sa.Column("rack_id", sa.String(length=36), nullable=True),
        sa.Column("rack_name", sa.Text(), nullable=True),
        sa.Column("rack_slot", sa.Text(), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name="fk_catalog_category_id_categories",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["subcategory_id"],
            ["subcategories.id"],
            name="fk_catalog_subcategory_id_subcategories",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["brand_id"],
            ["brands.id"],
            name="fk_catalog_brand_id_brands",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["product_type_id"],
            ["product_types.id"],
            name="fk_catalog_product_type_id_product_types",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["rack_id"],
            ["racks.id"],
            name="fk_catalog_rack_id_racks",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="catalog_pkey"),
        sa.UniqueConstraint("product_code", name="catalog_product_code_uq"),
    )

    op.create_index("catalog_category_id", "catalog", ["category_id"])
    op.create_index("catalog_subcategory_id", "catalog", ["subcategory_id"])
    op.create_index("catalog_brand_id", "catalog", ["brand_id"])
    op.create_index("catalog_product_type_id", "catalog", ["product_type_id"])
    op.create_index("catalog_rack_id", "catalog", ["rack_id"])
    op.create_index("catalog_category_name_sort", "catalog", ["category", "name"])
    op.create_index("catalog_brand", "catalog", ["brand"])
    op.create_index("catalog_rack_name_sort", "catalog", ["rack_id", "name"])
    op.create_index("catalog_type_name", "catalog", ["type_name"])
    op.create_index("catalog_product_group", "catalog", ["product_group"])
    op.create_index("catalog_subcategory", "catalog", ["subcategory"])
    op.create_index("catalog_product_class", "catalog", ["product_class"])
    op.create_index("catalog_size_mm", "catalog", ["size_mm"])
    op.create_index("catalog_name_sort", "catalog", ["name"])
    op.create_index("catalog_stock_reorder", "catalog", ["stock", "reorder_level"])

    op.create_foreign_key(
        "fk_product_group_items_product_id_catalog",
        "product_group_items",
        "catalog",
        ["product_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_rack_slots_product_id_catalog",
        "rack_slots",
        "catalog",
        ["product_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_rack_slots_product_id_catalog",
        "rack_slots",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_product_group_items_product_id_catalog",
        "product_group_items",
        type_="foreignkey",
    )
    op.drop_index("catalog_stock_reorder", table_name="catalog")
    op.drop_index("catalog_name_sort", table_name="catalog")
    op.drop_index("catalog_size_mm", table_name="catalog")
    op.drop_index("catalog_product_class", table_name="catalog")
    op.drop_index("catalog_subcategory", table_name="catalog")
    op.drop_index("catalog_product_group", table_name="catalog")
    op.drop_index("catalog_type_name", table_name="catalog")
    op.drop_index("catalog_rack_name_sort", table_name="catalog")
    op.drop_index("catalog_brand", table_name="catalog")
    op.drop_index("catalog_category_name_sort", table_name="catalog")
    op.drop_index("catalog_rack_id", table_name="catalog")
    op.drop_index("catalog_product_type_id", table_name="catalog")
    op.drop_index("catalog_brand_id", table_name="catalog")
    op.drop_index("catalog_subcategory_id", table_name="catalog")
    op.drop_index("catalog_category_id", table_name="catalog")
    op.drop_table("catalog")
