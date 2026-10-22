"""Partner Firebase app fields and firebase_uid uniqueness.

Revision ID: 0020_partner_firebase_app
Revises: 0019_product_families
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0020_partner_firebase_app"
down_revision = "0019_product_families"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("partners", sa.Column("firebase_uid", sa.Text(), nullable=True))
    op.add_column(
        "partners",
        sa.Column(
            "kyc_submitted",
            sa.Boolean(),
            nullable=True,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "partners",
        sa.Column("kyc_submitted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("partners", sa.Column("pan_number", sa.Text(), nullable=True))
    op.add_column("partners", sa.Column("aadhaar_last4", sa.Text(), nullable=True))
    op.add_column("partners", sa.Column("kyc_method", sa.Text(), nullable=True))
    op.create_index(
        "partners_firebase_uid_uq",
        "partners",
        ["firebase_uid"],
        unique=True,
        postgresql_where=sa.text(
            "firebase_uid IS NOT NULL AND deleted_at IS NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index("partners_firebase_uid_uq", table_name="partners")
    op.drop_column("partners", "kyc_method")
    op.drop_column("partners", "aadhaar_last4")
    op.drop_column("partners", "pan_number")
    op.drop_column("partners", "kyc_submitted_at")
    op.drop_column("partners", "kyc_submitted")
    op.drop_column("partners", "firebase_uid")
