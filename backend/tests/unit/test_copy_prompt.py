"""
Test copy_intent → guidance injection di copy_prompt.

copy_intent adalah kategori NIAT COPY tiap template (promotion / story / brand)
yang memberi AI arah cara menulis (bukan sekadar label tema). Guidance disuntik
ke prompt single & carousel.
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.providers.ai_types import CopyBrief, CopyInput
from app.services.providers.copy_prompt import (
    COPY_INTENT_GUIDANCE,
    COPY_INTENT_LENGTHS,
    build_carousel_prompt,
    build_copy_brief,
    collect_bind_slots,
    intent_guidance,
    intent_lengths,
    render_slot_spec,
)


class TestIntentGuidance:
    def test_known_intents_have_distinct_guidance(self):
        """Tiga mode wajib punya guidance sendiri-sendiri yang tidak kosong & berbeda."""
        promo = intent_guidance("promotion")
        story = intent_guidance("story")
        brand = intent_guidance("brand")
        assert "PROMOSI" in promo.upper()
        assert "CERITA" in story.upper() or "EDUKASI" in story.upper()
        assert "BRAND" in brand.upper()
        assert len({promo, story, brand}) == 3

    def test_registry_covers_three_modes(self):
        assert set(COPY_INTENT_GUIDANCE.keys()) == {"promotion", "story", "brand"}

    def test_unknown_or_empty_intent_falls_back_safely(self):
        """Intent kosong/tak dikenal → fallback generic non-kosong, tidak melempar."""
        assert intent_guidance("") .strip() != ""
        assert intent_guidance(None).strip() != ""
        assert intent_guidance("wibble").strip() != ""

    def test_case_insensitive(self):
        assert intent_guidance("PROMOTION") == intent_guidance("promotion")


class TestIntentLengths:
    def test_registry_covers_three_modes_with_all_slots(self):
        assert set(COPY_INTENT_LENGTHS.keys()) == {"promotion", "story", "brand"}
        for slots in COPY_INTENT_LENGTHS.values():
            assert set(slots.keys()) == {"headline", "body", "cta"}
            assert all(isinstance(v, int) and v > 0 for v in slots.values())

    def test_locked_numbers(self):
        """Angka yang sudah dikunci per mode — promo paling pendek, story paling panjang."""
        assert intent_lengths("promotion") == {"headline": 5, "body": 15, "cta": 4}
        assert intent_lengths("story") == {"headline": 10, "body": 35, "cta": 5}
        assert intent_lengths("brand") == {"headline": 6, "body": 20, "cta": 3}

    def test_fallback_preserves_legacy_limits(self):
        """None/tak dikenal → 12/35/5 (nilai lama) supaya template tanpa copy_intent tak berubah perilaku."""
        legacy = {"headline": 12, "body": 35, "cta": 5}
        assert intent_lengths(None) == legacy
        assert intent_lengths("") == legacy
        assert intent_lengths("wibble") == legacy

    def test_case_insensitive(self):
        assert intent_lengths("PROMOTION") == intent_lengths("promotion")


class TestSinglePromptLengthInjection:
    async def test_single_prompt_uses_intent_word_limits(self):
        """Prompt single harus memakai batas kata sesuai copy_intent, bukan angka fixed lama."""
        from app.services.providers.deepseek_copy import DeepSeekCopyProvider

        captured = {}

        async def _capture(**kwargs):
            captured["prompt"] = kwargs["messages"][0]["content"]
            msg = MagicMock()
            msg.message.content = _VALID
            resp = MagicMock()
            resp.choices = [msg]
            return resp

        with patch("app.services.providers.deepseek_copy.openai.AsyncOpenAI"):
            provider = DeepSeekCopyProvider()
        provider._client = MagicMock()
        provider._client.chat.completions.create = AsyncMock(side_effect=_capture)

        promo_input = CopyInput(
            business_name="Toko Budi", industry="fnb", language_style="casual",
            language_preference="id", template_theme="promo", copy_intent="promotion",
        )
        await provider.generate_copy(promo_input)
        prompt = captured["prompt"]
        assert "maksimal 5 kata" in prompt      # headline promo
        assert "maksimal 15 kata" in prompt     # body promo
        assert "maksimal 12 kata" not in prompt  # angka lama tak boleh muncul untuk promo


TPL_ALL_SLOTS = {"elements": [
    {"type": "text", "bind": "headline", "value": "H"},
    {"type": "text", "bind": "body", "value": "B"},
    {"type": "text", "bind": "cta", "value": "C"},
]}

# SOPWER-style: headline & body bersarang di dalam group (README §6 — traversal wajib rekursif).
TPL_GROUP_NO_CTA = {"elements": [
    {"type": "logo", "source": "brand"},
    {"type": "group", "anchor": "bottom", "children": [
        {"type": "text", "bind": "headline"},
        {"type": "text", "role": "eyebrow", "value": "Tau Gak Sih?"},
        {"type": "text", "bind": "body"},
    ]},
    {"type": "footer"},
]}


class TestCollectBindSlots:
    def test_finds_top_level_binds_in_canonical_order(self):
        assert collect_bind_slots(TPL_ALL_SLOTS) == ["headline", "body", "cta"]

    def test_recurses_into_group_children(self):
        """headline/body di dalam group harus tetap terdeteksi; cta tak ada."""
        assert collect_bind_slots(TPL_GROUP_NO_CTA) == ["headline", "body"]

    def test_ignores_non_bind_and_empty(self):
        assert collect_bind_slots({"elements": [{"type": "text", "role": "terms"}]}) == []
        assert collect_bind_slots({}) == []


class TestBuildCopyBrief:
    def test_slots_present_carry_intent_word_limits(self):
        brief = build_copy_brief(TPL_ALL_SLOTS, "promotion")
        assert brief.slots == {"headline": 5, "body": 15, "cta": 4}

    def test_absent_cta_not_in_slots(self):
        brief = build_copy_brief(TPL_GROUP_NO_CTA, "story")
        assert brief.slots == {"headline": 10, "body": 35}
        assert "cta" not in brief.slots

    def test_carries_intent(self):
        assert build_copy_brief(TPL_ALL_SLOTS, "brand").intent == "brand"


TPL_HEADLINE_OVERRIDE = {"elements": [
    {"type": "text", "bind": "headline", "maxWords": 3},   # override intent default
    {"type": "text", "bind": "body"},
    {"type": "text", "bind": "cta"},
]}

TPL_GROUP_OVERRIDE = {"elements": [
    {"type": "group", "children": [
        {"type": "text", "bind": "headline", "maxWords": 2},   # override inside group
        {"type": "text", "bind": "body"},
    ]},
]}

TPL_INVALID_OVERRIDE = {"elements": [
    {"type": "text", "bind": "headline", "maxWords": 0},        # invalid → ignore
    {"type": "text", "bind": "body", "maxWords": "lots"},       # invalid type → ignore
]}


class TestPerSlotMaxWordsOverride:
    def test_element_maxwords_overrides_intent_default(self):
        brief = build_copy_brief(TPL_HEADLINE_OVERRIDE, "promotion")
        assert brief.slots == {"headline": 3, "body": 15, "cta": 4}  # headline pinned, rest = intent

    def test_override_applies_inside_group(self):
        brief = build_copy_brief(TPL_GROUP_OVERRIDE, "story")
        assert brief.slots == {"headline": 2, "body": 35}

    def test_invalid_override_falls_back_to_intent_default(self):
        brief = build_copy_brief(TPL_INVALID_OVERRIDE, "promotion")
        assert brief.slots == {"headline": 5, "body": 15}  # 0 & non-int ignored → intent default

    def test_collect_bind_slots_unaffected_by_override(self):
        assert collect_bind_slots(TPL_HEADLINE_OVERRIDE) == ["headline", "body", "cta"]


TPL_WITH_STATIC = {"elements": [
    {"type": "text", "role": "eyebrow", "value": "HARI SUSHI"},
    {"type": "text", "bind": "headline", "value": "TEBUS"},
    {"type": "text", "role": "terms", "value": "Berlaku di\nseluruh outlet"},   # \n → dirapikan
    {"type": "logo", "source": "brand"},
    {"type": "footer"},
]}


class TestStaticContext:
    def test_collects_static_text_excluding_binds_and_nontext(self):
        brief = build_copy_brief(TPL_WITH_STATIC, "promotion")
        assert brief.static_context == [
            ("eyebrow", "HARI SUSHI"),
            ("terms", "Berlaku di seluruh outlet"),   # newline dikolaps jadi spasi
        ]

    def test_recurses_into_group(self):
        """eyebrow statis di dalam group (TPL_GROUP_NO_CTA) harus terkumpul."""
        brief = build_copy_brief(TPL_GROUP_NO_CTA, "story")
        assert ("eyebrow", "Tau Gak Sih?") in brief.static_context

    def test_no_static_text_gives_empty(self):
        assert build_copy_brief(TPL_ALL_SLOTS, "brand").static_context == []

    def test_render_includes_context_block_with_dont_repeat(self):
        spec = render_slot_spec(build_copy_brief(TPL_WITH_STATIC, "promotion"))
        assert "JANGAN diulang" in spec
        assert 'eyebrow: "HARI SUSHI"' in spec

    def test_render_omits_block_when_no_static(self):
        spec = render_slot_spec(build_copy_brief(TPL_ALL_SLOTS, "promotion"))
        assert "JANGAN diulang" not in spec


class TestRenderSlotSpec:
    def test_lists_present_slots_with_limits(self):
        spec = render_slot_spec(build_copy_brief(TPL_ALL_SLOTS, "promotion"))
        assert "headline — maksimal 5 kata" in spec
        assert "body — maksimal 15 kata" in spec

    def test_instructs_null_for_absent_cta(self):
        spec = render_slot_spec(build_copy_brief(TPL_GROUP_NO_CTA, "story"))
        assert '"cta" ke null' in spec

    def test_none_brief_falls_back_to_all_slots(self):
        """CopyInput tanpa brief (mis. caller lama) → anggap semua slot ada, pakai batas intent."""
        spec = render_slot_spec(None, "promotion")
        assert "headline — maksimal 5 kata" in spec
        assert '"cta" ke null' not in spec


class TestSinglePromptSlotSpec:
    async def test_prompt_tells_ai_to_null_cta_when_template_has_none(self):
        from app.services.providers.deepseek_copy import DeepSeekCopyProvider

        captured = {}

        async def _capture(**kwargs):
            captured["prompt"] = kwargs["messages"][0]["content"]
            msg = MagicMock()
            msg.message.content = _VALID
            resp = MagicMock()
            resp.choices = [msg]
            return resp

        with patch("app.services.providers.deepseek_copy.openai.AsyncOpenAI"):
            provider = DeepSeekCopyProvider()
        provider._client = MagicMock()
        provider._client.chat.completions.create = AsyncMock(side_effect=_capture)

        inp = CopyInput(
            business_name="Toko Budi", industry="fnb", language_style="casual",
            language_preference="id", template_theme="awareness", copy_intent="story",
            copy_brief=build_copy_brief(TPL_GROUP_NO_CTA, "story"),
        )
        await provider.generate_copy(inp)
        assert '"cta" ke null' in captured["prompt"]


class TestBriefEdgeCases:
    def test_untagged_template_uses_legacy_lengths(self):
        """copy_intent None (template lama belum ditandai) → batas 12/35/5 lama, tetap jalan."""
        brief = build_copy_brief(TPL_ALL_SLOTS, None)
        assert brief.slots == {"headline": 12, "body": 35, "cta": 5}
        assert brief.intent is None

    def test_headline_only_layout_nulls_body_and_cta(self):
        brief = build_copy_brief({"elements": [{"type": "text", "bind": "headline"}]}, "brand")
        assert brief.slots == {"headline": 6}
        spec = render_slot_spec(brief)
        assert '"body" ke null' in spec
        assert '"cta" ke null' in spec

    def test_empty_and_malformed_config_do_not_crash(self):
        for cfg in ({}, {"elements": None}, {"elements": []}, {"elements": [{"type": "logo"}]}):
            brief = build_copy_brief(cfg, "story")
            assert brief.slots == {}
            assert brief.static_context == []
            # render tetap aman walau tak ada slot
            assert isinstance(render_slot_spec(brief), str)


class TestCarouselPromptInjection:
    def test_carousel_prompt_embeds_intent_guidance(self):
        prompt = build_carousel_prompt(
            slide_count=3,
            business_name="Toko Budi",
            industry="fnb",
            template_theme="promo",
            copy_intent="promotion",
            goal="penjualan",
            platform="instagram_feed",
            language_style="casual",
            language_preference="id",
            brand_colors="#FF0000",
            product_or_service="kopi",
            key_message="diskon",
            promo_detail="50%",
            additional_notes="-",
        )
        assert intent_guidance("promotion") in prompt


MOCK_INPUT = CopyInput(
    business_name="Toko Budi",
    industry="fnb",
    language_style="casual",
    language_preference="id",
    template_theme="promo",
    copy_intent="story",
)

_VALID = json.dumps({
    "variants": [{
        "variant_number": 1,
        "copy": {"headline": "H", "body": "B", "cta": "C"},
        "typography": {"headline_font": "Inter", "body_font": "Inter",
                       "headline_size": 36, "body_size": 16, "letter_spacing": 0.5},
    }]
})


class TestProviderPassesIntent:
    async def test_single_prompt_includes_story_guidance(self):
        """Provider harus menyuntik guidance sesuai copy_intent input ke prompt yang dikirim."""
        from app.services.providers.deepseek_copy import DeepSeekCopyProvider

        captured = {}

        async def _capture(**kwargs):
            captured["prompt"] = kwargs["messages"][0]["content"]
            msg = MagicMock()
            msg.message.content = _VALID
            resp = MagicMock()
            resp.choices = [msg]
            return resp

        with patch("app.services.providers.deepseek_copy.openai.AsyncOpenAI"):
            provider = DeepSeekCopyProvider()
        provider._client = MagicMock()
        provider._client.chat.completions.create = AsyncMock(side_effect=_capture)

        await provider.generate_copy(MOCK_INPUT)
        assert intent_guidance("story") in captured["prompt"]


# ── Batas KARAKTER dari geometri template ────────────────────────────────────
# Kapasitas = (chars per baris) × (jumlah baris muat), diukur pada fontSize authored.
# Ini yang menentukan copy MUAT atau tidak — batas kata tidak berkorelasi dengan wrap.

TPL_GEOMETRY = {
    "canvas": {"dimensions": {"width": 1080, "height": 1350}},
    "elements": [
        # headline: lebar 0.92*1080=993.6px @118px → ~16 char/baris.
        # Penghalang di bawah = body (y 0.30) → budget 148.5px → 1 baris (118*1.1=129.8)
        {"type": "text", "bind": "headline", "x": 0.04, "y": 0.19, "width": 0.92,
         "style": {"fontSize": 118}},
        # body: 864px @36px → 48 char/baris; budget ke image (0.40) = 135px → 2 baris
        {"type": "text", "bind": "body", "x": 0.10, "y": 0.30, "width": 0.80,
         "style": {"fontSize": 36, "lineHeight": 1.3}},
        {"type": "image", "source": "thumbnail", "x": 0.06, "y": 0.40, "width": 0.88, "height": 0.30},
    ],
}

TPL_GEOMETRY_OVERRIDE = {
    "canvas": {"dimensions": {"width": 1080, "height": 1350}},
    "elements": [
        {"type": "text", "bind": "headline", "x": 0.04, "y": 0.19, "width": 0.92,
         "maxChars": 40, "style": {"fontSize": 118}},
        {"type": "text", "bind": "body", "x": 0.10, "y": 0.30, "width": 0.80,
         "maxChars": 0, "style": {"fontSize": 36, "lineHeight": 1.3}},  # invalid → derive
        {"type": "image", "source": "thumbnail", "x": 0.06, "y": 0.40, "width": 0.88, "height": 0.30},
    ],
}

TPL_GROUP_CHILD = {
    "canvas": {"dimensions": {"width": 1080, "height": 1350}},
    "elements": [
        {"type": "group", "x": 0.06, "y": 0.2, "width": 0.5, "children": [
            {"type": "text", "bind": "headline", "style": {"fontSize": 80}},
        ]},
    ],
}


class TestCharLimitsFromGeometry:
    def test_capacity_derived_from_width_fontsize_and_budget(self):
        brief = build_copy_brief(TPL_GEOMETRY, "story")
        # headline: 993.6/(118*0.5)=16.8 → 16/baris × 1 baris = 16 → margin 0.9 → 14
        assert brief.char_limits["headline"] == 14
        # body: 864/(36*0.5)=48/baris × 2 baris = 96 → margin 0.9 → 86
        assert brief.char_limits["body"] == 86

    def test_word_limits_still_come_from_intent(self):
        brief = build_copy_brief(TPL_GEOMETRY, "story")
        assert brief.slots == {"headline": 10, "body": 35}

    def test_explicit_maxchars_overrides_derived(self):
        brief = build_copy_brief(TPL_GEOMETRY_OVERRIDE, "story")
        assert brief.char_limits["headline"] == 40   # override menang, tanpa margin
        assert brief.char_limits["body"] == 86       # maxChars invalid → kembali ke derivasi

    def test_group_child_has_no_char_limit(self):
        # anak group mengalir vertikal → tak punya geometri absolut → tak bisa dihitung
        brief = build_copy_brief(TPL_GROUP_CHILD, "story")
        assert "headline" not in brief.char_limits
        assert brief.slots == {"headline": 10}

    def test_template_without_canvas_or_geometry_has_no_char_limit(self):
        brief = build_copy_brief(TPL_HEADLINE_OVERRIDE, "promotion")
        assert brief.char_limits == {}


class TestSlotSpecRendersCharLimit:
    def test_char_limit_appears_next_to_word_limit(self):
        spec = render_slot_spec(build_copy_brief(TPL_GEOMETRY, "story"))
        assert "headline — maksimal 10 kata, maksimal 14 karakter" in spec
        assert "body — maksimal 35 kata, maksimal 86 karakter" in spec

    def test_slot_without_char_limit_renders_word_limit_only(self):
        spec = render_slot_spec(build_copy_brief(TPL_HEADLINE_OVERRIDE, "promotion"))
        assert "headline — maksimal 3 kata" in spec
        assert "karakter" not in spec
