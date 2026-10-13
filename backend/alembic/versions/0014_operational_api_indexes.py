"""Index operational API search and soft-delete filters.

Revision ID: 0014_operational_api_indexes
Revises: 0013_catalog_api_indexes
Create Date: 2026-10-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014_operational_api_indexes"
down_revision: str | None = "0013_catalog_api_indexes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("purchases_deleted_at", "purchases", ["deleted_at"])
    op.create_index("purchase_lines_deleted_at", "purchase_lines", ["deleted_at"])
    op.create_index(
        "purchase_lines_purchase_created",
        "purchase_lines",
        ["purchase_id", "created_at", "id"],
    )
    op.create_index("rfqs_deleted_at", "rfqs", ["deleted_at"])
    op.create_index(
        "rfqs_partner_id_trgm",
        "rfqs",
        ["partner_id"],
        postgresql_using="gin",
        postgresql_ops={"partner_id": "gin_trgm_ops"},
    )
    op.create_index("rfq_lines_deleted_at", "rfq_lines", ["deleted_at"])
    op.create_index(
        "rfq_lines_rfq_created",
        "rfq_lines",
        ["rfq_id", "created_at", "id"],
    )
    op.create_index(
        "rfq_lines_product_code_trgm",
        "rfq_lines",
        ["product_code"],
        postgresql_using="gin",
        postgresql_ops={"product_code": "gin_trgm_ops"},
    )
    op.create_index(
        "rfq_lines_product_name_trgm",
        "rfq_lines",
        ["product_name"],
        postgresql_using="gin",
        postgresql_ops={"product_name": "gin_trgm_ops"},
    )
    op.create_index("reward_ledger_deleted_at", "reward_ledger", ["deleted_at"])
    op.create_index("dispatches_deleted_at", "dispatches", ["deleted_at"])
    op.create_index("dispatch_lines_deleted_at", "dispatch_lines", ["deleted_at"])
    op.create_index(
        "dispatch_lines_dispatch_created",
        "dispatch_lines",
        ["dispatch_id", "created_at", "id"],
    )


def downgrade() -> None:
    op.drop_index("dispatch_lines_deleted_at", table_name="dispatch_lines")
    op.drop_index("dispatches_deleted_at", table_name="dispatches")
    op.drop_index("reward_ledger_deleted_at", table_name="reward_ledger")
    op.drop_index(
        "dispatch_lines_dispatch_created",
        table_name="dispatch_lines",
    )
    op.drop_index("rfq_lines_product_name_trgm", table_name="rfq_lines")
    op.drop_index("rfq_lines_product_code_trgm", table_name="rfq_lines")
    op.drop_index("rfq_lines_rfq_created", table_name="rfq_lines")
    op.drop_index("rfq_lines_deleted_at", table_name="rfq_lines")
    op.drop_index("rfqs_partner_id_trgm", table_name="rfqs")
    op.drop_index("rfqs_deleted_at", table_name="rfqs")
    op.drop_index(
        "purchase_lines_purchase_created",
        table_name="purchase_lines",
    )
    op.drop_index("purchase_lines_deleted_at", table_name="purchase_lines")
    op.drop_index("purchases_deleted_at", table_name="purchases")
