"""add review columns to payment_orders

Jejak verifikasi pembayaran lewat panel admin (A-3): alasan penolakan,
admin yang meninjau, dan waktunya. reviewed_by → SET NULL supaya menghapus
akun admin tidak terhalang FK.

Revision ID: 0016
Revises: 0015
Create Date: 2026-10-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FK = "fk_payment_orders_reviewed_by_users"


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("payment_orders")}
    if "rejection_reason" not in cols:
        op.add_column("payment_orders", sa.Column("rejection_reason", sa.Text(), nullable=True))
    if "reviewed_by" not in cols:
        op.add_column(
            "payment_orders",
            sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.create_foreign_key(_FK, "payment_orders", "users", ["reviewed_by"], ["id"], ondelete="SET NULL")
    if "reviewed_at" not in cols:
        op.add_column("payment_orders", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("payment_orders")}
    if "reviewed_at" in cols:
        op.drop_column("payment_orders", "reviewed_at")
    if "reviewed_by" in cols:
        op.drop_constraint(_FK, "payment_orders", type_="foreignkey")
        op.drop_column("payment_orders", "reviewed_by")
    if "rejection_reason" in cols:
        op.drop_column("payment_orders", "rejection_reason")
