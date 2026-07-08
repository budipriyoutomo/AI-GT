"""add contact_messages table

Tabel pesan dari halaman Hubungi Kami (publik, tanpa auth). Dibaca admin via DB.

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-09
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if "contact_messages" in sa.inspect(bind).get_table_names():
        return
    op.create_table(
        "contact_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_handled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    bind = op.get_bind()
    if "contact_messages" in sa.inspect(bind).get_table_names():
        op.drop_table("contact_messages")
