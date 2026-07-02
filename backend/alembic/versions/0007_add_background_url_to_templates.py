"""add background_url to templates

Kolom image latar full-bleed (mis. foto toko blur), terpisah dari thumbnail_url
(yang dipakai sebagai foreground/gallery thumbnail). Nullable — di-upload admin per-baris.

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-02
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempoten: kolom bisa sudah ada karena seed_templates.py menambahkannya lewat
    # SCHEMA_FALLBACKS (ADD COLUMN IF NOT EXISTS) sebelum migrasi ini dijalankan.
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("templates")}
    if "background_url" not in columns:
        op.add_column("templates", sa.Column("background_url", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("templates")}
    if "background_url" in columns:
        op.drop_column("templates", "background_url")
