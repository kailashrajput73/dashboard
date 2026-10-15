"""Create service requests schema with embedded history.

Revision ID: 0018_service_requests_schema
Revises: 0017_rack_name_ci_unique
Create Date: 2026-10-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0018_service_requests_schema"
down_revision: str | None = "0017_rack_name_ci_unique"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "service_requests",
        sa.Column(
            "id",
            sa.String(length=36),
            server_default=sa.text("gen_random_uuid()::text"),
            nullable=False,
        ),
        sa.Column("service_type", sa.Text(), nullable=False),
        sa.Column("customer_name", sa.Text(), nullable=False),
        sa.Column("customer_phone", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("address", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("pincode", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("city", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("area", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("recommended_name", sa.Text(), nullable=True),
        sa.Column("recommended_phone", sa.Text(), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column(
            "history",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
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
        sa.PrimaryKeyConstraint("id", name="service_requests_id_uq"),
    )
    op.create_index(
        "service_requests_status_type_created",
        "service_requests",
        ["status", "service_type", sa.text("created_at DESC")],
    )
    op.create_index(
        "service_requests_service_type",
        "service_requests",
        ["service_type"],
    )
    op.create_index(
        "service_requests_createdAt",
        "service_requests",
        [sa.text("created_at DESC")],
    )
    op.create_index(
        "service_requests_deleted_at",
        "service_requests",
        ["deleted_at"],
    )
    for column in (
        "customer_name",
        "customer_phone",
        "service_type",
        "description",
        "city",
        "area",
    ):
        op.create_index(
            f"service_requests_{column}_trgm",
            "service_requests",
            [column],
            postgresql_using="gin",
            postgresql_ops={column: "gin_trgm_ops"},
        )


def downgrade() -> None:
    for column in (
        "area",
        "city",
        "description",
        "service_type",
        "customer_phone",
        "customer_name",
    ):
        op.drop_index(
            f"service_requests_{column}_trgm",
            table_name="service_requests",
        )
    op.drop_index(
        "service_requests_service_type",
        table_name="service_requests",
    )
    op.drop_index(
        "service_requests_deleted_at",
        table_name="service_requests",
    )
    op.drop_index(
        "service_requests_createdAt",
        table_name="service_requests",
    )
    op.drop_index(
        "service_requests_status_type_created",
        table_name="service_requests",
    )
    op.drop_table("service_requests")
