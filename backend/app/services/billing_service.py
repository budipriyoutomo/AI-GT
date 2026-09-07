import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.generate_session import GenerateSession
from app.models.payment_order import PaymentOrder
from app.models.project import Project
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.billing import OrderCreate
from app.services import billing_plans, storage_service
from app.utils.exceptions import AppError, ErrorCode

PERIOD_DAYS = 30


def get_plans_catalog() -> dict:
    return {"plans": billing_plans.PLANS, "addons": billing_plans.STORAGE_ADDONS}


async def get_subscription(db: AsyncSession, user_id: uuid.UUID) -> Subscription:
    """Return subscription user. Kalau belum ada, kembalikan default Starter (transient)."""
    sub = await db.scalar(select(Subscription).where(Subscription.user_id == user_id))
    if sub:
        return sub
    return Subscription(
        user_id=user_id,
        plan_id=billing_plans.DEFAULT_PLAN_ID,
        status="active",
        current_period_end=None,
    )


async def backfill_missing_subscriptions(db: AsyncSession) -> int:
    """Buat row Subscription Starter untuk semua user yang belum punya.

    Idempoten: user yang sudah punya row dilewati. Return jumlah row yang dibuat.
    """
    user_ids = set((await db.scalars(select(User.id))).all())
    existing = set((await db.scalars(select(Subscription.user_id))).all())
    missing = user_ids - existing

    for uid in missing:
        db.add(
            Subscription(
                user_id=uid,
                plan_id=billing_plans.DEFAULT_PLAN_ID,
                status="active",
            )
        )
    if missing:
        await db.commit()
    return len(missing)


async def assert_generate_quota(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Tegakkan kuota generate bulan berjalan. Raise RATE_LIMIT_EXCEEDED bila habis."""
    sub = await get_subscription(db, user_id)
    plan = billing_plans.get_plan(sub.plan_id) or billing_plans.get_plan(billing_plans.DEFAULT_PLAN_ID)
    limit = plan["generate_limit"]
    if limit < 0:  # -1 = tidak terbatas (future-proof; belum dipakai)
        return
    usage = await compute_usage(db, user_id)
    if usage["generate_used"] >= limit:
        raise AppError(
            429,
            ErrorCode.RATE_LIMIT_EXCEEDED,
            "Kuota generate bulan ini sudah habis. Upgrade paket untuk menambah kuota.",
        )


async def expire_stale_orders(db: AsyncSession, user_id: uuid.UUID | None = None) -> int:
    """Tandai order 'pending' yang lewat expires_at menjadi 'expired'.
    Order 'awaiting_verification' TIDAK di-expire (user sudah bayar, menunggu admin)."""
    now = datetime.now(timezone.utc)
    stmt = select(PaymentOrder).where(
        PaymentOrder.status == "pending",
        PaymentOrder.expires_at.is_not(None),
        PaymentOrder.expires_at < now,
    )
    if user_id is not None:
        stmt = stmt.where(PaymentOrder.user_id == user_id)
    rows = list(await db.scalars(stmt))
    for order in rows:
        order.status = "expired"
    if rows:
        await db.commit()
    return len(rows)


async def downgrade_expired_subscriptions(db: AsyncSession, user_id: uuid.UUID | None = None) -> int:
    """Kembalikan langganan berbayar yang periodenya habis ke Starter (reset add-on)."""
    now = datetime.now(timezone.utc)
    stmt = select(Subscription).where(
        Subscription.plan_id != billing_plans.DEFAULT_PLAN_ID,
        Subscription.current_period_end.is_not(None),
        Subscription.current_period_end < now,
    )
    if user_id is not None:
        stmt = stmt.where(Subscription.user_id == user_id)
    rows = list(await db.scalars(stmt))
    for sub in rows:
        sub.plan_id = billing_plans.DEFAULT_PLAN_ID
        sub.storage_addon_id = None
        sub.current_period_end = None
    if rows:
        await db.commit()
    return len(rows)


async def run_billing_maintenance() -> None:
    """Entry point cron — buat DB session sendiri, expire order & downgrade langganan."""
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        await expire_stale_orders(db)
        await downgrade_expired_subscriptions(db)


async def compute_usage(db: AsyncSession, user_id: uuid.UUID) -> dict:
    """generate_used = jumlah session bulan berjalan; history_used = jumlah project."""
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    generate_used = await db.scalar(
        select(func.count())
        .select_from(GenerateSession)
        .where(GenerateSession.user_id == user_id, GenerateSession.created_at >= month_start)
    )
    history_used = await db.scalar(
        select(func.count()).select_from(Project).where(Project.user_id == user_id)
    )
    return {"generate_used": int(generate_used or 0), "history_used": int(history_used or 0)}


async def create_order(db: AsyncSession, user_id: uuid.UUID, data: OrderCreate) -> PaymentOrder:
    if data.plan_id:
        item = billing_plans.get_plan(data.plan_id)
        if not item:
            raise AppError(404, ErrorCode.TEMPLATE_NOT_FOUND, "Paket tidak ditemukan.")
        if item["price"] <= 0:
            raise AppError(400, ErrorCode.VARIANT_NOT_SELECTED, "Paket gratis tidak perlu pembayaran.")
        kind, item_id, amount = "plan", data.plan_id, item["price"]
    else:
        item = billing_plans.get_addon(data.addon_id)
        if not item:
            raise AppError(404, ErrorCode.TEMPLATE_NOT_FOUND, "Add-on tidak ditemukan.")
        kind, item_id, amount = "addon", data.addon_id, item["price"]

    unique_code = random.randint(1, 999)
    order = PaymentOrder(
        id=uuid.uuid4(),
        user_id=user_id,
        kind=kind,
        item_id=item_id,
        amount=amount,
        unique_code=unique_code,
        total_amount=amount + unique_code,
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.billing_order_expire_hours),
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


async def list_orders(db: AsyncSession, user_id: uuid.UUID) -> list[PaymentOrder]:
    rows = await db.scalars(
        select(PaymentOrder)
        .where(PaymentOrder.user_id == user_id)
        .order_by(PaymentOrder.created_at.desc())
    )
    return list(rows)


async def get_order(db: AsyncSession, order_id: uuid.UUID, user_id: uuid.UUID) -> PaymentOrder:
    order = await db.scalar(select(PaymentOrder).where(PaymentOrder.id == order_id))
    if not order:
        raise AppError(404, ErrorCode.SESSION_NOT_FOUND, "Order tidak ditemukan.")
    if order.user_id != user_id:
        raise AppError(403, ErrorCode.SESSION_NOT_FOUND, "Kamu tidak punya akses ke order ini.")
    return order


async def attach_proof(
    db: AsyncSession,
    order_id: uuid.UUID,
    user_id: uuid.UUID,
    file_data: bytes,
    ext: str,
    content_type: str,
) -> PaymentOrder:
    order = await get_order(db, order_id, user_id)
    if order.status not in ("pending", "awaiting_verification"):
        raise AppError(
            400,
            ErrorCode.VARIANT_NOT_SELECTED,
            "Order ini tidak menunggu pembayaran, bukti transfer tidak diperlukan.",
        )
    url = storage_service.upload_payment_proof(file_data, str(user_id), str(order_id), ext, content_type)
    order.proof_url = url
    order.status = "awaiting_verification"
    await db.commit()
    await db.refresh(order)
    return order


async def confirm_order(db: AsyncSession, order_id: uuid.UUID) -> PaymentOrder:
    """Verifikasi manual (script admin): tandai lunas + aktifkan langganan/add-on."""
    order = await db.scalar(select(PaymentOrder).where(PaymentOrder.id == order_id))
    if not order:
        raise AppError(404, ErrorCode.SESSION_NOT_FOUND, "Order tidak ditemukan.")
    if order.status == "paid":
        return order

    order.status = "paid"
    order.paid_at = datetime.now(timezone.utc)

    sub = await db.scalar(select(Subscription).where(Subscription.user_id == order.user_id))
    if not sub:
        sub = Subscription(id=uuid.uuid4(), user_id=order.user_id)
        db.add(sub)

    if order.kind == "plan":
        sub.plan_id = order.item_id
        sub.status = "active"
        sub.current_period_end = datetime.now(timezone.utc) + timedelta(days=PERIOD_DAYS)
    else:
        sub.storage_addon_id = order.item_id

    await db.commit()
    await db.refresh(order)
    return order
