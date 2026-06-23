import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class GenerateVariant(Base):
    __tablename__ = "generate_variants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("generate_sessions.id"), nullable=False
    )
    variant_number: Mapped[int] = mapped_column(Integer, nullable=False)
    copy_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    typography_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    thematic_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    session: Mapped["GenerateSession"] = relationship(back_populates="variants")  # noqa: F821
    project: Mapped["Project"] = relationship(back_populates="variant", uselist=False)  # noqa: F821
