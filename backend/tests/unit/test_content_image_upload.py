"""Upload gambar konten user (image_source = "upload").

Gambar user diperlakukan sebagai aset permanen milik user — bukan temp per-session —
karena dipakai lintas session dan tidak dihasilkan AI.
"""
from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient
from PIL import Image

from app.services import storage_service
from app.utils.exceptions import AppError


def _png_bytes(size: tuple[int, int] = (100, 100)) -> bytes:
    buf = BytesIO()
    Image.new("RGBA", size, (255, 0, 0, 255)).save(buf, format="PNG")
    return buf.getvalue()


def _mock_storage_settings():
    s = MagicMock()
    s.cloudflare_r2_bucket_name = "ai-gt-bucket"
    s.cloudflare_r2_account_id = "test-account-id"
    s.cloudflare_r2_access_key = "key"
    s.cloudflare_r2_secret_key = "secret"
    return s


class TestNormalizeContentImage:
    def test_keeps_image_under_max_dimension_untouched_in_size(self):
        from app.utils.images import normalize_content_image

        out = normalize_content_image(_png_bytes((800, 600)))
        assert Image.open(BytesIO(out)).size == (800, 600)

    def test_downscales_oversized_image(self):
        from app.utils.images import MAX_CONTENT_DIMENSION, normalize_content_image

        out = normalize_content_image(_png_bytes((4000, 2000)))
        assert max(Image.open(BytesIO(out)).size) == MAX_CONTENT_DIMENSION

    def test_rejects_file_over_5mb(self):
        from app.utils.images import normalize_content_image

        with pytest.raises(AppError) as exc:
            normalize_content_image(_png_bytes() + b"\x00" * (6 * 1024 * 1024))
        assert exc.value.code == "FILE_TOO_LARGE"

    def test_rejects_non_image_bytes(self):
        from app.utils.images import normalize_content_image

        with pytest.raises(AppError) as exc:
            normalize_content_image(b"not an image at all")
        assert exc.value.code == "INVALID_FILE_TYPE"


class TestUploadContentImageStorage:
    def test_uploads_under_user_scoped_permanent_key(self):
        mock_client = MagicMock()
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                url = storage_service.upload_content_image("user-1", _png_bytes())

        assert url.startswith("/permanent/uploads/user-1/")
        assert url.endswith(".png")

    def test_distinct_uploads_do_not_overwrite_each_other(self):
        mock_client = MagicMock()
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                a = storage_service.upload_content_image("user-1", _png_bytes())
                b = storage_service.upload_content_image("user-1", _png_bytes())
        assert a != b

    def test_storage_failure_maps_to_storage_upload_failed(self):
        mock_client = MagicMock()
        mock_client.put_object.side_effect = Exception("boom")
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                with pytest.raises(AppError) as exc:
                    storage_service.upload_content_image("user-1", _png_bytes())
        assert exc.value.code == "STORAGE_UPLOAD_FAILED"


class TestUploadContentImageEndpoint:
    URL = "/api/v1/generate/upload-image"

    async def test_success_returns_image_url(self, client: AsyncClient, auth_headers: dict):
        mock_client = MagicMock()
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                res = await client.post(
                    self.URL,
                    headers=auth_headers,
                    files={"file": ("foto.png", _png_bytes(), "image/png")},
                )
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["image_url"].startswith("/permanent/uploads/")

    async def test_no_auth(self, client: AsyncClient):
        res = await client.post(self.URL, files={"file": ("foto.png", _png_bytes(), "image/png")})
        assert res.status_code == 401

    async def test_file_too_large(self, client: AsyncClient, auth_headers: dict):
        oversized = _png_bytes() + b"\x00" * (6 * 1024 * 1024)
        res = await client.post(
            self.URL, headers=auth_headers, files={"file": ("foto.png", oversized, "image/png")}
        )
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "FILE_TOO_LARGE"

    async def test_invalid_file_type(self, client: AsyncClient, auth_headers: dict):
        res = await client.post(
            self.URL, headers=auth_headers, files={"file": ("x.txt", b"nope", "text/plain")}
        )
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "INVALID_FILE_TYPE"

    async def test_storage_failure(self, client: AsyncClient, auth_headers: dict):
        mock_client = MagicMock()
        mock_client.put_object.side_effect = Exception("boom")
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                res = await client.post(
                    self.URL,
                    headers=auth_headers,
                    files={"file": ("foto.png", _png_bytes(), "image/png")},
                )
        assert res.status_code == 500
        assert res.json()["error"]["code"] == "STORAGE_UPLOAD_FAILED"
