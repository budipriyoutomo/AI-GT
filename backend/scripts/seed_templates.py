"""
Script seed sample templates ke database.
Jalankan dari folder backend/:
    python scripts/seed_templates.py

Idempotent — tidak akan duplikat jika dijalankan ulang.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.template import Template


TEMPLATES = [
    # ── Lebaran / Idul Fitri ─────────────────────────────────────────────────
    {
        "name": "FnB Lebaran Special - IG Post",
        "industry": "fnb",
        "theme": "lebaran",
        "content_type": "instagram_post",
        "thumbnail_url": "https://placehold.co/400x400/2D8C3C/FFFFFF?text=FnB+Lebaran",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1080},
            "layout": "full_bleed",
            "background": {"type": "gradient", "value": ["#2D8C3C", "#FFD700"]},
            "color_scheme": {
                "primary": "#2D8C3C",
                "secondary": "#FFD700",
                "accent": "#FFFFFF",
            },
            "zones": {
                "headline": {"x": 0.1, "y": 0.2,  "width": 0.8, "height": 0.2},
                "body":     {"x": 0.1, "y": 0.42, "width": 0.8, "height": 0.25},
                "cta":      {"x": 0.25, "y": 0.75, "width": 0.5, "height": 0.1},
            },
        },
    },
    {
        "name": "Retail Lebaran Sale - IG Story",
        "industry": "retail",
        "theme": "lebaran",
        "content_type": "instagram_story",
        "thumbnail_url": "https://placehold.co/400x711/1B6B3A/FFD700?text=Retail+Lebaran",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "top_hero",
            "background": {"type": "gradient", "value": ["#1B6B3A", "#D4A017"]},
            "color_scheme": {
                "primary": "#1B6B3A",
                "secondary": "#FFD700",
                "accent": "#FFFFFF",
            },
            "zones": {
                "headline": {"x": 0.1, "y": 0.5,  "width": 0.8, "height": 0.18},
                "body":     {"x": 0.1, "y": 0.7,  "width": 0.8, "height": 0.15},
                "cta":      {"x": 0.2, "y": 0.88, "width": 0.6, "height": 0.08},
            },
        },
    },
    # ── Harbolnas 12.12 ──────────────────────────────────────────────────────
    {
        "name": "Retail Harbolnas 12.12 - IG Post",
        "industry": "retail",
        "theme": "harbolnas",
        "content_type": "instagram_post",
        "thumbnail_url": "https://placehold.co/400x400/E63946/FFFFFF?text=Harbolnas+12.12",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1080},
            "layout": "split",
            "background": {"type": "color", "value": "#E63946"},
            "color_scheme": {
                "primary": "#E63946",
                "secondary": "#FFFFFF",
                "accent": "#FFD700",
            },
            "zones": {
                "headline": {"x": 0.1, "y": 0.28, "width": 0.8, "height": 0.2},
                "body":     {"x": 0.1, "y": 0.5,  "width": 0.8, "height": 0.2},
                "cta":      {"x": 0.25, "y": 0.77, "width": 0.5, "height": 0.1},
            },
        },
    },
    {
        "name": "Fashion Harbolnas Flash Sale - IG Story",
        "industry": "fashion",
        "theme": "harbolnas",
        "content_type": "instagram_story",
        "thumbnail_url": "https://placehold.co/400x711/B5112C/FFFFFF?text=Harbolnas+Fashion",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "bold_centered",
            "background": {"type": "gradient", "value": ["#B5112C", "#FF6B35"]},
            "color_scheme": {
                "primary": "#B5112C",
                "secondary": "#FFFFFF",
                "accent": "#FFD700",
            },
            "zones": {
                "headline": {"x": 0.1, "y": 0.3,  "width": 0.8, "height": 0.2},
                "body":     {"x": 0.1, "y": 0.52, "width": 0.8, "height": 0.18},
                "cta":      {"x": 0.2, "y": 0.75, "width": 0.6, "height": 0.08},
            },
        },
    },
    # ── Hari Buruh ───────────────────────────────────────────────────────────
    {
        "name": "Jasa Hari Buruh - IG Post",
        "industry": "jasa",
        "theme": "hari-buruh",
        "content_type": "instagram_post",
        "thumbnail_url": "https://placehold.co/400x400/CC3700/FFFFFF?text=Hari+Buruh",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1080},
            "layout": "centered",
            "background": {"type": "color", "value": "#CC3700"},
            "color_scheme": {
                "primary": "#CC3700",
                "secondary": "#FFFFFF",
                "accent": "#FFD700",
            },
            "zones": {
                "headline": {"x": 0.1, "y": 0.25, "width": 0.8, "height": 0.2},
                "body":     {"x": 0.1, "y": 0.47, "width": 0.8, "height": 0.25},
                "cta":      {"x": 0.25, "y": 0.78, "width": 0.5, "height": 0.1},
            },
        },
    },
    # ── HUT RI 17 Agustus ────────────────────────────────────────────────────
    {
        "name": "FnB HUT RI Promo - IG Post",
        "industry": "fnb",
        "theme": "hut-ri",
        "content_type": "instagram_post",
        "thumbnail_url": "https://placehold.co/400x400/CC0001/FFFFFF?text=HUT+RI+FnB",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1080},
            "layout": "centered",
            "background": {"type": "color", "value": "#CC0001"},
            "color_scheme": {
                "primary": "#CC0001",
                "secondary": "#FFFFFF",
                "accent": "#FFD700",
            },
            "zones": {
                "headline": {"x": 0.1, "y": 0.22, "width": 0.8, "height": 0.2},
                "body":     {"x": 0.1, "y": 0.44, "width": 0.8, "height": 0.25},
                "cta":      {"x": 0.25, "y": 0.76, "width": 0.5, "height": 0.1},
            },
        },
    },
    {
        "name": "Retail HUT RI Special - Banner",
        "industry": "retail",
        "theme": "hut-ri",
        "content_type": "banner",
        "thumbnail_url": "https://placehold.co/400x200/CC0001/FFFFFF?text=HUT+RI+Retail",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1200, "height": 628},
            "layout": "side_by_side",
            "background": {"type": "gradient", "value": ["#CC0001", "#FFFFFF"]},
            "color_scheme": {
                "primary": "#CC0001",
                "secondary": "#FFFFFF",
                "accent": "#FFD700",
            },
            "zones": {
                "headline": {"x": 0.05, "y": 0.15, "width": 0.6, "height": 0.3},
                "body":     {"x": 0.05, "y": 0.48, "width": 0.6, "height": 0.3},
                "cta":      {"x": 0.05, "y": 0.8,  "width": 0.25, "height": 0.15},
            },
        },
    },
    # ── Tahun Baru ───────────────────────────────────────────────────────────
    {
        "name": "FnB Tahun Baru - IG Post",
        "industry": "fnb",
        "theme": "tahun-baru",
        "content_type": "instagram_post",
        "thumbnail_url": "https://placehold.co/400x400/1A1A2E/FFD700?text=Tahun+Baru+FnB",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1080},
            "layout": "centered",
            "background": {"type": "gradient", "value": ["#1A1A2E", "#16213E"]},
            "color_scheme": {
                "primary": "#FFD700",
                "secondary": "#FFFFFF",
                "accent": "#FF6B35",
            },
            "zones": {
                "headline": {"x": 0.1, "y": 0.25, "width": 0.8, "height": 0.2},
                "body":     {"x": 0.1, "y": 0.47, "width": 0.8, "height": 0.25},
                "cta":      {"x": 0.25, "y": 0.78, "width": 0.5, "height": 0.1},
            },
        },
    },
    {
        "name": "Fashion Tahun Baru - IG Story",
        "industry": "fashion",
        "theme": "tahun-baru",
        "content_type": "instagram_story",
        "thumbnail_url": "https://placehold.co/400x711/0D0D0D/FFD700?text=Tahun+Baru+Fashion",
        "is_premium": True,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "editorial",
            "background": {"type": "gradient", "value": ["#0D0D0D", "#1A1A2E"]},
            "color_scheme": {
                "primary": "#FFD700",
                "secondary": "#FFFFFF",
                "accent": "#C77DFF",
            },
            "zones": {
                "headline": {"x": 0.1, "y": 0.5,  "width": 0.8, "height": 0.2},
                "body":     {"x": 0.1, "y": 0.72, "width": 0.8, "height": 0.15},
                "cta":      {"x": 0.25, "y": 0.89, "width": 0.5, "height": 0.07},
            },
        },
    },
    # ── Valentine ────────────────────────────────────────────────────────────
    {
        "name": "Beauty Valentine Gift - IG Post",
        "industry": "beauty",
        "theme": "valentine",
        "content_type": "instagram_post",
        "thumbnail_url": "https://placehold.co/400x400/F7A8C4/FFFFFF?text=Valentine+Beauty",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1080},
            "layout": "pastel_clean",
            "background": {"type": "color", "value": "#FFF0F6"},
            "color_scheme": {
                "primary": "#F7A8C4",
                "secondary": "#FFFFFF",
                "accent": "#C77DFF",
            },
            "zones": {
                "headline": {"x": 0.1, "y": 0.6,  "width": 0.8, "height": 0.15},
                "body":     {"x": 0.1, "y": 0.76, "width": 0.8, "height": 0.12},
                "cta":      {"x": 0.25, "y": 0.9,  "width": 0.5, "height": 0.07},
            },
        },
    },
    {
        "name": "FnB Valentine Promo - IG Story",
        "industry": "fnb",
        "theme": "valentine",
        "content_type": "instagram_story",
        "thumbnail_url": "https://placehold.co/400x711/C9184A/FFFFFF?text=Valentine+FnB",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "bold_centered",
            "background": {"type": "gradient", "value": ["#C9184A", "#FF6B6B"]},
            "color_scheme": {
                "primary": "#C9184A",
                "secondary": "#FFFFFF",
                "accent": "#FFD700",
            },
            "zones": {
                "headline": {"x": 0.1, "y": 0.3,  "width": 0.8, "height": 0.2},
                "body":     {"x": 0.1, "y": 0.52, "width": 0.8, "height": 0.18},
                "cta":      {"x": 0.2, "y": 0.75, "width": 0.6, "height": 0.08},
            },
        },
    },
    # ── Natal ────────────────────────────────────────────────────────────────
    {
        "name": "Retail Natal Sale - IG Post",
        "industry": "retail",
        "theme": "natal",
        "content_type": "instagram_post",
        "thumbnail_url": "https://placehold.co/400x400/165B33/FFFFFF?text=Natal+Retail",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1080},
            "layout": "split",
            "background": {"type": "gradient", "value": ["#165B33", "#BB2528"]},
            "color_scheme": {
                "primary": "#165B33",
                "secondary": "#FFFFFF",
                "accent": "#FFD700",
            },
            "zones": {
                "headline": {"x": 0.1, "y": 0.28, "width": 0.8, "height": 0.2},
                "body":     {"x": 0.1, "y": 0.5,  "width": 0.8, "height": 0.2},
                "cta":      {"x": 0.25, "y": 0.77, "width": 0.5, "height": 0.1},
            },
        },
    },
    {
        "name": "FnB Natal Special - IG Story",
        "industry": "fnb",
        "theme": "natal",
        "content_type": "instagram_story",
        "thumbnail_url": "https://placehold.co/400x711/BB2528/FFFFFF?text=Natal+FnB",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "top_hero",
            "background": {"type": "gradient", "value": ["#BB2528", "#165B33"]},
            "color_scheme": {
                "primary": "#BB2528",
                "secondary": "#FFFFFF",
                "accent": "#FFD700",
            },
            "zones": {
                "headline": {"x": 0.1, "y": 0.5,  "width": 0.8, "height": 0.18},
                "body":     {"x": 0.1, "y": 0.7,  "width": 0.8, "height": 0.15},
                "cta":      {"x": 0.2, "y": 0.88, "width": 0.6, "height": 0.08},
            },
        },
    },
    # ── Grand Opening ────────────────────────────────────────────────────────
    {
        "name": "Retail Grand Opening - Banner",
        "industry": "retail",
        "theme": "grand-opening",
        "content_type": "banner",
        "thumbnail_url": "https://placehold.co/400x200/8338EC/FFFFFF?text=Grand+Opening",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1200, "height": 628},
            "layout": "side_by_side",
            "background": {"type": "gradient", "value": ["#8338EC", "#3A86FF"]},
            "color_scheme": {
                "primary": "#8338EC",
                "secondary": "#FFFFFF",
                "accent": "#FFBE0B",
            },
            "zones": {
                "headline": {"x": 0.05, "y": 0.15, "width": 0.6, "height": 0.3},
                "body":     {"x": 0.05, "y": 0.48, "width": 0.6, "height": 0.3},
                "cta":      {"x": 0.05, "y": 0.8,  "width": 0.25, "height": 0.15},
            },
        },
    },
    {
        "name": "Edukasi Grand Opening - IG Post",
        "industry": "education",
        "theme": "grand-opening",
        "content_type": "instagram_post",
        "thumbnail_url": "https://placehold.co/400x400/0077B6/FFFFFF?text=Grand+Opening+Edu",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1080},
            "layout": "structured",
            "background": {"type": "color", "value": "#0077B6"},
            "color_scheme": {
                "primary": "#0077B6",
                "secondary": "#FFFFFF",
                "accent": "#00B4D8",
            },
            "zones": {
                "headline": {"x": 0.1, "y": 0.2,  "width": 0.8, "height": 0.25},
                "body":     {"x": 0.1, "y": 0.47, "width": 0.8, "height": 0.3},
                "cta":      {"x": 0.2, "y": 0.82, "width": 0.6, "height": 0.1},
            },
        },
    },
]


async def seed():
    engine = create_async_engine(
        settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
        echo=False,
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        existing = await session.execute(select(Template.name))
        existing_names = {row[0] for row in existing.fetchall()}

        added = 0
        skipped = 0
        for data in TEMPLATES:
            if data["name"] in existing_names:
                skipped += 1
                continue
            session.add(Template(**data))
            added += 1

        await session.commit()

    await engine.dispose()
    print(f"Selesai — {added} template ditambahkan, {skipped} dilewati (sudah ada).")


if __name__ == "__main__":
    asyncio.run(seed())
