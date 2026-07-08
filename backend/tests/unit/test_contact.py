"""
🔴 RED phase — test contact message endpoint (public, tanpa auth).
"""
from httpx import AsyncClient


class TestCreateContactMessage:
    async def test_create_success(self, client: AsyncClient):
        res = await client.post("/api/v1/contact", json={
            "name": "Budi",
            "email": "budi@example.com",
            "category": "support",
            "message": "Halo, saya butuh bantuan soal export PNG.",
        })
        assert res.status_code == 201
        body = res.json()
        assert body["success"] is True
        assert "id" in body["data"]
        assert body["data"]["email"] == "budi@example.com"
        assert body["data"]["category"] == "support"

    async def test_create_without_category(self, client: AsyncClient):
        res = await client.post("/api/v1/contact", json={
            "name": "Sari",
            "email": "sari@example.com",
            "message": "Pertanyaan umum tentang paket.",
        })
        assert res.status_code == 201
        assert res.json()["data"]["category"] is None

    async def test_create_missing_message(self, client: AsyncClient):
        res = await client.post("/api/v1/contact", json={
            "name": "Budi",
            "email": "budi@example.com",
        })
        assert res.status_code == 422

    async def test_create_invalid_email(self, client: AsyncClient):
        res = await client.post("/api/v1/contact", json={
            "name": "Budi",
            "email": "bukan-email",
            "message": "Halo.",
        })
        assert res.status_code == 422

    async def test_create_blank_message(self, client: AsyncClient):
        res = await client.post("/api/v1/contact", json={
            "name": "Budi",
            "email": "budi@example.com",
            "message": "   ",
        })
        assert res.status_code == 422
