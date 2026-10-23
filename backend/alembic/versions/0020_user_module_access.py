"""users.module_access for per-module RBAC

Revision ID: 0020_user_module_access
Revises: 0019_product_families
Create Date: 2026-10-22
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0020_user_module_access"
down_revision = "0019_product_families"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "module_access",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "module_access")
