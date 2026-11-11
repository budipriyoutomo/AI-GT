"""
A-10 — Monitoring storage & job terjadwal.
🔴 RED phase: ditulis sebelum job_runs, job_service, dan endpoint /admin/storage ada.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_audit_log import AdminAuditLog
from app.models.generate_session import GenerateSession
from app.models.generate_variant import GenerateVariant
from app.models.job_run import JobRun
from app.models.template import Template
from app.models.user import User
from app.services import cleanup_service, job_service, storage_service

TEMP_URL = "/temp/thematic-images/sess/123.png"


async def _expired_variant(db: AsyncSession, user: User, template: Template, url: str = TEMP_URL) -> GenerateVariant:
    s = GenerateSession(
        id=uuid.uuid4(), user_id=user.id, template_id=template.id, language_style="casual",
        status="completed", expires_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    db.add(s)
    await db.flush()
    v = GenerateVariant(id=uuid.uuid4(), session_id=s.id, variant_number=1, copy_data={},
                        typography_data={}, thematic_image_url=url)
    db.add(v)
    await db.commit()
    return v


# ── Cleanup idempoten ─────────────────────────────────────────────────────

class TestCleanupIsIdempotent:
    async def test_second_run_deletes_nothing(
        self, db: AsyncSession, verified_user: User, sample_template: Template,
    ):
        """Sebelumnya file yang sama 'dihapus' & dihitung ulang tiap 30 menit selamanya."""
        v = await _expired_variant(db, verified_user, sample_template)
        delete = MagicMock()
        with patch.object(storage_service, "delete_file", delete):
            assert await cleanup_service._do_cleanup(db) == 1
            assert await cleanup_service._do_cleanup(db) == 0
        delete.assert_called_once_with("temp/thematic-images/sess/123.png")
        await db.refresh(v)
        assert v.thematic_image_url is None


# ── job_service: setiap run tercatat ──────────────────────────────────────

class TestJobRuns:
    async def test_successful_run_is_recorded(
        self, db: AsyncSession, verified_user: User, sample_template: Template,
    ):
        await _expired_variant(db, verified_user, sample_template)
        with patch.object(storage_service, "delete_file"):
            run = await job_service.run_job(db, "cleanup_temp", trigger="schedule")

        assert run.status == "success"
        assert run.result == {"files_deleted": 1}
        assert run.trigger == "schedule"
        assert run.triggered_by is None
        assert run.started_at is not None and run.finished_at is not None
        assert (await db.scalar(select(JobRun))).id == run.id

    async def test_billing_maintenance_job(self, db: AsyncSession):
        run = await job_service.run_job(db, "billing_maintenance", trigger="schedule")
        assert run.status == "success"
        assert run.result == {"orders_expired": 0, "subscriptions_downgraded": 0}

    async def test_failure_is_recorded_not_raised(self, db: AsyncSession):
        boom = AsyncMock(side_effect=RuntimeError("R2 down"))
        with patch.dict(job_service.JOBS, {"cleanup_temp": {**job_service.JOBS["cleanup_temp"], "fn": boom}}):
            run = await job_service.run_job(db, "cleanup_temp", trigger="schedule")
        assert run.status == "failed"
        assert "R2 down" in run.error_message
        assert run.finished_at is not None

    async def test_manual_run_records_admin(self, db: AsyncSession, admin_user: User):
        with patch.object(storage_service, "delete_file"):
            run = await job_service.run_job(db, "cleanup_temp", trigger="manual", admin=admin_user)
        assert run.trigger == "manual"
        assert run.triggered_by == admin_user.id
        assert run.triggered_by_email == admin_user.email

    async def test_scheduled_entry_point_uses_own_session(self):
        """Dipanggil APScheduler tanpa argumen DB — membuka session sendiri."""
        fake_db = MagicMock()
        cm = MagicMock()
        cm.__aenter__ = AsyncMock(return_value=fake_db)
        cm.__aexit__ = AsyncMock(return_value=None)
        with patch("app.database.AsyncSessionLocal", return_value=cm), \
             patch.object(job_service, "run_job", new=AsyncMock()) as run_job:
            await job_service.run_scheduled("cleanup_temp")
        run_job.assert_awaited_once_with(fake_db, "cleanup_temp", trigger="schedule")


# ── GET /admin/storage/jobs ───────────────────────────────────────────────

class TestJobsEndpoint:
    URL = "/api/v1/admin/storage/jobs"

    async def test_requires_admin(self, client: AsyncClient, auth_headers: dict):
        assert (await client.get(self.URL)).status_code == 401
        res = await client.get(self.URL, headers=auth_headers)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "ADMIN_FORBIDDEN"

    async def test_lists_jobs_with_last_run_and_last_success(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        now = datetime.now(timezone.utc)
        ok = JobRun(id=uuid.uuid4(), job_name="cleanup_temp", trigger="schedule", status="success",
                    result={"files_deleted": 3}, started_at=now - timedelta(minutes=30),
                    finished_at=now - timedelta(minutes=30))
        bad = JobRun(id=uuid.uuid4(), job_name="cleanup_temp", trigger="schedule", status="failed",
                     error_message="R2 down", started_at=now, finished_at=now)
        db.add_all([ok, bad])
        await db.commit()

        res = await client.get(self.URL, headers=admin_headers)
        assert res.status_code == 200
        jobs = {j["name"]: j for j in res.json()["data"]["jobs"]}
        assert set(jobs) == {"cleanup_temp", "billing_maintenance"}
        cleanup = jobs["cleanup_temp"]
        assert cleanup["interval_minutes"] == 30
        assert cleanup["last_run"]["id"] == str(bad.id)
        assert cleanup["last_run"]["status"] == "failed"
        assert cleanup["last_run"]["error_message"] == "R2 down"
        assert cleanup["last_success"]["id"] == str(ok.id)
        assert cleanup["last_success"]["result"] == {"files_deleted": 3}
        assert jobs["billing_maintenance"]["last_run"] is None

    async def test_recent_runs_newest_first(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        now = datetime.now(timezone.utc)
        for i in range(25):
            db.add(JobRun(id=uuid.uuid4(), job_name="cleanup_temp", trigger="schedule", status="success",
                          result={}, started_at=now - timedelta(minutes=i), finished_at=now))
        await db.commit()
        recent = (await client.get(self.URL, headers=admin_headers)).json()["data"]["recent"]
        assert len(recent) == 20
        assert recent[0]["started_at"] > recent[-1]["started_at"]


# ── POST /admin/storage/jobs/{name}/run ───────────────────────────────────

class TestRunJobEndpoint:
    URL = "/api/v1/admin/storage/jobs"

    async def test_manual_run_records_run_and_audit(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, admin_user: User,
        verified_user: User, sample_template: Template,
    ):
        await _expired_variant(db, verified_user, sample_template)
        with patch.object(storage_service, "delete_file"):
            res = await client.post(f"{self.URL}/cleanup_temp/run", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["status"] == "success"
        assert data["result"] == {"files_deleted": 1}
        assert data["trigger"] == "manual"
        assert data["triggered_by_email"] == admin_user.email

        [log] = list(await db.scalars(select(AdminAuditLog)))
        assert log.action == "job.run"
        assert log.target_type == "job"
        assert log.target_id == "cleanup_temp"
        assert log.payload == {"status": "success", "result": {"files_deleted": 1}}

    async def test_failed_manual_run_still_returns_run(
        self, client: AsyncClient, admin_headers: dict,
    ):
        """Request-nya berhasil dieksekusi; kegagalan job dilaporkan lewat status run, bukan 500."""
        boom = AsyncMock(side_effect=RuntimeError("R2 down"))
        with patch.dict(job_service.JOBS, {"cleanup_temp": {**job_service.JOBS["cleanup_temp"], "fn": boom}}):
            res = await client.post(f"{self.URL}/cleanup_temp/run", headers=admin_headers)
        assert res.status_code == 200
        assert res.json()["data"]["status"] == "failed"
        assert "R2 down" in res.json()["data"]["error_message"]

    async def test_unknown_job_is_404(self, client: AsyncClient, admin_headers: dict):
        res = await client.post(f"{self.URL}/rm_rf/run", headers=admin_headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "JOB_NOT_FOUND"

    async def test_requires_admin(self, client: AsyncClient, auth_headers: dict):
        res = await client.post(f"{self.URL}/cleanup_temp/run", headers=auth_headers)
        assert res.status_code == 403


# ── Ringkasan pemakaian R2 ────────────────────────────────────────────────

class TestUsageAggregation:
    def test_aggregates_by_prefix_and_user(self):
        u1, u2 = str(uuid.uuid4()), str(uuid.uuid4())
        objects = [
            {"Key": f"permanent/uploads/{u1}/a.png", "Size": 100},
            {"Key": f"permanent/uploads/{u1}/b.png", "Size": 50},
            {"Key": f"permanent/exported/{u2}/p/export.png", "Size": 400},
            {"Key": f"permanent/logos/{u1}/logo.png", "Size": 10},
            {"Key": "permanent/templates/thumbnails/t1.png", "Size": 7},
            {"Key": "temp/thematic-images/sess/1.png", "Size": 30},
            {"Key": "permanent/uploads/bukan-uuid/x.png", "Size": 5},
        ]
        usage = storage_service.aggregate_usage(objects)
        prefixes = {p["prefix"]: p for p in usage["prefixes"]}
        assert prefixes["permanent/uploads"] == {"prefix": "permanent/uploads", "objects": 3, "bytes": 155}
        assert prefixes["permanent/templates"]["bytes"] == 7
        assert prefixes["temp/thematic-images"]["objects"] == 1
        # Diurutkan dari yang terbesar.
        assert usage["prefixes"][0]["prefix"] == "permanent/exported"
        users = {u["user_id"]: u for u in usage["users"]}
        assert users[u1] == {"user_id": u1, "objects": 3, "bytes": 160}
        assert users[u2]["bytes"] == 400
        assert usage["users"][0]["user_id"] == u2
        assert "bukan-uuid" not in users  # template/temp/key aneh tidak dianggap milik user
        assert (usage["total_objects"], usage["total_bytes"]) == (7, 602)

    def test_scan_is_capped(self):
        page = {"Contents": [{"Key": f"temp/x/{i}.png", "Size": 1} for i in range(10)]}
        paginator = MagicMock()
        paginator.paginate.return_value = [page, page, page]
        client = MagicMock()
        client.get_paginator.return_value = paginator
        settings = MagicMock(cloudflare_r2_bucket_name="b")
        with patch.object(storage_service, "_get_client", return_value=client), \
             patch.object(storage_service, "settings", settings):
            usage = storage_service.scan_usage(max_objects=15)
        assert usage["total_objects"] == 15
        assert usage["truncated"] is True


class TestUsageEndpoint:
    URL = "/api/v1/admin/storage/usage"

    async def test_joins_user_emails_and_limits_top_users(
        self, client: AsyncClient, admin_headers: dict, verified_user: User,
    ):
        ghost = str(uuid.uuid4())  # user sudah dihapus tapi file tertinggal
        fake = {
            "prefixes": [{"prefix": "permanent/uploads", "objects": 2, "bytes": 300}],
            "users": [
                {"user_id": str(verified_user.id), "objects": 1, "bytes": 200},
                {"user_id": ghost, "objects": 1, "bytes": 100},
            ],
            "total_objects": 2, "total_bytes": 300, "truncated": False,
        }
        with patch.object(storage_service, "scan_usage", return_value=fake):
            res = await client.get(self.URL, headers=admin_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["total_bytes"] == 300
        assert data["truncated"] is False
        assert data["scanned_at"] is not None
        top = data["top_users"]
        assert top[0]["user"] == {"id": str(verified_user.id), "email": verified_user.email, "name": verified_user.name}
        assert top[0]["bytes"] == 200
        # File yatim (user tak ada) ditandai, berguna untuk mendeteksi sampah bucket.
        assert top[1]["user"] is None and top[1]["user_id"] == ghost

    async def test_storage_failure_is_503(self, client: AsyncClient, admin_headers: dict):
        with patch.object(storage_service, "scan_usage", side_effect=RuntimeError("R2 down")):
            res = await client.get(self.URL, headers=admin_headers)
        assert res.status_code == 503
        assert res.json()["success"] is False
        assert "R2 down" not in res.text  # jangan bocorkan detail internal

    async def test_requires_admin(self, client: AsyncClient, auth_headers: dict):
        res = await client.get(self.URL, headers=auth_headers)
        assert res.status_code == 403
