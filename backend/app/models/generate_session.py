import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class GenerateSession(Base):
    __tablename__ = "generate_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("templates.id"), nullable=False
    )
    language_style: Mapped[str] = mapped_column(String(20), nullable=False)
    goal: Mapped[str | None] = mapped_column(String(50), nullable=True)
    platform: Mapped[str | None] = mapped_column(String(50), nullable=True)
    thematic_image_theme: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # content_data: stores Quick Generate fields (product_or_service, key_message, image_source, etc.)
    # campaign_data = NULL means Quick Generate; non-NULL means Campaign (premium)
    content_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    campaign_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="processing")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship(back_populates="generate_sessions")  # noqa: F821
    template: Mapped["Template"] = relationship(back_populates="generate_sessions")  # noqa: F821
    variants: Mapped[list["GenerateVariant"]] = relationship(  # noqa: F821
        back_populates="session", cascade="all, delete-orphan"
    )
    project: Mapped["Project"] = relationship(back_populates="session", uselist=False)  # noqa: F821

    @property
    def project_id(self) -> uuid.UUID | None:
        try:
            return self.project.id if self.project else None
        except Exception:
            return None
