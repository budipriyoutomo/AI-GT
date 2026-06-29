"""revert brand_color to brand_colors array, drop brand_color_secondary

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-27
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("company_profiles", "brand_color_secondary")

    # Convert VARCHAR back to JSONB array, wrapping existing value in an array
    op.alter_column(
        "company_profiles",
        "brand_color",
        type_=JSONB(),
        postgresql_using="CASE WHEN brand_color IS NULL THEN NULL ELSE to_jsonb(ARRAY[brand_color]) END",
    )
    op.alter_column("company_profiles", "brand_color", new_column_name="brand_colors")


def downgrade() -> None:
    op.alter_column("company_profiles", "brand_colors", new_column_name="brand_color")
    op.alter_column(
        "company_profiles",
        "brand_color",
        type_=sa.String(),
        postgresql_using="brand_color::jsonb->>0",
    )
    op.add_column("company_profiles", sa.Column("brand_color_secondary", sa.String(), nullable=True))
