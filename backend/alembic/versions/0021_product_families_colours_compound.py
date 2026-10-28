"""Electrical families: colours and compound (Safetech-style sheets).

Revision ID: 0021_product_families_colours_compound
Revises: 0020_user_module_access, 0020_partner_firebase_app
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0021_product_families_colours_compound"
down_revision: str | Sequence[str] | None = (
    "0020_user_module_access",
    "0020_partner_firebase_app",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("product_families", sa.Column("colours", sa.Text(), nullable=True))
    op.add_column("product_families", sa.Column("compound", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("product_families", "compound")
    op.drop_column("product_families", "colours")
