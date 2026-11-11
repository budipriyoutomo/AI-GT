"""
A-6 — Validasi template_config untuk Template Lab.
🔴 RED phase: ditulis sebelum app/services/template_validation.py ada.

Aturan diambil dari backend/scripts/seed_template_data/README.md (§0, §3, §4, §8, §9).
"""
import copy
import glob
import json
import os

import pytest

from app.services.template_validation import CONTENT_TYPE_CANVAS, validate_template_config

SEED_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "scripts", "seed_template_data")


def _valid() -> dict:
    return {
        "canvas": {"aspect": "4:5", "dimensions": {"width": 1080, "height": 1350}},
        "background": {"type": "image", "source": "background", "fallback": "#111111"},
        "color_scheme": {"accent": "#FF5733", "primary": "#FFFFFF", "secondary": "#222222"},
        "font": {"family": "Montserrat"},
        "brand_theme": {"color_slots": {"accent": 0}},
        "elements": [
            {"type": "logo", "source": "brand", "x": 0.06, "y": 0.05, "width": 0.2, "height": 0.08},
            {"type": "text", "role": "headline", "bind": "headline", "x": 0.06, "y": 0.3, "width": 0.88,
             "value": "Judul", "style": {"fontSize": 80, "color": "accent"}},
        ],
    }


def _errors(cfg) -> list[str]:
    return validate_template_config(cfg).errors


class TestValidConfig:
    def test_minimal_valid(self):
        result = validate_template_config(_valid())
        assert result.valid
        assert result.errors == []
        assert result.resolved["elements"][1]["bind"] == "headline"

    def test_input_not_mutated(self):
        raw = _valid()
        raw["palette"] = "promo-red"
        before = copy.deepcopy(raw)
        validate_template_config(raw)
        assert raw == before

    @pytest.mark.parametrize("path", sorted(glob.glob(os.path.join(SEED_DIR, "*.json"))))
    def test_all_seed_templates_pass(self, path):
        """Template yang sudah live harus lolos — validator tidak boleh lebih ketat dari kenyataan."""
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        result = validate_template_config(data["template_config"], data.get("content_type", "instagram_post"))
        assert result.errors == [], os.path.basename(path)


class TestPresets:
    def test_presets_are_expanded(self):
        raw = _valid()
        raw.pop("color_scheme")
        raw["palette"] = "promo-red"
        result = validate_template_config(raw)
        assert result.valid
        assert "palette" not in result.resolved
        assert result.resolved["color_scheme"]

    def test_unknown_preset_is_an_error(self):
        raw = _valid()
        raw["palette"] = "tidak-ada"
        result = validate_template_config(raw)
        assert not result.valid
        assert result.resolved is None
        assert any("tidak-ada" in e for e in result.errors)

    def test_missing_canvas_uses_default(self):
        raw = _valid()
        raw.pop("canvas")
        result = validate_template_config(raw)
        assert result.valid
        assert result.resolved["canvas"]["aspect"] == "4:5"


class TestStructure:
    def test_not_an_object(self):
        assert _errors([]) == ["template_config harus berupa objek JSON."]

    def test_elements_required(self):
        raw = _valid()
        raw["elements"] = []
        assert any("elements" in e for e in _errors(raw))

    def test_unknown_element_type(self):
        raw = _valid()
        raw["elements"].append({"type": "sticker", "x": 0.1, "y": 0.1})
        assert any("elements[2]" in e and "sticker" in e for e in _errors(raw))

    @pytest.mark.parametrize("field,value", [("x", 1.5), ("y", -0.1), ("width", "lebar")])
    def test_position_must_be_normalized(self, field, value):
        raw = _valid()
        raw["elements"][1][field] = value
        assert any(f"elements[1].{field}" in e for e in _errors(raw))


class TestBind:
    def test_headline_bind_required(self):
        raw = _valid()
        raw["elements"][1].pop("bind")
        assert any("headline" in e for e in _errors(raw))

    def test_headline_inside_group_counts(self):
        raw = _valid()
        headline = raw["elements"].pop(1)
        for k in ("x", "y", "width"):
            headline.pop(k)
        raw["elements"].append({"type": "group", "x": 0.06, "y": 0.5, "width": 0.88, "anchor": "top", "gap": 10,
                                "children": [headline]})
        assert _errors(raw) == []

    def test_unknown_bind_rejected(self):
        raw = _valid()
        raw["elements"].append({"type": "text", "bind": "subtitle", "x": 0.1, "y": 0.6, "width": 0.5, "value": "x"})
        assert any("subtitle" in e for e in _errors(raw))


class TestMandatoryRules:
    def test_brand_theme_required(self):
        raw = _valid()
        raw.pop("brand_theme")
        assert any("brand_theme" in e for e in _errors(raw))

    def test_missing_image_slot_is_warning_not_error(self):
        """README §0 #2 mewajibkan slot gambar, tapi flash-sale-retro-poster (live) tidak punya —
        jadi peringatan, bukan penghalang publish."""
        raw = _valid()
        raw["background"] = {"type": "color", "value": "#000000"}
        result = validate_template_config(raw)
        assert result.valid
        assert any("slot gambar" in w for w in result.warnings)

    def test_foreground_image_counts_as_slot(self):
        raw = _valid()
        raw["background"] = {"type": "color", "value": "#000000"}
        raw["elements"].append({"type": "image", "source": "thumbnail", "x": 0.1, "y": 0.5, "width": 0.8, "height": 0.3})
        result = validate_template_config(raw)
        assert result.errors == []
        assert result.warnings == []


class TestCanvasByContentType:
    def test_aspect_must_match_content_type(self):
        raw = _valid()
        raw["canvas"] = {"aspect": "1:1", "dimensions": {"width": 1080, "height": 1080}}
        assert any("4:5" in e for e in _errors(raw))

    def test_unknown_content_type(self):
        result = validate_template_config(_valid(), content_type="tiktok_video")
        assert any("tiktok_video" in e for e in result.errors)

    def test_mapping_is_generic(self):
        assert CONTENT_TYPE_CANVAS["instagram_post"]["aspect"] == "4:5"


class TestNormalizedConfigCarriesImages:
    """A-6 — background_url yang di-upload admin harus sampai ke editor/export (Fabric), bukan cuma galeri."""

    def test_background_url_injected(self, sample_template):
        from app.services.generate_service import _normalize_template_config

        cfg = _normalize_template_config(sample_template, sample_template.template_config)
        assert cfg["thumbnail_url"] == sample_template.thumbnail_url
        assert cfg["background_url"] == sample_template.background_url
        assert "background_url" not in sample_template.template_config  # config template tidak dimutasi
