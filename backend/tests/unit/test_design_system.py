"""
Tests untuk resolver design-system (Tier 1 preset library), scripts/design_system.py.

Preset di-resolve saat SEED time → template_config lengkap disimpan ke DB (renderer tak berubah).
Aturan merge: preset jadi base, style/field inline MENANG (override). Nama preset tak dikenal → error jelas.
"""
import pytest

from scripts.design_system import resolve_config, UnknownPresetError

DS = {
    "canvas": {"aspect": "4:5", "dimensions": {"width": 1080, "height": 1350}},
    "palettes": {
        "promo-red": {"accent": "#D42027", "primary": "#2C2B27", "secondary": "#F4C430"},
    },
    "backgrounds": {
        "image-bg": {"type": "image", "source": "background"},
    },
    "brand_themes": {
        "tint-accent": {"mode": "tint", "color_slots": {"accent": 0}},
    },
    "text_styles": {
        "glossy-headline": {"fontSize": 150, "weight": "400", "color": "#FFFFFF", "stroke": {"color": "accent", "width": 7}},
        "terms-fine": {"fontSize": 24, "fontFamily": "Montserrat", "color": "primary"},
    },
}


class TestResolvePalette:
    def test_palette_expands_to_color_scheme(self):
        out = resolve_config({"palette": "promo-red", "elements": []}, DS)
        assert out["color_scheme"] == DS["palettes"]["promo-red"]
        assert "palette" not in out

    def test_inline_color_scheme_overrides_palette(self):
        out = resolve_config({"palette": "promo-red", "color_scheme": {"accent": "#000"}, "elements": []}, DS)
        assert out["color_scheme"]["accent"] == "#000"
        assert out["color_scheme"]["primary"] == "#2C2B27"  # dari preset


class TestResolveBackgroundAndBrandTheme:
    def test_background_preset_merges_with_inline(self):
        out = resolve_config({"background": {"preset": "image-bg", "fallback": "#EDE3CE"}, "elements": []}, DS)
        assert out["background"] == {"type": "image", "source": "background", "fallback": "#EDE3CE"}

    def test_brand_theme_preset_merges_with_inline(self):
        out = resolve_config({"brand_theme": {"preset": "tint-accent", "font_brand_roles": ["terms"]}, "elements": []}, DS)
        assert out["brand_theme"] == {"mode": "tint", "color_slots": {"accent": 0}, "font_brand_roles": ["terms"]}


class TestResolveElementStyle:
    def test_style_preset_merges_and_inline_wins(self):
        raw = {"elements": [
            {"type": "text", "role": "headline", "stylePreset": "glossy-headline",
             "style": {"color": "#111", "accentWords": "Deals"}},
        ]}
        el = resolve_config(raw, DS)["elements"][0]
        assert "stylePreset" not in el
        assert el["style"]["fontSize"] == 150          # dari preset
        assert el["style"]["color"] == "#111"          # inline menang
        assert el["style"]["accentWords"] == "Deals"   # inline tambahan

    def test_style_preset_resolves_inside_group_children(self):
        raw = {"elements": [
            {"type": "group", "children": [
                {"type": "text", "role": "terms", "stylePreset": "terms-fine"},
            ]},
        ]}
        child = resolve_config(raw, DS)["elements"][0]["children"][0]
        assert child["style"]["fontSize"] == 24


class TestDefaultsAndErrors:
    def test_default_canvas_injected_when_missing(self):
        out = resolve_config({"elements": []}, DS)
        assert out["canvas"] == DS["canvas"]

    def test_existing_inline_canvas_preserved(self):
        raw = {"canvas": {"aspect": "1:1", "dimensions": {"width": 1080, "height": 1080}}, "elements": []}
        assert resolve_config(raw, DS)["canvas"]["aspect"] == "1:1"

    def test_passthrough_when_no_presets(self):
        raw = {"canvas": DS["canvas"], "background": {"type": "color", "value": "#fff"},
               "color_scheme": {"accent": "#f00"}, "elements": [{"type": "text", "style": {"fontSize": 40}}]}
        assert resolve_config(raw, DS) == raw

    def test_unknown_palette_raises(self):
        with pytest.raises(UnknownPresetError, match="nope"):
            resolve_config({"palette": "nope", "elements": []}, DS)

    def test_unknown_style_preset_raises(self):
        with pytest.raises(UnknownPresetError, match="ghost"):
            resolve_config({"elements": [{"type": "text", "stylePreset": "ghost"}]}, DS)
