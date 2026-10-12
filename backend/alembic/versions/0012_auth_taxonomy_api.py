"""Add case-insensitive uniqueness for auth and taxonomy API writes.

Revision ID: 0012_auth_taxonomy_api
Revises: 0011_dispatches_schema
Create Date: 2026-10-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012_auth_taxonomy_api"
down_revision: str | None = "0011_dispatches_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("categories_name_uq", "categories", type_="unique")
    op.drop_constraint(
        "subcategories_category_name_uq",
        "subcategories",
        type_="unique",
    )
    op.drop_constraint("brands_name_uq", "brands", type_="unique")
    op.drop_constraint(
        "product_types_name_uq",
        "product_types",
        type_="unique",
    )

    op.create_index(
        "users_contact_number_uq",
        "users",
        ["contact_number"],
        unique=True,
        postgresql_where=sa.text(
            "contact_number IS NOT NULL AND deleted_at IS NULL"
        ),
    )
    op.create_index(
        "categories_name_ci_uq",
        "categories",
        [sa.text("lower(name)")],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "subcategories_category_name_ci_uq",
        "subcategories",
        ["category_id", sa.text("lower(name)")],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "brands_name_ci_uq",
        "brands",
        [sa.text("lower(name)")],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "product_types_name_ci_uq",
        "product_types",
        [sa.text("lower(name)")],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("product_types_name_ci_uq", table_name="product_types")
    op.drop_index("brands_name_ci_uq", table_name="brands")
    op.drop_index(
        "subcategories_category_name_ci_uq",
        table_name="subcategories",
    )
    op.drop_index("categories_name_ci_uq", table_name="categories")
    op.drop_index("users_contact_number_uq", table_name="users")

    op.create_unique_constraint(
        "product_types_name_uq",
        "product_types",
        ["name"],
    )
    op.create_unique_constraint("brands_name_uq", "brands", ["name"])
    op.create_unique_constraint(
        "subcategories_category_name_uq",
        "subcategories",
        ["category_id", "name"],
    )
    op.create_unique_constraint("categories_name_uq", "categories", ["name"])
