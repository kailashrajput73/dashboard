"""Create rack and rack slot schema.

Revision ID: 0005_racks_schema
Revises: 0004_product_groups_schema
Create Date: 2026-10-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_racks_schema"
down_revision: str | None = "0004_product_groups_schema"
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
        "racks",
        _id_column(),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("column_count", sa.Integer(), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="racks_pkey"),
        sa.UniqueConstraint("name", name="racks_name_uq"),
    )
    op.create_index("racks_name_sort", "racks", ["name"])

    op.create_table(
        "rack_slots",
        _id_column(),
        sa.Column("rack_id", sa.String(length=36), nullable=False),
        sa.Column("slot_code", sa.Text(), nullable=False),
        sa.Column("product_id", sa.String(length=36), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["rack_id"],
            ["racks.id"],
            name="fk_rack_slots_rack_id_racks",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="rack_slots_pkey"),
        sa.UniqueConstraint("rack_id", "slot_code", name="rack_slots_rack_code_uq"),
    )
    op.create_index("rack_slots_rack_id", "rack_slots", ["rack_id"])
    op.create_index("rack_slots_product_id", "rack_slots", ["product_id"])
    op.create_index(
        "rack_slots_product_id_uq",
        "rack_slots",
        ["product_id"],
        unique=True,
        postgresql_where=sa.text("product_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("rack_slots_product_id_uq", table_name="rack_slots")
    op.drop_index("rack_slots_product_id", table_name="rack_slots")
    op.drop_index("rack_slots_rack_id", table_name="rack_slots")
    op.drop_table("rack_slots")
    op.drop_index("racks_name_sort", table_name="racks")
    op.drop_table("racks")
