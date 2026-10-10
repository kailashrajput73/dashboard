"""Create product groups and product group items schema.

Revision ID: 0004_product_groups_schema
Revises: 0003_taxonomy_schema
Create Date: 2026-10-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_product_groups_schema"
down_revision: str | None = "0003_taxonomy_schema"
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
        "product_groups",
        _id_column(),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("product_count", sa.Integer(), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="product_groups_pkey"),
        sa.UniqueConstraint("name", name="product_groups_name_uq"),
    )
    op.create_index("product_groups_name_sort", "product_groups", ["name"])

    op.create_table(
        "product_group_items",
        sa.Column("product_group_id", sa.String(length=36), nullable=False),
        sa.Column("product_id", sa.String(length=36), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["product_group_id"],
            ["product_groups.id"],
            name="fk_product_group_items_product_group_id_product_groups",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "product_group_id",
            "product_id",
            name="product_group_items_pkey",
        ),
    )
    op.create_index("product_group_items_group_id", "product_group_items", ["product_group_id"])
    op.create_index("product_group_items_product_id", "product_group_items", ["product_id"])


def downgrade() -> None:
    op.drop_index("product_group_items_product_id", table_name="product_group_items")
    op.drop_index("product_group_items_group_id", table_name="product_group_items")
    op.drop_table("product_group_items")
    op.drop_index("product_groups_name_sort", table_name="product_groups")
    op.drop_table("product_groups")
