"""
🔴 RED phase — semua test ini harus FAILING sebelum implementasi router.
Jalankan: pytest tests/unit/test_auth.py -v
"""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import Subscription
from app.models.user import User


class TestRegister:
    async def test_register_success(self, client: AsyncClient):
        res = await client.post("/api/v1/auth/register", json={
            "name": "Budi",
            "email": "budi@example.com",
            "password": "secret123",
        })
        assert res.status_code == 201
        body = res.json()
        assert body["success"] is True
        assert "access_token" in body["data"]
        assert body["data"]["token_type"] == "bearer"
        assert "user" in body["data"]
        assert body["data"]["user"]["email"] == "budi@example.com"
        assert body["data"]["user"]["name"] == "Budi"

    async def test_register_duplicate_email(self, client: AsyncClient, verified_user: User):
        res = await client.post("/api/v1/auth/register", json={
            "name": "Duplikat",
            "email": verified_user.email,
            "password": "secret123",
        })
        assert res.status_code == 400
        assert res.json()["success"] is False
        assert res.json()["error"]["code"] == "AUTH_INVALID_CREDENTIALS"

    async def test_register_missing_field(self, client: AsyncClient):
        res = await client.post("/api/v1/auth/register", json={
            "email": "nopw@example.com",
        })
        assert res.status_code == 422

    async def test_register_invalid_email_format(self, client: AsyncClient):
        res = await client.post("/api/v1/auth/register", json={
            "name": "Budi",
            "email": "bukan-email",
            "password": "secret123",
        })
        assert res.status_code == 422

    async def test_register_creates_starter_subscription(
        self, client: AsyncClient, db: AsyncSession
    ):
        res = await client.post("/api/v1/auth/register", json={
            "name": "Budi",
            "email": "starter@example.com",
            "password": "secret123",
        })
        assert res.status_code == 201
        user_id = uuid.UUID(res.json()["data"]["user"]["id"])

        sub = await db.scalar(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        assert sub is not None
        assert sub.plan_id == "starter"
        assert sub.status == "active"


class TestLogin:
    async def test_login_success(self, client: AsyncClient, verified_user: User):
        res = await client.post("/api/v1/auth/login", json={
            "email": verified_user.email,
            "password": "password123",
        })
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert "access_token" in body["data"]
        assert body["data"]["token_type"] == "bearer"
        assert "user" in body["data"]
        assert body["data"]["user"]["email"] == verified_user.email

    async def test_login_wrong_password(self, client: AsyncClient, verified_user: User):
        res = await client.post("/api/v1/auth/login", json={
            "email": verified_user.email,
            "password": "salah123",
        })
        assert res.status_code == 401
        assert res.json()["error"]["code"] == "AUTH_INVALID_CREDENTIALS"

    async def test_login_email_not_found(self, client: AsyncClient):
        res = await client.post("/api/v1/auth/login", json={
            "email": "tidakada@example.com",
            "password": "password123",
        })
        assert res.status_code == 401
        assert res.json()["error"]["code"] == "AUTH_INVALID_CREDENTIALS"

    async def test_login_unverified_email(self, client: AsyncClient, unverified_user: User):
        res = await client.post("/api/v1/auth/login", json={
            "email": unverified_user.email,
            "password": "password123",
        })
        assert res.status_code == 401
        assert res.json()["error"]["code"] == "AUTH_EMAIL_NOT_VERIFIED"


class TestGetMe:
    async def test_get_me_success(self, client: AsyncClient, auth_headers: dict, verified_user: User):
        res = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["email"] == verified_user.email
        assert body["data"]["name"] == verified_user.name
        assert "password_hash" not in body["data"]

    async def test_get_me_no_token(self, client: AsyncClient):
        res = await client.get("/api/v1/auth/me")
        assert res.status_code == 401

    async def test_get_me_invalid_token(self, client: AsyncClient):
        res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer token.palsu.ini"},
        )
        assert res.status_code == 401
        assert res.json()["error"]["code"] == "AUTH_TOKEN_EXPIRED"


class TestChangePassword:
    async def test_change_password_success(
        self, client: AsyncClient, auth_headers: dict, verified_user: User
    ):
        res = await client.post(
            "/api/v1/auth/change-password",
            headers=auth_headers,
            json={"current_password": "password123", "new_password": "newsecret123"},
        )
        assert res.status_code == 200
        assert res.json()["success"] is True

        # password lama tidak lagi berlaku, password baru berlaku
        old = await client.post("/api/v1/auth/login", json={
            "email": verified_user.email, "password": "password123",
        })
        assert old.status_code == 401
        new = await client.post("/api/v1/auth/login", json={
            "email": verified_user.email, "password": "newsecret123",
        })
        assert new.status_code == 200

    async def test_change_password_wrong_current(self, client: AsyncClient, auth_headers: dict):
        res = await client.post(
            "/api/v1/auth/change-password",
            headers=auth_headers,
            json={"current_password": "salah-banget", "new_password": "newsecret123"},
        )
        assert res.status_code == 401
        assert res.json()["error"]["code"] == "AUTH_INVALID_CREDENTIALS"

    async def test_change_password_too_short(self, client: AsyncClient, auth_headers: dict):
        res = await client.post(
            "/api/v1/auth/change-password",
            headers=auth_headers,
            json={"current_password": "password123", "new_password": "123"},
        )
        assert res.status_code == 422

    async def test_change_password_no_auth(self, client: AsyncClient):
        res = await client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "password123", "new_password": "newsecret123"},
        )
        assert res.status_code == 401


class TestDeleteAccount:
    async def test_delete_account_success(
        self, client: AsyncClient, auth_headers: dict, verified_user: User
    ):
        res = await client.request(
            "DELETE", "/api/v1/auth/me", headers=auth_headers
        )
        assert res.status_code == 200
        assert res.json()["success"] is True

        # user tidak bisa lagi login / akses /me
        me = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert me.status_code == 404
        login = await client.post("/api/v1/auth/login", json={
            "email": verified_user.email, "password": "password123",
        })
        assert login.status_code == 401

    async def test_delete_account_removes_related_data(
        self, client: AsyncClient, auth_headers: dict, project, company_profile
    ):
        # ada project + company profile milik user, delete harus bersih tanpa error FK
        res = await client.request("DELETE", "/api/v1/auth/me", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["success"] is True

    async def test_delete_account_removes_subscription(
        self, client: AsyncClient, auth_headers: dict, verified_user: User, db: AsyncSession
    ):
        # user punya subscription + payment order → delete harus bersih tanpa error FK
        from app.models.payment_order import PaymentOrder

        db.add(Subscription(user_id=verified_user.id, plan_id="pro", status="active"))
        db.add(PaymentOrder(
            user_id=verified_user.id, kind="plan", item_id="pro",
            amount=99000, unique_code=1, total_amount=99001, status="paid",
        ))
        await db.commit()

        res = await client.request("DELETE", "/api/v1/auth/me", headers=auth_headers)
        assert res.status_code == 200

        remaining = await db.scalar(
            select(Subscription).where(Subscription.user_id == verified_user.id)
        )
        assert remaining is None

    async def test_delete_account_no_auth(self, client: AsyncClient):
        res = await client.request("DELETE", "/api/v1/auth/me")
        assert res.status_code == 401
