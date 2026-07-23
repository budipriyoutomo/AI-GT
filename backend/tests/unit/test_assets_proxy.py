"""Proxy aset ber-CORS.

CDN publik tidak mengirim header CORS, jadi canvas Fabric harus memuat gambar
lewat origin backend agar `crossOrigin="anonymous"` berhasil dan canvas tidak
ter-taint — tanpa itu gambar user hilang dari PNG hasil export.
"""
from io import BytesIO
from unittest.mock import MagicMock, patch

from httpx import AsyncClient
from PIL import Image

from app.services import storage_service


def _png_bytes() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (40, 40), (10, 20, 30)).save(buf, format="PNG")
    return buf.getvalue()


def _mock_storage_settings():
    s = MagicMock()
    s.cloudflare_r2_bucket_name = "ai-gt-bucket"
    s.cloudflare_r2_account_id = "test-account-id"
    s.cloudflare_r2_access_key = "key"
    s.cloudflare_r2_secret_key = "secret"
    return s


def _r2_client_returning(body: bytes, content_type: str = "image/png"):
    client = MagicMock()
    client.get_object.return_value = {
        "Body": MagicMock(read=MagicMock(return_value=body)),
        "ContentType": content_type,
    }
    return client


class TestGetObject:
    def test_returns_body_and_content_type(self):
        with patch.object(storage_service, "_get_client", return_value=_r2_client_returning(_png_bytes())):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                data, content_type = storage_service.get_object("permanent/uploads/u1/a.png")
        assert data == _png_bytes()
        assert content_type == "image/png"

    def test_missing_object_returns_none(self):
        client = MagicMock()
        client.get_object.side_effect = Exception("NoSuchKey")
        with patch.object(storage_service, "_get_client", return_value=client):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                assert storage_service.get_object("permanent/uploads/u1/missing.png") is None


class TestAssetProxyEndpoint:
    URL = "/api/v1/assets"

    async def test_serves_object_with_cors_header(self, client: AsyncClient):
        with patch.object(storage_service, "_get_client", return_value=_r2_client_returning(_png_bytes())):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                res = await client.get(
                    f"{self.URL}/permanent/uploads/u1/a.png",
                    headers={"Origin": "http://localhost:3000"},
                )
        assert res.status_code == 200
        assert res.content == _png_bytes()
        assert res.headers["content-type"] == "image/png"
        # Tanpa header ini canvas ter-taint dan export kehilangan gambar.
        assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"

    async def test_is_public_no_auth_required(self, client: AsyncClient):
        """Dipanggil oleh <img>/Image() yang tidak bisa mengirim Authorization header."""
        with patch.object(storage_service, "_get_client", return_value=_r2_client_returning(_png_bytes())):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                res = await client.get(f"{self.URL}/permanent/uploads/u1/a.png")
        assert res.status_code == 200

    async def test_sets_long_cache_header(self, client: AsyncClient):
        with patch.object(storage_service, "_get_client", return_value=_r2_client_returning(_png_bytes())):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                res = await client.get(f"{self.URL}/permanent/uploads/u1/a.png")
        assert "max-age" in res.headers.get("cache-control", "")

    async def test_missing_object_returns_404(self, client: AsyncClient):
        r2 = MagicMock()
        r2.get_object.side_effect = Exception("NoSuchKey")
        with patch.object(storage_service, "_get_client", return_value=r2):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                res = await client.get(f"{self.URL}/permanent/uploads/u1/missing.png")
        assert res.status_code == 404

    async def test_rejects_key_outside_known_prefixes(self, client: AsyncClient):
        """Proxy tidak boleh jadi pembaca bebas seluruh bucket."""
        res = await client.get(f"{self.URL}/secrets/config.json")
        assert res.status_code == 404

    async def test_rejects_path_traversal(self, client: AsyncClient):
        res = await client.get(f"{self.URL}/permanent/../secrets/config.json")
        assert res.status_code in (307, 404)
