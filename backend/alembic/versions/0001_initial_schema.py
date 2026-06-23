"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-23
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "company_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), unique=True, nullable=False),
        sa.Column("business_name", sa.String(100), nullable=False),
        sa.Column("industry", sa.String(50), nullable=False),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("brand_colors", JSONB(), nullable=True),
        sa.Column("language_preference", sa.String(10), server_default="id", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "templates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("industry", sa.String(50), nullable=False),
        sa.Column("theme", sa.String(50), nullable=False),
        sa.Column("content_type", sa.String(20), nullable=False),
        sa.Column("thumbnail_url", sa.Text(), nullable=False),
        sa.Column("template_config", JSONB(), nullable=False),
        sa.Column("is_premium", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_templates_industry", "templates", ["industry"])
    op.create_index("ix_templates_theme", "templates", ["theme"])
    op.create_index("ix_templates_is_active", "templates", ["is_active"])

    op.create_table(
        "generate_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("template_id", UUID(as_uuid=True), sa.ForeignKey("templates.id"), nullable=False),
        sa.Column("language_style", sa.String(20), nullable=False),
        sa.Column("thematic_image_theme", sa.String(50), nullable=True),
        sa.Column("campaign_data", JSONB(), nullable=True),
        sa.Column("status", sa.String(20), server_default="processing", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_generate_sessions_user_id", "generate_sessions", ["user_id"])
    op.create_index("ix_generate_sessions_expires_at", "generate_sessions", ["expires_at"])

    op.create_table(
        "generate_variants",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("session_id", UUID(as_uuid=True), sa.ForeignKey("generate_sessions.id"), nullable=False),
        sa.Column("variant_number", sa.Integer(), nullable=False),
        sa.Column("copy_data", JSONB(), nullable=False),
        sa.Column("typography_data", JSONB(), nullable=False),
        sa.Column("thematic_image_url", sa.Text(), nullable=True),
        sa.Column("is_selected", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_generate_variants_session_id", "generate_variants", ["session_id"])

    op.create_table(
        "projects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_id", UUID(as_uuid=True), sa.ForeignKey("generate_sessions.id"), nullable=False),
        sa.Column("variant_id", UUID(as_uuid=True), sa.ForeignKey("generate_variants.id"), nullable=False),
        sa.Column("title", sa.String(100), nullable=True),
        sa.Column("final_config", JSONB(), nullable=False),
        sa.Column("exported_image_url", sa.Text(), nullable=True),
        sa.Column("is_exported", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_projects_user_id", "projects", ["user_id"])


def downgrade() -> None:
    op.drop_table("projects")
    op.drop_table("generate_variants")
    op.drop_table("generate_sessions")
    op.drop_table("templates")
    op.drop_table("company_profiles")
    op.drop_table("users")
