"""A-4 — Manajemen user. Aksi destruktif (hapus) wajib konfirmasi email di body."""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.admin import (
    AdminCompanyProfileSummary,
    AdminSubscriptionSummary,
    AdminUsageSummary,
    AdminUserDetail,
    AdminUserListItem,
    DeleteUserRequest,
    GrantAddonRequest,
    SuspendUserRequest,
    UpdateSubscriptionRequest,
)
from app.services import admin_user_service
from app.utils.auth import get_current_admin

# Dependency di level router: endpoint baru di sini otomatis terlindungi.
router = APIRouter(prefix="/users", dependencies=[Depends(get_current_admin)])


async def _detail(db: AsyncSession, user_id: uuid.UUID) -> dict:
    d = await admin_user_service.get_detail(db, user_id)
    user, profile, sub, plan = d["user"], d["profile"], d["subscription"], d["plan"]
    return AdminUserDetail(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        suspended_at=user.suspended_at,
        suspended_reason=user.suspended_reason,
        created_at=user.created_at,
        company_profile=AdminCompanyProfileSummary(
            business_name=profile.business_name, industry=profile.industry, logo_url=profile.logo_url,
        ) if profile else None,
        subscription=AdminSubscriptionSummary(
            plan_id=sub.plan_id,
            plan_name=plan["name"],
            status=sub.status,
            storage_addon_id=sub.storage_addon_id,
            current_period_end=sub.current_period_end,
        ),
        usage=AdminUsageSummary(**d["usage"]),
    ).model_dump(mode="json")


@router.get("")
async def list_users(
    q: str | None = None,
    plan: str | None = None,
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    rows, total = await admin_user_service.list_users(db, q, plan, status, limit, offset)
    items = [
        AdminUserListItem(
            id=u.id, email=u.email, name=u.name, role=u.role, is_active=u.is_active,
            plan_id=plan_id, business_name=business_name, created_at=u.created_at,
        ).model_dump(mode="json")
        for u, plan_id, business_name in rows
    ]
    return {"success": True, "data": {"items": items, "total": total}}


@router.get("/{user_id}")
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return {"success": True, "data": await _detail(db, user_id)}


@router.post("/{user_id}/suspend")
async def suspend_user(
    user_id: uuid.UUID,
    body: SuspendUserRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    await admin_user_service.suspend(db, user_id, admin, body.reason)
    return {"success": True, "data": await _detail(db, user_id)}


@router.post("/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    await admin_user_service.unsuspend(db, user_id, admin)
    return {"success": True, "data": await _detail(db, user_id)}


@router.delete("/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    body: DeleteUserRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    await admin_user_service.delete_user(db, user_id, admin, body.confirm_email)
    return {"success": True, "data": None, "message": "User dan seluruh datanya sudah dihapus."}


@router.patch("/{user_id}/subscription")
async def update_subscription(
    user_id: uuid.UUID,
    body: UpdateSubscriptionRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    await admin_user_service.update_subscription(
        db, user_id, admin, body.plan_id, body.extend_days, body.reset_quota,
    )
    return {"success": True, "data": await _detail(db, user_id)}


@router.post("/{user_id}/grant-addon")
async def grant_addon(
    user_id: uuid.UUID,
    body: GrantAddonRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    await admin_user_service.grant_addon(db, user_id, admin, body.addon_id)
    return {"success": True, "data": await _detail(db, user_id)}
