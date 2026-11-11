"""
A-1 — Role & otorisasi admin.
🔴 RED phase: ditulis sebelum kolom `role` dan get_current_admin() ada.
"""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class TestUserRoleColumn:
    async def test_new_user_defaults_to_role_user(self, client: AsyncClient, db: AsyncSession):
        """Registrasi biasa tidak boleh menghasilkan admin."""
        res = await client.post("/api/v1/auth/register", json={
            "name": "Budi", "email": "roledefault@example.com", "password": "secret123",
        })
        assert res.status_code == 201
        user_id = uuid.UUID(res.json()["data"]["user"]["id"])

        user = await db.get(User, user_id)
        assert user.role == "user"

    async def test_role_not_exposed_in_auth_me(self, client: AsyncClient, auth_headers: dict):
        """Role bukan rahasia, tapi juga bukan sesuatu yang dipakai UI user biasa."""
        res = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert res.status_code == 200
        assert "password_hash" not in res.json()["data"]


class TestGetCurrentAdmin:
    async def test_admin_passes(self, client: AsyncClient, admin_headers: dict):
        res = await client.get("/api/v1/admin/ping", headers=admin_headers)
        assert res.status_code == 200
        assert res.json()["success"] is True

    async def test_superadmin_passes(self, client: AsyncClient, superadmin_headers: dict):
        res = await client.get("/api/v1/admin/ping", headers=superadmin_headers)
        assert res.status_code == 200

    async def test_regular_user_forbidden(self, client: AsyncClient, auth_headers: dict):
        res = await client.get("/api/v1/admin/ping", headers=auth_headers)
        assert res.status_code == 403
        assert res.json()["success"] is False
        assert res.json()["error"]["code"] == "ADMIN_FORBIDDEN"

    async def test_no_token_unauthorized(self, client: AsyncClient):
        res = await client.get("/api/v1/admin/ping")
        assert res.status_code == 401

    async def test_invalid_token_unauthorized(self, client: AsyncClient):
        res = await client.get(
            "/api/v1/admin/ping", headers={"Authorization": "Bearer token.palsu"}
        )
        assert res.status_code == 401
        assert res.json()["error"]["code"] == "AUTH_TOKEN_EXPIRED"


class TestAdminErrorCode:
    def test_error_code_constant_exists(self):
        from app.utils.exceptions import ErrorCode

        assert ErrorCode.ADMIN_FORBIDDEN == "ADMIN_FORBIDDEN"
