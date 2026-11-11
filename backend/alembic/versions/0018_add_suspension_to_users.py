"""add suspension columns to users

Suspend user dari panel admin (A-4). Semua baris lama aktif.

Revision ID: 0018
Revises: 0017
Create Date: 2026-10-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0018"
down_revision: Union[str, None] = "0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _cols() -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns("users")}


def upgrade() -> None:
    cols = _cols()
    if "is_active" not in cols:
        op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    if "suspended_at" not in cols:
        op.add_column("users", sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True))
    if "suspended_reason" not in cols:
        op.add_column("users", sa.Column("suspended_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    cols = _cols()
    for col in ("suspended_reason", "suspended_at", "is_active"):
        if col in cols:
            op.drop_column("users", col)
