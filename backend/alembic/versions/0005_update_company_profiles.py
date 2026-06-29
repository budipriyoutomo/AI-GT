"""update company_profiles: rename brand_colors to brand_color, add new columns

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-27
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_DEFAULT_CONTACT = """{
  "website": "",
  "phone": "",
  "instagram": "",
  "tiktok": "",
  "youtube": "",
  "hashtag": ""
}"""


def upgrade() -> None:
    # Rename brand_colors → brand_color and convert type from JSONB array to VARCHAR
    op.alter_column("company_profiles", "brand_colors", new_column_name="brand_color")
    op.alter_column(
        "company_profiles",
        "brand_color",
        type_=sa.String(),
        postgresql_using="brand_color::jsonb->>0",
    )

    op.add_column("company_profiles", sa.Column("brand_color_secondary", sa.String(), nullable=True))
    op.add_column("company_profiles", sa.Column("brand_font", sa.String(), nullable=True))
    op.add_column("company_profiles", sa.Column("tagline", sa.String(), nullable=True))
    op.add_column(
        "company_profiles",
        sa.Column(
            "contact",
            JSONB(),
            server_default=sa.text(f"'{_DEFAULT_CONTACT}'::jsonb"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("company_profiles", "contact")
    op.drop_column("company_profiles", "tagline")
    op.drop_column("company_profiles", "brand_font")
    op.drop_column("company_profiles", "brand_color_secondary")

    # Revert VARCHAR back to JSONB array and rename
    op.alter_column(
        "company_profiles",
        "brand_color",
        type_=JSONB(),
        postgresql_using="to_jsonb(ARRAY[brand_color])",
    )
    op.alter_column("company_profiles", "brand_color", new_column_name="brand_colors")
