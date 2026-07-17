"""
Backfill row Subscription Starter untuk user existing yang belum punya.

Jalankan dari folder backend/:
    python scripts/backfill_subscriptions.py

Bersifat IDEMPOTEN & NON-DESTRUKTIF:
- User tanpa row subscription → di-INSERT Starter (plan_id="starter", status="active").
- User yang sudah punya row → DIBIARKAN (tidak ditimpa, tidak diduplikasi).

Registrasi baru sudah otomatis membuat row Starter (lihat auth_service.register_user);
script ini hanya untuk mengisi user yang terlanjur ada sebelum fitur itu aktif.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.services import billing_service


async def backfill() -> None:
    engine = create_async_engine(
        settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
        echo=False,
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        created = await billing_service.backfill_missing_subscriptions(session)

    await engine.dispose()
    print(f"Selesai — {created} row Subscription Starter dibuat untuk user existing.")


if __name__ == "__main__":
    asyncio.run(backfill())
