"""Kotak masuk pesan Contact untuk admin (A-7)."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact_message import ContactMessage
from app.models.user import User
from app.utils.exceptions import AppError, ErrorCode
from app.utils.pagination import validate_page

MESSAGE_STATUSES = ("new", "read", "handled")
# "open" = belum selesai (new + read) — default kotak masuk.
_FILTERS = {
    "open": ("new", "read"),
    "new": ("new",),
    "read": ("read",),
    "handled": ("handled",),
    "all": MESSAGE_STATUSES,
}


async def list_messages(
    db: AsyncSession, status: str | None, limit: int, offset: int
) -> tuple[list[ContactMessage], int, int]:
    """Return (items, total sesuai filter, jumlah 'new' lintas filter)."""
    statuses = _FILTERS.get(status or "open")
    if statuses is None:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Filter status tidak dikenal.")
    validate_page(limit, offset)

    where = ContactMessage.status.in_(statuses)
    total = int(await db.scalar(select(func.count()).select_from(ContactMessage).where(where)) or 0)
    unread = int(await db.scalar(
        select(func.count()).select_from(ContactMessage).where(ContactMessage.status == "new")
    ) or 0)
    rows = await db.scalars(
        select(ContactMessage).where(where)
        .order_by(ContactMessage.created_at.desc()).limit(limit).offset(offset)
    )
    return list(rows), total, unread


async def update_status(
    db: AsyncSession, message_id: uuid.UUID, admin: User, status: str, only_if_new: bool = False
) -> ContactMessage:
    if status not in MESSAGE_STATUSES:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Status pesan tidak dikenal.")
    msg = await db.scalar(select(ContactMessage).where(ContactMessage.id == message_id))
    if not msg:
        raise AppError(404, ErrorCode.MESSAGE_NOT_FOUND, "Pesan tidak ditemukan.")

    # only_if_new: dipakai auto-mark-read saat admin membuka pesan — jangan sampai
    # membuka pesan yang sudah selesai malah mengembalikannya ke "read".
    if only_if_new and msg.status != "new":
        return msg

    msg.status = status
    if status == "handled":
        msg.handled_by = admin.id
        msg.handled_at = datetime.now(timezone.utc)
    else:
        msg.handled_by = None
        msg.handled_at = None
    await db.commit()
    await db.refresh(msg)
    return msg
