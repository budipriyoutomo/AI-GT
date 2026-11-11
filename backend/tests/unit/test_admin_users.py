"""
A-4 — Manajemen user di panel admin.
🔴 RED phase: ditulis sebelum router admin/users dan kolom is_active ada.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company_profile import CompanyProfile
from app.models.generate_session import GenerateSession
from app.models.subscription import Subscription
from app.models.user import User
from app.services import storage_service
from app.services.auth_service import get_auth_provider

URL = "/api/v1/admin/users"


async def _user(db: AsyncSession, email: str, name: str = "Pengguna", role: str = "user", **kw) -> User:
    u = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=get_auth_provider().hash_password("password123"),
        name=name,
        is_verified=True,
        role=role,
        is_active=kw.get("is_active", True),
        created_at=kw.get("created_at", datetime.now(timezone.utc)),
    )
    db.add(u)
    if kw.get("plan_id"):
        db.add(Subscription(user_id=u.id, plan_id=kw["plan_id"], status="active"))
    await db.commit()
    await db.refresh(u)
    return u


# ── Otorisasi ─────────────────────────────────────────────────────────────

class TestAuthorization:
    async def test_list_requires_token(self, client: AsyncClient):
        assert (await client.get(URL)).status_code == 401

    async def test_list_forbidden_for_regular_user(self, client: AsyncClient, auth_headers: dict):
        res = await client.get(URL, headers=auth_headers)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "ADMIN_FORBIDDEN"

    async def test_suspend_forbidden_for_regular_user(
        self, client: AsyncClient, auth_headers: dict, other_user: User,
    ):
        res = await client.post(f"{URL}/{other_user.id}/suspend", headers=auth_headers, json={"reason": "x"})
        assert res.status_code == 403

    async def test_delete_forbidden_for_regular_user(
        self, client: AsyncClient, auth_headers: dict, other_user: User,
    ):
        res = await client.request(
            "DELETE", f"{URL}/{other_user.id}", headers=auth_headers,
            json={"confirm_email": other_user.email},
        )
        assert res.status_code == 403


# ── GET /admin/users ──────────────────────────────────────────────────────

class TestListUsers:
    async def test_lists_users_newest_first_without_password_hash(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, admin_user: User,
    ):
        now = datetime.now(timezone.utc)
        old = await _user(db, "lama@example.com", created_at=now - timedelta(days=3))
        new = await _user(db, "baru@example.com", created_at=now + timedelta(seconds=1))

        res = await client.get(URL, headers=admin_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        ids = [u["id"] for u in data["items"]]
        assert ids.index(str(new.id)) < ids.index(str(old.id))
        assert data["total"] == 3  # termasuk admin_user
        for item in data["items"]:
            assert "password_hash" not in item

    async def test_item_shape(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        u = await _user(db, "toko@example.com", name="Toko Ani", plan_id="pro")
        db.add(CompanyProfile(id=uuid.uuid4(), user_id=u.id, business_name="Kedai Ani", industry="fnb"))
        await db.commit()

        res = await client.get(f"{URL}?q=toko@", headers=admin_headers)
        item = res.json()["data"]["items"][0]
        assert item["email"] == "toko@example.com"
        assert item["name"] == "Toko Ani"
        assert item["role"] == "user"
        assert item["is_active"] is True
        assert item["plan_id"] == "pro"
        assert item["business_name"] == "Kedai Ani"

    async def test_user_without_subscription_row_counts_as_starter(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        await _user(db, "lawas@example.com")
        res = await client.get(f"{URL}?q=lawas", headers=admin_headers)
        assert res.json()["data"]["items"][0]["plan_id"] == "starter"

    async def test_search_by_email_or_name_case_insensitive(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        a = await _user(db, "siti@example.com", name="Siti Aminah")
        b = await _user(db, "budi@warung.id", name="Budi")
        await _user(db, "lain@example.com", name="Lain")

        res = await client.get(f"{URL}?q=AMINAH", headers=admin_headers)
        assert [u["id"] for u in res.json()["data"]["items"]] == [str(a.id)]
        res = await client.get(f"{URL}?q=warung", headers=admin_headers)
        assert [u["id"] for u in res.json()["data"]["items"]] == [str(b.id)]

    async def test_search_treats_wildcards_literally(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        await _user(db, "satu@example.com")
        res = await client.get(f"{URL}?q=%25", headers=admin_headers)  # "%"
        assert res.json()["data"]["total"] == 0

    async def test_filter_by_plan(self, client: AsyncClient, db: AsyncSession, admin_headers: dict):
        pro = await _user(db, "pro@example.com", plan_id="pro")
        await _user(db, "biasa@example.com", plan_id="starter")
        res = await client.get(f"{URL}?plan=pro", headers=admin_headers)
        assert [u["id"] for u in res.json()["data"]["items"]] == [str(pro.id)]

    async def test_filter_starter_includes_users_without_row(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        await _user(db, "pro@example.com", plan_id="pro")
        res = await client.get(f"{URL}?plan=starter", headers=admin_headers)
        emails = {u["email"] for u in res.json()["data"]["items"]}
        assert "pro@example.com" not in emails
        assert "admin@example.com" in emails  # admin_user tanpa row subscription

    async def test_filter_by_status(self, client: AsyncClient, db: AsyncSession, admin_headers: dict):
        s = await _user(db, "susp@example.com", is_active=False)
        res = await client.get(f"{URL}?status=suspended", headers=admin_headers)
        assert [u["id"] for u in res.json()["data"]["items"]] == [str(s.id)]
        res = await client.get(f"{URL}?status=active", headers=admin_headers)
        assert str(s.id) not in [u["id"] for u in res.json()["data"]["items"]]

    async def test_pagination(self, client: AsyncClient, db: AsyncSession, admin_headers: dict):
        for i in range(3):
            await _user(db, f"u{i}@example.com")
        res = await client.get(f"{URL}?limit=2&offset=2", headers=admin_headers)
        assert res.json()["data"]["total"] == 4
        assert len(res.json()["data"]["items"]) == 2

    async def test_invalid_filters_are_400(self, client: AsyncClient, admin_headers: dict):
        for qs in ("plan=gold", "status=banned", "limit=0", "offset=-1"):
            res = await client.get(f"{URL}?{qs}", headers=admin_headers)
            assert res.status_code == 400, qs
            assert res.json()["error"]["code"] == "VALIDATION_ERROR"


# ── GET /admin/users/{id} ─────────────────────────────────────────────────

class TestUserDetail:
    async def test_detail_includes_profile_subscription_usage(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        verified_user: User, company_profile: CompanyProfile, project,
    ):
        res = await client.get(f"{URL}/{verified_user.id}", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["email"] == verified_user.email
        assert "password_hash" not in data
        assert data["company_profile"]["business_name"] == "Toko Budi"
        assert data["subscription"]["plan_id"] == "starter"
        assert data["subscription"]["plan_name"] == "Starter"
        # project fixture = 1 session bulan ini + 1 project
        assert data["usage"] == {
            "generate_used": 1, "generate_limit": 20, "history_used": 1, "history_limit": 20,
        }

    async def test_detail_without_profile(
        self, client: AsyncClient, admin_headers: dict, other_user: User,
    ):
        res = await client.get(f"{URL}/{other_user.id}", headers=admin_headers)
        assert res.json()["data"]["company_profile"] is None

    async def test_not_found(self, client: AsyncClient, admin_headers: dict):
        res = await client.get(f"{URL}/{uuid.uuid4()}", headers=admin_headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "USER_NOT_FOUND"


# ── Suspend / unsuspend ───────────────────────────────────────────────────

class TestSuspend:
    async def test_suspend_records_reason_and_blocks_login(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, other_user: User,
    ):
        res = await client.post(
            f"{URL}/{other_user.id}/suspend", headers=admin_headers, json={"reason": "  Spam generate  "},
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["is_active"] is False
        assert data["suspended_reason"] == "Spam generate"
        assert data["suspended_at"] is not None

        login = await client.post("/api/v1/auth/login", json={
            "email": other_user.email, "password": "password123",
        })
        assert login.status_code == 403
        assert login.json()["error"]["code"] == "AUTH_ACCOUNT_SUSPENDED"

    async def test_suspend_revokes_existing_token_immediately(
        self, client: AsyncClient, admin_headers: dict, other_user: User, other_auth_headers: dict,
    ):
        assert (await client.get("/api/v1/auth/me", headers=other_auth_headers)).status_code == 200
        await client.post(f"{URL}/{other_user.id}/suspend", headers=admin_headers, json={"reason": "abuse"})

        res = await client.get("/api/v1/auth/me", headers=other_auth_headers)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "AUTH_ACCOUNT_SUSPENDED"

    async def test_wrong_password_does_not_reveal_suspension(
        self, client: AsyncClient, db: AsyncSession,
    ):
        u = await _user(db, "susp@example.com", is_active=False)
        res = await client.post("/api/v1/auth/login", json={"email": u.email, "password": "salah"})
        assert res.status_code == 401
        assert res.json()["error"]["code"] == "AUTH_INVALID_CREDENTIALS"

    async def test_suspend_requires_reason(
        self, client: AsyncClient, admin_headers: dict, other_user: User,
    ):
        for reason in ("   ", "x" * 501):
            res = await client.post(f"{URL}/{other_user.id}/suspend", headers=admin_headers, json={"reason": reason})
            assert res.status_code == 400
            assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    async def test_unsuspend_restores_login(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        u = await _user(db, "susp@example.com", is_active=False)
        res = await client.post(f"{URL}/{u.id}/unsuspend", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["is_active"] is True
        assert data["suspended_reason"] is None
        assert data["suspended_at"] is None

        login = await client.post("/api/v1/auth/login", json={"email": u.email, "password": "password123"})
        assert login.status_code == 200

    async def test_cannot_suspend_self(
        self, client: AsyncClient, admin_headers: dict, admin_user: User,
    ):
        res = await client.post(f"{URL}/{admin_user.id}/suspend", headers=admin_headers, json={"reason": "x"})
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "ADMIN_FORBIDDEN"

    async def test_admin_cannot_suspend_another_admin(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        other_admin = await _user(db, "admin2@example.com", role="admin")
        res = await client.post(f"{URL}/{other_admin.id}/suspend", headers=admin_headers, json={"reason": "x"})
        assert res.status_code == 403

    async def test_superadmin_can_suspend_admin(
        self, client: AsyncClient, db: AsyncSession, superadmin_headers: dict,
    ):
        other_admin = await _user(db, "admin2@example.com", role="admin")
        res = await client.post(f"{URL}/{other_admin.id}/suspend", headers=superadmin_headers, json={"reason": "x"})
        assert res.status_code == 200

    async def test_superadmin_untouchable_from_panel(
        self, client: AsyncClient, db: AsyncSession, superadmin_headers: dict,
    ):
        other_super = await _user(db, "super2@example.com", role="superadmin")
        res = await client.post(f"{URL}/{other_super.id}/suspend", headers=superadmin_headers, json={"reason": "x"})
        assert res.status_code == 403

    async def test_suspended_admin_loses_panel_access(
        self, client: AsyncClient, db: AsyncSession, superadmin_headers: dict,
    ):
        a = await _user(db, "admin2@example.com", role="admin")
        token = get_auth_provider().create_token(str(a.id))
        await client.post(f"{URL}/{a.id}/suspend", headers=superadmin_headers, json={"reason": "x"})
        res = await client.get("/api/v1/admin/ping", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403

    async def test_suspend_not_found(self, client: AsyncClient, admin_headers: dict):
        res = await client.post(f"{URL}/{uuid.uuid4()}/suspend", headers=admin_headers, json={"reason": "x"})
        assert res.status_code == 404


# ── DELETE /admin/users/{id} ──────────────────────────────────────────────

class TestDeleteUser:
    async def test_delete_requires_matching_email(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, other_user: User,
    ):
        res = await client.request(
            "DELETE", f"{URL}/{other_user.id}", headers=admin_headers, json={"confirm_email": "salah@example.com"},
        )
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"
        assert await db.get(User, other_user.id) is not None

    async def test_delete_removes_user_data_and_files(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        verified_user: User, company_profile: CompanyProfile, project,
    ):
        uid = verified_user.id
        with patch.object(storage_service, "delete_user_files", return_value=0) as cleanup:
            res = await client.request(
                "DELETE", f"{URL}/{uid}", headers=admin_headers,
                json={"confirm_email": "  TEST@example.com "},
            )
        assert res.status_code == 200
        assert res.json()["success"] is True
        cleanup.assert_called_once_with(str(uid))

        db.expire_all()
        assert await db.scalar(select(User).where(User.id == uid)) is None
        assert await db.scalar(select(GenerateSession).where(GenerateSession.user_id == uid)) is None

    async def test_cannot_delete_self(self, client: AsyncClient, admin_headers: dict, admin_user: User):
        res = await client.request(
            "DELETE", f"{URL}/{admin_user.id}", headers=admin_headers, json={"confirm_email": admin_user.email},
        )
        assert res.status_code == 403

    async def test_admin_cannot_delete_another_admin(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        a = await _user(db, "admin2@example.com", role="admin")
        res = await client.request(
            "DELETE", f"{URL}/{a.id}", headers=admin_headers, json={"confirm_email": a.email},
        )
        assert res.status_code == 403

    async def test_delete_not_found(self, client: AsyncClient, admin_headers: dict):
        res = await client.request(
            "DELETE", f"{URL}/{uuid.uuid4()}", headers=admin_headers, json={"confirm_email": "x@example.com"},
        )
        assert res.status_code == 404
