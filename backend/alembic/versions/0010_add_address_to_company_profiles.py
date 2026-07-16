"""add address to company_profiles

Alamat bisnis sebagai kolom tersendiri (bukan key di dalam JSON `contact`). Nilainya
mengisi slot footer `location` saat template dirender branded — pemetaan address →
slot `location` dilakukan di frontend (lib/template/footer-contact.ts).

Revision ID: 0010
Revises: 0009
Create Date: 2026-07-16
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("company_profiles")}
    if "address" not in columns:
        op.add_column("company_profiles", sa.Column("address", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("company_profiles")}
    if "address" in columns:
        op.drop_column("company_profiles", "address")
