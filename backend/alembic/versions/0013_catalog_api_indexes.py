"""Index catalog API filters and substring search.

Revision ID: 0013_catalog_api_indexes
Revises: 0012_auth_taxonomy_api
Create Date: 2026-10-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013_catalog_api_indexes"
down_revision: str | None = "0012_auth_taxonomy_api"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.create_index(
        "categories_active_sort",
        "categories",
        ["is_active", "name"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index("catalog_deleted_at", "catalog", ["deleted_at"])
    op.create_index(
        "catalog_tree_category_active",
        "catalog",
        [sa.text("lower(category)"), "is_active"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "catalog_brand_ci",
        "catalog",
        [sa.text("lower(brand)")],
    )
    op.create_index(
        "catalog_type_name_ci",
        "catalog",
        [sa.text("lower(type_name)")],
    )
    op.create_index(
        "catalog_subcategory_ci",
        "catalog",
        [sa.text("lower(subcategory)")],
    )
    op.create_index(
        "catalog_product_class_ci",
        "catalog",
        [sa.text("lower(product_class)")],
    )
    op.create_index(
        "catalog_name_trgm",
        "catalog",
        ["name"],
        postgresql_using="gin",
        postgresql_ops={"name": "gin_trgm_ops"},
    )
    op.create_index(
        "catalog_product_code_trgm",
        "catalog",
        ["product_code"],
        postgresql_using="gin",
        postgresql_ops={"product_code": "gin_trgm_ops"},
    )
    op.create_index(
        "catalog_brand_trgm",
        "catalog",
        ["brand"],
        postgresql_using="gin",
        postgresql_ops={"brand": "gin_trgm_ops"},
    )
    op.create_index(
        "catalog_aliases_trgm",
        "catalog",
        [sa.text("(aliases::text) gin_trgm_ops")],
        postgresql_using="gin",
    )
    op.create_index(
        "product_groups_name_ci",
        "product_groups",
        [sa.text("lower(name)")],
    )
    op.create_index(
        "product_group_items_group_deleted",
        "product_group_items",
        ["product_group_id", "deleted_at"],
    )
    op.create_index(
        "product_group_items_product_deleted",
        "product_group_items",
        ["product_id", "deleted_at"],
    )
    op.drop_index("product_group_items_group_id", table_name="product_group_items")
    op.drop_index("product_group_items_product_id", table_name="product_group_items")


def downgrade() -> None:
    op.create_index(
        "product_group_items_product_id",
        "product_group_items",
        ["product_id"],
    )
    op.create_index(
        "product_group_items_group_id",
        "product_group_items",
        ["product_group_id"],
    )
    op.drop_index("product_group_items_product_deleted", table_name="product_group_items")
    op.drop_index("product_group_items_group_deleted", table_name="product_group_items")
    op.drop_index("product_groups_name_ci", table_name="product_groups")
    op.drop_index("catalog_aliases_trgm", table_name="catalog")
    op.drop_index("catalog_brand_trgm", table_name="catalog")
    op.drop_index("catalog_product_code_trgm", table_name="catalog")
    op.drop_index("catalog_name_trgm", table_name="catalog")
    op.drop_index("catalog_product_class_ci", table_name="catalog")
    op.drop_index("catalog_subcategory_ci", table_name="catalog")
    op.drop_index("catalog_type_name_ci", table_name="catalog")
    op.drop_index("catalog_brand_ci", table_name="catalog")
    op.drop_index("catalog_tree_category_active", table_name="catalog")
    op.drop_index("catalog_deleted_at", table_name="catalog")
    op.drop_index("categories_active_sort", table_name="categories")
