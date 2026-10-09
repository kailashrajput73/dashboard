"""Create core auth, partner, and money configuration tables.

Revision ID: 0002_core_auth_schema
Revises: 0001_empty_baseline
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_core_auth_schema"
down_revision: str | None = "0001_empty_baseline"
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
        "users",
        _id_column(),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("company_name", sa.Text(), nullable=True),
        sa.Column("gstin", sa.Text(), nullable=True),
        sa.Column("contact_number", sa.Text(), nullable=True),
        sa.Column("passcode_hash", sa.Text(), nullable=True),
        sa.Column("permissions", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="users_pkey"),
    )
    op.create_index("users_role_contact", "users", ["role", "contact_number"])
    op.create_index("users_contact", "users", ["contact_number"])
    op.create_index("users_role_name_sort", "users", ["role", "name"])

    op.create_table(
        "admin_tokens",
        _id_column(),
        sa.Column("token", sa.Text(), nullable=False),
        sa.Column("admin_id", sa.String(length=36), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["admin_id"],
            ["users.id"],
            name="fk_admin_tokens_admin_id_users",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="admin_tokens_pkey"),
        sa.UniqueConstraint("token", name="admin_tokens_token_uq"),
    )
    op.create_index("admin_tokens_admin_id", "admin_tokens", ["admin_id"])

    op.create_table(
        "partners",
        _id_column(),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("business_name", sa.Text(), nullable=True),
        sa.Column("pincode", sa.Text(), nullable=True),
        sa.Column("city", sa.Text(), nullable=True),
        sa.Column("area", sa.Text(), nullable=True),
        sa.Column("sales_manager", sa.Text(), nullable=True),
        sa.Column("documents", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("kyc_status", sa.Text(), nullable=True),
        sa.Column("location_verified", sa.Boolean(), nullable=True),
        sa.Column("app_active", sa.Boolean(), nullable=True),
        sa.Column("kyc_history", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("reward_points", sa.Integer(), nullable=True),
        sa.Column("passcode_hash", sa.Text(), nullable=True),
        sa.Column("registered_via", sa.Text(), nullable=True),
        sa.Column("login_count", sa.Integer(), nullable=True),
        sa.Column("last_app_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by", sa.Text(), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="partners_pkey"),
    )
    op.create_index(
        "partners_phone_uq",
        "partners",
        ["phone"],
        unique=True,
        postgresql_where=sa.text("phone IS NOT NULL"),
    )
    op.create_index("partners_kyc_name_sort", "partners", ["kyc_status", "name"])
    op.create_index("partners_sales_manager", "partners", ["sales_manager"])
    op.create_index("partners_name_sort", "partners", ["name"])

    op.create_table(
        "partner_tokens",
        _id_column(),
        sa.Column("token", sa.Text(), nullable=False),
        sa.Column("partner_id", sa.String(length=36), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["partner_id"],
            ["partners.id"],
            name="fk_partner_tokens_partner_id_partners",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="partner_tokens_pkey"),
        sa.UniqueConstraint("token", name="partner_tokens_token_uq"),
    )
    op.create_index("partner_tokens_partner_id", "partner_tokens", ["partner_id"])

    op.create_table(
        "money_config",
        _id_column(),
        sa.Column("admin_id", sa.String(length=36), nullable=False),
        sa.Column("discount_percent", sa.Float(), server_default=sa.text("0"), nullable=False),
        sa.Column("gst_percent", sa.Float(), server_default=sa.text("18"), nullable=False),
        sa.Column(
            "special_discount_percent",
            sa.Float(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("show_discount", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("show_gst", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "show_special_discount",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["admin_id"],
            ["users.id"],
            name="fk_money_config_admin_id_users",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="money_config_pkey"),
        sa.UniqueConstraint("admin_id", name="money_config_admin_id_uq"),
    )


def downgrade() -> None:
    op.drop_table("money_config")
    op.drop_index("partner_tokens_partner_id", table_name="partner_tokens")
    op.drop_table("partner_tokens")
    op.drop_index("partners_name_sort", table_name="partners")
    op.drop_index("partners_sales_manager", table_name="partners")
    op.drop_index("partners_kyc_name_sort", table_name="partners")
    op.drop_index("partners_phone_uq", table_name="partners")
    op.drop_table("partners")
    op.drop_index("admin_tokens_admin_id", table_name="admin_tokens")
    op.drop_table("admin_tokens")
    op.drop_index("users_role_name_sort", table_name="users")
    op.drop_index("users_contact", table_name="users")
    op.drop_index("users_role_contact", table_name="users")
    op.drop_table("users")
