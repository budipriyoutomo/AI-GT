"""Job terjadwal + riwayat eksekusinya (A-10).

Setiap run — terjadwal (APScheduler) maupun manual (panel admin) — lewat run_job()
supaya tercatat di tabel job_runs. Job baru: daftarkan di JOBS dan jadwalkan di main.py.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Awaitable, Callable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job_run import JobRun
from app.models.user import User
from app.services import billing_service, cleanup_service
from app.utils.exceptions import AppError, ErrorCode

logger = logging.getLogger(__name__)

_MAX_ERROR_MESSAGE = 500


async def _cleanup_temp(db: AsyncSession) -> dict:
    return {"files_deleted": await cleanup_service._do_cleanup(db)}


async def _billing_maintenance(db: AsyncSession) -> dict:
    return {
        "orders_expired": await billing_service.expire_stale_orders(db),
        "subscriptions_downgraded": await billing_service.downgrade_expired_subscriptions(db),
    }


JOBS: dict[str, dict] = {
    "cleanup_temp": {
        "label": "Hapus file temp R2 dari session expired",
        "interval_minutes": 30,
        "fn": _cleanup_temp,
    },
    "billing_maintenance": {
        "label": "Expire order lama & turunkan langganan habis periode",
        "interval_minutes": 30,
        "fn": _billing_maintenance,
    },
}


def get_job(name: str) -> dict:
    job = JOBS.get(name)
    if not job:
        raise AppError(404, ErrorCode.JOB_NOT_FOUND, "Job tidak dikenal.")
    return job


async def run_job(db: AsyncSession, name: str, trigger: str, admin: User | None = None) -> JobRun:
    """Jalankan job & catat hasilnya. Kegagalan job DICATAT, tidak di-raise —
    scheduler tidak boleh mati karena satu run gagal."""
    fn: Callable[[AsyncSession], Awaitable[dict]] = get_job(name)["fn"]

    run = JobRun(
        id=uuid.uuid4(),
        job_name=name,
        trigger=trigger,
        triggered_by=admin.id if admin else None,
        triggered_by_email=admin.email if admin else None,
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)
    await db.commit()  # baris "running" terlihat selama job berjalan

    try:
        result = await fn(db)
        run.status, run.result = "success", result
    except Exception as e:
        logger.exception("job %s gagal", name)
        await db.rollback()  # buang perubahan setengah jalan dari job
        run = await db.get(JobRun, run.id)
        run.status = "failed"
        run.error_message = str(e)[:_MAX_ERROR_MESSAGE]
    run.finished_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(run)
    return run


async def run_scheduled(name: str) -> None:
    """Entry point APScheduler — membuka DB session sendiri."""
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        await run_job(db, name, trigger="schedule")


async def job_overview(db: AsyncSession, recent_limit: int = 20) -> dict:
    jobs = []
    for name, job in JOBS.items():
        base = select(JobRun).where(JobRun.job_name == name).order_by(JobRun.started_at.desc()).limit(1)
        last_run = await db.scalar(base)
        last_success = await db.scalar(base.where(JobRun.status == "success"))
        jobs.append({
            "name": name,
            "label": job["label"],
            "interval_minutes": job["interval_minutes"],
            "last_run": last_run,
            "last_success": last_success,
        })
    recent = list(await db.scalars(select(JobRun).order_by(JobRun.started_at.desc()).limit(recent_limit)))
    return {"jobs": jobs, "recent": recent}
