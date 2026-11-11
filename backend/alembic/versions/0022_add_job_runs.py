"""add job_runs table

Riwayat eksekusi job terjadwal/manual (A-10): cleanup temp R2 & billing maintenance.

Revision ID: 0022
Revises: 0021
Create Date: 2026-10-05
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0022"
down_revision: Union[str, None] = "0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if "job_runs" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "job_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("job_name", sa.String(50), nullable=False),
        sa.Column("trigger", sa.String(20), nullable=False),
        sa.Column(
            "triggered_by", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
        ),
        sa.Column("triggered_by_email", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_job_runs_job_name", "job_runs", ["job_name"])
    op.create_index("ix_job_runs_started_at", "job_runs", ["started_at"])


def downgrade() -> None:
    if "job_runs" in sa.inspect(op.get_bind()).get_table_names():
        op.drop_table("job_runs")
