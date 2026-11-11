"""
Cleanup service — hapus file R2 temp/ dari session yang sudah expired.
Dijalankan lewat job_service ("cleanup_temp") — terjadwal tiap 30 menit atau manual dari /admin/storage.
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
                # Tandai sudah dibersihkan — tanpa ini file yang sama "dihapus" & dihitung
                # ulang tiap run selamanya. Aman: session expired tak bisa dipilih lagi,
                # dan project menyimpan URL permanennya sendiri di final_config.
                variant.thematic_image_url = None
                deleted += 1

    if deleted:
        await db.commit()
        logger.info(
            "Cleanup: dihapus %d temp file dari %d expired session.",
            deleted,
            len(expired_sessions),
        )
    return deleted
