"""
P3-2 — Characterization test untuk jalur AI yang belum teruji.

Kode sudah ada; test mengunci perilakunya. Semua call di-mock — tidak ada network.
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from jose import jwt

from app.services import ai_service
from app.services.providers.ai_types import CopyInput, ImageResult

COPY_INPUT = CopyInput(
    business_name="Toko Budi", industry="fnb", language_style="casual",
    language_preference="id", template_theme="seasonal_lebaran",
    brand_colors=["#FF5733"], goal="promo", platform="instagram_feed",
    product_or_service="Nasi Goreng", key_message="Enak dan murah",
)

COPY_JSON = json.dumps({"variants": [{
    "variant_number": 1,
    "copy": {"headline": "Judul", "body": "Body", "cta": "Pesan"},
    "typography": {"headline_font": "Montserrat", "body_font": "Lato"},
}]})


def _settings(**kw):
    s = MagicMock()
    for k, v in kw.items():
        setattr(s, k, v)
    return s


# ── ai_service: pemilihan provider ────────────────────────────────────────

class TestProviderSelection:
    def test_deepseek_copy_provider(self):
        from app.services.providers.deepseek_copy import DeepSeekCopyProvider
        with patch.object(ai_service, "settings", _settings(ai_copy_provider="deepseek", deepseek_api_key="k")):
            assert isinstance(ai_service.get_copy_provider(), DeepSeekCopyProvider)

    def test_unknown_copy_provider_raises(self):
        with patch.object(ai_service, "settings", _settings(ai_copy_provider="gpt-9")):
            with pytest.raises(ValueError, match="gpt-9"):
                ai_service.get_copy_provider()

    def test_unknown_image_provider_raises(self):
        with patch.object(ai_service, "settings", _settings(ai_image_provider="midjourney")):
            with pytest.raises(ValueError, match="midjourney"):
                ai_service.get_image_provider()


# ── ai_service._call_copy_provider_raw ────────────────────────────────────

class TestCallCopyProviderRaw:
    async def test_anthropic(self):
        msg = MagicMock(content=[MagicMock(text="  hasil  ")])
        client = MagicMock()
        client.messages.create = AsyncMock(return_value=msg)
        with patch.object(ai_service, "settings", _settings(ai_copy_provider="anthropic", ai_copy_model="m", anthropic_api_key="k")), \
             patch("anthropic.AsyncAnthropic", return_value=client):
            assert await ai_service._call_copy_provider_raw("p", max_tokens=10) == "hasil"
        kwargs = client.messages.create.call_args.kwargs
        assert kwargs["model"] == "m"  # model dari settings, bukan hardcode
        assert kwargs["max_tokens"] == 10

    async def test_deepseek(self):
        resp = MagicMock(choices=[MagicMock(message=MagicMock(content=" hasil "))])
        client = MagicMock()
        client.chat.completions.create = AsyncMock(return_value=resp)
        with patch.object(ai_service, "settings", _settings(ai_copy_provider="deepseek", ai_copy_model="m", deepseek_api_key="k")), \
             patch("openai.AsyncOpenAI", return_value=client):
            assert await ai_service._call_copy_provider_raw("p") == "hasil"

    async def test_deepseek_none_content_is_empty_string(self):
        resp = MagicMock(choices=[MagicMock(message=MagicMock(content=None))])
        client = MagicMock()
        client.chat.completions.create = AsyncMock(return_value=resp)
        with patch.object(ai_service, "settings", _settings(ai_copy_provider="deepseek", ai_copy_model="m", deepseek_api_key="k")), \
             patch("openai.AsyncOpenAI", return_value=client):
            assert await ai_service._call_copy_provider_raw("p") == ""

    async def test_unknown_provider_raises(self):
        with patch.object(ai_service, "settings", _settings(ai_copy_provider="gpt-9")):
            with pytest.raises(ValueError):
                await ai_service._call_copy_provider_raw("p")


# ── ai_service.generate_image_suggestions ─────────────────────────────────

class TestImageSuggestions:
    async def _call(self, raw=None, side_effect=None):
        mock = AsyncMock(return_value=raw, side_effect=side_effect)
        with patch.object(ai_service, "_call_copy_provider_raw", new=mock):
            return await ai_service.generate_image_suggestions("brief", "tema", "fnb")

    async def test_plain_json(self):
        got = await self._call(json.dumps({"suggestions": ["a", "b", "c", "d"]}))
        assert got == ["a", "b", "c"]  # dibatasi 3

    async def test_markdown_wrapped_json(self):
        raw = 'Ini sarannya:\n```json\n{"suggestions": ["a", "b"]}\n```'
        assert await self._call(raw) == ["a", "b"]

    async def test_empty_response(self):
        assert await self._call("") == []

    async def test_invalid_json(self):
        assert await self._call("bukan json") == []

    async def test_provider_error_returns_empty(self):
        assert await self._call(side_effect=RuntimeError("down")) == []

    async def test_defaults_filled_in_prompt(self):
        mock = AsyncMock(return_value='{"suggestions": []}')
        with patch.object(ai_service, "_call_copy_provider_raw", new=mock):
            await ai_service.generate_image_suggestions("brief", "", "")
        prompt = mock.call_args.args[0]
        assert "umum" in prompt  # target_audience default


class TestGenerateSingleImage:
    async def test_returns_first_url(self):
        with patch.object(ai_service, "_generate_images_safe", new=AsyncMock(return_value=ImageResult(image_urls=["u1"]))):
            assert await ai_service.generate_single_image("kopi") == "u1"

    async def test_no_image_returns_none(self):
        with patch.object(ai_service, "_generate_images_safe", new=AsyncMock(return_value=ImageResult())):
            assert await ai_service.generate_single_image("kopi") is None


# ── AnthropicCopyProvider ─────────────────────────────────────────────────

class TestAnthropicCopyProvider:
    def _provider(self, text: str):
        from app.services.providers import anthropic_copy

        client = MagicMock()
        client.messages.create = AsyncMock(return_value=MagicMock(content=[MagicMock(text=text)]))
        with patch.object(anthropic_copy.anthropic, "AsyncAnthropic", return_value=client):
            provider = anthropic_copy.AnthropicCopyProvider()
        return provider, client

    async def test_single_copy(self):
        provider, client = self._provider(COPY_JSON)
        with patch("app.services.providers.anthropic_copy.settings", _settings(ai_copy_model="haiku-env")):
            result = await provider.generate_copy(COPY_INPUT)
        assert result.variants[0].copy["headline"] == "Judul"
        kwargs = client.messages.create.call_args.kwargs
        assert kwargs["model"] == "haiku-env"
        assert kwargs["max_tokens"] == 2048
        assert "instagram_feed" in kwargs["messages"][0]["content"]

    async def test_carousel_uses_bigger_budget(self):
        provider, client = self._provider(COPY_JSON)
        carousel = CopyInput(**{**COPY_INPUT.__dict__, "content_type": "Carousel", "slide_count": 3})
        with patch("app.services.providers.anthropic_copy.settings", _settings(ai_copy_model="m")):
            await provider.generate_copy(carousel)
        assert client.messages.create.call_args.kwargs["max_tokens"] == 3072

    async def test_invalid_json_raises_for_retry(self):
        """ai_service._generate_copy_with_retry mengandalkan JSONDecodeError untuk retry."""
        provider, _ = self._provider("bukan json")
        with patch("app.services.providers.anthropic_copy.settings", _settings(ai_copy_model="m")):
            with pytest.raises(json.JSONDecodeError):
                await provider.generate_copy(COPY_INPUT)


# ── Protocol provider ─────────────────────────────────────────────────────

class TestProviderProtocols:
    def test_concrete_providers_satisfy_protocols(self):
        from app.services.providers.anthropic_copy import AnthropicCopyProvider
        from app.services.providers.base_copy import CopyProvider
        from app.services.providers.base_image import ImageProvider
        from app.services.providers.replicate_image import ReplicateImageProvider

        with patch("app.services.providers.anthropic_copy.anthropic.AsyncAnthropic"):
            assert isinstance(AnthropicCopyProvider(), CopyProvider)
        assert isinstance(ReplicateImageProvider(), ImageProvider)
        assert not isinstance(object(), CopyProvider)


# ── SupabaseAuthProvider ──────────────────────────────────────────────────

class TestSupabaseAuthProvider:
    SECRET = "supabase-test-secret-32-chars-long!!"

    def _provider(self):
        from app.services.providers.auth import supabase_auth
        return supabase_auth.SupabaseAuthProvider(), patch.object(
            supabase_auth, "settings", _settings(supabase_jwt_secret=self.SECRET),
        )

    def test_valid_token_returns_sub(self):
        provider, settings = self._provider()
        token = jwt.encode({"sub": "user-1", "aud": "authenticated"}, self.SECRET, algorithm="HS256")
        with settings:
            assert provider.verify_token(token) == "user-1"

    def test_wrong_secret_rejected(self):
        provider, settings = self._provider()
        token = jwt.encode({"sub": "user-1"}, "secret-lain", algorithm="HS256")
        with settings, pytest.raises(ValueError, match="tidak valid"):
            provider.verify_token(token)

    def test_token_without_sub_rejected(self):
        provider, settings = self._provider()
        token = jwt.encode({"role": "x"}, self.SECRET, algorithm="HS256")
        with settings, pytest.raises(ValueError, match="sub"):
            provider.verify_token(token)

    @pytest.mark.parametrize("call", [
        lambda p: p.create_token("u"),
        lambda p: p.hash_password("x"),
        lambda p: p.verify_password("x", "y"),
    ])
    def test_password_and_token_creation_not_supported(self, call):
        provider, _ = self._provider()
        with pytest.raises(NotImplementedError):
            call(provider)
