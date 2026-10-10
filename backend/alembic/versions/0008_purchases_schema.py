"""Create purchases and purchase lines schema.

Revision ID: 0008_purchases_schema
Revises: 0007_pricing_schema
Create Date: 2026-10-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008_purchases_schema"
down_revision: str | None = "0007_pricing_schema"
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
        "purchases",
        _id_column(),
        sa.Column("partner_id", sa.String(length=36), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["partner_id"],
            ["partners.id"],
            name="fk_purchases_partner_id_partners",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="purchases_pkey"),
    )
    op.create_index(
        "purchases_createdAt",
        "purchases",
        [sa.text("created_at DESC")],
    )
    op.create_index(
        "purchases_partner_created",
        "purchases",
        ["partner_id", sa.text("created_at DESC")],
    )

    op.create_table(
        "purchase_lines",
        _id_column(),
        sa.Column("purchase_id", sa.String(length=36), nullable=False),
        sa.Column("product_id", sa.String(length=36), nullable=False),
        sa.Column("product_code", sa.Text(), nullable=False),
        sa.Column("product_name", sa.Text(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("list_price", sa.Float(), nullable=False),
        sa.Column(
            "purchase_discount",
            sa.Float(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("rack_id", sa.String(length=36), nullable=True),
        sa.Column("rack_slot", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["purchase_id"],
            ["purchases.id"],
            name="fk_purchase_lines_purchase_id_purchases",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["catalog.id"],
            name="fk_purchase_lines_product_id_catalog",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["rack_id"],
            ["racks.id"],
            name="fk_purchase_lines_rack_id_racks",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="purchase_lines_pkey"),
    )
    op.create_index("purchase_lines_purchase_id", "purchase_lines", ["purchase_id"])
    op.create_index("purchase_lines_product_id", "purchase_lines", ["product_id"])
    op.create_index("purchase_lines_product_code", "purchase_lines", ["product_code"])


def downgrade() -> None:
    op.drop_index("purchase_lines_product_code", table_name="purchase_lines")
    op.drop_index("purchase_lines_product_id", table_name="purchase_lines")
    op.drop_index("purchase_lines_purchase_id", table_name="purchase_lines")
    op.drop_table("purchase_lines")
    op.drop_index("purchases_partner_created", table_name="purchases")
    op.drop_index("purchases_createdAt", table_name="purchases")
    op.drop_table("purchases")
