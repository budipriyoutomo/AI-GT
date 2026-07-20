"""
🔴 RED phase — test company profile endpoint.
"""
from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient
from PIL import Image

from app.models import CompanyProfile, User
from app.services import storage_service


def _png_bytes() -> bytes:
    buf = BytesIO()
    Image.new("RGBA", (100, 100), (255, 0, 0, 255)).save(buf, format="PNG")
    return buf.getvalue()


def _mock_storage_settings():
    s = MagicMock()
    s.cloudflare_r2_bucket_name = "ai-gt-bucket"
    s.cloudflare_r2_account_id = "test-account-id"
    s.cloudflare_r2_access_key = "key"
    s.cloudflare_r2_secret_key = "secret"
    return s


class TestGetProfile:
    async def test_get_profile_success(
        self, client: AsyncClient, auth_headers: dict, company_profile: CompanyProfile
    ):
        res = await client.get("/api/v1/company-profile", headers=auth_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["business_name"] == "Toko Budi"
        assert body["data"]["industry"] == "fnb"
        assert body["data"]["brand_colors"] == ["#FF5733", "#FFC300"]

    async def test_get_profile_not_found(self, client: AsyncClient, auth_headers: dict):
        res = await client.get("/api/v1/company-profile", headers=auth_headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "PROFILE_NOT_FOUND"

    async def test_get_profile_no_auth(self, client: AsyncClient):
        res = await client.get("/api/v1/company-profile")
        assert res.status_code == 401


class TestCreateProfile:
    async def test_create_profile_success(self, client: AsyncClient, auth_headers: dict):
        res = await client.post("/api/v1/company-profile", headers=auth_headers, json={
            "business_name": "Warung Makan Enak",
            "industry": "fnb",
            "language_preference": "id",
            "brand_colors": ["#FF0000"],
        })
        assert res.status_code == 201
        body = res.json()
        assert body["success"] is True
        assert body["data"]["business_name"] == "Warung Makan Enak"
        assert body["data"]["industry"] == "fnb"
        assert body["data"]["brand_colors"] == ["#FF0000"]

    async def test_create_profile_with_new_fields(self, client: AsyncClient, auth_headers: dict):
        res = await client.post("/api/v1/company-profile", headers=auth_headers, json={
            "business_name": "Brand Lengkap",
            "industry": "retail",
            "brand_colors": ["#111111", "#222222"],
            "brand_font": "Inter",
            "tagline": "Kualitas terbaik",
            "contact": {
                "website": "www.brandlengkap.com",
                "phone": "08123456789",
                "instagram": "@brandlengkap",
                "tiktok": "",
                "youtube": "",
                "hashtag": "#brandlengkap",
            },
        })
        assert res.status_code == 201
        body = res.json()
        assert body["data"]["brand_colors"] == ["#111111", "#222222"]
        assert body["data"]["brand_font"] == "Inter"
        assert body["data"]["tagline"] == "Kualitas terbaik"
        assert body["data"]["contact"]["instagram"] == "@brandlengkap"

    async def test_create_profile_with_address(self, client: AsyncClient, auth_headers: dict):
        res = await client.post("/api/v1/company-profile", headers=auth_headers, json={
            "business_name": "Brand Beralamat",
            "industry": "retail",
            "address": "Jl. Merdeka No. 12, Bandung",
        })
        assert res.status_code == 201
        assert res.json()["data"]["address"] == "Jl. Merdeka No. 12, Bandung"

    async def test_create_profile_contact_whatsapp_facebook(
        self, client: AsyncClient, auth_headers: dict
    ):
        # Slot footer `whatsapp`/`facebook` dideklarasikan template tapi belum punya field
        # di ContactInfo — tanpa ini slot-nya tergambar sebagai ikon tanpa teks.
        res = await client.post("/api/v1/company-profile", headers=auth_headers, json={
            "business_name": "Brand Sosmed",
            "industry": "retail",
            "contact": {"whatsapp": "08123456789", "facebook": "brandsosmed"},
        })
        assert res.status_code == 201
        contact = res.json()["data"]["contact"]
        assert contact["whatsapp"] == "08123456789"
        assert contact["facebook"] == "brandsosmed"

    async def test_create_profile_duplicate(
        self, client: AsyncClient, auth_headers: dict, company_profile: CompanyProfile
    ):
        res = await client.post("/api/v1/company-profile", headers=auth_headers, json={
            "business_name": "Duplikat",
            "industry": "retail",
        })
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "PROFILE_NOT_FOUND"

    async def test_create_profile_missing_required(self, client: AsyncClient, auth_headers: dict):
        res = await client.post("/api/v1/company-profile", headers=auth_headers, json={
            "business_name": "Tanpa Industri",
        })
        assert res.status_code == 422

    async def test_create_profile_no_auth(self, client: AsyncClient):
        res = await client.post("/api/v1/company-profile", json={
            "business_name": "Test", "industry": "fnb"
        })
        assert res.status_code == 401


class TestUpdateProfile:
    async def test_update_profile_success(
        self, client: AsyncClient, auth_headers: dict, company_profile: CompanyProfile
    ):
        res = await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "business_name": "Toko Budi Updated",
            "brand_colors": ["#000000"],
        })
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["business_name"] == "Toko Budi Updated"
        assert body["data"]["brand_colors"] == ["#000000"]
        assert body["data"]["industry"] == "fnb"

    async def test_update_profile_new_fields(
        self, client: AsyncClient, auth_headers: dict, company_profile: CompanyProfile
    ):
        res = await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "tagline": "Tagline baru",
            "brand_font": "Poppins",
        })
        assert res.status_code == 200
        body = res.json()
        assert body["data"]["tagline"] == "Tagline baru"
        assert body["data"]["brand_font"] == "Poppins"

    async def test_update_profile_not_found(self, client: AsyncClient, auth_headers: dict):
        res = await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "business_name": "Ghost Update",
        })
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "PROFILE_NOT_FOUND"

    async def test_update_profile_no_auth(self, client: AsyncClient):
        res = await client.patch("/api/v1/company-profile", json={"business_name": "X"})
        assert res.status_code == 401


class TestUpdateProfileAddress:
    async def test_update_profile_address(
        self, client: AsyncClient, auth_headers: dict, company_profile: CompanyProfile
    ):
        res = await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "address": "Jl. Asia Afrika No. 1, Bandung",
        })
        assert res.status_code == 200
        assert res.json()["data"]["address"] == "Jl. Asia Afrika No. 1, Bandung"

    async def test_absent_address_key_leaves_existing_address_unchanged(
        self, client: AsyncClient, auth_headers: dict, company_profile: CompanyProfile
    ):
        await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "address": "Jl. Braga No. 5",
        })
        res = await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "tagline": "Tagline saja",
        })
        assert res.status_code == 200
        assert res.json()["data"]["address"] == "Jl. Braga No. 5"


class TestUpdateProfileLogoTriState:
    """logo_url absen (key hilang dari body) harus dibedakan dari logo_url: null
    (dihapus eksplisit) — lihat handoff upload-company-logo.md §4.3b."""

    async def test_absent_logo_key_leaves_existing_logo_unchanged(
        self, client: AsyncClient, auth_headers: dict, company_profile: CompanyProfile
    ):
        seed = await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "logo_url": "/permanent/logos/u1/logo.png?v=1",
        })
        assert seed.json()["data"]["logo_url"] == "/permanent/logos/u1/logo.png?v=1"

        res = await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "business_name": "Tetap Ada Logo",
        })
        assert res.status_code == 200
        assert res.json()["data"]["logo_url"] == "/permanent/logos/u1/logo.png?v=1"

    async def test_explicit_logo_url_null_clears_logo(
        self, client: AsyncClient, auth_headers: dict, company_profile: CompanyProfile
    ):
        seed = await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "logo_url": "/permanent/logos/u1/logo.png?v=1",
        })
        assert seed.json()["data"]["logo_url"] == "/permanent/logos/u1/logo.png?v=1"

        res = await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "logo_url": None,
        })
        assert res.status_code == 200
        assert res.json()["data"]["logo_url"] is None

    async def test_new_logo_url_replaces_previous_value_and_version(
        self, client: AsyncClient, auth_headers: dict, company_profile: CompanyProfile
    ):
        await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "logo_url": "/permanent/logos/u1/logo.png?v=1",
        })
        res = await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "logo_url": "/permanent/logos/u1/logo.png?v=2",
        })
        assert res.status_code == 200
        assert res.json()["data"]["logo_url"] == "/permanent/logos/u1/logo.png?v=2"

    async def test_get_after_logo_deleted_returns_null(
        self, client: AsyncClient, auth_headers: dict, company_profile: CompanyProfile
    ):
        await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "logo_url": "/permanent/logos/u1/logo.png?v=1",
        })
        await client.patch("/api/v1/company-profile", headers=auth_headers, json={
            "logo_url": None,
        })

        res = await client.get("/api/v1/company-profile", headers=auth_headers)
        assert res.json()["data"]["logo_url"] is None


class TestUploadLogo:
    async def test_upload_logo_success(self, client: AsyncClient, auth_headers: dict):
        mock_client = MagicMock()
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                res = await client.post(
                    "/api/v1/company-profile/logo",
                    headers=auth_headers,
                    files={"file": ("logo.png", _png_bytes(), "image/png")},
                )
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["logo_url"].startswith("/permanent/logos/")
        assert "?v=" in body["data"]["logo_url"]

    async def test_upload_logo_no_auth(self, client: AsyncClient):
        res = await client.post(
            "/api/v1/company-profile/logo",
            files={"file": ("logo.png", _png_bytes(), "image/png")},
        )
        assert res.status_code == 401

    async def test_upload_logo_file_too_large(self, client: AsyncClient, auth_headers: dict):
        oversized = _png_bytes() + b"\x00" * (2 * 1024 * 1024)
        res = await client.post(
            "/api/v1/company-profile/logo",
            headers=auth_headers,
            files={"file": ("logo.png", oversized, "image/png")},
        )
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "FILE_TOO_LARGE"

    async def test_upload_logo_invalid_file_type(self, client: AsyncClient, auth_headers: dict):
        res = await client.post(
            "/api/v1/company-profile/logo",
            headers=auth_headers,
            files={"file": ("logo.txt", b"not an image", "text/plain")},
        )
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "INVALID_FILE_TYPE"

    async def test_upload_logo_storage_failure(self, client: AsyncClient, auth_headers: dict):
        mock_client = MagicMock()
        mock_client.put_object.side_effect = Exception("R2 unreachable")
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                res = await client.post(
                    "/api/v1/company-profile/logo",
                    headers=auth_headers,
                    files={"file": ("logo.png", _png_bytes(), "image/png")},
                )
        assert res.status_code == 500
        assert res.json()["error"]["code"] == "STORAGE_UPLOAD_FAILED"

    async def test_upload_logo_does_not_touch_db(
        self, client: AsyncClient, auth_headers: dict, company_profile: CompanyProfile
    ):
        mock_client = MagicMock()
        with patch.object(storage_service, "_get_client", return_value=mock_client):
            with patch.object(storage_service, "settings", _mock_storage_settings()):
                res = await client.post(
                    "/api/v1/company-profile/logo",
                    headers=auth_headers,
                    files={"file": ("logo.png", _png_bytes(), "image/png")},
                )
        assert res.status_code == 200

        get_res = await client.get("/api/v1/company-profile", headers=auth_headers)
        assert get_res.json()["data"]["logo_url"] is None
