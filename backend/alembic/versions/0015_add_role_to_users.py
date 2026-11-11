"""add role to users

Kolom otorisasi panel admin (A-1). Nilai: 'user' | 'admin' | 'superadmin'.
Semua baris lama jadi 'user' — admin pertama dibuat lewat scripts/promote_admin.py.

Revision ID: 0015
Revises: 0014
Create Date: 2026-09-11
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("users")}
    if "role" in cols:
        return
    op.add_column(
        "users",
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("users")}
    if "role" in cols:
        op.drop_column("users", "role")
