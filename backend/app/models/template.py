import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    industry: Mapped[str] = mapped_column(String(50), nullable=False)
    theme: Mapped[str] = mapped_column(String(50), nullable=False)
    content_type: Mapped[str] = mapped_column(String(20), nullable=False)
    thumbnail_url: Mapped[str] = mapped_column(Text, nullable=False)
    template_config: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    generate_sessions: Mapped[list["GenerateSession"]] = relationship(back_populates="template")  # noqa: F821
