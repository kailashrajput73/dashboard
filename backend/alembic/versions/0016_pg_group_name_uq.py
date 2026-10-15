"""Enforce active product-group name uniqueness case-insensitively.

Revision ID: 0016_pg_group_name_uq
Revises: 0015_optional_purchase_partner
Create Date: 2026-10-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0016_pg_group_name_uq"
down_revision: str | None = "0015_optional_purchase_partner"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    duplicate_names = op.get_bind().execute(
        sa.text(
            """
            SELECT lower(name)
            FROM product_groups
            WHERE deleted_at IS NULL
            GROUP BY lower(name)
            HAVING count(*) > 1
            LIMIT 1
            """
        )
    ).first()
    if duplicate_names is not None:
        raise RuntimeError(
            "Cannot enforce case-insensitive product-group name uniqueness: "
            "active product groups contain duplicate names."
        )

    op.drop_index("product_groups_name_ci", table_name="product_groups")
    op.create_index(
        "product_groups_name_ci",
        "product_groups",
        [sa.text("lower(name)")],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("product_groups_name_ci", table_name="product_groups")
    op.create_index(
        "product_groups_name_ci",
        "product_groups",
        [sa.text("lower(name)")],
    )
