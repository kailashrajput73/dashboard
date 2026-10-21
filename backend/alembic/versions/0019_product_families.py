"""Product families for catalog SKUs (pipes & fittings v1).

Revision ID: 0019_product_families
Revises: 0018_service_requests_schema
Create Date: 2026-10-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0019_product_families"
down_revision: str | None = "0018_service_requests_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "product_families",
        sa.Column(
            "id",
            sa.String(length=36),
            server_default=sa.text("gen_random_uuid()::text"),
            nullable=False,
        ),
        sa.Column("category_id", sa.String(length=36), nullable=False),
        sa.Column("subcategory_id", sa.String(length=36), nullable=True),
        sa.Column("brand_id", sa.String(length=36), nullable=True),
        sa.Column("product_type_id", sa.String(length=36), nullable=True),
        sa.Column("product_class", sa.Text(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("family_key", sa.Text(), nullable=False),
        sa.Column("hsn_code", sa.Text(), nullable=True),
        sa.Column("gst_rate", sa.Float(), nullable=True),
        sa.Column("unit", sa.Text(), server_default=sa.text("'pcs'"), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name="fk_product_families_category_id_categories",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["subcategory_id"],
            ["subcategories.id"],
            name="fk_product_families_subcategory_id_subcategories",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["brand_id"],
            ["brands.id"],
            name="fk_product_families_brand_id_brands",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["product_type_id"],
            ["product_types.id"],
            name="fk_product_families_product_type_id_product_types",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="product_families_id_uq"),
        sa.UniqueConstraint("family_key", name="product_families_family_key_uq"),
    )
    op.create_index(
        "product_families_category_id",
        "product_families",
        ["category_id"],
    )
    op.create_index(
        "product_families_brand_id",
        "product_families",
        ["brand_id"],
    )
    op.create_index(
        "product_families_deleted_at",
        "product_families",
        ["deleted_at"],
    )

    op.add_column(
        "catalog",
        sa.Column("family_id", sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        "fk_catalog_family_id_product_families",
        "catalog",
        "product_families",
        ["family_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("catalog_family_id", "catalog", ["family_id"])


def downgrade() -> None:
    op.drop_index("catalog_family_id", table_name="catalog")
    op.drop_constraint(
        "fk_catalog_family_id_product_families", "catalog", type_="foreignkey"
    )
    op.drop_column("catalog", "family_id")
    op.drop_index("product_families_deleted_at", table_name="product_families")
    op.drop_index("product_families_brand_id", table_name="product_families")
    op.drop_index("product_families_category_id", table_name="product_families")
    op.drop_table("product_families")
