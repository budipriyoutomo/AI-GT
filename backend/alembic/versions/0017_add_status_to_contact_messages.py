"""contact_messages: is_handled → status + jejak admin

Kotak masuk pesan di panel admin (A-7). Boolean is_handled tidak cukup untuk
membedakan pesan baru vs sudah dibaca, jadi diganti status
'new' | 'read' | 'handled'. Baris lama: is_handled=true → 'handled', sisanya 'new'.
handled_by → SET NULL supaya menghapus akun admin tidak terhalang FK.

Revision ID: 0017
Revises: 0016
Create Date: 2026-10-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0017"
down_revision: Union[str, None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FK = "fk_contact_messages_handled_by_users"


def _cols() -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns("contact_messages")}


def upgrade() -> None:
    cols = _cols()
    if "status" not in cols:
        op.add_column(
            "contact_messages",
            sa.Column("status", sa.String(20), nullable=False, server_default="new"),
        )
        if "is_handled" in cols:
            op.execute("UPDATE contact_messages SET status = 'handled' WHERE is_handled")
    if "handled_by" not in cols:
        op.add_column(
            "contact_messages",
            sa.Column("handled_by", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.create_foreign_key(_FK, "contact_messages", "users", ["handled_by"], ["id"], ondelete="SET NULL")
    if "handled_at" not in cols:
        op.add_column("contact_messages", sa.Column("handled_at", sa.DateTime(timezone=True), nullable=True))
    if "is_handled" in cols:
        op.drop_column("contact_messages", "is_handled")


def downgrade() -> None:
    cols = _cols()
    if "is_handled" not in cols:
        op.add_column(
            "contact_messages",
            sa.Column("is_handled", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
        if "status" in cols:
            op.execute("UPDATE contact_messages SET is_handled = true WHERE status = 'handled'")
    if "handled_at" in cols:
        op.drop_column("contact_messages", "handled_at")
    if "handled_by" in cols:
        op.drop_constraint(_FK, "contact_messages", type_="foreignkey")
        op.drop_column("contact_messages", "handled_by")
    if "status" in cols:
        op.drop_column("contact_messages", "status")
