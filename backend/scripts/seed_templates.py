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

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.template import Template


# content_type: "Single" | "Carousel"  (matches frontend FORMATS filter)
# platform: "instagram_feed" | "instagram_story" | "facebook" | "tiktok"  (matches PlatformEnum)
# industry: must match frontend INDUSTRIES dropdown exactly
# theme: free-form label for the visual theme
TEMPLATES = [

    # ── Instagram Feed — Single ──────────────────────────────────────────────

    {
        "name": "FnB Promo Harian – IG Feed",
        "industry": "F&B / Kuliner",
        "theme": "promo",
        "content_type": "Single",
        "platform": "instagram_feed",
        "thumbnail_url": "https://placehold.co/400x500/E63946/FFFFFF?text=FnB+Promo",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1350},
            "layout": "full_bleed",
            "background": {"type": "gradient", "value": ["#E63946", "#FF6B35"]},
            "color_scheme": {"primary": "#E63946", "secondary": "#FFFFFF", "accent": "#FFD700"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.20, "width": 0.8, "height": 0.20},
                "body":     {"x": 0.1, "y": 0.43, "width": 0.8, "height": 0.22},
                "cta":      {"x": 0.25, "y": 0.72, "width": 0.5, "height": 0.10},
            },
        },
    },
    {
        "name": "Fashion Brand Awareness – IG Feed",
        "industry": "Fashion & Retail",
        "theme": "modern",
        "content_type": "Single",
        "platform": "instagram_feed",
        "thumbnail_url": "https://placehold.co/400x500/1A1A2E/FFFFFF?text=Fashion+Brand",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1350},
            "layout": "editorial",
            "background": {"type": "gradient", "value": ["#1A1A2E", "#16213E"]},
            "color_scheme": {"primary": "#FFFFFF", "secondary": "#FFD700", "accent": "#C77DFF"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.55, "width": 0.8, "height": 0.18},
                "body":     {"x": 0.1, "y": 0.75, "width": 0.8, "height": 0.12},
                "cta":      {"x": 0.25, "y": 0.89, "width": 0.5, "height": 0.07},
            },
        },
    },
    {
        "name": "Klinik Kecantikan Awareness – IG Feed",
        "industry": "Kesehatan & Kecantikan",
        "theme": "clean",
        "content_type": "Single",
        "platform": "instagram_feed",
        "thumbnail_url": "https://placehold.co/400x500/F7A8C4/333333?text=Kecantikan",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1350},
            "layout": "pastel_clean",
            "background": {"type": "color", "value": "#FFF0F6"},
            "color_scheme": {"primary": "#C9184A", "secondary": "#FFFFFF", "accent": "#FF6B6B"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.60, "width": 0.8, "height": 0.15},
                "body":     {"x": 0.1, "y": 0.77, "width": 0.8, "height": 0.12},
                "cta":      {"x": 0.25, "y": 0.91, "width": 0.5, "height": 0.07},
            },
        },
    },
    {
        "name": "Kursus Online Launch – IG Feed",
        "industry": "Edukasi",
        "theme": "launch",
        "content_type": "Single",
        "platform": "instagram_feed",
        "thumbnail_url": "https://placehold.co/400x500/0077B6/FFFFFF?text=Kursus+Launch",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1350},
            "layout": "structured",
            "background": {"type": "gradient", "value": ["#0077B6", "#00B4D8"]},
            "color_scheme": {"primary": "#0077B6", "secondary": "#FFFFFF", "accent": "#FFBE0B"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.18, "width": 0.8, "height": 0.22},
                "body":     {"x": 0.1, "y": 0.43, "width": 0.8, "height": 0.28},
                "cta":      {"x": 0.2,  "y": 0.78, "width": 0.6, "height": 0.10},
            },
        },
    },
    {
        "name": "Jasa Renovasi Konversi – IG Feed",
        "industry": "Jasa & Layanan",
        "theme": "profesional",
        "content_type": "Single",
        "platform": "instagram_feed",
        "thumbnail_url": "https://placehold.co/400x500/2B2D42/FFFFFF?text=Jasa+Renovasi",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1350},
            "layout": "split",
            "background": {"type": "color", "value": "#2B2D42"},
            "color_scheme": {"primary": "#EF233C", "secondary": "#FFFFFF", "accent": "#8D99AE"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.22, "width": 0.8, "height": 0.20},
                "body":     {"x": 0.1, "y": 0.45, "width": 0.8, "height": 0.25},
                "cta":      {"x": 0.2,  "y": 0.77, "width": 0.6, "height": 0.10},
            },
        },
    },
    {
        "name": "FnB Grand Opening – IG Feed",
        "industry": "F&B / Kuliner",
        "theme": "grand-opening",
        "content_type": "Single",
        "platform": "instagram_feed",
        "thumbnail_url": "https://placehold.co/400x500/8338EC/FFFFFF?text=Grand+Opening",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1350},
            "layout": "centered",
            "background": {"type": "gradient", "value": ["#8338EC", "#3A86FF"]},
            "color_scheme": {"primary": "#8338EC", "secondary": "#FFFFFF", "accent": "#FFBE0B"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.22, "width": 0.8, "height": 0.22},
                "body":     {"x": 0.1, "y": 0.47, "width": 0.8, "height": 0.22},
                "cta":      {"x": 0.25, "y": 0.76, "width": 0.5, "height": 0.10},
            },
        },
    },
    {
        "name": "Fashion Flash Sale – IG Feed",
        "industry": "Fashion & Retail",
        "theme": "flash-sale",
        "content_type": "Single",
        "platform": "instagram_feed",
        "thumbnail_url": "https://placehold.co/400x500/B5112C/FFFFFF?text=Flash+Sale",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1350},
            "layout": "bold_centered",
            "background": {"type": "color", "value": "#B5112C"},
            "color_scheme": {"primary": "#B5112C", "secondary": "#FFFFFF", "accent": "#FFD700"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.25, "width": 0.8, "height": 0.22},
                "body":     {"x": 0.1, "y": 0.50, "width": 0.8, "height": 0.20},
                "cta":      {"x": 0.25, "y": 0.77, "width": 0.5, "height": 0.10},
            },
        },
    },
    {
        "name": "Kecantikan Engagement Tips – IG Feed",
        "industry": "Kesehatan & Kecantikan",
        "theme": "tips",
        "content_type": "Single",
        "platform": "instagram_feed",
        "thumbnail_url": "https://placehold.co/400x500/9D4EDD/FFFFFF?text=Tips+Kecantikan",
        "is_premium": True,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1350},
            "layout": "pastel_clean",
            "background": {"type": "gradient", "value": ["#9D4EDD", "#C77DFF"]},
            "color_scheme": {"primary": "#9D4EDD", "secondary": "#FFFFFF", "accent": "#FFD166"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.18, "width": 0.8, "height": 0.20},
                "body":     {"x": 0.1, "y": 0.41, "width": 0.8, "height": 0.30},
                "cta":      {"x": 0.25, "y": 0.78, "width": 0.5, "height": 0.10},
            },
        },
    },

    # ── Instagram Feed — Carousel ────────────────────────────────────────────

    {
        "name": "FnB Menu Showcase – IG Carousel",
        "industry": "F&B / Kuliner",
        "theme": "showcase",
        "content_type": "Carousel",
        "platform": "instagram_feed",
        "thumbnail_url": "https://placehold.co/400x500/F4A261/FFFFFF?text=Menu+Carousel",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1080},
            "layout": "carousel_cover",
            "slide_count": 5,
            "background": {"type": "gradient", "value": ["#F4A261", "#E76F51"]},
            "color_scheme": {"primary": "#E76F51", "secondary": "#FFFFFF", "accent": "#264653"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.20, "width": 0.8, "height": 0.20},
                "body":     {"x": 0.1, "y": 0.43, "width": 0.8, "height": 0.25},
                "cta":      {"x": 0.25, "y": 0.75, "width": 0.5, "height": 0.10},
            },
        },
    },
    {
        "name": "Edukasi Tips Belajar – IG Carousel",
        "industry": "Edukasi",
        "theme": "tips",
        "content_type": "Carousel",
        "platform": "instagram_feed",
        "thumbnail_url": "https://placehold.co/400x500/118AB2/FFFFFF?text=Tips+Belajar",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1080},
            "layout": "carousel_cover",
            "slide_count": 6,
            "background": {"type": "color", "value": "#118AB2"},
            "color_scheme": {"primary": "#118AB2", "secondary": "#FFFFFF", "accent": "#FFD166"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.22, "width": 0.8, "height": 0.20},
                "body":     {"x": 0.1, "y": 0.45, "width": 0.8, "height": 0.28},
                "cta":      {"x": 0.2,  "y": 0.80, "width": 0.6, "height": 0.10},
            },
        },
    },
    {
        "name": "Fashion Lookbook – IG Carousel",
        "industry": "Fashion & Retail",
        "theme": "lookbook",
        "content_type": "Carousel",
        "platform": "instagram_feed",
        "thumbnail_url": "https://placehold.co/400x500/212529/F8F9FA?text=Lookbook",
        "is_premium": True,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1350},
            "layout": "editorial_carousel",
            "slide_count": 5,
            "background": {"type": "color", "value": "#212529"},
            "color_scheme": {"primary": "#FFFFFF", "secondary": "#ADB5BD", "accent": "#FFD700"},
            "zones": {
                "headline": {"x": 0.08, "y": 0.60, "width": 0.84, "height": 0.18},
                "body":     {"x": 0.08, "y": 0.80, "width": 0.84, "height": 0.12},
                "cta":      {"x": 0.25, "y": 0.93, "width": 0.5,  "height": 0.05},
            },
        },
    },

    # ── Instagram Story ──────────────────────────────────────────────────────

    {
        "name": "FnB Diskon Story – IG Story",
        "industry": "F&B / Kuliner",
        "theme": "promo",
        "content_type": "Single",
        "platform": "instagram_story",
        "thumbnail_url": "https://placehold.co/225x400/E63946/FFFFFF?text=Diskon+FnB",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "bold_centered",
            "background": {"type": "gradient", "value": ["#E63946", "#FF6B35"]},
            "color_scheme": {"primary": "#E63946", "secondary": "#FFFFFF", "accent": "#FFD700"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.30, "width": 0.8, "height": 0.20},
                "body":     {"x": 0.1, "y": 0.52, "width": 0.8, "height": 0.18},
                "cta":      {"x": 0.2,  "y": 0.75, "width": 0.6, "height": 0.08},
            },
        },
    },
    {
        "name": "Kecantikan Promo Story – IG Story",
        "industry": "Kesehatan & Kecantikan",
        "theme": "promo",
        "content_type": "Single",
        "platform": "instagram_story",
        "thumbnail_url": "https://placehold.co/225x400/C9184A/FFFFFF?text=Promo+Beauty",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "top_hero",
            "background": {"type": "gradient", "value": ["#C9184A", "#FF6B6B"]},
            "color_scheme": {"primary": "#C9184A", "secondary": "#FFFFFF", "accent": "#FFD700"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.50, "width": 0.8, "height": 0.18},
                "body":     {"x": 0.1, "y": 0.70, "width": 0.8, "height": 0.15},
                "cta":      {"x": 0.2,  "y": 0.88, "width": 0.6, "height": 0.08},
            },
        },
    },
    {
        "name": "Fashion Koleksi Baru – IG Story",
        "industry": "Fashion & Retail",
        "theme": "launch",
        "content_type": "Single",
        "platform": "instagram_story",
        "thumbnail_url": "https://placehold.co/225x400/0D0D0D/FFD700?text=Koleksi+Baru",
        "is_premium": True,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "editorial",
            "background": {"type": "gradient", "value": ["#0D0D0D", "#1A1A2E"]},
            "color_scheme": {"primary": "#FFD700", "secondary": "#FFFFFF", "accent": "#C77DFF"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.50, "width": 0.8, "height": 0.20},
                "body":     {"x": 0.1, "y": 0.72, "width": 0.8, "height": 0.15},
                "cta":      {"x": 0.25, "y": 0.89, "width": 0.5, "height": 0.07},
            },
        },
    },
    {
        "name": "Jasa Digital Konversi – IG Story",
        "industry": "Jasa & Layanan",
        "theme": "konversi",
        "content_type": "Single",
        "platform": "instagram_story",
        "thumbnail_url": "https://placehold.co/225x400/4361EE/FFFFFF?text=Jasa+Digital",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "structured",
            "background": {"type": "gradient", "value": ["#4361EE", "#3A0CA3"]},
            "color_scheme": {"primary": "#4361EE", "secondary": "#FFFFFF", "accent": "#F72585"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.28, "width": 0.8, "height": 0.22},
                "body":     {"x": 0.1, "y": 0.53, "width": 0.8, "height": 0.22},
                "cta":      {"x": 0.2,  "y": 0.80, "width": 0.6, "height": 0.08},
            },
        },
    },
    {
        "name": "Edukasi Webinar – IG Story",
        "industry": "Edukasi",
        "theme": "launch",
        "content_type": "Single",
        "platform": "instagram_story",
        "thumbnail_url": "https://placehold.co/225x400/06D6A0/1B1B1B?text=Webinar",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "top_hero",
            "background": {"type": "gradient", "value": ["#073B4C", "#06D6A0"]},
            "color_scheme": {"primary": "#06D6A0", "secondary": "#FFFFFF", "accent": "#FFD166"},
            "zones": {
                "headline": {"x": 0.1, "y": 0.48, "width": 0.8, "height": 0.20},
                "body":     {"x": 0.1, "y": 0.70, "width": 0.8, "height": 0.15},
                "cta":      {"x": 0.2,  "y": 0.88, "width": 0.6, "height": 0.08},
            },
        },
    },

    # ── Facebook ─────────────────────────────────────────────────────────────

    {
        "name": "FnB Promo Weekend – Facebook",
        "industry": "F&B / Kuliner",
        "theme": "promo",
        "content_type": "Single",
        "platform": "facebook",
        "thumbnail_url": "https://placehold.co/400x210/E76F51/FFFFFF?text=FnB+Facebook",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1200, "height": 628},
            "layout": "side_by_side",
            "background": {"type": "gradient", "value": ["#E76F51", "#F4A261"]},
            "color_scheme": {"primary": "#E76F51", "secondary": "#FFFFFF", "accent": "#264653"},
            "zones": {
                "headline": {"x": 0.05, "y": 0.12, "width": 0.58, "height": 0.30},
                "body":     {"x": 0.05, "y": 0.45, "width": 0.58, "height": 0.32},
                "cta":      {"x": 0.05, "y": 0.82, "width": 0.28, "height": 0.14},
            },
        },
    },
    {
        "name": "Jasa Profesional Awareness – Facebook",
        "industry": "Jasa & Layanan",
        "theme": "profesional",
        "content_type": "Single",
        "platform": "facebook",
        "thumbnail_url": "https://placehold.co/400x210/023E8A/FFFFFF?text=Jasa+Facebook",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1200, "height": 628},
            "layout": "centered",
            "background": {"type": "gradient", "value": ["#023E8A", "#0077B6"]},
            "color_scheme": {"primary": "#023E8A", "secondary": "#FFFFFF", "accent": "#90E0EF"},
            "zones": {
                "headline": {"x": 0.05, "y": 0.15, "width": 0.60, "height": 0.28},
                "body":     {"x": 0.05, "y": 0.47, "width": 0.60, "height": 0.30},
                "cta":      {"x": 0.05, "y": 0.82, "width": 0.25, "height": 0.14},
            },
        },
    },
    {
        "name": "Fashion Grand Sale – Facebook",
        "industry": "Fashion & Retail",
        "theme": "flash-sale",
        "content_type": "Single",
        "platform": "facebook",
        "thumbnail_url": "https://placehold.co/400x210/B5112C/FFFFFF?text=Fashion+Sale+FB",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1200, "height": 628},
            "layout": "split",
            "background": {"type": "color", "value": "#B5112C"},
            "color_scheme": {"primary": "#B5112C", "secondary": "#FFFFFF", "accent": "#FFD700"},
            "zones": {
                "headline": {"x": 0.05, "y": 0.18, "width": 0.58, "height": 0.28},
                "body":     {"x": 0.05, "y": 0.50, "width": 0.58, "height": 0.28},
                "cta":      {"x": 0.05, "y": 0.83, "width": 0.25, "height": 0.13},
            },
        },
    },
    {
        "name": "Edukasi Kelas Online – Facebook",
        "industry": "Edukasi",
        "theme": "launch",
        "content_type": "Single",
        "platform": "facebook",
        "thumbnail_url": "https://placehold.co/400x210/2D6A4F/FFFFFF?text=Kelas+Online+FB",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1200, "height": 628},
            "layout": "structured",
            "background": {"type": "gradient", "value": ["#2D6A4F", "#40916C"]},
            "color_scheme": {"primary": "#2D6A4F", "secondary": "#FFFFFF", "accent": "#B7E4C7"},
            "zones": {
                "headline": {"x": 0.05, "y": 0.15, "width": 0.58, "height": 0.30},
                "body":     {"x": 0.05, "y": 0.48, "width": 0.58, "height": 0.30},
                "cta":      {"x": 0.05, "y": 0.83, "width": 0.28, "height": 0.13},
            },
        },
    },
    {
        "name": "Kecantikan Produk Baru – Facebook",
        "industry": "Kesehatan & Kecantikan",
        "theme": "launch",
        "content_type": "Single",
        "platform": "facebook",
        "thumbnail_url": "https://placehold.co/400x210/9D4EDD/FFFFFF?text=Produk+Baru+FB",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1200, "height": 628},
            "layout": "pastel_clean",
            "background": {"type": "gradient", "value": ["#9D4EDD", "#C77DFF"]},
            "color_scheme": {"primary": "#9D4EDD", "secondary": "#FFFFFF", "accent": "#FFD166"},
            "zones": {
                "headline": {"x": 0.05, "y": 0.15, "width": 0.60, "height": 0.28},
                "body":     {"x": 0.05, "y": 0.46, "width": 0.60, "height": 0.30},
                "cta":      {"x": 0.05, "y": 0.82, "width": 0.28, "height": 0.14},
            },
        },
    },

    # ── TikTok ───────────────────────────────────────────────────────────────

    {
        "name": "FnB Viral Challenge – TikTok",
        "industry": "F&B / Kuliner",
        "theme": "engagement",
        "content_type": "Single",
        "platform": "tiktok",
        "thumbnail_url": "https://placehold.co/225x400/FF0050/FFFFFF?text=TikTok+FnB",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "tiktok_bold",
            "background": {"type": "gradient", "value": ["#FF0050", "#FF6B35"]},
            "color_scheme": {"primary": "#FF0050", "secondary": "#FFFFFF", "accent": "#00F2EA"},
            "zones": {
                "headline": {"x": 0.08, "y": 0.35, "width": 0.84, "height": 0.20},
                "body":     {"x": 0.08, "y": 0.57, "width": 0.84, "height": 0.18},
                "cta":      {"x": 0.2,  "y": 0.80, "width": 0.6,  "height": 0.08},
            },
        },
    },
    {
        "name": "Fashion OOTD – TikTok",
        "industry": "Fashion & Retail",
        "theme": "engagement",
        "content_type": "Single",
        "platform": "tiktok",
        "thumbnail_url": "https://placehold.co/225x400/000000/FFFFFF?text=OOTD+TikTok",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "tiktok_editorial",
            "background": {"type": "color", "value": "#000000"},
            "color_scheme": {"primary": "#FFFFFF", "secondary": "#FF0050", "accent": "#00F2EA"},
            "zones": {
                "headline": {"x": 0.08, "y": 0.55, "width": 0.84, "height": 0.18},
                "body":     {"x": 0.08, "y": 0.75, "width": 0.84, "height": 0.12},
                "cta":      {"x": 0.2,  "y": 0.89, "width": 0.6,  "height": 0.07},
            },
        },
    },
    {
        "name": "Edukasi Quick Tips – TikTok",
        "industry": "Edukasi",
        "theme": "tips",
        "content_type": "Single",
        "platform": "tiktok",
        "thumbnail_url": "https://placehold.co/225x400/06D6A0/1B1B1B?text=Tips+TikTok",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "tiktok_bold",
            "background": {"type": "gradient", "value": ["#073B4C", "#118AB2"]},
            "color_scheme": {"primary": "#06D6A0", "secondary": "#FFFFFF", "accent": "#FFD166"},
            "zones": {
                "headline": {"x": 0.08, "y": 0.30, "width": 0.84, "height": 0.22},
                "body":     {"x": 0.08, "y": 0.55, "width": 0.84, "height": 0.22},
                "cta":      {"x": 0.2,  "y": 0.82, "width": 0.6,  "height": 0.08},
            },
        },
    },
    {
        "name": "Kecantikan Before After – TikTok",
        "industry": "Kesehatan & Kecantikan",
        "theme": "testimonial",
        "content_type": "Single",
        "platform": "tiktok",
        "thumbnail_url": "https://placehold.co/225x400/F7A8C4/333333?text=Before+After",
        "is_premium": False,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "top_hero",
            "background": {"type": "gradient", "value": ["#FFF0F6", "#FFCCD5"]},
            "color_scheme": {"primary": "#C9184A", "secondary": "#FFFFFF", "accent": "#FF6B6B"},
            "zones": {
                "headline": {"x": 0.08, "y": 0.50, "width": 0.84, "height": 0.18},
                "body":     {"x": 0.08, "y": 0.70, "width": 0.84, "height": 0.15},
                "cta":      {"x": 0.2,  "y": 0.88, "width": 0.6,  "height": 0.08},
            },
        },
    },
    {
        "name": "Jasa Testimonial – TikTok",
        "industry": "Jasa & Layanan",
        "theme": "testimonial",
        "content_type": "Single",
        "platform": "tiktok",
        "thumbnail_url": "https://placehold.co/225x400/4361EE/FFFFFF?text=Testimonial",
        "is_premium": True,
        "template_config": {
            "dimensions": {"width": 1080, "height": 1920},
            "layout": "tiktok_editorial",
            "background": {"type": "gradient", "value": ["#4361EE", "#3A0CA3"]},
            "color_scheme": {"primary": "#4361EE", "secondary": "#FFFFFF", "accent": "#F72585"},
            "zones": {
                "headline": {"x": 0.08, "y": 0.38, "width": 0.84, "height": 0.20},
                "body":     {"x": 0.08, "y": 0.61, "width": 0.84, "height": 0.20},
                "cta":      {"x": 0.2,  "y": 0.85, "width": 0.6,  "height": 0.08},
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
