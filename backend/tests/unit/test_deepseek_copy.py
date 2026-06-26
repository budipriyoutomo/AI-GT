"""
Test DeepSeekCopyProvider — semua call ke OpenAI client di-mock, tidak ada network request.
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.providers.ai_types import CopyInput


MOCK_COPY_INPUT = CopyInput(
    business_name="Toko Budi",
    industry="fnb",
    language_style="casual",
    language_preference="id",
    template_theme="seasonal_lebaran",
    brand_colors=["#FF5733"],
    campaign_data={"goal": "Tingkatkan penjualan"},
)

_VALID_RESPONSE = json.dumps({
    "variants": [
        {
            "variant_number": i,
            "copy": {"headline": f"Judul {i}", "body": "Body copy.", "cta": "Pesan Sekarang"},
            "typography": {
                "headline_font": "Montserrat",
                "body_font": "Lato",
                "headline_size": 36,
                "body_size": 16,
                "letter_spacing": 0.5,
            },
        }
        for i in range(1, 4)
    ]
})


def _make_openai_response(content: str):
    message = MagicMock()
    message.content = content
    choice = MagicMock()
    choice.message = message
    response = MagicMock()
    response.choices = [choice]
    return response


def _make_provider():
    """Buat DeepSeekCopyProvider dengan mock client agar tidak perlu API key."""
    from app.services.providers.deepseek_copy import DeepSeekCopyProvider
    with patch("app.services.providers.deepseek_copy.openai.AsyncOpenAI"):
        return DeepSeekCopyProvider()


class TestDeepSeekCopyProvider:
    async def test_generate_copy_success(self):
        """Happy path: return CopyResult dengan 3 variants."""
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(
            return_value=_make_openai_response(_VALID_RESPONSE)
        )

        provider = _make_provider()
        provider._client = mock_client
        result = await provider.generate_copy(MOCK_COPY_INPUT)

        assert len(result.variants) == 3
        assert result.variants[0].variant_number == 1
        assert result.variants[1].variant_number == 2
        assert result.variants[2].variant_number == 3
        assert result.variants[0].copy["headline"] == "Judul 1"

    async def test_generate_copy_invalid_json_raises(self):
        """Response bukan JSON valid → JSONDecodeError agar ai_service bisa retry."""
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(
            return_value=_make_openai_response("ini bukan json")
        )

        provider = _make_provider()
        provider._client = mock_client
        with pytest.raises(json.JSONDecodeError):
            await provider.generate_copy(MOCK_COPY_INPUT)

    async def test_generate_copy_api_error_propagates(self):
        """API error → exception propagate ke caller (ai_service yang handle)."""
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(
            side_effect=RuntimeError("DeepSeek API down")
        )

        provider = _make_provider()
        provider._client = mock_client
        with pytest.raises(RuntimeError, match="DeepSeek API down"):
            await provider.generate_copy(MOCK_COPY_INPUT)

    async def test_generate_copy_uses_model_from_settings(self):
        """Model dibaca dari settings.ai_copy_model, tidak di-hardcode."""
        from app.config import settings

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(
            return_value=_make_openai_response(_VALID_RESPONSE)
        )

        provider = _make_provider()
        provider._client = mock_client
        await provider.generate_copy(MOCK_COPY_INPUT)

        call_kwargs = mock_client.chat.completions.create.call_args.kwargs
        assert call_kwargs["model"] == settings.ai_copy_model
