"""
🔴 RED phase — semua test ini harus FAILING sebelum implementasi router.
Jalankan: pytest tests/unit/test_auth.py -v
"""
import pytest
from httpx import AsyncClient

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
