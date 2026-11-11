"""Metrik dashboard admin & daftar session generate (A-8).

Batas hari/bulan memakai UTC — sama dengan perhitungan kuota (billing_service.compute_usage),
supaya "generate bulan ini" di dashboard cocok dengan kuota yang dilihat user.
"""
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact_message import ContactMessage
from app.models.generate_session import GenerateSession
from app.models.payment_order import PaymentOrder
from app.models.template import Template
from app.models.user import User
from app.services.billing_service import as_utc
from app.utils.exceptions import AppError, ErrorCode
from app.utils.pagination import validate_page

TREND_DAYS = 30
SESSION_FILTERS = ("failed", "processing", "completed", "all")


async def _count(db: AsyncSession, model, *conditions) -> int:
    return int(await db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0)


async def get_metrics(db: AsyncSession) -> dict:
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    since_30d = now - timedelta(days=30)

    users = {
        "total": await _count(db, User),
        "new_7d": await _count(db, User, User.created_at >= now - timedelta(days=7)),
        "new_30d": await _count(db, User, User.created_at >= since_30d),
        "suspended": await _count(db, User, User.is_active.is_(False)),
    }

    status_rows = await db.execute(
        select(GenerateSession.status, func.count())
        .where(GenerateSession.created_at >= since_30d)
        .group_by(GenerateSession.status)
    )
    by_status = {status: int(n) for status, n in status_rows.all()}
    completed, failed = by_status.get("completed", 0), by_status.get("failed", 0)
    finished = completed + failed

    revenue_row = (await db.execute(
        select(func.coalesce(func.sum(PaymentOrder.total_amount), 0), func.count())
        .where(PaymentOrder.status == "paid", PaymentOrder.paid_at >= month_start)
    )).one()

    return {
        "users": users,
        "generate": {
            "this_month": await _count(db, GenerateSession, GenerateSession.created_at >= month_start),
            "last_30d": {
                "total": sum(by_status.values()),
                "completed": completed,
                "failed": failed,
                "processing": by_status.get("processing", 0),
            },
            # None (bukan 0) kalau belum ada session yang selesai — 0/0 bukan 0%.
            # "processing" tidak dihitung: hasilnya belum diketahui.
            "success_rate_30d": round(completed / finished, 4) if finished else None,
        },
        "revenue": {"this_month": int(revenue_row[0]), "paid_orders_this_month": int(revenue_row[1])},
        "pending": {
            "orders_awaiting_verification": await _count(
                db, PaymentOrder, PaymentOrder.status == "awaiting_verification"
            ),
            "messages_unread": await _count(db, ContactMessage, ContactMessage.status == "new"),
        },
        "daily": await _daily_trend(db, now),
    }


async def _daily_trend(db: AsyncSession, now: datetime) -> list[dict]:
    """TREND_DAYS hari terakhir (termasuk hari ini), urut lama → baru, hari kosong tetap ada.

    Dikelompokkan di Python, bukan SQL: fungsi tanggal SQLite (test) dan Postgres berbeda.
    Volume 30 hari masih kecil untuk skala MVP — pindahkan ke date_trunc bila membesar.
    """
    today = now.date()
    first = today - timedelta(days=TREND_DAYS - 1)
    start = datetime(first.year, first.month, first.day, tzinfo=timezone.utc)
    buckets: dict[date, dict] = {
        first + timedelta(days=i): {"completed": 0, "failed": 0} for i in range(TREND_DAYS)
    }
    rows = await db.execute(
        select(GenerateSession.created_at, GenerateSession.status).where(
            GenerateSession.created_at >= start,
            GenerateSession.status.in_(("completed", "failed")),
        )
    )
    for created_at, status in rows.all():
        day = as_utc(created_at).date()
        if day in buckets:
            buckets[day][status] += 1
    return [{"date": d.isoformat(), **counts} for d, counts in buckets.items()]


async def list_sessions(
    db: AsyncSession, status: str | None, limit: int, offset: int
) -> tuple[list[tuple[GenerateSession, User | None, str | None]], int]:
    status = status or "failed"
    if status not in SESSION_FILTERS:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Filter status tidak dikenal.")
    validate_page(limit, offset)

    conditions = [] if status == "all" else [GenerateSession.status == status]
    total = await _count(db, GenerateSession, *conditions)
    # Outer join: session tetap tampil walau user/template-nya sudah hilang.
    rows = await db.execute(
        select(GenerateSession, User, Template.name)
        .outerjoin(User, User.id == GenerateSession.user_id)
        .outerjoin(Template, Template.id == GenerateSession.template_id)
        .where(*conditions)
        .order_by(GenerateSession.created_at.desc())
        .limit(limit).offset(offset)
    )
    return [(s, u, name) for s, u, name in rows.all()], total
