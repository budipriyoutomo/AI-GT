"""
scripts/confirm_payment.py — jalur darurat CLI wajib tercatat di audit log (A-9).
🔴 RED phase: ditulis sebelum script meminta identitas admin.
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_audit_log import AdminAuditLog
from app.models.payment_order import PaymentOrder
from app.models.user import User
from scripts import confirm_payment


async def _order(db: AsyncSession, user: User, status: str) -> PaymentOrder:
    order = PaymentOrder(
        id=uuid.uuid4(),
        user_id=user.id,
        kind="plan",
        item_id="pro",
        amount=99000,
        unique_code=123,
        total_amount=99123,
        status=status,
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


class TestConfirmPaymentScript:
    async def test_records_audit_and_reviewer(
        self, db: AsyncSession, admin_user: User, verified_user: User,
    ):
        order = await _order(db, verified_user, "awaiting_verification")
        await confirm_payment.confirm(db, str(order.id), admin_user.email)

        await db.refresh(order)
        assert order.status == "paid"
        assert order.reviewed_by == admin_user.id
        assert order.reviewed_at is not None

        log = await db.scalar(select(AdminAuditLog).where(AdminAuditLog.target_id == str(order.id)))
        assert log.action == "order.confirm"
        assert log.admin_id == admin_user.id
        assert log.payload["via"] == "cli"
        assert log.payload["previous_status"] == "awaiting_verification"

    async def test_emergency_path_still_confirms_any_status(
        self, db: AsyncSession, admin_user: User, verified_user: User,
    ):
        """Jalur darurat sengaja tanpa guard status — tapi tetap tercatat."""
        order = await _order(db, verified_user, "expired")
        await confirm_payment.confirm(db, str(order.id), admin_user.email)

        await db.refresh(order)
        assert order.status == "paid"
        log = await db.scalar(select(AdminAuditLog).where(AdminAuditLog.target_id == str(order.id)))
        assert log.payload["previous_status"] == "expired"

    async def test_regular_user_rejected(self, db: AsyncSession, verified_user: User):
        order = await _order(db, verified_user, "awaiting_verification")
        with pytest.raises(SystemExit):
            await confirm_payment.confirm(db, str(order.id), verified_user.email)

        await db.refresh(order)
        assert order.status == "awaiting_verification"
        assert await db.scalar(select(AdminAuditLog)) is None

    async def test_unknown_email_rejected(self, db: AsyncSession, verified_user: User):
        order = await _order(db, verified_user, "awaiting_verification")
        with pytest.raises(SystemExit):
            await confirm_payment.confirm(db, str(order.id), "nobody@example.com")

        await db.refresh(order)
        assert order.status == "awaiting_verification"

    def test_confirm_without_admin_flag_prints_usage(self, monkeypatch, capsys):
        monkeypatch.setattr("sys.argv", ["confirm_payment.py", str(uuid.uuid4())])
        with pytest.raises(SystemExit):
            confirm_payment.main()
        assert "--admin" in capsys.readouterr().out
