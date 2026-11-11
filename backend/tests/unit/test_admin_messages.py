"""
A-7 — Kotak masuk pesan Contact di panel admin (menutup T-12).
🔴 RED phase: ditulis sebelum router admin/messages dan kolom status ada.
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact_message import ContactMessage
from app.models.user import User

URL = "/api/v1/admin/messages"


async def _msg(db: AsyncSession, status: str = "new", **kw) -> ContactMessage:
    m = ContactMessage(
        id=uuid.uuid4(),
        name=kw.get("name", "Siti"),
        email=kw.get("email", "siti@example.com"),
        category=kw.get("category", "support"),
        message=kw.get("message", "Halo, saya mau tanya soal paket."),
        status=status,
        created_at=kw.get("created_at", datetime.now(timezone.utc)),
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


@pytest_asyncio.fixture
async def new_message(db: AsyncSession) -> ContactMessage:
    return await _msg(db, "new")


class TestAuthorization:
    async def test_list_requires_token(self, client: AsyncClient):
        res = await client.get(URL)
        assert res.status_code == 401

    async def test_list_forbidden_for_regular_user(self, client: AsyncClient, auth_headers: dict):
        res = await client.get(URL, headers=auth_headers)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "ADMIN_FORBIDDEN"

    async def test_patch_forbidden_for_regular_user(
        self, client: AsyncClient, auth_headers: dict, new_message: ContactMessage
    ):
        res = await client.patch(f"{URL}/{new_message.id}", headers=auth_headers, json={"status": "handled"})
        assert res.status_code == 403


class TestPublicSubmitStillWorks:
    async def test_new_submission_starts_as_new(self, client: AsyncClient, admin_headers: dict):
        res = await client.post("/api/v1/contact", json={
            "name": "Andi", "email": "Andi@Example.com", "category": "partnership", "message": "Mau kerja sama",
        })
        assert res.status_code == 201

        listed = await client.get(URL, headers=admin_headers)
        item = listed.json()["data"]["items"][0]
        assert item["status"] == "new"
        assert item["email"] == "andi@example.com"
        assert item["message"] == "Mau kerja sama"


class TestListMessages:
    async def test_default_shows_open_messages_newest_first(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        now = datetime.now(timezone.utc)
        old_read = await _msg(db, "read", created_at=now - timedelta(days=1))
        new = await _msg(db, "new", created_at=now)
        await _msg(db, "handled")

        res = await client.get(URL, headers=admin_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["total"] == 2
        assert [m["id"] for m in data["items"]] == [str(new.id), str(old_read.id)]

    async def test_reports_unread_count(self, client: AsyncClient, db: AsyncSession, admin_headers: dict):
        await _msg(db, "new")
        await _msg(db, "new")
        await _msg(db, "read")
        res = await client.get(f"{URL}?status=handled", headers=admin_headers)
        # unread dihitung lintas filter — dipakai badge di nav admin.
        assert res.json()["data"]["unread"] == 2

    async def test_filter_handled(self, client: AsyncClient, db: AsyncSession, admin_headers: dict):
        handled = await _msg(db, "handled")
        await _msg(db, "new")
        res = await client.get(f"{URL}?status=handled", headers=admin_headers)
        assert [m["id"] for m in res.json()["data"]["items"]] == [str(handled.id)]

    async def test_filter_all(self, client: AsyncClient, db: AsyncSession, admin_headers: dict):
        for s in ("new", "read", "handled"):
            await _msg(db, s)
        res = await client.get(f"{URL}?status=all", headers=admin_headers)
        assert res.json()["data"]["total"] == 3

    async def test_pagination(self, client: AsyncClient, db: AsyncSession, admin_headers: dict):
        for _ in range(3):
            await _msg(db, "new")
        res = await client.get(f"{URL}?limit=2&offset=2", headers=admin_headers)
        assert res.json()["data"]["total"] == 3
        assert len(res.json()["data"]["items"]) == 1

    async def test_invalid_status_is_400(self, client: AsyncClient, admin_headers: dict):
        res = await client.get(f"{URL}?status=spam", headers=admin_headers)
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    async def test_invalid_pagination_is_400(self, client: AsyncClient, admin_headers: dict):
        for qs in ("limit=0", "limit=101", "offset=-1"):
            res = await client.get(f"{URL}?{qs}", headers=admin_headers)
            assert res.status_code == 400, qs

    async def test_empty(self, client: AsyncClient, admin_headers: dict):
        res = await client.get(URL, headers=admin_headers)
        assert res.json()["data"] == {"items": [], "total": 0, "unread": 0}


class TestUpdateStatus:
    async def test_mark_read(
        self, client: AsyncClient, admin_headers: dict, new_message: ContactMessage,
    ):
        res = await client.patch(f"{URL}/{new_message.id}", headers=admin_headers, json={"status": "read"})
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["status"] == "read"
        assert data["handled_by"] is None
        assert data["handled_at"] is None

    async def test_mark_handled_records_admin(
        self, client: AsyncClient, admin_headers: dict, admin_user: User, new_message: ContactMessage,
    ):
        res = await client.patch(f"{URL}/{new_message.id}", headers=admin_headers, json={"status": "handled"})
        data = res.json()["data"]
        assert data["status"] == "handled"
        assert data["handled_by"] == {
            "id": str(admin_user.id), "email": admin_user.email, "name": admin_user.name,
        }
        assert data["handled_at"] is not None

    async def test_reopen_clears_handler(
        self, client: AsyncClient, admin_headers: dict, new_message: ContactMessage,
    ):
        await client.patch(f"{URL}/{new_message.id}", headers=admin_headers, json={"status": "handled"})
        res = await client.patch(f"{URL}/{new_message.id}", headers=admin_headers, json={"status": "read"})
        data = res.json()["data"]
        assert data["status"] == "read"
        assert data["handled_by"] is None
        assert data["handled_at"] is None

    async def test_mark_read_does_not_downgrade_handled(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        """Auto-mark-read saat admin membuka pesan tidak boleh membuka ulang pesan yang sudah selesai."""
        handled = await _msg(db, "handled")
        res = await client.patch(
            f"{URL}/{handled.id}", headers=admin_headers, json={"status": "read", "only_if_new": True},
        )
        assert res.status_code == 200
        assert res.json()["data"]["status"] == "handled"

    async def test_invalid_status_is_400(
        self, client: AsyncClient, admin_headers: dict, new_message: ContactMessage,
    ):
        res = await client.patch(f"{URL}/{new_message.id}", headers=admin_headers, json={"status": "spam"})
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    async def test_not_found(self, client: AsyncClient, admin_headers: dict):
        res = await client.patch(f"{URL}/{uuid.uuid4()}", headers=admin_headers, json={"status": "read"})
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "MESSAGE_NOT_FOUND"
