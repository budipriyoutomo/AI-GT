"""
Konfirmasi pembayaran manual (verifikasi bukti transfer BCA oleh admin).

Tidak ada endpoint publik untuk ini — aktivasi langganan HANYA lewat script ini
supaya user tak bisa mengaktifkan paket sendiri tanpa benar-benar transfer.

Alur admin:
  1. Cek mutasi rekening BCA, cocokkan `total_amount` (nominal + kode unik) & bukti transfer.
  2. Jalankan:  aigt/bin/python scripts/confirm_payment.py <order_id>
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

from app.database import AsyncSessionLocal
from app.models.payment_order import PaymentOrder
from app.services import billing_service


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


async def _confirm(order_id: str) -> None:
    async with AsyncSessionLocal() as db:
        order = await billing_service.confirm_order(db, uuid.UUID(order_id))
        print(f"OK — order {order.id} status={order.status}, item={order.kind}:{order.item_id}")


def main() -> None:
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        return
    if args[0] == "--pending":
        asyncio.run(_list_pending())
        return
    asyncio.run(_confirm(args[0]))


if __name__ == "__main__":
    main()
