"""Allow purchases without a linked partner.

Revision ID: 0015_optional_purchase_partner
Revises: 0014_operational_api_indexes
Create Date: 2026-10-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0015_optional_purchase_partner"
down_revision: str | None = "0014_operational_api_indexes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "purchases",
        "partner_id",
        existing_type=sa.String(length=36),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "purchases",
        "partner_id",
        existing_type=sa.String(length=36),
        nullable=False,
    )
