"""
Integration: logo upload → profile create/update round-trip through R2 (mocked) + DB (real sqlite).
"""
from io import BytesIO
from unittest.mock import MagicMock, patch

from httpx import AsyncClient
from PIL import Image

from app.services import storage_service


def _png_bytes() -> bytes:
    buf = BytesIO()
    Image.new("RGBA", (100, 100), (0, 255, 0, 255)).save(buf, format="PNG")
    return buf.getvalue()


def _mock_storage_settings():
    s = MagicMock()
    s.cloudflare_r2_bucket_name = "ai-gt-bucket"
    s.cloudflare_r2_account_id = "test-account-id"
    s.cloudflare_r2_access_key = "key"
    s.cloudflare_r2_secret_key = "secret"
    return s


async def _upload_logo(client: AsyncClient, auth_headers: dict, at_time: float = 1_700_000_000.0) -> str:
    """`at_time` pins the `?v=` cache-busting version — callers uploading twice in the same
    test pass distinct values so the two versions are guaranteed different, not just
    probably different (real time.time() could tick the same integer second twice)."""
    mock_client = MagicMock()
    with patch.object(storage_service, "_get_client", return_value=mock_client):
        with patch.object(storage_service, "settings", _mock_storage_settings()):
            with patch.object(storage_service.time, "time", return_value=at_time):
                res = await client.post(
                    "/api/v1/company-profile/logo",
                    headers=auth_headers,
                    files={"file": ("logo.png", _png_bytes(), "image/png")},
                )
    assert res.status_code == 200
    return res.json()["data"]["logo_url"]


class TestLogoUploadThenCreateProfile:
    async def test_upload_then_create_persists_logo_url_with_query_intact(
        self, client: AsyncClient, auth_headers: dict
    ):
        logo_url = await _upload_logo(client, auth_headers)
        assert "?v=" in logo_url

        create_res = await client.post(
            "/api/v1/company-profile",
            headers=auth_headers,
            json={"business_name": "Toko Baru", "industry": "fnb", "logo_url": logo_url},
        )
        assert create_res.status_code == 201
        assert create_res.json()["data"]["logo_url"] == logo_url

        get_res = await client.get("/api/v1/company-profile", headers=auth_headers)
        assert get_res.status_code == 200
        assert get_res.json()["data"]["logo_url"] == logo_url


class TestLogoUploadThenPatchProfile:
    async def test_upload_then_patch_changes_logo_url_and_version(
        self, client: AsyncClient, auth_headers: dict, company_profile
    ):
        first_logo_url = await _upload_logo(client, auth_headers, at_time=1_700_000_000.0)
        patch_res = await client.patch(
            "/api/v1/company-profile",
            headers=auth_headers,
            json={"logo_url": first_logo_url},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["data"]["logo_url"] == first_logo_url

        second_logo_url = await _upload_logo(client, auth_headers, at_time=1_700_000_100.0)
        assert second_logo_url != first_logo_url

        patch_res2 = await client.patch(
            "/api/v1/company-profile",
            headers=auth_headers,
            json={"logo_url": second_logo_url},
        )
        assert patch_res2.status_code == 200
        assert patch_res2.json()["data"]["logo_url"] == second_logo_url
        assert patch_res2.json()["data"]["logo_url"] != first_logo_url
