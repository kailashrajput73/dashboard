"""Enforce active rack name uniqueness case-insensitively.

Revision ID: 0017_rack_name_ci_unique
Revises: 0016_pg_group_name_uq
Create Date: 2026-10-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0017_rack_name_ci_unique"
down_revision: str | None = "0016_pg_group_name_uq"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    duplicate_names = op.get_bind().execute(
        sa.text(
            """
            SELECT lower(name)
            FROM racks
            WHERE deleted_at IS NULL
            GROUP BY lower(name)
            HAVING count(*) > 1
            LIMIT 1
            """
        )
    ).first()
    if duplicate_names is not None:
        raise RuntimeError(
            "Cannot enforce case-insensitive rack name uniqueness: "
            "active racks contain duplicate names."
        )

    op.create_index(
        "racks_name_ci",
        "racks",
        [sa.text("lower(name)")],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("racks_name_ci", table_name="racks")
