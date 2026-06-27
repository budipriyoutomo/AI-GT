"""
🔴 RED phase — test company profile endpoint.
"""
import pytest
from httpx import AsyncClient

from app.models import CompanyProfile, User


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
