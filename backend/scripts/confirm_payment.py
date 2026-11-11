"""
Konfirmasi pembayaran manual (verifikasi bukti transfer BCA oleh admin).

Jalur utama sekarang panel admin `/admin/orders` (A-3) — ada guard status.
Script ini jalur DARURAT saja: mau mengonfirmasi order berstatus apa pun, tapi
tetap wajib menyebut admin pelaksana supaya tercatat di audit log (A-9) dan
reviewed_by/reviewed_at terisi.

Alur admin:
  1. Cek mutasi rekening BCA, cocokkan `total_amount` (nominal + kode unik) & bukti transfer.
  2. Jalankan:  aigt/bin/python scripts/confirm_payment.py <order_id> --admin <email_admin>
  3. Order jadi `paid`, langganan/add-on user aktif otomatis.

List order yang menunggu verifikasi:
  aigt/bin/python scripts/confirm_payment.py --pending
"""
import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.payment_order import PaymentOrder
from app.models.user import User
from app.services import admin_payment_service

ADMIN_ROLES = ("admin", "superadmin")


async def _list_pending() -> None:
    async with AsyncSessionLocal() as db:
        rows = await db.scalars(
            select(PaymentOrder)
            .where(PaymentOrder.status == "awaiting_verification")
            .order_by(PaymentOrder.created_at.desc())
        )
        orders = list(rows)
        if not orders:
            print("Tidak ada order yang menunggu verifikasi.")
            return
        print(f"{len(orders)} order menunggu verifikasi:")
        for o in orders:
            print(f"  {o.id}  {o.kind}:{o.item_id}  Rp{o.total_amount:,}  proof={bool(o.proof_url)}")


async def confirm(db: AsyncSession, order_id: str, admin_email: str) -> PaymentOrder:
    admin = await db.scalar(select(User).where(User.email == admin_email))
    if admin is None or admin.role not in ADMIN_ROLES:
        sys.exit(f"'{admin_email}' bukan admin — angkat dulu lewat scripts/promote_admin.py.")
    order = await admin_payment_service.confirm(db, uuid.UUID(order_id), admin, emergency=True)
    print(f"OK — order {order.id} status={order.status}, item={order.kind}:{order.item_id}")
    return order


async def _confirm(order_id: str, admin_email: str) -> None:
    async with AsyncSessionLocal() as db:
        await confirm(db, order_id, admin_email)


def main() -> None:
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        return
    if args[0] == "--pending":
        asyncio.run(_list_pending())
        return
    if len(args) != 3 or args[1] != "--admin":
        print(__doc__)
        sys.exit(1)
    asyncio.run(_confirm(args[0], args[2]))


if __name__ == "__main__":
    main()
