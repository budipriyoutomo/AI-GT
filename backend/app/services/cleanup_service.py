"""
Cleanup service — hapus file R2 temp/ dari session yang sudah expired.
Di-trigger oleh APScheduler setiap 30 menit.
"""
import logging
from datetime import datetime, timezone
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.services import storage_service

logger = logging.getLogger(__name__)


async def _do_cleanup(db: AsyncSession) -> int:
    """
    Core cleanup logic — dapat di-inject DB session (testable).
    Return jumlah file yang dihapus.
    """
    from app.models.generate_session import GenerateSession

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(GenerateSession)
        .where(GenerateSession.expires_at < now)
        .options(selectinload(GenerateSession.variants))
    )
    expired_sessions = result.scalars().all()

    deleted = 0
    for session in expired_sessions:
        for variant in session.variants:
            url = variant.thematic_image_url
            if url and "/temp/" in url:
                key = urlparse(url).path.lstrip("/")
                storage_service.delete_file(key)
                deleted += 1

    if deleted:
        logger.info(
            "Cleanup: dihapus %d temp file dari %d expired session.",
            deleted,
            len(expired_sessions),
        )
    return deleted


async def cleanup_expired_temp_files() -> int:
    """Entry point cron job — buat DB session sendiri lalu panggil _do_cleanup."""
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        return await _do_cleanup(db)
