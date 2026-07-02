"""
Tests untuk templates endpoint.

List endpoint mengembalikan template_config penuh (element-based) agar galeri bisa
live-render. Tidak ada lagi transformasi preview_config.
"""
import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Template


# ---------------------------------------------------------------------------
# Endpoint tests — GET /api/v1/templates
# ---------------------------------------------------------------------------

class TestListTemplates:
    async def test_list_templates_success(
        self, client: AsyncClient, auth_headers: dict, sample_template: Template
    ):
        res = await client.get("/api/v1/templates", headers=auth_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert len(body["data"]) == 1
        assert body["data"][0]["name"] == "Template Lebaran FnB"

    async def test_list_includes_template_config(
        self, client: AsyncClient, auth_headers: dict, sample_template: Template
    ):
        """Response list menyertakan template_config penuh, bukan preview_config lama."""
        res = await client.get("/api/v1/templates", headers=auth_headers)
        item = res.json()["data"][0]
        assert "template_config" in item
        assert "preview_config" not in item

    async def test_list_template_config_passthrough(
        self, client: AsyncClient, auth_headers: dict, sample_template: Template
    ):
        """template_config dikirim apa adanya (color_scheme & font ikut)."""
        res = await client.get("/api/v1/templates", headers=auth_headers)
        tc = res.json()["data"][0]["template_config"]
        assert tc["color_scheme"]["accent"] == "#FFD700"
        assert tc["font"]["family"] == "Inter"

    async def test_list_includes_background_url(
        self, client: AsyncClient, auth_headers: dict, sample_template: Template
    ):
        """Response list menyertakan background_url (image latar terpisah dari foreground)."""
        res = await client.get("/api/v1/templates", headers=auth_headers)
        item = res.json()["data"][0]
        assert item["background_url"] == sample_template.background_url

    async def test_list_templates_filter_industry(
        self, client: AsyncClient, auth_headers: dict, db: AsyncSession, sample_template: Template
    ):
        other = Template(
            id=uuid.uuid4(),
            name="Template Retail",
            industry="retail",
            theme="promo",
            content_type="single",
            thumbnail_url="https://r2.example.com/t2.png",
            template_config={},
            is_active=True,
        )
        db.add(other)
        await db.commit()

        res = await client.get("/api/v1/templates?industry=fnb", headers=auth_headers)
        assert res.status_code == 200
        assert len(res.json()["data"]) == 1
        assert res.json()["data"][0]["industry"] == "fnb"

    async def test_list_templates_filter_theme(
        self, client: AsyncClient, auth_headers: dict, db: AsyncSession, sample_template: Template
    ):
        other = Template(
            id=uuid.uuid4(),
            name="Template Harbolnas",
            industry="fnb",
            theme="seasonal_harbolnas",
            content_type="single",
            thumbnail_url="https://r2.example.com/t3.png",
            template_config={},
            is_active=True,
        )
        db.add(other)
        await db.commit()

        res = await client.get("/api/v1/templates?theme=seasonal_lebaran", headers=auth_headers)
        assert res.status_code == 200
        assert len(res.json()["data"]) == 1
        assert res.json()["data"][0]["theme"] == "seasonal_lebaran"

    async def test_list_templates_excludes_inactive(
        self, client: AsyncClient, auth_headers: dict, db: AsyncSession, sample_template: Template
    ):
        inactive = Template(
            id=uuid.uuid4(),
            name="Template Inactive",
            industry="fnb",
            theme="promo",
            content_type="single",
            thumbnail_url="https://r2.example.com/t4.png",
            template_config={},
            is_active=False,
        )
        db.add(inactive)
        await db.commit()

        res = await client.get("/api/v1/templates", headers=auth_headers)
        assert res.status_code == 200
        names = [t["name"] for t in res.json()["data"]]
        assert "Template Inactive" not in names

    async def test_list_templates_no_auth(self, client: AsyncClient):
        res = await client.get("/api/v1/templates")
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# Endpoint tests — GET /api/v1/templates/{id}
# ---------------------------------------------------------------------------

class TestGetTemplate:
    async def test_get_template_success(
        self, client: AsyncClient, auth_headers: dict, sample_template: Template
    ):
        res = await client.get(f"/api/v1/templates/{sample_template.id}", headers=auth_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["id"] == str(sample_template.id)
        assert body["data"]["name"] == "Template Lebaran FnB"
        assert "template_config" in body["data"]
        assert body["data"]["background_url"] == sample_template.background_url

    async def test_get_template_not_found(self, client: AsyncClient, auth_headers: dict):
        fake_id = uuid.uuid4()
        res = await client.get(f"/api/v1/templates/{fake_id}", headers=auth_headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "TEMPLATE_NOT_FOUND"

    async def test_get_template_inactive_not_found(
        self, client: AsyncClient, auth_headers: dict, db: AsyncSession
    ):
        inactive = Template(
            id=uuid.uuid4(),
            name="Inactive",
            industry="fnb",
            theme="promo",
            content_type="single",
            thumbnail_url="https://r2.example.com/t5.png",
            template_config={},
            is_active=False,
        )
        db.add(inactive)
        await db.commit()

        res = await client.get(f"/api/v1/templates/{inactive.id}", headers=auth_headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "TEMPLATE_NOT_FOUND"

    async def test_get_template_no_auth(self, client: AsyncClient, sample_template: Template):
        res = await client.get(f"/api/v1/templates/{sample_template.id}")
        assert res.status_code == 401
