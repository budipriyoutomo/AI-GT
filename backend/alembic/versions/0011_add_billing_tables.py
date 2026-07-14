"""add billing tables (subscriptions + payment_orders)

Monetisasi transfer manual (tanpa payment gateway). subscriptions = entitlement
plan aktif per user; payment_orders = order/invoice + bukti transfer.

Revision ID: 0011
Revises: 0010
Create Date: 2026-07-09
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())

    if "subscriptions" not in tables:
        op.create_table(
            "subscriptions",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), unique=True, nullable=False),
            sa.Column("plan_id", sa.String(30), nullable=False, server_default="starter"),
            sa.Column("status", sa.String(20), nullable=False, server_default="active"),
            sa.Column("storage_addon_id", sa.String(30), nullable=True),
            sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )

    if "payment_orders" not in tables:
        op.create_table(
            "payment_orders",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("kind", sa.String(10), nullable=False),
            sa.Column("item_id", sa.String(30), nullable=False),
            sa.Column("amount", sa.Integer(), nullable=False),
            sa.Column("unique_code", sa.Integer(), nullable=False),
            sa.Column("total_amount", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(25), nullable=False, server_default="pending"),
            sa.Column("proof_url", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "payment_orders" in tables:
        op.drop_table("payment_orders")
    if "subscriptions" in tables:
        op.drop_table("subscriptions")
