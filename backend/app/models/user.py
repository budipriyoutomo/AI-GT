import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, Text, true
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    # "user" | "admin" | "superadmin" — otorisasi panel admin (A-1).
    role: Mapped[str] = mapped_column(String(20), default="user", server_default="user", nullable=False)
    # Suspend oleh admin (A-4). False → login & semua request ber-token ditolak AUTH_ACCOUNT_SUSPENDED.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true(), nullable=False)
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    suspended_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    company_profile: Mapped["CompanyProfile"] = relationship(back_populates="user", uselist=False)  # noqa: F821
    generate_sessions: Mapped[list["GenerateSession"]] = relationship(back_populates="user")  # noqa: F821
    projects: Mapped[list["Project"]] = relationship(back_populates="user")  # noqa: F821
