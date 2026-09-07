"""
🔴 RED — billing/monetisasi (transfer manual BCA, tanpa payment gateway).
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment_order import PaymentOrder
from app.models.subscription import Subscription
from app.models.user import User
from app.utils.exceptions import AppError, ErrorCode


class TestPlans:
    async def test_list_plans_public(self, client: AsyncClient):
        res = await client.get("/api/v1/billing/plans")
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data["plans"]) == 3
        assert len(data["addons"]) == 3
        pro = next(p for p in data["plans"] if p["id"] == "pro")
        assert pro["price"] == 99000


class TestSubscription:
    async def test_get_subscription_default_starter(self, client: AsyncClient, auth_headers: dict):
        res = await client.get("/api/v1/billing/subscription", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["plan_id"] == "starter"
        assert data["usage"]["generate_limit"] == 20
        assert "generate_used" in data["usage"]

    async def test_get_subscription_no_auth(self, client: AsyncClient):
        res = await client.get("/api/v1/billing/subscription")
        assert res.status_code == 401


class TestBackfillSubscriptions:
    async def test_backfill_creates_missing_starter(
        self, db: AsyncSession, verified_user: User, other_user: User
    ):
        from app.services import billing_service

        # dua user existing tanpa row subscription
        created = await billing_service.backfill_missing_subscriptions(db)
        assert created == 2

        for u in (verified_user, other_user):
            sub = await db.scalar(select(Subscription).where(Subscription.user_id == u.id))
            assert sub is not None
            assert sub.plan_id == "starter"
            assert sub.status == "active"

    async def test_backfill_is_idempotent(
        self, db: AsyncSession, verified_user: User
    ):
        from app.services import billing_service

        first = await billing_service.backfill_missing_subscriptions(db)
        assert first == 1
        # run kedua tidak boleh membuat duplikat
        second = await billing_service.backfill_missing_subscriptions(db)
        assert second == 0
        count = len(
            (await db.scalars(select(Subscription).where(Subscription.user_id == verified_user.id))).all()
        )
        assert count == 1


class TestCreateOrder:
    async def test_create_plan_order(self, client: AsyncClient, auth_headers: dict):
        res = await client.post("/api/v1/billing/orders", headers=auth_headers, json={"plan_id": "pro"})
        assert res.status_code == 201
        d = res.json()["data"]
        assert d["kind"] == "plan"
        assert d["item_id"] == "pro"
        assert d["amount"] == 99000
        assert 0 < d["unique_code"] < 1000
        assert d["total_amount"] == d["amount"] + d["unique_code"]
        assert d["status"] == "pending"
        assert d["bank"]["account_number"] == "1234567890"
        assert d["bank"]["bank_name"] == "BCA"

    async def test_create_addon_order(self, client: AsyncClient, auth_headers: dict):
        res = await client.post("/api/v1/billing/orders", headers=auth_headers, json={"addon_id": "s200"})
        assert res.status_code == 201
        d = res.json()["data"]
        assert d["kind"] == "addon"
        assert d["amount"] == 45000

    async def test_create_invalid_plan(self, client: AsyncClient, auth_headers: dict):
        res = await client.post("/api/v1/billing/orders", headers=auth_headers, json={"plan_id": "ghost"})
        assert res.status_code == 404

    async def test_create_both_fields(self, client: AsyncClient, auth_headers: dict):
        res = await client.post("/api/v1/billing/orders", headers=auth_headers, json={"plan_id": "pro", "addon_id": "s50"})
        assert res.status_code == 422

    async def test_create_no_auth(self, client: AsyncClient):
        res = await client.post("/api/v1/billing/orders", json={"plan_id": "pro"})
        assert res.status_code == 401


class TestListGetOrders:
    async def _create(self, client: AsyncClient, headers: dict, plan="pro") -> str:
        res = await client.post("/api/v1/billing/orders", headers=headers, json={"plan_id": plan})
        return res.json()["data"]["id"]

    async def test_list_orders_own_only(
        self, client: AsyncClient, auth_headers: dict, other_auth_headers: dict
    ):
        await self._create(client, auth_headers)
        res = await client.get("/api/v1/billing/orders", headers=auth_headers)
        assert res.status_code == 200
        assert len(res.json()["data"]) == 1
        # user lain tidak melihat order ini
        res2 = await client.get("/api/v1/billing/orders", headers=other_auth_headers)
        assert len(res2.json()["data"]) == 0

    async def test_get_order_detail(self, client: AsyncClient, auth_headers: dict):
        oid = await self._create(client, auth_headers)
        res = await client.get(f"/api/v1/billing/orders/{oid}", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["data"]["id"] == oid

    async def test_get_order_forbidden(
        self, client: AsyncClient, auth_headers: dict, other_auth_headers: dict
    ):
        oid = await self._create(client, auth_headers)
        res = await client.get(f"/api/v1/billing/orders/{oid}", headers=other_auth_headers)
        assert res.status_code in (403, 404)

    async def test_get_order_not_found(self, client: AsyncClient, auth_headers: dict):
        res = await client.get(f"/api/v1/billing/orders/{uuid.uuid4()}", headers=auth_headers)
        assert res.status_code == 404


class TestUploadProof:
    async def _create(self, client: AsyncClient, headers: dict) -> str:
        res = await client.post("/api/v1/billing/orders", headers=headers, json={"plan_id": "pro"})
        return res.json()["data"]["id"]

    async def test_upload_proof_success(self, client: AsyncClient, auth_headers: dict):
        oid = await self._create(client, auth_headers)
        fake_url = "/permanent/payment-proofs/u/o.png"
        with patch("app.services.billing_service.storage_service.upload_payment_proof", return_value=fake_url):
            res = await client.post(
                f"/api/v1/billing/orders/{oid}/proof",
                headers=auth_headers,
                files={"file": ("bukti.png", b"img", "image/png")},
            )
        assert res.status_code == 200
        d = res.json()["data"]
        assert d["status"] == "awaiting_verification"
        assert d["proof_url"] == fake_url

    async def test_upload_proof_rejects_non_image(self, client: AsyncClient, auth_headers: dict):
        oid = await self._create(client, auth_headers)
        res = await client.post(
            f"/api/v1/billing/orders/{oid}/proof",
            headers=auth_headers,
            files={"file": ("x.txt", b"data", "text/plain")},
        )
        assert res.status_code == 400

    async def test_upload_proof_rejects_too_large(self, client: AsyncClient, auth_headers: dict):
        oid = await self._create(client, auth_headers)
        big = b"x" * (5 * 1024 * 1024 + 1)  # > 5 MB
        res = await client.post(
            f"/api/v1/billing/orders/{oid}/proof",
            headers=auth_headers,
            files={"file": ("big.png", big, "image/png")},
        )
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "FILE_TOO_LARGE"

    async def test_upload_proof_forbidden(
        self, client: AsyncClient, auth_headers: dict, other_auth_headers: dict
    ):
        oid = await self._create(client, auth_headers)
        with patch("app.services.billing_service.storage_service.upload_payment_proof", return_value="/x.png"):
            res = await client.post(
                f"/api/v1/billing/orders/{oid}/proof",
                headers=other_auth_headers,
                files={"file": ("b.png", b"img", "image/png")},
            )
        assert res.status_code in (403, 404)


class TestActivation:
    """Aktivasi langganan saat order dikonfirmasi lunas (dipakai script admin)."""

    async def test_confirm_activates_subscription(
        self, client: AsyncClient, db, auth_headers: dict, verified_user: User
    ):
        from app.services import billing_service

        res = await client.post("/api/v1/billing/orders", headers=auth_headers, json={"plan_id": "pro"})
        oid = uuid.UUID(res.json()["data"]["id"])

        order = await billing_service.confirm_order(db, oid)
        assert order.status == "paid"
        assert order.paid_at is not None

        sub = await billing_service.get_subscription(db, verified_user.id)
        assert sub.plan_id == "pro"
        assert sub.status == "active"
        assert sub.current_period_end is not None


class TestStorageAddonLimit:
    """#1 — add-on storage harus menambah history_limit yang ditampilkan."""

    async def test_addon_adds_slots_to_history_limit(
        self, client: AsyncClient, db: AsyncSession, auth_headers: dict, verified_user: User
    ):
        db.add(Subscription(
            user_id=verified_user.id, plan_id="pro", status="active", storage_addon_id="s50",
        ))
        await db.commit()

        res = await client.get("/api/v1/billing/subscription", headers=auth_headers)
        assert res.status_code == 200
        # pro history_limit = 50 + addon s50 (+50) = 100
        assert res.json()["data"]["usage"]["history_limit"] == 100

    async def test_addon_ignored_when_unlimited(
        self, client: AsyncClient, db: AsyncSession, auth_headers: dict, verified_user: User
    ):
        db.add(Subscription(
            user_id=verified_user.id, plan_id="business", status="active", storage_addon_id="s500",
        ))
        await db.commit()

        res = await client.get("/api/v1/billing/subscription", headers=auth_headers)
        assert res.json()["data"]["usage"]["history_limit"] == -1  # unlimited tetap unlimited


class TestGenerateQuota:
    """#2 — kuota generate ditegakkan, bukan hanya tampilan."""

    async def test_quota_ok_when_under_limit(self, db: AsyncSession, verified_user: User):
        from app.services import billing_service

        with patch.object(
            billing_service, "compute_usage",
            new=AsyncMock(return_value={"generate_used": 5, "history_used": 0}),
        ):
            # tidak boleh raise
            await billing_service.assert_generate_quota(db, verified_user.id)

    async def test_quota_raises_when_exhausted(self, db: AsyncSession, verified_user: User):
        from app.services import billing_service

        with patch.object(
            billing_service, "compute_usage",
            new=AsyncMock(return_value={"generate_used": 20, "history_used": 0}),
        ):
            with pytest.raises(AppError) as exc:
                await billing_service.assert_generate_quota(db, verified_user.id)
        assert exc.value.code == ErrorCode.RATE_LIMIT_EXCEEDED
        assert exc.value.status_code == 429


class TestOrderExpiry:
    """#3 — order pending yang lewat expires_at ditandai expired."""

    async def test_expire_stale_pending_order(self, db: AsyncSession, verified_user: User):
        from app.services import billing_service

        past = datetime.now(timezone.utc) - timedelta(hours=1)
        future = datetime.now(timezone.utc) + timedelta(hours=1)
        stale = PaymentOrder(
            user_id=verified_user.id, kind="plan", item_id="pro", amount=99000,
            unique_code=1, total_amount=99001, status="pending", expires_at=past,
        )
        fresh = PaymentOrder(
            user_id=verified_user.id, kind="plan", item_id="pro", amount=99000,
            unique_code=2, total_amount=99002, status="pending", expires_at=future,
        )
        awaiting = PaymentOrder(
            user_id=verified_user.id, kind="plan", item_id="pro", amount=99000,
            unique_code=3, total_amount=99003, status="awaiting_verification", expires_at=past,
        )
        db.add_all([stale, fresh, awaiting])
        await db.commit()

        n = await billing_service.expire_stale_orders(db)
        assert n == 1
        await db.refresh(stale); await db.refresh(fresh); await db.refresh(awaiting)
        assert stale.status == "expired"
        assert fresh.status == "pending"
        assert awaiting.status == "awaiting_verification"  # sudah bayar, tunggu admin


class TestPeriodDowngrade:
    """#4 — langganan yang periodenya habis turun otomatis ke Starter."""

    async def test_downgrade_expired_subscription(self, db: AsyncSession, verified_user: User):
        from app.services import billing_service

        past = datetime.now(timezone.utc) - timedelta(days=1)
        db.add(Subscription(
            user_id=verified_user.id, plan_id="pro", status="active",
            storage_addon_id="s50", current_period_end=past,
        ))
        await db.commit()

        n = await billing_service.downgrade_expired_subscriptions(db)
        assert n == 1
        sub = await db.scalar(select(Subscription).where(Subscription.user_id == verified_user.id))
        assert sub.plan_id == "starter"
        assert sub.storage_addon_id is None
        assert sub.current_period_end is None


class TestProofGuard:
    """#5 — bukti transfer tidak boleh diunggah untuk order yang sudah lunas."""

    async def test_attach_proof_rejected_on_paid_order(self, db: AsyncSession, verified_user: User):
        from app.services import billing_service

        order = PaymentOrder(
            user_id=verified_user.id, kind="plan", item_id="pro", amount=99000,
            unique_code=1, total_amount=99001, status="paid",
        )
        db.add(order)
        await db.commit()

        with pytest.raises(AppError) as exc:
            await billing_service.attach_proof(
                db, order.id, verified_user.id, b"img", "png", "image/png"
            )
        assert exc.value.status_code == 400
