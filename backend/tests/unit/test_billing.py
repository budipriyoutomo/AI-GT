"""
🔴 RED — billing/monetisasi (transfer manual BCA, tanpa payment gateway).
"""
import uuid
from unittest.mock import patch

from httpx import AsyncClient

from app.models.user import User


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
