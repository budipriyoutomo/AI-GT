"""
One-off migration: rewrite persisted asset URLs from absolute (R2 endpoint / CDN
host) to ROOT-RELATIVE paths, matching the new storage_service._asset_path format.

Background: storage_service used to bake the full host into every stored URL, e.g.
    https://ai-gt-bucket.<acct>.r2.cloudflarestorage.com/permanent/thumbnails/u/p.png
The public host is now applied at render time by the frontend (NEXT_PUBLIC_CDN_URL),
so the DB should hold only the path:
    /permanent/thumbnails/u/p.png

This script strips ONLY our own known hosts (the R2 S3 endpoint and the public CDN).
External URLs (e.g. template sample images, provider fallback URLs) are left untouched.

Fields rewritten:
    projects.thumbnail_url          (Text)
    projects.exported_image_url     (Text)
    projects.final_config           (JSON)  -> "thematic_image_url"
    generate_variants.thematic_image_url    (Text)

Idempotent: values already relative (leading "/") or on external hosts are skipped.

Run:  cd backend && ./aigt/bin/python scripts/migrate_asset_urls.py
"""
import asyncio
import os
import sys
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.project import Project
from app.models.generate_variant import GenerateVariant


def _owned_hosts() -> set[str]:
    """Hosts we control — only URLs on these get rewritten to relative paths."""
    hosts = {
        f"{settings.cloudflare_r2_bucket_name}.{settings.cloudflare_r2_account_id}.r2.cloudflarestorage.com",
        f"{settings.cloudflare_r2_account_id}.r2.cloudflarestorage.com",
        "cdn.calira.my.id",
    }
    return {h for h in hosts if h and "." in h}


OWNED_HOSTS = _owned_hosts()


def to_relative(url: str | None) -> str | None:
    """Return root-relative path if `url` is an absolute URL on one of our hosts,
    else return `url` unchanged (already relative, empty, or external)."""
    if not url or not url.startswith(("http://", "https://")):
        return url
    parsed = urlparse(url)
    if parsed.netloc not in OWNED_HOSTS:
        return url  # external host — leave as-is
    path = parsed.path or "/"
    if not path.startswith("/"):
        path = "/" + path
    return path


async def main() -> None:
    changed_projects = 0
    changed_variants = 0

    async with AsyncSessionLocal() as db:
        # ── projects ──────────────────────────────────────────────────────
        projects = (await db.scalars(select(Project))).all()
        for p in projects:
            touched = False

            new_thumb = to_relative(p.thumbnail_url)
            if new_thumb != p.thumbnail_url:
                p.thumbnail_url = new_thumb
                touched = True

            new_export = to_relative(p.exported_image_url)
            if new_export != p.exported_image_url:
                p.exported_image_url = new_export
                touched = True

            cfg = p.final_config or {}
            if isinstance(cfg, dict) and "thematic_image_url" in cfg:
                new_ti = to_relative(cfg.get("thematic_image_url"))
                if new_ti != cfg.get("thematic_image_url"):
                    new_cfg = dict(cfg)
                    new_cfg["thematic_image_url"] = new_ti
                    p.final_config = new_cfg  # reassign so SQLAlchemy tracks the change
                    touched = True

            if touched:
                changed_projects += 1

        # ── generate_variants ─────────────────────────────────────────────
        variants = (await db.scalars(select(GenerateVariant))).all()
        for v in variants:
            new_url = to_relative(v.thematic_image_url)
            if new_url != v.thematic_image_url:
                v.thematic_image_url = new_url
                changed_variants += 1

        await db.commit()

    print(f"Owned hosts stripped: {sorted(OWNED_HOSTS)}")
    print(f"Projects updated : {changed_projects}")
    print(f"Variants updated : {changed_variants}")
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
