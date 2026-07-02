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

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.template import Template
from scripts.design_system import load_design_system, resolve_config

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed_template_data")

# Fallback schema-sync: kolom yang ditambahkan migrasi belakangan tapi mungkin BELUM ter-apply
# di DB (mis. saat revisi Alembic sempat bentrok), padahal model `Template` sudah mendeklarasikannya.
# Tanpa ini `select(Template)` gagal: "column templates.platform does not exist".
# `ADD COLUMN IF NOT EXISTS` idempoten & non-destruktif — aman dijalankan berulang.
SCHEMA_FALLBACKS: tuple[str, ...] = (
    "ALTER TABLE templates ADD COLUMN IF NOT EXISTS platform VARCHAR(50)",
    "ALTER TABLE templates ADD COLUMN IF NOT EXISTS background_url TEXT",
)


def _uses_thumbnail_foreground(config: dict) -> bool:
    """True bila thumbnail_url dipakai sebagai FOREGROUND (element image source 'thumbnail'),
    bukan sebagai latar. Template begini TIDAK boleh di-backfill (thumbnail != foto latar)."""
    for el in (config or {}).get("elements") or []:
        if el.get("type") == "image" and el.get("source") == "thumbnail":
            return True
    return False


def needs_background_backfill(config: dict, background_url, thumbnail_url) -> bool:
    """Template image-bg LEGACY: foto latar dulu di thumbnail_url, kini pindah ke background_url.
    Backfill (salin thumbnail_url -> background_url) hanya bila:
    - background.type == 'image'
    - background_url masih kosong (belum di-migrasi / belum di-upload admin)
    - thumbnail_url terisi
    - thumbnail_url TIDAK dipakai sebagai foreground (kalau iya, itu bukan foto latar)."""
    bg = (config or {}).get("background") or {}
    if bg.get("type") != "image":
        return False
    if background_url:
        return False
    if not thumbnail_url:
        return False
    return not _uses_thumbnail_foreground(config)


def load_templates() -> list[dict]:
    """Baca setiap *.json di DATA_DIR, buang key `_meta`, expand preset design-system,
    kembalikan dict siap-insert."""
    ds = load_design_system()
    rows: list[dict] = []
    for path in sorted(glob.glob(os.path.join(DATA_DIR, "*.json"))):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        data.pop("_meta", None)
        # Expand preset (palette/background/brand_theme/stylePreset) → config lengkap.
        # Template full-inline lolos apa adanya (passthrough).
        if "template_config" in data:
            data["template_config"] = resolve_config(data["template_config"], ds)
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
        # Pastikan schema sinkron dengan model sebelum query (lihat SCHEMA_FALLBACKS).
        for ddl in SCHEMA_FALLBACKS:
            await session.execute(text(ddl))
        await session.commit()

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
                    # Jangan timpa image yang di-upload admin per-baris (thumbnail_url =
                    # foreground/thumbnail, background_url = latar) dengan nilai kosong —
                    # itu bukan dikelola JSON.
                    if key in ("thumbnail_url", "background_url") and not value:
                        continue
                    setattr(row, key, value)
                updated += 1

        await session.commit()

        # Backfill: template image-bg legacy yang foto latarnya masih di thumbnail_url
        # (background_url kosong) → salin ke background_url agar dibaca source "background".
        # Idempoten: hanya mengisi yang kosong, tidak menimpa yang sudah ada.
        result = await session.execute(select(Template))
        backfilled = 0
        for row in result.scalars().all():
            if needs_background_backfill(row.template_config, row.background_url, row.thumbnail_url):
                row.background_url = row.thumbnail_url
                backfilled += 1
        await session.commit()

    await engine.dispose()
    print(
        f"Selesai — {added} template ditambahkan, {updated} diperbarui, "
        f"{backfilled} background_url di-backfill. Data lain di tabel templates dipertahankan."
    )


if __name__ == "__main__":
    asyncio.run(seed())
