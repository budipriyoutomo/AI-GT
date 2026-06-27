"""
Tests untuk templates endpoint dan _build_preview_config helper.
"""
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Template
from app.routers.templates import _build_preview_config
from tests.conftest import SAMPLE_TEMPLATE_CONFIG


# ---------------------------------------------------------------------------
# Unit tests — _build_preview_config (pure function, no DB)
# ---------------------------------------------------------------------------

class TestBuildPreviewConfig:
    def test_returns_required_top_level_keys(self):
        cfg = _build_preview_config(SAMPLE_TEMPLATE_CONFIG)
        assert "color_scheme" in cfg
        assert "font_family" in cfg
        assert "zones" in cfg

    def test_color_scheme_preserved(self):
        cfg = _build_preview_config(SAMPLE_TEMPLATE_CONFIG)
        assert cfg["color_scheme"]["accent"] == "#FFD700"
        assert cfg["color_scheme"]["primary"] == "#FFFFFF"
        assert cfg["color_scheme"]["secondary"] == "#CCCCCC"

    def test_font_family_extracted(self):
        cfg = _build_preview_config(SAMPLE_TEMPLATE_CONFIG)
        assert cfg["font_family"] == "Inter"

    def test_logo_position_from_first_anchor(self):
        cfg = _build_preview_config(SAMPLE_TEMPLATE_CONFIG)
        logo = cfg["zones"]["logo"]
        assert logo["x"] == 0.35
        assert logo["y"] == 0.03
        assert logo["width"] == 0.30
        assert logo["height"] == 0.10

    def test_headline_y_resolved_from_anchor_affects(self):
        """headline.y harus diambil dari affects.headline.y, bukan dari zone.y (0.0)."""
        cfg = _build_preview_config(SAMPLE_TEMPLATE_CONFIG)
        assert cfg["zones"]["headline"]["y"] == 0.16

    def test_body_y_resolved_from_anchor_affects(self):
        """body.y harus diambil dari affects.body.y, bukan dari zone.y (0.0)."""
        cfg = _build_preview_config(SAMPLE_TEMPLATE_CONFIG)
        assert cfg["zones"]["body"]["y"] == 0.45

    def test_headline_includes_accent_words(self):
        cfg = _build_preview_config(SAMPLE_TEMPLATE_CONFIG)
        style = cfg["zones"]["headline"]["style"]
        assert style["accentWords"] == "auto"
        assert style["accentColor"] == "accent"

    def test_zone_value_included(self):
        cfg = _build_preview_config(SAMPLE_TEMPLATE_CONFIG)
        assert cfg["zones"]["headline"]["value"] == "Headline Contoh Template"
        assert cfg["zones"]["body"]["value"] == "Body copy untuk template test"
        assert cfg["zones"]["cta"]["value"] == "Pesan Sekarang"

    def test_zone_visibility_preserved(self):
        cfg = _build_preview_config(SAMPLE_TEMPLATE_CONFIG)
        assert cfg["zones"]["headline"]["visible"] is True
        assert cfg["zones"]["body"]["visible"] is True
        assert cfg["zones"]["cta"]["visible"] is False

    def test_footer_slots_preserved(self):
        cfg = _build_preview_config(SAMPLE_TEMPLATE_CONFIG)
        assert cfg["zones"]["footer"]["slots"] == ["instagram", "youtube"]

    def test_footer_style_preserved(self):
        cfg = _build_preview_config(SAMPLE_TEMPLATE_CONFIG)
        style = cfg["zones"]["footer"]["style"]
        assert style["backgroundColor"] == "#000000"
        assert style["opacity"] == 0.6
        assert style["fontSize"] == 22

    def test_empty_template_config_returns_valid_structure(self):
        """template_config kosong tidak boleh raise exception."""
        cfg = _build_preview_config({})
        assert "color_scheme" in cfg
        assert "font_family" in cfg
        assert "zones" in cfg
        assert cfg["zones"]["headline"] is None
        assert cfg["zones"]["body"] is None
        assert cfg["zones"]["cta"] is None
        assert cfg["zones"]["footer"]["slots"] == []

    def test_missing_anchor_falls_back_to_default_logo_position(self):
        """Template tanpa logo anchors pakai posisi fallback."""
        tc = {**SAMPLE_TEMPLATE_CONFIG, "zones": {
            **SAMPLE_TEMPLATE_CONFIG["zones"],
            "logo": {"type": "image", "anchors": [], "positioning": "anchored"},
        }}
        cfg = _build_preview_config(tc)
        logo = cfg["zones"]["logo"]
        assert logo["x"] == 0.04
        assert logo["y"] == 0.03

    def test_zone_without_accent_words_omits_accent_fields(self):
        """Zone yang tidak punya accentWords tidak menyertakan field tersebut."""
        cfg = _build_preview_config(SAMPLE_TEMPLATE_CONFIG)
        body_style = cfg["zones"]["body"]["style"]
        assert "accentWords" not in body_style
        assert "accentColor" not in body_style

    def test_font_family_fallback_when_missing(self):
        cfg = _build_preview_config({})
        assert cfg["font_family"] == "Inter"


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

    async def test_list_templates_has_preview_config(
        self, client: AsyncClient, auth_headers: dict, sample_template: Template
    ):
        """Response list harus menyertakan preview_config, bukan template_config."""
        res = await client.get("/api/v1/templates", headers=auth_headers)
        assert res.status_code == 200
        item = res.json()["data"][0]
        assert "template_config" not in item
        assert "preview_config" in item

    async def test_list_templates_preview_config_shape(
        self, client: AsyncClient, auth_headers: dict, sample_template: Template
    ):
        """preview_config harus punya color_scheme, font_family, dan zones."""
        res = await client.get("/api/v1/templates", headers=auth_headers)
        pc = res.json()["data"][0]["preview_config"]
        assert "color_scheme" in pc
        assert "font_family" in pc
        assert "zones" in pc
        assert pc["color_scheme"]["accent"] == "#FFD700"
        assert pc["font_family"] == "Inter"

    async def test_list_templates_preview_config_zones_shape(
        self, client: AsyncClient, auth_headers: dict, sample_template: Template
    ):
        """Zones di preview_config harus punya posisi dan value yang benar."""
        res = await client.get("/api/v1/templates", headers=auth_headers)
        zones = res.json()["data"][0]["preview_config"]["zones"]
        assert zones["headline"]["y"] == 0.16          # resolved dari anchor affects
        assert zones["body"]["y"] == 0.45              # resolved dari anchor affects
        assert zones["headline"]["value"] == "Headline Contoh Template"
        assert zones["footer"]["slots"] == ["instagram", "youtube"]

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
