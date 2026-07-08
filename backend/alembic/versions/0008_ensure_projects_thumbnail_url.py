"""ensure thumbnail_url exists on projects

Guard migration: 0004_add_thumbnail_url ran on some environments without actually
applying its DDL (alembic_version advanced to head via a colliding revision id from
a parallel branch, so the ADD COLUMN never executed on this DB). Re-declaring the
column here, idempotently, brings any drifted environment back in sync.

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-08
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
    columns = {c["name"] for c in sa.inspect(bind).get_columns("projects")}
    if "thumbnail_url" not in columns:
        op.add_column("projects", sa.Column("thumbnail_url", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("projects")}
    if "thumbnail_url" in columns:
        op.drop_column("projects", "thumbnail_url")
