"""add template_drafts table

Draft Template Lab (A-6) — terpisah dari `templates` supaya draft tak pernah tampil di galeri user.

Revision ID: 0023
Revises: 0022
Create Date: 2026-10-22
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0023"
down_revision: Union[str, None] = "0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if "template_drafts" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "template_drafts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, server_default=""),
        sa.Column("industry", sa.String(50), nullable=False, server_default=""),
        sa.Column("theme", sa.String(50), nullable=False, server_default=""),
        sa.Column("copy_intent", sa.String(20), nullable=True),
        sa.Column("content_type", sa.String(20), nullable=False, server_default="instagram_post"),
        sa.Column("is_premium", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("template_config", sa.JSON(), nullable=False),
        sa.Column("thumbnail_url", sa.Text(), nullable=True),
        sa.Column("background_url", sa.Text(), nullable=True),
        sa.Column(
            "source_template_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("templates.id", ondelete="SET NULL"), nullable=True,
        ),
        sa.Column(
            "created_by", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    if "template_drafts" in sa.inspect(op.get_bind()).get_table_names():
        op.drop_table("template_drafts")
