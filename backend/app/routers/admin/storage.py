"""A-10 — Monitoring storage R2 & job terjadwal."""
import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.job_run import JobRun
from app.models.user import User
from app.schemas.admin import AdminUserRef, JobRunData
from app.services import audit_service, auth_service, job_service, storage_service
from app.utils.auth import get_current_admin
from app.utils.exceptions import AppError, ErrorCode

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/storage", dependencies=[Depends(get_current_admin)])

TOP_USERS = 20


def _run(run: JobRun | None) -> dict | None:
    return JobRunData.model_validate(run).model_dump(mode="json") if run else None


@router.get("/jobs")
async def list_jobs(db: AsyncSession = Depends(get_db)):
    overview = await job_service.job_overview(db)
    return {
        "success": True,
        "data": {
            "jobs": [
                {**{k: j[k] for k in ("name", "label", "interval_minutes")},
                 "last_run": _run(j["last_run"]), "last_success": _run(j["last_success"])}
                for j in overview["jobs"]
            ],
            "recent": [_run(r) for r in overview["recent"]],
        },
    }


@router.post("/jobs/{name}/run")
async def run_job(
    name: str,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Jalankan job sekarang. Kegagalan job dilaporkan lewat `status` run (200), bukan 500."""
    job_service.get_job(name)  # 404 sebelum ada apa pun yang tercatat
    run = await job_service.run_job(db, name, trigger="manual", admin=admin)
    audit_service.record(db, admin, "job.run", "job", name, {"status": run.status, "result": run.result})
    await db.commit()
    return {"success": True, "data": _run(run)}


@router.get("/usage")
async def storage_usage(db: AsyncSession = Depends(get_db)):
    """Pemakaian R2 per prefix & per user. Pemindaian on-demand (bisa beberapa detik)."""
    try:
        # boto3 sinkron — jangan blok event loop.
        usage = await asyncio.to_thread(storage_service.scan_usage)
    except Exception as e:
        logger.error("storage scan gagal: %s", e)
        raise AppError(503, ErrorCode.STORAGE_UNAVAILABLE, "Storage tidak bisa dipindai saat ini.")

    top = usage["users"][:TOP_USERS]
    users = await auth_service.get_users_by_ids(db, {uuid.UUID(u["user_id"]) for u in top})
    return {
        "success": True,
        "data": {
            "prefixes": usage["prefixes"],
            # user None = file yatim (akun sudah tak ada) — kandidat sampah bucket.
            "top_users": [
                {**u, "user": (ref.model_dump(mode="json") if (ref := AdminUserRef.from_user(users.get(uuid.UUID(u["user_id"])))) else None)}
                for u in top
            ],
            "total_objects": usage["total_objects"],
            "total_bytes": usage["total_bytes"],
            "truncated": usage["truncated"],
            "scanned_at": datetime.now(timezone.utc).isoformat(),
        },
    }
