"""add progress to generate_sessions

Kolom 0-100 untuk melaporkan progress generate asli ke frontend (bukan
simulasi waktu). Diperbarui backend di run_generation_task.

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-05
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("generate_sessions")}
    if "progress" not in columns:
        op.add_column(
            "generate_sessions",
            sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("generate_sessions")}
    if "progress" in columns:
        op.drop_column("generate_sessions", "progress")
