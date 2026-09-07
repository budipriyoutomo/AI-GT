"""drop is_exported from projects

Kolom is_exported dihapus. Status export sekarang diturunkan dari
exported_image_url (terisi = sudah export, null = draft).

Revision ID: 0013
Revises: 0012
Create Date: 2026-07-15
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("projects")}
    if "is_exported" in columns:
        op.drop_column("projects", "is_exported")


def downgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("projects")}
    if "is_exported" not in columns:
        op.add_column(
            "projects",
            sa.Column(
                "is_exported",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )
