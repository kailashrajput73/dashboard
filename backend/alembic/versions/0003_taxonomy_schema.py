"""Create taxonomy tables for categories, subcategories, brands, and product types.

Revision ID: 0003_taxonomy_schema
Revises: 0002_core_auth_schema
Create Date: 2026-10-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_taxonomy_schema"
down_revision: str | None = "0002_core_auth_schema"
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
        "categories",
        _id_column(),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("product_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="categories_pkey"),
        sa.UniqueConstraint("name", name="categories_name_uq"),
    )
    op.create_index("categories_name_sort", "categories", ["name"])

    op.create_table(
        "subcategories",
        _id_column(),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("category_id", sa.String(length=36), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name="fk_subcategories_category_id_categories",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="subcategories_pkey"),
        sa.UniqueConstraint("category_id", "name", name="subcategories_category_name_uq"),
    )
    op.create_index("subcategories_category_id", "subcategories", ["category_id"])
    op.create_index("subcategories_category_name_sort", "subcategories", ["category_id", "name"])

    op.create_table(
        "brands",
        _id_column(),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("product_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("logo_url", sa.Text(), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="brands_pkey"),
        sa.UniqueConstraint("name", name="brands_name_uq"),
    )
    op.create_index("brands_name_sort", "brands", ["name"])

    op.create_table(
        "product_types",
        _id_column(),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("product_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="product_types_pkey"),
        sa.UniqueConstraint("name", name="product_types_name_uq"),
    )
    op.create_index("product_types_name_sort", "product_types", ["name"])


def downgrade() -> None:
    op.drop_index("product_types_name_sort", table_name="product_types")
    op.drop_table("product_types")
    op.drop_index("brands_name_sort", table_name="brands")
    op.drop_table("brands")
    op.drop_index("subcategories_category_name_sort", table_name="subcategories")
    op.drop_index("subcategories_category_id", table_name="subcategories")
    op.drop_table("subcategories")
    op.drop_index("categories_name_sort", table_name="categories")
    op.drop_table("categories")
