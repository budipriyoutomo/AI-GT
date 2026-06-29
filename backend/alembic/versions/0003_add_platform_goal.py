"""add platform, goal, content_data columns

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-27
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("templates", sa.Column("platform", sa.String(50), nullable=True))
    op.create_index("ix_templates_platform", "templates", ["platform"])

    op.add_column("generate_sessions", sa.Column("goal", sa.String(50), nullable=True))
    op.add_column("generate_sessions", sa.Column("platform", sa.String(50), nullable=True))
    op.add_column("generate_sessions", sa.Column("content_data", JSONB(), nullable=True))
    op.create_index("ix_generate_sessions_goal", "generate_sessions", ["goal"])
    op.create_index("ix_generate_sessions_platform", "generate_sessions", ["platform"])


def downgrade() -> None:
    op.drop_index("ix_generate_sessions_platform", "generate_sessions")
    op.drop_index("ix_generate_sessions_goal", "generate_sessions")
    op.drop_column("generate_sessions", "content_data")
    op.drop_column("generate_sessions", "platform")
    op.drop_column("generate_sessions", "goal")

    op.drop_index("ix_templates_platform", "templates")
    op.drop_column("templates", "platform")
