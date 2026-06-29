"""
Reconcile schema DB existing ke head Alembic (0006) — SEKALI JALAN.

Konteks: revisi Alembic sempat duplikat (dua "0002", dua "0003"), sehingga sebagian
migrasi tak ter-apply dan DB drift dari model. Setelah revisi dilinearkan (0001..0006),
DB lama yang sudah terlanjur ada perlu diselaraskan sekali, lalu alembic_version
di-stamp ke 0006.

Menjalankan isi `reconcile_schema.sql` (idempoten) memakai koneksi & DATABASE_URL yang
sama dengan aplikasi — jadi tidak butuh `psql` atau export env manual.

Jalankan dari folder backend/:
    aigt/bin/python scripts/reconcile_schema.py
atau dari root:
    make reconcile

DB BARU tidak perlu ini — cukup `alembic upgrade head`.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg

from app.config import settings

SQL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reconcile_schema.sql")


async def reconcile():
    with open(SQL_PATH, encoding="utf-8") as f:
        sql = f.read()

    # asyncpg butuh DSN polos `postgresql://...` (tanpa suffix +asyncpg).
    dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute(sql)  # script multi-statement (sudah ada BEGIN/COMMIT di file)
    finally:
        await conn.close()

    print("✅ Schema diselaraskan ke head Alembic (0006). Lanjut: make seed")


if __name__ == "__main__":
    asyncio.run(reconcile())
