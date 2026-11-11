"""A-8 — Dashboard metrik admin + daftar session generate (pelacak kegagalan provider AI)."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.admin import AdminSessionData, AdminUserRef
from app.services import admin_metrics_service
from app.utils.auth import get_current_admin

router = APIRouter(dependencies=[Depends(get_current_admin)])


@router.get("/metrics")
async def get_metrics(db: AsyncSession = Depends(get_db)):
    return {"success": True, "data": await admin_metrics_service.get_metrics(db)}


@router.get("/sessions")
async def list_sessions(
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Default: session `failed`. Juga `processing` (bisa macet), `completed`, `all`."""
    rows, total = await admin_metrics_service.list_sessions(db, status, limit, offset)
    items = [
        AdminSessionData(
            id=s.id,
            user=AdminUserRef.from_user(user),
            template_name=template_name,
            status=s.status,
            goal=s.goal,
            platform=s.platform,
            error_reason=s.error_reason,
            error_message=s.error_message,
            created_at=s.created_at,
        ).model_dump(mode="json")
        for s, user, template_name in rows
    ]
    return {"success": True, "data": {"items": items, "total": total}}
