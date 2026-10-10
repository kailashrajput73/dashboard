"""Create RFQs and RFQ lines schema.

Revision ID: 0009_rfqs_schema
Revises: 0008_purchases_schema
Create Date: 2026-10-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009_rfqs_schema"
down_revision: str | None = "0008_purchases_schema"
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
        "rfqs",
        _id_column(),
        sa.Column("partner_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("grand_total", sa.Float(), nullable=False),
        sa.Column("special_discount_percent", sa.Float(), nullable=False),
        sa.Column("reward_points", sa.Integer(), nullable=False),
        sa.Column("delivery_mode", sa.Text(), nullable=False),
        sa.Column("scheduled_at", sa.Text(), nullable=True),
        sa.Column(
            "history",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["partner_id"],
            ["partners.id"],
            name="fk_rfqs_partner_id_partners",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="rfqs_id_uq"),
    )
    op.create_index("rfqs_partner_id", "rfqs", ["partner_id"])
    op.create_index("rfqs_partner_status", "rfqs", ["partner_id", "status"])
    op.create_index(
        "rfqs_status_created",
        "rfqs",
        ["status", sa.text("created_at DESC")],
    )
    op.create_index(
        "rfqs_created_at",
        "rfqs",
        [sa.text("created_at DESC")],
    )

    op.create_table(
        "rfq_lines",
        _id_column(),
        sa.Column("rfq_id", sa.String(length=36), nullable=False),
        sa.Column("product_id", sa.String(length=36), nullable=False),
        sa.Column("product_code", sa.Text(), nullable=False),
        sa.Column("product_name", sa.Text(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["rfq_id"],
            ["rfqs.id"],
            name="fk_rfq_lines_rfq_id_rfqs",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["catalog.id"],
            name="fk_rfq_lines_product_id_catalog",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="rfq_lines_pkey"),
    )
    op.create_index("rfq_lines_rfq_id", "rfq_lines", ["rfq_id"])
    op.create_index("rfq_lines_product_id", "rfq_lines", ["product_id"])
    op.create_index("rfq_lines_product_code", "rfq_lines", ["product_code"])


def downgrade() -> None:
    op.drop_index("rfq_lines_product_code", table_name="rfq_lines")
    op.drop_index("rfq_lines_product_id", table_name="rfq_lines")
    op.drop_index("rfq_lines_rfq_id", table_name="rfq_lines")
    op.drop_table("rfq_lines")
    op.drop_index("rfqs_created_at", table_name="rfqs")
    op.drop_index("rfqs_status_created", table_name="rfqs")
    op.drop_index("rfqs_partner_status", table_name="rfqs")
    op.drop_index("rfqs_partner_id", table_name="rfqs")
    op.drop_table("rfqs")
