"""Verifikasi pembayaran manual oleh admin (A-3).

Aktivasi langganan tetap lewat billing_service.confirm_order() — service ini hanya
menambah guard status + jejak peninjau di atasnya, supaya CLI
scripts/confirm_payment.py dan panel admin memakai satu jalur aktivasi.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment_order import PaymentOrder
from app.models.user import User
from app.services import audit_service, billing_service, storage_service
from app.utils.exceptions import AppError, ErrorCode
from app.utils.pagination import validate_page

ORDER_STATUSES = ("pending", "awaiting_verification", "paid", "rejected", "expired")
DEFAULT_STATUS_FILTER = "awaiting_verification"

# "pending" ikut boleh: transfer sudah tampak di mutasi tapi user lupa upload bukti.
_REVIEWABLE = ("pending", "awaiting_verification")

MAX_REASON_LENGTH = 500


async def list_orders(
    db: AsyncSession, status: str | None, limit: int, offset: int
) -> tuple[list[PaymentOrder], int]:
    status = status or DEFAULT_STATUS_FILTER
    if status != "all" and status not in ORDER_STATUSES:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Filter status tidak dikenal.")
    validate_page(limit, offset)

    stmt = select(PaymentOrder)
    count = select(func.count()).select_from(PaymentOrder)
    if status != "all":
        stmt = stmt.where(PaymentOrder.status == status)
        count = count.where(PaymentOrder.status == status)

    total = int(await db.scalar(count) or 0)
    rows = await db.scalars(
        stmt.order_by(PaymentOrder.created_at.desc()).limit(limit).offset(offset)
    )
    return list(rows), total


async def get_order(db: AsyncSession, order_id: uuid.UUID) -> PaymentOrder:
    order = await db.scalar(select(PaymentOrder).where(PaymentOrder.id == order_id))
    if not order:
        raise AppError(404, ErrorCode.ORDER_NOT_FOUND, "Order tidak ditemukan.")
    return order


async def get_proof(db: AsyncSession, order_id: uuid.UUID) -> tuple[bytes, str]:
    order = await get_order(db, order_id)
    if not order.proof_url:
        raise AppError(404, ErrorCode.ORDER_NOT_FOUND, "Order ini belum punya bukti transfer.")
    # proof_url disimpan sebagai path root-relative ("/permanent/...").
    obj = storage_service.get_object(order.proof_url.lstrip("/"))
    if obj is None:
        raise AppError(404, ErrorCode.ORDER_NOT_FOUND, "File bukti transfer tidak ditemukan.")
    return obj


def _assert_reviewable(order: PaymentOrder) -> None:
    if order.status not in _REVIEWABLE:
        raise AppError(
            422,
            ErrorCode.ORDER_STATUS_INVALID,
            f"Order berstatus '{order.status}' tidak bisa ditinjau lagi.",
        )


async def _owner_email(db: AsyncSession, order: PaymentOrder) -> str | None:
    owner = await db.get(User, order.user_id)
    return owner.email if owner else None


async def confirm(
    db: AsyncSession, order_id: uuid.UUID, admin: User, *, emergency: bool = False
) -> PaymentOrder:
    """emergency=True = jalur CLI `scripts/confirm_payment.py`: tanpa guard status, tetap tercatat."""
    order = await get_order(db, order_id)
    if not emergency:
        _assert_reviewable(order)
    payload = {
        "user_email": await _owner_email(db, order),
        "item": f"{order.kind}:{order.item_id}",
        "total_amount": order.total_amount,
        "previous_status": order.status,
    }
    if emergency:
        payload["via"] = "cli"
    # Dicatat sebelum confirm_order() commit → log & aktivasi atomik.
    audit_service.record(db, admin, "order.confirm", "payment_order", order.id, payload)
    order.reviewed_by = admin.id
    order.reviewed_at = datetime.now(timezone.utc)
    return await billing_service.confirm_order(db, order_id)


async def reject(db: AsyncSession, order_id: uuid.UUID, admin: User, reason: str) -> PaymentOrder:
    reason = (reason or "").strip()
    if not reason:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Alasan penolakan wajib diisi.")
    if len(reason) > MAX_REASON_LENGTH:
        raise AppError(
            400, ErrorCode.VALIDATION_ERROR,
            f"Alasan penolakan maksimal {MAX_REASON_LENGTH} karakter.",
        )

    order = await get_order(db, order_id)
    _assert_reviewable(order)
    audit_service.record(db, admin, "order.reject", "payment_order", order.id, {
        "user_email": await _owner_email(db, order),
        "reason": reason,
        "previous_status": order.status,
    })
    order.status = "rejected"
    order.rejection_reason = reason
    order.reviewed_by = admin.id
    order.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(order)
    return order
