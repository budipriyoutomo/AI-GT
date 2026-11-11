"""
A-9 — Audit log aksi admin.
🔴 RED phase: ditulis sebelum tabel admin_audit_logs dan audit_service ada.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_audit_log import AdminAuditLog
from app.models.payment_order import PaymentOrder
from app.models.user import User
from app.services import storage_service

URL = "/api/v1/admin/audit-logs"


async def _order(db: AsyncSession, user: User, status: str = "awaiting_verification") -> PaymentOrder:
    o = PaymentOrder(
        id=uuid.uuid4(), user_id=user.id, kind="plan", item_id="pro",
        amount=99000, unique_code=123, total_amount=99123, status=status,
    )
    db.add(o)
    await db.commit()
    await db.refresh(o)
    return o


async def _logs(db: AsyncSession) -> list[AdminAuditLog]:
    # Client memakai session yang sama dengan `db`, jadi baris baru langsung terlihat.
    return list(await db.scalars(select(AdminAuditLog).order_by(AdminAuditLog.created_at)))


# ── Aksi admin tercatat ───────────────────────────────────────────────────

class TestActionsAreRecorded:
    async def test_confirm_order(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, admin_user: User, verified_user: User,
    ):
        order = await _order(db, verified_user)
        await client.post(f"/api/v1/admin/orders/{order.id}/confirm", headers=admin_headers)

        [log] = await _logs(db)
        assert log.admin_id == admin_user.id
        assert log.admin_email == admin_user.email
        assert log.action == "order.confirm"
        assert log.target_type == "payment_order"
        assert log.target_id == str(order.id)
        assert log.payload == {
            "user_email": verified_user.email, "item": "plan:pro",
            "total_amount": 99123, "previous_status": "awaiting_verification",
        }

    async def test_reject_order(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        order = await _order(db, verified_user)
        await client.post(
            f"/api/v1/admin/orders/{order.id}/reject", headers=admin_headers, json={"reason": "Bukti buram"},
        )
        [log] = await _logs(db)
        assert log.action == "order.reject"
        assert log.payload["reason"] == "Bukti buram"
        assert log.payload["user_email"] == verified_user.email

    async def test_suspend_and_unsuspend_user(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, other_user: User,
    ):
        await client.post(f"/api/v1/admin/users/{other_user.id}/suspend", headers=admin_headers, json={"reason": "Spam"})
        await client.post(f"/api/v1/admin/users/{other_user.id}/unsuspend", headers=admin_headers)

        suspend, unsuspend = await _logs(db)
        assert (suspend.action, suspend.target_type, suspend.target_id) == ("user.suspend", "user", str(other_user.id))
        assert suspend.payload == {"email": other_user.email, "reason": "Spam"}
        assert unsuspend.action == "user.unsuspend"
        assert unsuspend.payload == {"email": other_user.email, "previous_reason": "Spam"}

    async def test_delete_user_survives_target_deletion(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, other_user: User,
    ):
        """Target sudah tidak ada di DB — log tetap menyimpan email-nya."""
        with patch.object(storage_service, "delete_user_files", return_value=0):
            res = await client.request(
                "DELETE", f"/api/v1/admin/users/{other_user.id}", headers=admin_headers,
                json={"confirm_email": other_user.email},
            )
        assert res.status_code == 200
        [log] = await _logs(db)
        assert log.action == "user.delete"
        assert log.target_id == str(other_user.id)
        assert log.payload == {"email": other_user.email, "role": "user"}

    async def test_failed_action_is_not_recorded(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        """Log ditulis dalam transaksi yang sama dengan aksinya — aksi ditolak = tidak ada log."""
        paid = await _order(db, verified_user, status="paid")
        res = await client.post(f"/api/v1/admin/orders/{paid.id}/confirm", headers=admin_headers)
        assert res.status_code == 422

        res = await client.post(f"/api/v1/admin/users/{uuid.uuid4()}/suspend", headers=admin_headers, json={"reason": "x"})
        assert res.status_code == 404

        assert await _logs(db) == []

    async def test_read_only_endpoints_are_not_recorded(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, verified_user: User,
    ):
        await client.get("/api/v1/admin/users", headers=admin_headers)
        await client.get(f"/api/v1/admin/users/{verified_user.id}", headers=admin_headers)
        await client.get("/api/v1/admin/orders", headers=admin_headers)
        assert await _logs(db) == []


# ── GET /admin/audit-logs ─────────────────────────────────────────────────

async def _log(db: AsyncSession, admin: User | None, action: str, created_at: datetime, **kw) -> AdminAuditLog:
    log = AdminAuditLog(
        id=uuid.uuid4(),
        admin_id=admin.id if admin else None,
        admin_email=admin.email if admin else kw.get("admin_email", "hapus@example.com"),
        action=action,
        target_type=kw.get("target_type", "user"),
        target_id=kw.get("target_id", str(uuid.uuid4())),
        payload=kw.get("payload", {}),
        created_at=created_at,
    )
    db.add(log)
    await db.commit()
    return log


class TestListAuditLogs:
    async def test_requires_admin(self, client: AsyncClient, auth_headers: dict):
        assert (await client.get(URL)).status_code == 401
        res = await client.get(URL, headers=auth_headers)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "ADMIN_FORBIDDEN"

    async def test_lists_newest_first(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, admin_user: User,
    ):
        now = datetime.now(timezone.utc)
        old = await _log(db, admin_user, "user.suspend", now - timedelta(days=1), payload={"email": "a@x.id"})
        new = await _log(db, admin_user, "order.confirm", now)

        res = await client.get(URL, headers=admin_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["total"] == 2
        assert [i["id"] for i in data["items"]] == [str(new.id), str(old.id)]
        item = data["items"][1]
        assert item["admin"] == {"id": str(admin_user.id), "email": admin_user.email}
        assert item["action"] == "user.suspend"
        assert item["target_type"] == "user"
        assert item["payload"] == {"email": "a@x.id"}

    async def test_deleted_admin_keeps_email_snapshot(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
    ):
        await _log(db, None, "user.delete", datetime.now(timezone.utc), admin_email="mantan@example.com")
        res = await client.get(URL, headers=admin_headers)
        assert res.json()["data"]["items"][0]["admin"] == {"id": None, "email": "mantan@example.com"}

    async def test_filter_by_admin(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        admin_user: User, superadmin_user: User,
    ):
        now = datetime.now(timezone.utc)
        mine = await _log(db, admin_user, "user.suspend", now)
        await _log(db, superadmin_user, "user.suspend", now)
        res = await client.get(f"{URL}?admin_id={admin_user.id}", headers=admin_headers)
        assert [i["id"] for i in res.json()["data"]["items"]] == [str(mine.id)]

    async def test_filter_by_action(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, admin_user: User,
    ):
        now = datetime.now(timezone.utc)
        c = await _log(db, admin_user, "order.confirm", now)
        await _log(db, admin_user, "user.delete", now)
        res = await client.get(f"{URL}?action=order.confirm", headers=admin_headers)
        assert [i["id"] for i in res.json()["data"]["items"]] == [str(c.id)]

    async def test_filter_by_date_range_inclusive(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, admin_user: User,
    ):
        d = lambda day, h=12: datetime(2026, 9, day, h, tzinfo=timezone.utc)  # noqa: E731
        await _log(db, admin_user, "user.suspend", d(9))
        first = await _log(db, admin_user, "user.suspend", d(10, 0))
        last = await _log(db, admin_user, "user.suspend", d(12, 23))
        await _log(db, admin_user, "user.suspend", d(13))

        res = await client.get(f"{URL}?date_from=2026-09-10&date_to=2026-09-12", headers=admin_headers)
        assert [i["id"] for i in res.json()["data"]["items"]] == [str(last.id), str(first.id)]

    async def test_response_lists_admins_for_filter(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict,
        admin_user: User, superadmin_user: User,
    ):
        now = datetime.now(timezone.utc)
        await _log(db, admin_user, "user.suspend", now)
        await _log(db, admin_user, "user.unsuspend", now)
        await _log(db, superadmin_user, "user.suspend", now)
        res = await client.get(f"{URL}?action=user.unsuspend", headers=admin_headers)
        # Daftar admin untuk dropdown tidak ikut terfilter — selalu semua yang pernah beraksi.
        assert sorted(a["email"] for a in res.json()["data"]["admins"]) == sorted(
            [admin_user.email, superadmin_user.email]
        )

    async def test_pagination(
        self, client: AsyncClient, db: AsyncSession, admin_headers: dict, admin_user: User,
    ):
        for _ in range(3):
            await _log(db, admin_user, "user.suspend", datetime.now(timezone.utc))
        res = await client.get(f"{URL}?limit=2&offset=2", headers=admin_headers)
        assert res.json()["data"]["total"] == 3
        assert len(res.json()["data"]["items"]) == 1

    async def test_invalid_filters_are_400(self, client: AsyncClient, admin_headers: dict):
        for qs in ("action=user.hack", "date_from=kemarin", "date_to=2026-13-01",
                   "date_from=2026-09-12&date_to=2026-09-10", "admin_id=bukan-uuid", "limit=0"):
            res = await client.get(f"{URL}?{qs}", headers=admin_headers)
            assert res.status_code == 400, qs
            assert res.json()["error"]["code"] == "VALIDATION_ERROR"

    async def test_no_write_endpoints(self, client: AsyncClient, admin_headers: dict):
        """Audit log hanya bisa dibaca — tidak ada cara mengubah/menghapus jejak dari API."""
        for method in ("POST", "PATCH", "PUT", "DELETE"):
            res = await client.request(method, URL, headers=admin_headers)
            assert res.status_code == 405, method


class TestRecordGuard:
    async def test_unknown_action_is_programming_error(self, db: AsyncSession, admin_user: User):
        """Salah ketik nama aksi harus meledak di test, bukan menghasilkan log yang tak bisa difilter."""
        import pytest

        from app.services import audit_service

        with pytest.raises(ValueError):
            audit_service.record(db, admin_user, "user.hapus", "user", "x", {})
