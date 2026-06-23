"""
🔴 RED phase — test templates endpoint.
"""
import uuid

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Template


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
