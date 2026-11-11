"""
A-3 — Verifikasi pembayaran lewat panel admin (pengganti scripts/confirm_payment.py).
🔴 RED phase: ditulis sebelum router admin/payments dan admin_payment_service ada.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment_order import PaymentOrder
from app.models.subscription import Subscription
from app.models.user import User
from app.services import storage_service

URL = "/api/v1/admin/orders"


async def _order(db: AsyncSession, user: User, status: str, **kw) -> PaymentOrder:
    order = PaymentOrder(
        id=uuid.uuid4(),
        user_id=user.id,
        kind=kw.get("kind", "plan"),
        item_id=kw.get("item_id", "pro"),
        amount=99000,
        unique_code=123,
        total_amount=99123,
        status=status,
        proof_url=kw.get("proof_url"),
        created_at=kw.get("created_at", datetime.now(timezone.utc)),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


@pytest_asyncio.fixture
async def awaiting_order(db: AsyncSession, verified_user: User) -> PaymentOrder:
    return await _order(
        db, verified_user, "awaiting_verification",
        proof_url=f"/permanent/payment-proofs/{verified_user.id}/x.png",
    )


# ── Otorisasi (berlaku untuk semua endpoint) ──────────────────────────────

class TestAuthorization:
    async def test_list_requires_token(self, client: AsyncClient):
        res = await client.get(URL)
        assert res.status_code == 401

    async def test_list_forbidden_for_regular_user(self, client: AsyncClient, auth_headers: dict):
        res = await client.get(URL, headers=auth_headers)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "ADMIN_FORBIDDEN"

    async def test_confirm_forbidden_for_regular_user(
        self, client: AsyncClient, auth_headers: dict, awaiting_order: PaymentOrder, db: AsyncSession
    ):
        """User tidak boleh mengaktifkan paketnya sendiri."""
        res = await client.post(f"{URL}/{awaiting_order.id}/confirm", headers=auth_headers)
        assert res.status_code == 403
        await db.refresh(awaiting_order)
        assert awaiting_order.status == "awaiting_verification"

    async def test_reject_forbidden_for_regular_user(
        self, client: AsyncClient, auth_headers: dict, awaiting_order: PaymentOrder
    ):
        res = await client.post(
            f"{URL}/{awaiting_order.id}/reject", headers=auth_headers, json={"reason": "palsu"}
        )
        assert res.status_code == 403

    async def test_proof_forbidden_for_regular_user(
        self, client: AsyncClient, auth_headers: dict, awaiting_order: PaymentOrder
    ):
        res = await client.get(f"{URL}/{awaiting_order.id}/proof", headers=auth_headers)
        assert res.status_code == 403


# ── GET /admin/orders ─────────────────────────────────────────────────────

class TestListOrders:
    async def test_default_filter_is_awaiting_verification(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        verified_user: User, awaiting_order: PaymentOrder,
    ):
        await _order(db, verified_user, "pending")
        await _order(db, verified_user, "paid")

        res = await client.get(URL, headers=admin_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["total"] == 1
        assert [o["id"] for o in body["data"]["items"]] == [str(awaiting_order.id)]

    async def test_item_shape_includes_user_and_amounts(
        self, client: AsyncClient, admin_headers: dict, verified_user: User, awaiting_order: PaymentOrder,
    ):
        res = await client.get(URL, headers=admin_headers)
        item = res.json()["data"]["items"][0]
        assert item["user"] == {
            "id": str(verified_user.id), "email": verified_user.email, "name": verified_user.name,
        }
        assert item["total_amount"] == 99123
        assert item["unique_code"] == 123
        assert item["item_name"] == "Pro"
        assert item["has_proof"] is True
        # URL mentah tidak dibocorkan — bukti transfer dibaca lewat endpoint /proof.
        assert "proof_url" not in item
        assert "password_hash" not in item["user"]

    async def test_filter_by_status(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        paid = await _order(db, verified_user, "paid")
        await _order(db, verified_user, "pending")

        res = await client.get(f"{URL}?status=paid", headers=admin_headers)
        assert [o["id"] for o in res.json()["data"]["items"]] == [str(paid.id)]

    async def test_status_all_returns_everything_newest_first(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        now = datetime.now(timezone.utc)
        old = await _order(db, verified_user, "paid", created_at=now - timedelta(days=2))
        new = await _order(db, verified_user, "pending", created_at=now)

        res = await client.get(f"{URL}?status=all", headers=admin_headers)
        assert [o["id"] for o in res.json()["data"]["items"]] == [str(new.id), str(old.id)]

    async def test_lists_orders_of_all_users(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        verified_user: User, other_user: User,
    ):
        await _order(db, verified_user, "awaiting_verification")
        await _order(db, other_user, "awaiting_verification")

        res = await client.get(URL, headers=admin_headers)
        assert res.json()["data"]["total"] == 2

    async def test_pagination(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        for _ in range(3):
            await _order(db, verified_user, "awaiting_verification")

        res = await client.get(f"{URL}?limit=2&offset=2", headers=admin_headers)
        data = res.json()["data"]
        assert data["total"] == 3
        assert len(data["items"]) == 1

    async def test_invalid_status_is_400(self, client: AsyncClient, admin_headers: dict):
        res = await client.get(f"{URL}?status=bukan-status", headers=admin_headers)
        assert res.status_code == 400
        assert res.json()["success"] is False
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    async def test_invalid_pagination_is_400(self, client: AsyncClient, admin_headers: dict):
        for qs in ("limit=0", "limit=101", "offset=-1"):
            res = await client.get(f"{URL}?{qs}", headers=admin_headers)
            assert res.status_code == 400, qs

    async def test_empty_list(self, client: AsyncClient, admin_headers: dict):
        res = await client.get(URL, headers=admin_headers)
        assert res.json()["data"] == {"items": [], "total": 0}


# ── GET /admin/orders/{id} ────────────────────────────────────────────────

class TestGetOrder:
    async def test_detail(self, client: AsyncClient, admin_headers: dict, awaiting_order: PaymentOrder):
        res = await client.get(f"{URL}/{awaiting_order.id}", headers=admin_headers)
        assert res.status_code == 200
        assert res.json()["data"]["id"] == str(awaiting_order.id)
        assert res.json()["data"]["status"] == "awaiting_verification"

    async def test_not_found(self, client: AsyncClient, admin_headers: dict):
        res = await client.get(f"{URL}/{uuid.uuid4()}", headers=admin_headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "ORDER_NOT_FOUND"


# ── GET /admin/orders/{id}/proof ──────────────────────────────────────────

class TestProof:
    async def test_serves_proof_bytes_privately(
        self, client: AsyncClient, admin_headers: dict, awaiting_order: PaymentOrder,
    ):
        with patch.object(storage_service, "get_object", return_value=(b"PNGDATA", "image/png")) as get:
            res = await client.get(f"{URL}/{awaiting_order.id}/proof", headers=admin_headers)
        assert res.status_code == 200
        assert res.content == b"PNGDATA"
        assert res.headers["content-type"] == "image/png"
        # Data pribadi: jangan pernah di-cache browser/CDN.
        assert "no-store" in res.headers["cache-control"]
        # proof_url disimpan dengan leading slash; key R2 tanpa slash.
        get.assert_called_once_with(awaiting_order.proof_url.lstrip("/"))

    async def test_order_without_proof_is_404(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        order = await _order(db, verified_user, "pending")
        res = await client.get(f"{URL}/{order.id}/proof", headers=admin_headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "ORDER_NOT_FOUND"

    async def test_missing_object_in_storage_is_404(
        self, client: AsyncClient, admin_headers: dict, awaiting_order: PaymentOrder,
    ):
        with patch.object(storage_service, "get_object", return_value=None):
            res = await client.get(f"{URL}/{awaiting_order.id}/proof", headers=admin_headers)
        assert res.status_code == 404


# ── POST /admin/orders/{id}/confirm ───────────────────────────────────────

class TestConfirm:
    async def test_confirm_activates_subscription_and_records_reviewer(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        admin_user: User, verified_user: User, awaiting_order: PaymentOrder,
    ):
        res = await client.post(f"{URL}/{awaiting_order.id}/confirm", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["status"] == "paid"
        assert data["paid_at"] is not None
        assert data["reviewed_by"] == {
            "id": str(admin_user.id), "email": admin_user.email, "name": admin_user.name,
        }
        assert data["reviewed_at"] is not None

        sub = await db.scalar(select(Subscription).where(Subscription.user_id == verified_user.id))
        assert sub.plan_id == "pro"
        assert sub.current_period_end is not None

    async def test_confirm_pending_order_without_proof_allowed(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        """Transfer sudah masuk di mutasi tapi user lupa upload bukti — admin tetap bisa konfirmasi."""
        order = await _order(db, verified_user, "pending")
        res = await client.post(f"{URL}/{order.id}/confirm", headers=admin_headers)
        assert res.status_code == 200
        assert res.json()["data"]["status"] == "paid"

    async def test_confirm_already_paid_is_422(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        """Konfirmasi ganda tidak boleh memperpanjang periode langganan diam-diam."""
        order = await _order(db, verified_user, "paid")
        res = await client.post(f"{URL}/{order.id}/confirm", headers=admin_headers)
        assert res.status_code == 422
        assert res.json()["error"]["code"] == "ORDER_STATUS_INVALID"

    async def test_confirm_rejected_is_422(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        order = await _order(db, verified_user, "rejected")
        res = await client.post(f"{URL}/{order.id}/confirm", headers=admin_headers)
        assert res.status_code == 422

    async def test_confirm_expired_is_422(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        order = await _order(db, verified_user, "expired")
        res = await client.post(f"{URL}/{order.id}/confirm", headers=admin_headers)
        assert res.status_code == 422

    async def test_confirm_not_found(self, client: AsyncClient, admin_headers: dict):
        res = await client.post(f"{URL}/{uuid.uuid4()}/confirm", headers=admin_headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "ORDER_NOT_FOUND"


# ── POST /admin/orders/{id}/reject ────────────────────────────────────────

class TestReject:
    async def test_reject_records_reason_and_reviewer(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        admin_user: User, verified_user: User, awaiting_order: PaymentOrder,
    ):
        res = await client.post(
            f"{URL}/{awaiting_order.id}/reject", headers=admin_headers,
            json={"reason": "Nominal transfer tidak sesuai"},
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["status"] == "rejected"
        assert data["rejection_reason"] == "Nominal transfer tidak sesuai"
        assert data["reviewed_by"]["id"] == str(admin_user.id)
        assert data["reviewed_at"] is not None

        # Penolakan tidak boleh menyentuh langganan.
        sub = await db.scalar(select(Subscription).where(Subscription.user_id == verified_user.id))
        assert sub is None

    async def test_reject_strips_reason(
        self, client: AsyncClient, admin_headers: dict, awaiting_order: PaymentOrder,
    ):
        res = await client.post(
            f"{URL}/{awaiting_order.id}/reject", headers=admin_headers, json={"reason": "  Bukti buram  "},
        )
        assert res.json()["data"]["rejection_reason"] == "Bukti buram"

    async def test_reject_requires_reason(
        self, client: AsyncClient, admin_headers: dict, awaiting_order: PaymentOrder,
    ):
        res = await client.post(
            f"{URL}/{awaiting_order.id}/reject", headers=admin_headers, json={"reason": "   "},
        )
        assert res.status_code == 400
        assert res.json()["success"] is False

    async def test_reject_reason_too_long(
        self, client: AsyncClient, admin_headers: dict, awaiting_order: PaymentOrder,
    ):
        res = await client.post(
            f"{URL}/{awaiting_order.id}/reject", headers=admin_headers, json={"reason": "x" * 501},
        )
        assert res.status_code == 400

    async def test_reject_paid_order_is_422(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        """Order lunas tidak bisa ditolak — langganannya sudah aktif."""
        order = await _order(db, verified_user, "paid")
        res = await client.post(f"{URL}/{order.id}/reject", headers=admin_headers, json={"reason": "salah"})
        assert res.status_code == 422
        assert res.json()["error"]["code"] == "ORDER_STATUS_INVALID"

    async def test_reject_not_found(self, client: AsyncClient, admin_headers: dict):
        res = await client.post(f"{URL}/{uuid.uuid4()}/reject", headers=admin_headers, json={"reason": "x"})
        assert res.status_code == 404


# ── Sisi user: alasan penolakan terlihat di order miliknya ───────────────

class TestUserSeesRejection:
    async def test_user_order_includes_rejection_reason(
        self, client: AsyncClient, admin_headers: dict, auth_headers: dict, awaiting_order: PaymentOrder,
    ):
        await client.post(
            f"{URL}/{awaiting_order.id}/reject", headers=admin_headers, json={"reason": "Bukti buram"},
        )
        res = await client.get(f"/api/v1/billing/orders/{awaiting_order.id}", headers=auth_headers)
        assert res.json()["data"]["status"] == "rejected"
        assert res.json()["data"]["rejection_reason"] == "Bukti buram"
