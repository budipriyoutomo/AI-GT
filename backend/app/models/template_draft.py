import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TemplateDraft(Base):
    """Draft Template Lab (A-6).

    Tabel terpisah dari `templates` — bukan flag — supaya draft tidak mungkin bocor ke galeri user
    karena filter yang terlewat. `template_config` di sini MENTAH (preset belum di-expand) dan boleh
    belum valid selama diedit; validasi penuh hanya saat publish.
    """

    __tablename__ = "template_drafts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    industry: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    theme: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    copy_intent: Mapped[str | None] = mapped_column(String(20), nullable=True)
    content_type: Mapped[str] = mapped_column(String(20), nullable=False, default="instagram_post")
    is_premium: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    template_config: Mapped[dict] = mapped_column(JSON, nullable=False)
    # Disalin dari template asal (versi baru) supaya preview langsung lengkap; upload gambar
    # baru dilakukan per baris setelah publish.
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    background_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("templates.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
