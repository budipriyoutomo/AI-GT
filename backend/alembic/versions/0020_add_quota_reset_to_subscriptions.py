"""add quota_reset_at to subscriptions

Reset kuota generate manual oleh admin (A-5). Kuota dihitung sejak
max(tgl 1 bulan berjalan, quota_reset_at) — riwayat session tidak dihapus.

Revision ID: 0020
Revises: 0019
Create Date: 2026-10-05
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0020"
down_revision: Union[str, None] = "0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _cols() -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns("subscriptions")}


def upgrade() -> None:
    if "quota_reset_at" not in _cols():
        op.add_column("subscriptions", sa.Column("quota_reset_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    if "quota_reset_at" in _cols():
        op.drop_column("subscriptions", "quota_reset_at")
