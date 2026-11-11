"""Manajemen user oleh admin (A-4).

Aturan hierarki (berlaku untuk suspend, unsuspend, dan hapus):
- Admin tidak bisa bertindak atas akunnya sendiri.
- Akun admin hanya bisa ditindak superadmin.
- Akun superadmin tidak bisa ditindak dari panel (cegah saling kunci).
"""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company_profile import CompanyProfile
from app.models.subscription import Subscription
from app.models.user import User
from app.services import audit_service, auth_service, billing_plans, billing_service
from app.utils.exceptions import AppError, ErrorCode
from app.utils.pagination import validate_page

STATUS_FILTERS = ("all", "active", "suspended")
MAX_REASON_LENGTH = 500


def _escape_like(q: str) -> str:
    return q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def list_users(
    db: AsyncSession, q: str | None, plan: str | None, status: str | None, limit: int, offset: int
) -> tuple[list[tuple[User, str, str | None]], int]:
    """Return ([(user, plan_id, business_name)], total)."""
    status = status or "all"
    if status not in STATUS_FILTERS:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Filter status tidak dikenal.")
    if plan and not billing_plans.get_plan(plan):
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Filter paket tidak dikenal.")
    validate_page(limit, offset)

    # User lama bisa belum punya row Subscription → dianggap Starter.
    plan_col = func.coalesce(Subscription.plan_id, billing_plans.DEFAULT_PLAN_ID)
    conditions = []
    if q and q.strip():
        pattern = f"%{_escape_like(q.strip())}%"
        conditions.append(or_(User.email.ilike(pattern, escape="\\"), User.name.ilike(pattern, escape="\\")))
    if plan:
        conditions.append(plan_col == plan)
    if status == "active":
        conditions.append(User.is_active.is_(True))
    elif status == "suspended":
        conditions.append(User.is_active.is_(False))

    base = (
        select(User, plan_col, CompanyProfile.business_name)
        .outerjoin(Subscription, Subscription.user_id == User.id)
        .outerjoin(CompanyProfile, CompanyProfile.user_id == User.id)
        .where(*conditions)
    )
    total = int(await db.scalar(select(func.count()).select_from(base.subquery())) or 0)
    rows = await db.execute(base.order_by(User.created_at.desc()).limit(limit).offset(offset))
    return [(u, p, b) for u, p, b in rows.all()], total


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User:
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise AppError(404, ErrorCode.USER_NOT_FOUND, "User tidak ditemukan.")
    return user


async def get_detail(db: AsyncSession, user_id: uuid.UUID) -> dict:
    user = await get_user(db, user_id)
    profile = await db.scalar(select(CompanyProfile).where(CompanyProfile.user_id == user_id))
    sub = await billing_service.get_subscription(db, user_id)
    plan = billing_plans.get_plan(sub.plan_id) or billing_plans.get_plan(billing_plans.DEFAULT_PLAN_ID)
    usage = await billing_service.compute_usage(db, user_id)
    return {
        "user": user,
        "profile": profile,
        "subscription": sub,
        "plan": plan,
        "usage": {
            **usage,
            "generate_limit": plan["generate_limit"],
            "history_limit": billing_plans.effective_history_limit(plan, sub.storage_addon_id),
        },
    }


def _assert_can_manage(admin: User, target: User) -> None:
    if target.id == admin.id:
        raise AppError(403, ErrorCode.ADMIN_FORBIDDEN, "Tidak bisa melakukan aksi ini pada akun sendiri.")
    if target.role == "superadmin":
        raise AppError(403, ErrorCode.ADMIN_FORBIDDEN, "Akun superadmin tidak bisa diubah dari panel.")
    if target.role == "admin" and admin.role != "superadmin":
        raise AppError(403, ErrorCode.ADMIN_FORBIDDEN, "Hanya superadmin yang bisa menindak akun admin.")


async def suspend(db: AsyncSession, user_id: uuid.UUID, admin: User, reason: str) -> User:
    reason = (reason or "").strip()
    if not reason:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Alasan suspend wajib diisi.")
    if len(reason) > MAX_REASON_LENGTH:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, f"Alasan maksimal {MAX_REASON_LENGTH} karakter.")
    target = await get_user(db, user_id)
    _assert_can_manage(admin, target)
    audit_service.record(db, admin, "user.suspend", "user", target.id, {"email": target.email, "reason": reason})
    target.is_active = False
    target.suspended_at = datetime.now(timezone.utc)
    target.suspended_reason = reason
    await db.commit()
    await db.refresh(target)
    return target


async def unsuspend(db: AsyncSession, user_id: uuid.UUID, admin: User) -> User:
    target = await get_user(db, user_id)
    _assert_can_manage(admin, target)
    audit_service.record(db, admin, "user.unsuspend", "user", target.id, {
        "email": target.email, "previous_reason": target.suspended_reason,
    })
    target.is_active = True
    target.suspended_at = None
    target.suspended_reason = None
    await db.commit()
    await db.refresh(target)
    return target


async def delete_user(db: AsyncSession, user_id: uuid.UUID, admin: User, confirm_email: str) -> None:
    target = await get_user(db, user_id)
    _assert_can_manage(admin, target)
    # Konfirmasi ganda di server, bukan cuma di UI: email harus diketik ulang.
    if (confirm_email or "").strip().lower() != target.email.lower():
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Email konfirmasi tidak cocok.")
    # Ikut ter-commit oleh delete_account(); email disalin karena barisnya akan hilang.
    audit_service.record(db, admin, "user.delete", "user", target.id, {"email": target.email, "role": target.role})
    await auth_service.delete_account(db, target)


MAX_EXTEND_DAYS = 365


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


async def _get_or_create_subscription(db: AsyncSession, user_id: uuid.UUID) -> Subscription:
    sub = await db.scalar(select(Subscription).where(Subscription.user_id == user_id))
    if not sub:
        # User lama tanpa row → materialisasikan default Starter supaya bisa diubah.
        sub = Subscription(id=uuid.uuid4(), user_id=user_id, plan_id=billing_plans.DEFAULT_PLAN_ID, status="active")
        db.add(sub)
    return sub


async def update_subscription(
    db: AsyncSession,
    user_id: uuid.UUID,
    admin: User,
    plan_id: str | None,
    extend_days: int | None,
    reset_quota: bool,
) -> None:
    """Ubah paket / perpanjang periode / reset kuota secara manual.

    - Ganti paket (ke paket berbeda) SELALU me-reset kuota bulan berjalan (keputusan produk).
    - Ganti ke paket berbayar tanpa periode aktif → periode baru PERIOD_DAYS; periode aktif dipertahankan.
    - Ganti ke Starter → periode dihapus. Add-on tidak disentuh (lewat grant_addon).
    - extend_days ditambahkan ke max(sekarang, akhir periode); Starter tak bisa diperpanjang.
    """
    if plan_id is None and extend_days is None and not reset_quota:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Tidak ada perubahan yang diminta.")
    if plan_id is not None and not billing_plans.get_plan(plan_id):
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Paket tidak dikenal.")
    if extend_days is not None and not 1 <= extend_days <= MAX_EXTEND_DAYS:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, f"Perpanjangan harus 1–{MAX_EXTEND_DAYS} hari.")

    target = await get_user(db, user_id)
    _assert_can_manage(admin, target)
    sub = await _get_or_create_subscription(db, user_id)
    now = datetime.now(timezone.utc)
    before = {"plan_id": sub.plan_id, "current_period_end": _iso(sub.current_period_end)}

    period_end = billing_service.as_utc(sub.current_period_end) if sub.current_period_end else None
    plan_changed = plan_id is not None and plan_id != sub.plan_id
    if plan_changed:
        sub.plan_id = plan_id
        sub.status = "active"
        if plan_id == billing_plans.DEFAULT_PLAN_ID:
            period_end = None
        elif period_end is None or period_end < now:
            period_end = now + timedelta(days=billing_service.PERIOD_DAYS)

    if extend_days is not None:
        if sub.plan_id == billing_plans.DEFAULT_PLAN_ID:
            raise AppError(422, ErrorCode.VALIDATION_ERROR, "Paket Starter tidak punya periode untuk diperpanjang.")
        period_end = max(now, period_end or now) + timedelta(days=extend_days)

    sub.current_period_end = period_end
    quota_reset = plan_changed or reset_quota
    if quota_reset:
        sub.quota_reset_at = now

    audit_service.record(db, admin, "subscription.update", "user", target.id, {
        "email": target.email,
        "before": before,
        "after": {"plan_id": sub.plan_id, "current_period_end": _iso(sub.current_period_end)},
        "extend_days": extend_days,
        "quota_reset": quota_reset,
    })
    await db.commit()


async def grant_addon(db: AsyncSession, user_id: uuid.UUID, admin: User, addon_id: str | None) -> None:
    """Beri (atau cabut, addon_id=None) add-on storage tanpa pembayaran — kompensasi/trial."""
    if addon_id is not None and not billing_plans.get_addon(addon_id):
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Add-on tidak dikenal.")
    target = await get_user(db, user_id)
    _assert_can_manage(admin, target)
    sub = await _get_or_create_subscription(db, user_id)
    audit_service.record(db, admin, "subscription.grant_addon", "user", target.id, {
        "email": target.email, "before": sub.storage_addon_id, "after": addon_id,
    })
    sub.storage_addon_id = addon_id
    await db.commit()
