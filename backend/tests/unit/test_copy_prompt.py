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
