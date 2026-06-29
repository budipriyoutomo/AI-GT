"""
Script seed templates ke database — membaca semua file JSON di scripts/seed_template_data/.

Jalankan dari folder backend/:
    python scripts/seed_templates.py

Bersifat UPSERT & NON-DESTRUKTIF:
- Template dari JSON yang belum ada (match by `name`) → di-INSERT.
- Template dari JSON yang sudah ada → di-UPDATE (perubahan JSON ikut tersinkron).
- Template lain di tabel (mis. ditambah manual) → DIBIARKAN, tidak dihapus.

Setiap file JSON = 1 template; key `_meta` (dokumentasi) diabaikan saat insert.
"""
import asyncio
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.template import Template

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed_template_data")


def load_templates() -> list[dict]:
    """Baca setiap *.json di DATA_DIR, buang key `_meta`, kembalikan dict siap-insert."""
    rows: list[dict] = []
    for path in sorted(glob.glob(os.path.join(DATA_DIR, "*.json"))):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        data.pop("_meta", None)
        # Kolom thumbnail_url saat ini NOT NULL. Template berlatar gradient (tanpa
        # background image) memakai null di JSON → coerce ke "" agar lolos constraint.
        data["thumbnail_url"] = data.get("thumbnail_url") or ""
        rows.append(data)
    return rows


async def seed():
    engine = create_async_engine(
        settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
        echo=False,
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    templates = load_templates()

    async with async_session() as session:
        result = await session.execute(select(Template))
        existing = {t.name: t for t in result.scalars().all()}

        added = 0
        updated = 0
        for data in templates:
            row = existing.get(data["name"])
            if row is None:
                session.add(Template(**data))
                added += 1
            else:
                for key, value in data.items():
                    # Jangan timpa background image (thumbnail_url) existing dengan nilai kosong —
                    # itu di-upload admin per-baris, bukan dikelola JSON.
                    if key == "thumbnail_url" and not value:
                        continue
                    setattr(row, key, value)
                updated += 1

        await session.commit()

    await engine.dispose()
    print(
        f"Selesai — {added} template ditambahkan, {updated} diperbarui. "
        f"Data lain di tabel templates dipertahankan."
    )


if __name__ == "__main__":
    asyncio.run(seed())
