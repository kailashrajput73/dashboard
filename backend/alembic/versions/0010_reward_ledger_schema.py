"""Create reward ledger schema.

Revision ID: 0010_reward_ledger_schema
Revises: 0009_rfqs_schema
Create Date: 2026-10-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010_reward_ledger_schema"
down_revision: str | None = "0009_rfqs_schema"
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
        "reward_ledger",
        _id_column(),
        sa.Column("requester_id", sa.String(length=36), nullable=False),
        sa.Column("quotation_id", sa.String(length=36), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["requester_id"],
            ["partners.id"],
            name="fk_reward_ledger_requester_id_partners",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["quotation_id"],
            ["rfqs.id"],
            name="fk_reward_ledger_quotation_id_rfqs",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="reward_ledger_pkey"),
    )
    op.create_index(
        "reward_ledger_requester_created",
        "reward_ledger",
        ["requester_id", sa.text("created_at DESC")],
    )
    op.create_index(
        "reward_ledger_requester_type",
        "reward_ledger",
        ["requester_id", "type"],
    )
    op.create_index(
        "reward_ledger_quotation_type",
        "reward_ledger",
        ["quotation_id", "type"],
    )
    op.create_index(
        "reward_ledger_one_earned_per_quotation_uq",
        "reward_ledger",
        ["quotation_id"],
        unique=True,
        postgresql_where=sa.text("type = 'earned' AND deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "reward_ledger_one_earned_per_quotation_uq",
        table_name="reward_ledger",
    )
    op.drop_index("reward_ledger_quotation_type", table_name="reward_ledger")
    op.drop_index("reward_ledger_requester_type", table_name="reward_ledger")
    op.drop_index("reward_ledger_requester_created", table_name="reward_ledger")
    op.drop_table("reward_ledger")
