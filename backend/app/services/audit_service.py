"""Audit log aksi admin (A-9).

record() hanya menambahkan baris ke session — TIDAK commit. Pemanggil memanggilnya
sebelum commit aksinya sendiri, jadi log dan aksi atomik: aksi gagal = tak ada log,
aksi sukses = log pasti ada. Aksi baru yang mengubah data wajib memanggil record().
"""
import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_audit_log import AdminAuditLog
from app.models.user import User
from app.utils.exceptions import AppError, ErrorCode
from app.utils.pagination import validate_page

# Satu-satunya daftar aksi yang sah — dipakai juga untuk validasi filter.
ACTIONS = (
    "order.confirm",
    "order.reject",
    "user.suspend",
    "user.unsuspend",
    "user.delete",
    "subscription.update",
    "subscription.grant_addon",
    "job.run",
    "template.update",
    "template.upload_image",
    "template.delete",
    "template.publish",
)


def record(
    db: AsyncSession, admin: User, action: str, target_type: str, target_id: object, payload: dict
) -> None:
    if action not in ACTIONS:
        raise ValueError(f"Aksi audit tidak dikenal: {action}")
    db.add(AdminAuditLog(
        id=uuid.uuid4(),
        admin_id=admin.id,
        admin_email=admin.email,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        payload=payload,
        created_at=datetime.now(timezone.utc),
    ))


def _parse_date(value: str | None, field: str) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, f"Format {field} harus YYYY-MM-DD.")


def _parse_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "admin_id tidak valid.")


async def list_logs(
    db: AsyncSession,
    admin_id: str | None,
    action: str | None,
    date_from: str | None,
    date_to: str | None,
    limit: int,
    offset: int,
) -> tuple[list[AdminAuditLog], int]:
    admin_uuid = _parse_uuid(admin_id)
    if action and action not in ACTIONS:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Filter aksi tidak dikenal.")
    start, end = _parse_date(date_from, "date_from"), _parse_date(date_to, "date_to")
    if start and end and start > end:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "date_from harus sebelum date_to.")
    validate_page(limit, offset)

    conditions = []
    if admin_uuid:
        conditions.append(AdminAuditLog.admin_id == admin_uuid)
    if action:
        conditions.append(AdminAuditLog.action == action)
    # Rentang tanggal inklusif, dalam UTC.
    if start:
        conditions.append(AdminAuditLog.created_at >= datetime.combine(start, time.min, timezone.utc))
    if end:
        conditions.append(AdminAuditLog.created_at < datetime.combine(end + timedelta(days=1), time.min, timezone.utc))

    total = int(await db.scalar(select(func.count()).select_from(AdminAuditLog).where(*conditions)) or 0)
    rows = await db.scalars(
        select(AdminAuditLog).where(*conditions)
        .order_by(AdminAuditLog.created_at.desc()).limit(limit).offset(offset)
    )
    return list(rows), total


async def list_actors(db: AsyncSession) -> list[tuple[uuid.UUID | None, str]]:
    """Semua admin yang pernah beraksi (untuk dropdown filter) — tidak ikut terfilter."""
    rows = await db.execute(
        select(AdminAuditLog.admin_id, AdminAuditLog.admin_email)
        .where(AdminAuditLog.admin_id.is_not(None))
        .distinct()
        .order_by(AdminAuditLog.admin_email)
    )
    return [(aid, email) for aid, email in rows.all()]
