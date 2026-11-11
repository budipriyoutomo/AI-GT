"""
A-8 — Dashboard metrik admin + daftar session gagal.
🔴 RED phase: ditulis sebelum kolom error_reason/error_message dan endpoint metrics/sessions ada.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company_profile import CompanyProfile
from app.models.contact_message import ContactMessage
from app.models.generate_session import GenerateSession
from app.models.payment_order import PaymentOrder
from app.models.template import Template
from app.models.user import User
from app.services import ai_service, generate_service
from app.services.providers.ai_types import CopyError, CopyInvalidJsonError, CopyTimeoutError


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _session(
    db: AsyncSession, user: User, template: Template, status: str, at: datetime | None = None, **kw,
) -> GenerateSession:
    s = GenerateSession(
        id=uuid.uuid4(), user_id=user.id, template_id=template.id, language_style="casual",
        status=status, created_at=at or _now(), expires_at=_now() + timedelta(hours=1),
        content_data={"product_or_service": "Kopi", "key_message": "Enak", "image_source": "none"},
        error_reason=kw.get("error_reason"), error_message=kw.get("error_message"),
    )
    db.add(s)
    await db.commit()
    return s


# ── Kegagalan generate tercatat dengan alasan ─────────────────────────────

class TestFailureIsRecorded:
    @pytest.mark.parametrize("exc, reason", [
        (CopyTimeoutError("timeout 30s"), "copy_timeout"),
        (CopyInvalidJsonError("invalid json x3"), "copy_invalid_json"),
        (CopyError("Haiku down"), "copy_failed"),
    ])
    async def test_copy_failures(
        self, db: AsyncSession, verified_user: User, sample_template: Template,
        company_profile: CompanyProfile, exc: Exception, reason: str,
    ):
        s = await _session(db, verified_user, sample_template, "processing")
        with patch.object(ai_service, "generate_content", new=AsyncMock(side_effect=exc)):
            await generate_service._do_generate(db, s.id)
        await db.refresh(s)
        assert s.status == "failed"
        assert s.error_reason == reason
        assert str(exc) in s.error_message

    async def test_missing_profile(
        self, db: AsyncSession, verified_user: User, sample_template: Template,
    ):
        s = await _session(db, verified_user, sample_template, "processing")
        await generate_service._do_generate(db, s.id)
        await db.refresh(s)
        assert (s.status, s.error_reason) == ("failed", "missing_profile")

    async def test_error_message_is_truncated(
        self, db: AsyncSession, verified_user: User, sample_template: Template, company_profile: CompanyProfile,
    ):
        s = await _session(db, verified_user, sample_template, "processing")
        with patch.object(ai_service, "generate_content", new=AsyncMock(side_effect=CopyError("x" * 5000))):
            await generate_service._do_generate(db, s.id)
        await db.refresh(s)
        assert len(s.error_message) <= 500

    async def test_user_facing_session_response_does_not_leak_error(
        self, client: AsyncClient, db: AsyncSession, auth_headers: dict,
        verified_user: User, sample_template: Template,
    ):
        """Pesan error provider hanya untuk admin — bukan untuk user (AGENTS.md §10 #4)."""
        s = await _session(db, verified_user, sample_template, "failed",
                           error_reason="copy_failed", error_message="secret provider detail")
        res = await client.get(f"/api/v1/generate/session/{s.id}", headers=auth_headers)
        assert res.status_code == 200
        assert "secret provider detail" not in res.text
        assert "error_reason" not in res.text


# ── GET /admin/metrics ────────────────────────────────────────────────────

class TestMetrics:
    URL = "/api/v1/admin/metrics"

    async def test_requires_admin(self, client: AsyncClient, auth_headers: dict):
        assert (await client.get(self.URL)).status_code == 401
        res = await client.get(self.URL, headers=auth_headers)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "ADMIN_FORBIDDEN"

    async def test_empty_system(self, client: AsyncClient, db: AsyncSession, admin_headers: dict):
        res = await client.get(self.URL, headers=admin_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["generate"]["success_rate_30d"] is None  # 0/0 bukan 0%
        assert data["revenue"]["this_month"] == 0
        assert len(data["daily"]) == 30
        assert all(d["completed"] == 0 and d["failed"] == 0 for d in data["daily"])

    async def test_users(self, client: AsyncClient, db: AsyncSession, admin_headers: dict, admin_user: User):
        from app.services.auth_service import get_auth_provider

        h = get_auth_provider().hash_password("password123")
        for email, age_days, active in (("a@x.id", 2, True), ("b@x.id", 20, False), ("c@x.id", 90, True)):
            db.add(User(id=uuid.uuid4(), email=email, name="U", password_hash=h, is_verified=True,
                        is_active=active, created_at=_now() - timedelta(days=age_days)))
        await db.commit()

        users = (await client.get(self.URL, headers=admin_headers)).json()["data"]["users"]
        # + admin_user (dibuat barusan)
        assert users == {"total": 4, "new_7d": 2, "new_30d": 3, "suspended": 1}

    async def test_generate_counts_and_success_rate(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        verified_user: User, sample_template: Template,
    ):
        for status in ("completed", "completed", "completed", "failed", "processing"):
            await _session(db, verified_user, sample_template, status)
        await _session(db, verified_user, sample_template, "failed", at=_now() - timedelta(days=40))

        gen = (await client.get(self.URL, headers=admin_headers)).json()["data"]["generate"]
        assert gen["last_30d"] == {"total": 5, "completed": 3, "failed": 1, "processing": 1}
        # processing tidak ikut dihitung — belum tahu hasilnya.
        assert gen["success_rate_30d"] == 0.75

    async def test_this_month_generate_count(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        verified_user: User, sample_template: Template,
    ):
        now = _now()
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        await _session(db, verified_user, sample_template, "completed", at=month_start + timedelta(seconds=1))
        await _session(db, verified_user, sample_template, "completed", at=month_start - timedelta(seconds=1))
        gen = (await client.get(self.URL, headers=admin_headers)).json()["data"]["generate"]
        assert gen["this_month"] == 1

    async def test_daily_trend_buckets_by_utc_date(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        verified_user: User, sample_template: Template,
    ):
        today = _now().replace(hour=12, minute=0, second=0, microsecond=0)
        if today > _now():
            today -= timedelta(days=1)  # jangan membuat session di masa depan
        await _session(db, verified_user, sample_template, "completed", at=today)
        await _session(db, verified_user, sample_template, "failed", at=today)
        await _session(db, verified_user, sample_template, "completed", at=today - timedelta(days=3))

        daily = (await client.get(self.URL, headers=admin_headers)).json()["data"]["daily"]
        by_date = {d["date"]: d for d in daily}
        assert daily[-1]["date"] == _now().date().isoformat()  # urut lama → baru, berakhir hari ini
        assert by_date[today.date().isoformat()] == {"date": today.date().isoformat(), "completed": 1, "failed": 1}
        assert by_date[(today - timedelta(days=3)).date().isoformat()]["completed"] == 1

    async def test_revenue_this_month_counts_paid_only(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        now = _now()
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

        def order(status: str, total: int, paid_at: datetime | None) -> PaymentOrder:
            return PaymentOrder(id=uuid.uuid4(), user_id=verified_user.id, kind="plan", item_id="pro",
                                amount=total, unique_code=0, total_amount=total, status=status, paid_at=paid_at)

        db.add_all([
            order("paid", 99123, month_start + timedelta(hours=1)),
            order("paid", 249456, now),
            order("paid", 99000, month_start - timedelta(seconds=1)),  # bulan lalu
            order("awaiting_verification", 15000, None),
            order("awaiting_verification", 45000, None),
            order("rejected", 90000, None),
        ])
        await db.commit()

        data = (await client.get(self.URL, headers=admin_headers)).json()["data"]
        assert data["revenue"] == {"this_month": 99123 + 249456, "paid_orders_this_month": 2}
        assert data["pending"]["orders_awaiting_verification"] == 2

    async def test_unread_messages(self, client: AsyncClient, db: AsyncSession, admin_headers: dict):
        for status in ("new", "new", "read", "handled"):
            db.add(ContactMessage(id=uuid.uuid4(), name="A", email="a@x.id", message="hi", status=status))
        await db.commit()
        pending = (await client.get(self.URL, headers=admin_headers)).json()["data"]["pending"]
        assert pending["messages_unread"] == 2


# ── GET /admin/sessions ───────────────────────────────────────────────────

class TestSessions:
    URL = "/api/v1/admin/sessions"

    async def test_requires_admin(self, client: AsyncClient, auth_headers: dict):
        res = await client.get(self.URL, headers=auth_headers)
        assert res.status_code == 403

    async def test_default_lists_failed_newest_first_with_error(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        verified_user: User, sample_template: Template,
    ):
        old = await _session(db, verified_user, sample_template, "failed", at=_now() - timedelta(hours=2),
                             error_reason="copy_timeout", error_message="timeout 30s")
        new = await _session(db, verified_user, sample_template, "failed",
                             error_reason="copy_invalid_json", error_message="bad json")
        await _session(db, verified_user, sample_template, "completed")

        res = await client.get(self.URL, headers=admin_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["total"] == 2
        assert [i["id"] for i in data["items"]] == [str(new.id), str(old.id)]
        item = data["items"][1]
        assert item["error_reason"] == "copy_timeout"
        assert item["error_message"] == "timeout 30s"
        assert item["user"] == {"id": str(verified_user.id), "email": verified_user.email, "name": verified_user.name}
        assert item["template_name"] == sample_template.name
        assert item["status"] == "failed"

    async def test_filter_processing_and_all(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        verified_user: User, sample_template: Template,
    ):
        await _session(db, verified_user, sample_template, "failed")
        p = await _session(db, verified_user, sample_template, "processing")
        await _session(db, verified_user, sample_template, "completed")

        res = await client.get(f"{self.URL}?status=processing", headers=admin_headers)
        assert [i["id"] for i in res.json()["data"]["items"]] == [str(p.id)]
        res = await client.get(f"{self.URL}?status=all", headers=admin_headers)
        assert res.json()["data"]["total"] == 3

    async def test_deleted_template_or_user_does_not_crash(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        verified_user: User, sample_template: Template,
    ):
        await _session(db, verified_user, sample_template, "failed")
        # Simulasikan template dihapus (SQLite test tidak menegakkan FK).
        await db.execute(delete(Template).where(Template.id == sample_template.id))
        await db.commit()
        res = await client.get(self.URL, headers=admin_headers)
        assert res.status_code == 200
        assert res.json()["data"]["items"][0]["template_name"] is None

    async def test_invalid_filters_are_400(self, client: AsyncClient, admin_headers: dict):
        for qs in ("status=exploded", "limit=0", "offset=-1"):
            res = await client.get(f"{self.URL}?{qs}", headers=admin_headers)
            assert res.status_code == 400, qs
            assert res.json()["error"]["code"] == "VALIDATION_ERROR"
