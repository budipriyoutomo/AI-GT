"""
Test cleanup_service._do_cleanup — gunakan DB session test, mock R2 delete.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import cleanup_service


async def _seed_expired_session(db: AsyncSession, image_url: str) -> None:
    from app.models.generate_session import GenerateSession
    from app.models.generate_variant import GenerateVariant
    from app.models.template import Template
    from app.models.user import User
    from app.services.auth_service import get_auth_provider

    provider = get_auth_provider()
    suffix = uuid.uuid4().hex[:8]

    user = User(
        id=uuid.uuid4(),
        email=f"cleanup_{suffix}@example.com",
        password_hash=provider.hash_password("pass"),
        name="Cleanup User",
        is_verified=True,
    )
    db.add(user)

    template = Template(
        id=uuid.uuid4(),
        name=f"T_{suffix}",
        industry="fnb",
        theme="promo",
        content_type="single",
        thumbnail_url="https://r2.example.com/t.png",
        template_config={},
        is_active=True,
    )
    db.add(template)
    await db.flush()

    session = GenerateSession(
        id=uuid.uuid4(),
        user_id=user.id,
        template_id=template.id,
        language_style="casual",
        status="processing",
        expires_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    db.add(session)
    await db.flush()

    variant = GenerateVariant(
        id=uuid.uuid4(),
        session_id=session.id,
        variant_number=1,
        copy_data={},
        typography_data={},
        thematic_image_url=image_url,
    )
    db.add(variant)
    await db.commit()


class TestDoCleanup:
    async def test_cleanup_deletes_temp_files(self, db: AsyncSession):
        """Session expired dengan temp image → file dihapus dari R2."""
        await _seed_expired_session(
            db,
            "https://ai-gt-bucket.account.r2.cloudflarestorage.com/temp/thematic-images/sess/123.png",
        )

        deleted_keys: list[str] = []

        def mock_delete(key: str) -> None:
            deleted_keys.append(key)

        with patch.object(cleanup_service.storage_service, "delete_file", side_effect=mock_delete):
            count = await cleanup_service._do_cleanup(db)

        assert count == 1
        assert any("temp/thematic-images" in k for k in deleted_keys)

    async def test_cleanup_skips_permanent_files(self, db: AsyncSession):
        """Variant dengan permanent URL tidak dihapus."""
        await _seed_expired_session(
            db,
            "https://ai-gt-bucket.account.r2.cloudflarestorage.com/permanent/thematic-images/uid/pid.png",
        )

        delete_mock = MagicMock()
        with patch.object(cleanup_service.storage_service, "delete_file", delete_mock):
            count = await cleanup_service._do_cleanup(db)

        assert count == 0
        delete_mock.assert_not_called()

    async def test_cleanup_no_expired_sessions(self, db: AsyncSession):
        """Tidak ada session expired → tidak ada yang dihapus."""
        delete_mock = MagicMock()
        with patch.object(cleanup_service.storage_service, "delete_file", delete_mock):
            count = await cleanup_service._do_cleanup(db)

        assert count == 0
        delete_mock.assert_not_called()
