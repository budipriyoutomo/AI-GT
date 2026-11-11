"""
P3-2 — Characterization test untuk alur gambar di generate_service.

Kode sudah ada sebelum test ini; test mengunci perilakunya yang sekarang:
unduh dari provider → upload R2, dan fallback ke URL mentah bila gagal
(AGENTS.md §5: kegagalan gambar tidak boleh menggagalkan alur).
"""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.services import ai_service, generate_service, storage_service

RAW = "https://replicate.delivery/out/abc.png"


def _http_client(content: bytes = b"PNG", fail: bool = False):
    """Ganti httpx.AsyncClient: `async with ... as client: await client.get(url)`."""
    resp = MagicMock(content=content)
    resp.raise_for_status.side_effect = (
        httpx.HTTPStatusError("404", request=MagicMock(), response=MagicMock()) if fail else None
    )
    client = MagicMock()
    client.get = AsyncMock(return_value=resp)
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=client)
    cm.__aexit__ = AsyncMock(return_value=None)
    return patch.object(generate_service.httpx, "AsyncClient", return_value=cm)


class TestPersistImage:
    async def test_uploads_to_temp(self):
        with _http_client(b"IMG"), patch.object(storage_service, "upload_temp", return_value="/temp/x.png") as up:
            assert await generate_service._persist_image(RAW, "sess-1") == "/temp/x.png"
        up.assert_called_once_with(b"IMG", "sess-1")

    async def test_download_failure_falls_back_to_raw_url(self):
        with _http_client(fail=True), patch.object(storage_service, "upload_temp") as up:
            assert await generate_service._persist_image(RAW, "sess-1") == RAW
        up.assert_not_called()

    async def test_upload_failure_falls_back_to_raw_url(self):
        with _http_client(), patch.object(storage_service, "upload_temp", side_effect=RuntimeError("R2 down")):
            assert await generate_service._persist_image(RAW, "sess-1") == RAW


class TestPersistImagePermanent:
    async def test_uploads_to_permanent(self):
        with _http_client(b"IMG"), patch.object(
            storage_service, "upload_permanent_thematic", return_value="/permanent/thematic-images/u/p.png",
        ) as up:
            got = await generate_service._persist_image_permanent(RAW, "u", "p")
        assert got == "/permanent/thematic-images/u/p.png"
        up.assert_called_once_with(b"IMG", "u", "p")

    async def test_failure_falls_back_to_raw_url(self):
        with _http_client(fail=True):
            assert await generate_service._persist_image_permanent(RAW, "u", "p") == RAW


class TestResolveThematicImage:
    async def test_none_stays_none(self):
        assert await generate_service._resolve_thematic_image(None, "u", "p") is None

    async def test_temp_is_moved_to_permanent(self):
        with patch.object(storage_service, "move_to_permanent", return_value="/permanent/thematic-images/u/p.png") as mv:
            got = await generate_service._resolve_thematic_image("/temp/thematic-images/s/1.png", "u", "p")
        assert got == "/permanent/thematic-images/u/p.png"
        mv.assert_called_once_with("temp/thematic-images/s/1.png", "u", "p")

    async def test_permanent_is_returned_as_is(self):
        url = "/permanent/thematic-images/u/p.png"
        with patch.object(storage_service, "move_to_permanent") as mv:
            assert await generate_service._resolve_thematic_image(url, "u", "p") == url
        mv.assert_not_called()

    async def test_external_url_is_persisted(self):
        with patch.object(generate_service, "_persist_image_permanent", new=AsyncMock(return_value="/permanent/x.png")):
            assert await generate_service._resolve_thematic_image(RAW, "u", "p") == "/permanent/x.png"

    async def test_move_failure_keeps_original_url(self):
        url = "/temp/thematic-images/s/1.png"
        with patch.object(storage_service, "move_to_permanent", side_effect=RuntimeError("R2 down")):
            assert await generate_service._resolve_thematic_image(url, "u", "p") == url


class TestRegenerateProjectImage:
    async def test_provider_returns_nothing(self, db: AsyncSession, verified_user, project: Project):
        with patch.object(ai_service, "generate_single_image", new=AsyncMock(return_value=None)):
            got = await generate_service.regenerate_project_image(db, verified_user.id, project.id, "kopi")
        assert got is None

    async def test_success_updates_project_config(self, db: AsyncSession, verified_user, project: Project):
        with patch.object(ai_service, "generate_single_image", new=AsyncMock(return_value=RAW)), \
             _http_client(b"IMG"), \
             patch.object(storage_service, "upload_permanent_thematic", return_value="/permanent/thematic-images/u/p.png"):
            got = await generate_service.regenerate_project_image(db, verified_user.id, project.id, "kopi")
        assert got == "/permanent/thematic-images/u/p.png"
        await db.refresh(project)
        assert project.final_config["thematic_image_url"] == got
        # Field lain final_config tidak tersentuh.
        assert project.final_config["copy"]["headline"] == "Judul 1"

    async def test_upload_failure_uses_raw_url(self, db: AsyncSession, verified_user, project: Project):
        with patch.object(ai_service, "generate_single_image", new=AsyncMock(return_value=RAW)), \
             _http_client(fail=True):
            got = await generate_service.regenerate_project_image(db, verified_user.id, project.id, "kopi")
        assert got == RAW
        await db.refresh(project)
        assert project.final_config["thematic_image_url"] == RAW

    async def test_other_users_project_is_not_touched(
        self, db: AsyncSession, other_user, project: Project,
    ):
        before = dict(project.final_config)
        with patch.object(ai_service, "generate_single_image", new=AsyncMock(return_value=RAW)), \
             _http_client(fail=True):
            await generate_service.regenerate_project_image(db, other_user.id, project.id, "kopi")
        await db.refresh(project)
        assert project.final_config == before


class TestRunGenerationTask:
    async def test_opens_own_session(self):
        fake_db = MagicMock()
        cm = MagicMock()
        cm.__aenter__ = AsyncMock(return_value=fake_db)
        cm.__aexit__ = AsyncMock(return_value=None)
        sid = uuid.uuid4()
        with patch("app.database.AsyncSessionLocal", return_value=cm), \
             patch.object(generate_service, "_do_generate", new=AsyncMock()) as do:
            await generate_service.run_generation_task(sid)
        do.assert_awaited_once_with(fake_db, sid)


@pytest.fixture(autouse=True)
def _no_real_network():
    """Jaga-jaga: test di file ini tidak boleh menyentuh jaringan sungguhan."""
    with patch.object(httpx.AsyncClient, "send", side_effect=AssertionError("network call")):
        yield
