"""A-3 — Verifikasi pembayaran (pengganti scripts/confirm_payment.py).

Semua endpoint memakai get_current_admin. Bukti transfer disajikan dari sini,
BUKAN lewat proxy publik /api/v1/assets (yang menolak payment-proofs/).
"""
import uuid

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.payment_order import PaymentOrder
from app.models.user import User
from app.schemas.admin import AdminOrderData, AdminUserRef, RejectOrderRequest
from app.services import admin_payment_service, auth_service, billing_plans
from app.utils.auth import get_current_admin

# Dependency di level router: endpoint baru di sini otomatis terlindungi meski
# lupa menambahkan get_current_admin di signature-nya.
router = APIRouter(prefix="/orders", dependencies=[Depends(get_current_admin)])


def _order_data(order: PaymentOrder, users: dict[uuid.UUID, User]) -> dict:
    return AdminOrderData(
        id=order.id,
        user=AdminUserRef.from_user(users.get(order.user_id)),
        kind=order.kind,
        item_id=order.item_id,
        item_name=billing_plans.item_name(order.kind, order.item_id),
        amount=order.amount,
        unique_code=order.unique_code,
        total_amount=order.total_amount,
        status=order.status,
        has_proof=bool(order.proof_url),
        created_at=order.created_at,
        expires_at=order.expires_at,
        paid_at=order.paid_at,
        rejection_reason=order.rejection_reason,
        reviewed_by=AdminUserRef.from_user(users.get(order.reviewed_by)),
        reviewed_at=order.reviewed_at,
    ).model_dump(mode="json")


async def _single(db: AsyncSession, order: PaymentOrder) -> dict:
    users = await auth_service.get_users_by_ids(db, {order.user_id, order.reviewed_by})
    return {"success": True, "data": _order_data(order, users)}


@router.get("")
async def list_orders(
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Default: order `awaiting_verification`. `status=all` untuk semua status."""
    orders, total = await admin_payment_service.list_orders(db, status, limit, offset)
    users = await auth_service.get_users_by_ids(
        db, {o.user_id for o in orders} | {o.reviewed_by for o in orders}
    )
    items = [_order_data(o, users) for o in orders]
    return {"success": True, "data": {"items": items, "total": total}}


@router.get("/{order_id}")
async def get_order(
    order_id: uuid.UUID,
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    order = await admin_payment_service.get_order(db, order_id)
    return await _single(db, order)


@router.get("/{order_id}/proof")
async def get_proof(
    order_id: uuid.UUID,
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Gambar bukti transfer. Frontend mengambilnya via fetch + Authorization lalu
    menampilkannya sebagai blob URL — <img src> biasa tak bisa mengirim token."""
    data, content_type = await admin_payment_service.get_proof(db, order_id)
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "private, no-store"},
    )


@router.post("/{order_id}/confirm")
async def confirm_order(
    order_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    order = await admin_payment_service.confirm(db, order_id, admin)
    return await _single(db, order)


@router.post("/{order_id}/reject")
async def reject_order(
    order_id: uuid.UUID,
    body: RejectOrderRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    order = await admin_payment_service.reject(db, order_id, admin, body.reason)
    return await _single(db, order)
