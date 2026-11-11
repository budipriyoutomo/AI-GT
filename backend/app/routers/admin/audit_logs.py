"""A-9 — Riwayat aksi admin. HANYA baca: tidak ada endpoint ubah/hapus jejak."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.admin import AdminAuditLogData, AuditActorRef
from app.services import audit_service
from app.utils.auth import get_current_admin

router = APIRouter(prefix="/audit-logs", dependencies=[Depends(get_current_admin)])


@router.get("")
async def list_audit_logs(
    admin_id: str | None = None,
    action: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    logs, total = await audit_service.list_logs(db, admin_id, action, date_from, date_to, limit, offset)
    actors = await audit_service.list_actors(db)
    items = [
        AdminAuditLogData(
            id=log.id,
            admin=AuditActorRef(id=log.admin_id, email=log.admin_email),
            action=log.action,
            target_type=log.target_type,
            target_id=log.target_id,
            payload=log.payload,
            created_at=log.created_at,
        ).model_dump(mode="json")
        for log in logs
    ]
    return {
        "success": True,
        "data": {
            "items": items,
            "total": total,
            "actions": list(audit_service.ACTIONS),
            "admins": [AuditActorRef(id=aid, email=email).model_dump(mode="json") for aid, email in actors],
        },
    }
