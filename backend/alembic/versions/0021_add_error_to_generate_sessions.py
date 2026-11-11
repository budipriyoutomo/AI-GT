"""add error_reason & error_message to generate_sessions

Jejak kegagalan generate untuk panel admin (A-8). Hanya dibaca endpoint admin.

Revision ID: 0021
Revises: 0020
Create Date: 2026-10-05
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0021"
down_revision: Union[str, None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _cols() -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns("generate_sessions")}


def upgrade() -> None:
    cols = _cols()
    if "error_reason" not in cols:
        op.add_column("generate_sessions", sa.Column("error_reason", sa.String(30), nullable=True))
    if "error_message" not in cols:
        op.add_column("generate_sessions", sa.Column("error_message", sa.Text(), nullable=True))


def downgrade() -> None:
    cols = _cols()
    for col in ("error_message", "error_reason"):
        if col in cols:
            op.drop_column("generate_sessions", col)
