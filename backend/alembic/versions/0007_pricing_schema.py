"""Create pricing and pricing history schema.

Revision ID: 0007_pricing_schema
Revises: 0006_catalog_schema
Create Date: 2026-10-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_pricing_schema"
down_revision: str | None = "0006_catalog_schema"
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
        "pricing",
        _id_column(),
        sa.Column("product_code", sa.Text(), nullable=False),
        sa.Column("mrp", sa.Float(), nullable=True),
        sa.Column("selling_price", sa.Float(), nullable=True),
        sa.Column("purchase_price", sa.Float(), nullable=True),
        sa.Column("discount", sa.Float(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["product_code"],
            ["catalog.product_code"],
            name="fk_pricing_product_code_catalog",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pricing_pkey"),
        sa.UniqueConstraint("product_code", name="pricing_product_code_uq"),
    )

    op.create_table(
        "pricing_history",
        _id_column(),
        sa.Column("product_code", sa.Text(), nullable=False),
        sa.Column("mrp", sa.Float(), nullable=True),
        sa.Column("selling_price", sa.Float(), nullable=True),
        sa.Column("purchase_price", sa.Float(), nullable=True),
        sa.Column("discount", sa.Float(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["product_code"],
            ["catalog.product_code"],
            name="fk_pricing_history_product_code_catalog",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pricing_history_pkey"),
    )
    op.create_index(
        "pricing_history_code_updated",
        "pricing_history",
        ["product_code", sa.text("updated_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("pricing_history_code_updated", table_name="pricing_history")
    op.drop_table("pricing_history")
    op.drop_table("pricing")
