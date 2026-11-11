"""A-7 — Kotak masuk pesan Contact (menutup T-12: pesan tersimpan tapi tak terbaca)."""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.contact_message import ContactMessage
from app.models.user import User
from app.schemas.admin import AdminMessageData, AdminUserRef, UpdateMessageRequest
from app.services import admin_message_service, auth_service
from app.utils.auth import get_current_admin

# Dependency di level router: endpoint baru di sini otomatis terlindungi.
router = APIRouter(prefix="/messages", dependencies=[Depends(get_current_admin)])


def _message_data(msg: ContactMessage, users: dict[uuid.UUID, User]) -> dict:
    return AdminMessageData(
        id=msg.id,
        name=msg.name,
        email=msg.email,
        category=msg.category,
        message=msg.message,
        status=msg.status,
        created_at=msg.created_at,
        handled_by=AdminUserRef.from_user(users.get(msg.handled_by)),
        handled_at=msg.handled_at,
    ).model_dump(mode="json")


@router.get("")
async def list_messages(
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Default: pesan belum selesai (`new` + `read`). `status=all` untuk semua."""
    items, total, unread = await admin_message_service.list_messages(db, status, limit, offset)
    users = await auth_service.get_users_by_ids(db, {m.handled_by for m in items})
    return {
        "success": True,
        "data": {"items": [_message_data(m, users) for m in items], "total": total, "unread": unread},
    }


@router.patch("/{message_id}")
async def update_message(
    message_id: uuid.UUID,
    body: UpdateMessageRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    msg = await admin_message_service.update_status(db, message_id, admin, body.status, body.only_if_new)
    users = await auth_service.get_users_by_ids(db, {msg.handled_by})
    return {"success": True, "data": _message_data(msg, users)}
