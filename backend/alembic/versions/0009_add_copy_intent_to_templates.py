"""add copy_intent to templates

Niat copy per-template (promotion | story | brand) yang memberi AI arah cara menulis
copy — terpisah dari `theme` (label tema/visual) dan `content_type` (format platform).
Nullable: template lama tanpa nilai jatuh ke fallback prompt generic.

Revision ID: 0009
Revises: 0008
Create Date: 2026-07-09
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempoten: kolom bisa sudah ada karena seed_templates.py menambahkannya lewat
    # SCHEMA_FALLBACKS (ADD COLUMN IF NOT EXISTS) sebelum migrasi ini dijalankan.
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("templates")}
    if "copy_intent" not in columns:
        op.add_column("templates", sa.Column("copy_intent", sa.String(length=20), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("templates")}
    if "copy_intent" in columns:
        op.drop_column("templates", "copy_intent")
