"""Create dispatches and dispatch lines schema.

Revision ID: 0011_dispatches_schema
Revises: 0010_reward_ledger_schema
Create Date: 2026-10-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0011_dispatches_schema"
down_revision: str | None = "0010_reward_ledger_schema"
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
        "dispatches",
        _id_column(),
        sa.Column("source_rfq_id", sa.String(length=36), nullable=True),
        sa.Column("customer_name", sa.Text(), nullable=True),
        sa.Column("customer_phone", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["source_rfq_id"],
            ["rfqs.id"],
            name="fk_dispatches_source_rfq_id_rfqs",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="dispatches_pkey"),
    )
    op.create_index(
        "dispatches_createdAt",
        "dispatches",
        [sa.text("created_at DESC")],
    )
    op.create_index(
        "dispatches_source_rfq_id_uq",
        "dispatches",
        ["source_rfq_id"],
        unique=True,
        postgresql_where=sa.text("source_rfq_id IS NOT NULL"),
    )

    op.create_table(
        "dispatch_lines",
        _id_column(),
        sa.Column("dispatch_id", sa.String(length=36), nullable=False),
        sa.Column("product_id", sa.String(length=36), nullable=False),
        sa.Column("product_code", sa.Text(), nullable=False),
        sa.Column("product_name", sa.Text(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["dispatch_id"],
            ["dispatches.id"],
            name="fk_dispatch_lines_dispatch_id_dispatches",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["catalog.id"],
            name="fk_dispatch_lines_product_id_catalog",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="dispatch_lines_pkey"),
    )
    op.create_index("dispatch_lines_dispatch_id", "dispatch_lines", ["dispatch_id"])
    op.create_index("dispatch_lines_product_id", "dispatch_lines", ["product_id"])
    op.create_index("dispatch_lines_product_code", "dispatch_lines", ["product_code"])


def downgrade() -> None:
    op.drop_index("dispatch_lines_product_code", table_name="dispatch_lines")
    op.drop_index("dispatch_lines_product_id", table_name="dispatch_lines")
    op.drop_index("dispatch_lines_dispatch_id", table_name="dispatch_lines")
    op.drop_table("dispatch_lines")
    op.drop_index("dispatches_source_rfq_id_uq", table_name="dispatches")
    op.drop_index("dispatches_createdAt", table_name="dispatches")
    op.drop_table("dispatches")
