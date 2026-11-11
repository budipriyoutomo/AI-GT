"""
A-5 — Manajemen langganan & kuota oleh admin.
🔴 RED phase: ditulis sebelum quota_reset_at dan endpoint subscription/grant-addon ada.

Keputusan produk: mengganti paket secara manual IKUT me-reset kuota generate bulan berjalan.
"""
import uuid
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_audit_log import AdminAuditLog
from app.models.generate_session import GenerateSession
from app.models.subscription import Subscription
from app.models.template import Template
from app.models.user import User
from app.services import billing_service
from app.services.auth_service import get_auth_provider

URL = "/api/v1/admin/users"


async def _sessions(db: AsyncSession, user: User, template: Template, n: int, at: datetime | None = None) -> None:
    for _ in range(n):
        db.add(GenerateSession(
            id=uuid.uuid4(), user_id=user.id, template_id=template.id, language_style="casual",
            status="completed", created_at=at or datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        ))
    await db.commit()


def _dt(value: str) -> datetime:
    """Parse datetime dari response. SQLite (test) mengembalikan naive; Postgres aware — anggap UTC."""
    dt = datetime.fromisoformat(value)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def _sub(db: AsyncSession, user_id: uuid.UUID) -> Subscription | None:
    return await db.scalar(select(Subscription).where(Subscription.user_id == user_id))


async def _audit(db: AsyncSession) -> list[AdminAuditLog]:
    return list(await db.scalars(select(AdminAuditLog).order_by(AdminAuditLog.created_at)))


# ── Reset kuota di level billing_service (sumber tunggal hitungan kuota) ───

class TestQuotaReset:
    async def test_usage_counts_only_after_reset(
        self, db: AsyncSession, verified_user: User, sample_template: Template,
    ):
        await _sessions(db, verified_user, sample_template, 3, at=datetime.now(timezone.utc) - timedelta(minutes=5))
        db.add(Subscription(
            user_id=verified_user.id, plan_id="starter", status="active",
            quota_reset_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        ))
        await db.commit()
        await _sessions(db, verified_user, sample_template, 1)

        usage = await billing_service.compute_usage(db, verified_user.id)
        assert usage["generate_used"] == 1

    async def test_reset_from_previous_month_does_not_extend_window(
        self, db: AsyncSession, verified_user: User, sample_template: Template,
    ):
        """Reset bulan lalu tidak boleh membuat sesi bulan lalu ikut terhitung — jendela tetap mulai tgl 1."""
        db.add(Subscription(
            user_id=verified_user.id, plan_id="starter", status="active",
            quota_reset_at=datetime.now(timezone.utc) - timedelta(days=60),
        ))
        await db.commit()
        await _sessions(db, verified_user, sample_template, 2, at=datetime.now(timezone.utc) - timedelta(days=45))

        usage = await billing_service.compute_usage(db, verified_user.id)
        assert usage["generate_used"] == 0

    async def test_quota_gate_respects_reset(
        self, db: AsyncSession, verified_user: User, sample_template: Template,
    ):
        """User Starter yang kuotanya habis bisa generate lagi setelah reset."""
        await _sessions(db, verified_user, sample_template, 20, at=datetime.now(timezone.utc) - timedelta(minutes=5))
        db.add(Subscription(
            user_id=verified_user.id, plan_id="starter", status="active",
            quota_reset_at=datetime.now(timezone.utc),
        ))
        await db.commit()
        await billing_service.assert_generate_quota(db, verified_user.id)  # tidak raise


# ── PATCH /admin/users/{id}/subscription ──────────────────────────────────

class TestUpdateSubscription:
    async def test_requires_admin(self, client: AsyncClient, auth_headers: dict, other_user: User):
        assert (await client.patch(f"{URL}/{other_user.id}/subscription", json={"plan_id": "pro"})).status_code == 401
        res = await client.patch(f"{URL}/{other_user.id}/subscription", headers=auth_headers, json={"plan_id": "pro"})
        assert res.status_code == 403

    async def test_change_plan_sets_period_and_resets_quota(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        verified_user: User, sample_template: Template,
    ):
        await _sessions(db, verified_user, sample_template, 15, at=datetime.now(timezone.utc) - timedelta(minutes=5))

        res = await client.patch(f"{URL}/{verified_user.id}/subscription", headers=admin_headers, json={"plan_id": "pro"})
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["subscription"]["plan_id"] == "pro"
        assert data["subscription"]["current_period_end"] is not None
        assert data["usage"]["generate_used"] == 0
        assert data["usage"]["generate_limit"] == 80

        sub = await _sub(db, verified_user.id)
        end = sub.current_period_end if sub.current_period_end.tzinfo else sub.current_period_end.replace(tzinfo=timezone.utc)
        assert timedelta(days=29) < end - datetime.now(timezone.utc) <= timedelta(days=30)

    async def test_change_plan_keeps_active_period(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        """Upgrade Pro → Business di tengah periode tidak memotong/menambah periode yang sudah dibayar."""
        end = datetime.now(timezone.utc) + timedelta(days=10)
        db.add(Subscription(user_id=verified_user.id, plan_id="pro", status="active", current_period_end=end))
        await db.commit()

        res = await client.patch(f"{URL}/{verified_user.id}/subscription", headers=admin_headers, json={"plan_id": "business"})
        got = _dt(res.json()["data"]["subscription"]["current_period_end"])
        assert abs(got - end) < timedelta(seconds=1)

    async def test_downgrade_to_starter_clears_period(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        db.add(Subscription(
            user_id=verified_user.id, plan_id="pro", status="active",
            current_period_end=datetime.now(timezone.utc) + timedelta(days=10), storage_addon_id="s50",
        ))
        await db.commit()

        res = await client.patch(f"{URL}/{verified_user.id}/subscription", headers=admin_headers, json={"plan_id": "starter"})
        sub = res.json()["data"]["subscription"]
        assert sub["plan_id"] == "starter"
        assert sub["current_period_end"] is None
        assert sub["storage_addon_id"] == "s50"  # add-on dikelola terpisah lewat grant-addon

    async def test_same_plan_does_not_reset_quota(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        verified_user: User, sample_template: Template,
    ):
        await _sessions(db, verified_user, sample_template, 5, at=datetime.now(timezone.utc) - timedelta(minutes=5))
        res = await client.patch(f"{URL}/{verified_user.id}/subscription", headers=admin_headers, json={"plan_id": "starter"})
        assert res.status_code == 200
        assert res.json()["data"]["usage"]["generate_used"] == 5

    async def test_explicit_reset_quota_only(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        verified_user: User, sample_template: Template,
    ):
        await _sessions(db, verified_user, sample_template, 5, at=datetime.now(timezone.utc) - timedelta(minutes=5))
        res = await client.patch(f"{URL}/{verified_user.id}/subscription", headers=admin_headers, json={"reset_quota": True})
        data = res.json()["data"]
        assert data["usage"]["generate_used"] == 0
        assert data["subscription"]["plan_id"] == "starter"

    async def test_extend_from_current_end(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        end = datetime.now(timezone.utc) + timedelta(days=10)
        db.add(Subscription(user_id=verified_user.id, plan_id="pro", status="active", current_period_end=end))
        await db.commit()

        res = await client.patch(f"{URL}/{verified_user.id}/subscription", headers=admin_headers, json={"extend_days": 7})
        got = _dt(res.json()["data"]["subscription"]["current_period_end"])
        assert abs(got - (end + timedelta(days=7))) < timedelta(seconds=1)

    async def test_extend_lapsed_period_starts_from_now(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        db.add(Subscription(
            user_id=verified_user.id, plan_id="pro", status="active",
            current_period_end=datetime.now(timezone.utc) - timedelta(days=3),
        ))
        await db.commit()
        res = await client.patch(f"{URL}/{verified_user.id}/subscription", headers=admin_headers, json={"extend_days": 7})
        got = _dt(res.json()["data"]["subscription"]["current_period_end"])
        assert abs(got - (datetime.now(timezone.utc) + timedelta(days=7))) < timedelta(seconds=5)

    async def test_extend_starter_is_422(
        self, client: AsyncClient, admin_headers: dict, verified_user: User,
    ):
        """Starter gratis tak punya periode — memperpanjangnya tak bermakna."""
        res = await client.patch(f"{URL}/{verified_user.id}/subscription", headers=admin_headers, json={"extend_days": 7})
        assert res.status_code == 422
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    async def test_change_plan_and_extend_together(
        self, client: AsyncClient, admin_headers: dict, verified_user: User,
    ):
        res = await client.patch(
            f"{URL}/{verified_user.id}/subscription", headers=admin_headers, json={"plan_id": "pro", "extend_days": 30},
        )
        got = _dt(res.json()["data"]["subscription"]["current_period_end"])
        assert abs(got - (datetime.now(timezone.utc) + timedelta(days=60))) < timedelta(seconds=5)

    async def test_validation(self, client: AsyncClient, admin_headers: dict, verified_user: User):
        for body in ({}, {"plan_id": "gold"}, {"extend_days": 0}, {"extend_days": 366}, {"reset_quota": False}):
            res = await client.patch(f"{URL}/{verified_user.id}/subscription", headers=admin_headers, json=body)
            assert res.status_code == 400, body
            assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    async def test_cannot_change_own_subscription(
        self, client: AsyncClient, admin_headers: dict, admin_user: User,
    ):
        res = await client.patch(f"{URL}/{admin_user.id}/subscription", headers=admin_headers, json={"plan_id": "business"})
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "ADMIN_FORBIDDEN"

    async def test_admin_cannot_change_another_admin(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        other = User(
            id=uuid.uuid4(), email="admin2@example.com", name="Admin 2", is_verified=True, role="admin",
            password_hash=get_auth_provider().hash_password("password123"),
        )
        db.add(other)
        await db.commit()
        res = await client.patch(f"{URL}/{other.id}/subscription", headers=admin_headers, json={"plan_id": "pro"})
        assert res.status_code == 403

    async def test_not_found(self, client: AsyncClient, admin_headers: dict):
        res = await client.patch(f"{URL}/{uuid.uuid4()}/subscription", headers=admin_headers, json={"plan_id": "pro"})
        assert res.status_code == 404

    async def test_audit_records_before_and_after(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        await client.patch(f"{URL}/{verified_user.id}/subscription", headers=admin_headers, json={"plan_id": "pro"})
        [log] = await _audit(db)
        assert log.action == "subscription.update"
        assert log.target_type == "user"
        assert log.target_id == str(verified_user.id)
        assert log.payload["email"] == verified_user.email
        assert log.payload["before"] == {"plan_id": "starter", "current_period_end": None}
        assert log.payload["after"]["plan_id"] == "pro"
        assert log.payload["after"]["current_period_end"] is not None
        assert log.payload["quota_reset"] is True

    async def test_failed_update_not_audited(self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User):
        await client.patch(f"{URL}/{verified_user.id}/subscription", headers=admin_headers, json={"extend_days": 7})
        assert await _audit(db) == []


# ── POST /admin/users/{id}/grant-addon ────────────────────────────────────

class TestGrantAddon:
    async def test_grant_addon_raises_history_limit(
        self, client: AsyncClient, admin_headers: dict, verified_user: User,
    ):
        res = await client.post(f"{URL}/{verified_user.id}/grant-addon", headers=admin_headers, json={"addon_id": "s50"})
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["subscription"]["storage_addon_id"] == "s50"
        assert data["usage"]["history_limit"] == 70  # starter 20 + 50

    async def test_revoke_addon(self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User):
        db.add(Subscription(user_id=verified_user.id, plan_id="starter", status="active", storage_addon_id="s200"))
        await db.commit()
        res = await client.post(f"{URL}/{verified_user.id}/grant-addon", headers=admin_headers, json={"addon_id": None})
        assert res.json()["data"]["subscription"]["storage_addon_id"] is None

    async def test_unknown_addon_is_400(self, client: AsyncClient, admin_headers: dict, verified_user: User):
        res = await client.post(f"{URL}/{verified_user.id}/grant-addon", headers=admin_headers, json={"addon_id": "s9999"})
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    async def test_cannot_grant_self(self, client: AsyncClient, admin_headers: dict, admin_user: User):
        res = await client.post(f"{URL}/{admin_user.id}/grant-addon", headers=admin_headers, json={"addon_id": "s500"})
        assert res.status_code == 403

    async def test_requires_admin(self, client: AsyncClient, auth_headers: dict, verified_user: User):
        res = await client.post(f"{URL}/{verified_user.id}/grant-addon", headers=auth_headers, json={"addon_id": "s50"})
        assert res.status_code == 403

    async def test_audit(self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User):
        await client.post(f"{URL}/{verified_user.id}/grant-addon", headers=admin_headers, json={"addon_id": "s50"})
        [log] = await _audit(db)
        assert log.action == "subscription.grant_addon"
        assert log.payload == {"email": verified_user.email, "before": None, "after": "s50"}
