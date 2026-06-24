"""
Test ai_service.py — semua AI call di-mock, tidak ada network request.
"""
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services import ai_service
from app.services.providers.ai_types import (
    CopyError,
    CopyInput,
    CopyInvalidJsonError,
    CopyResult,
    CopyTimeoutError,
    CopyVariant,
    ImageInput,
    ImageResult,
)


MOCK_COPY_INPUT = CopyInput(
    business_name="Toko Budi",
    industry="fnb",
    language_style="casual",
    language_preference="id",
    template_theme="seasonal_lebaran",
    brand_colors=["#FF5733"],
    campaign_data={"goal": "Tingkatkan penjualan"},
)

MOCK_IMAGE_INPUT = ImageInput(theme="seasonal_lebaran")

_MOCK_COPY_RESULT = CopyResult(
    variants=[
        CopyVariant(
            variant_number=i,
            copy={"headline": f"Judul {i}", "body": "Body copy.", "cta": "Pesan Sekarang"},
            typography={"headline_font": "Montserrat", "body_font": "Lato", "headline_size": 36, "body_size": 16, "letter_spacing": 0.5},
        )
        for i in range(1, 4)
    ]
)

_MOCK_IMAGE_RESULT = ImageResult(image_urls=[
    "https://r2.example.com/temp/img1.png",
    "https://r2.example.com/temp/img2.png",
    "https://r2.example.com/temp/img3.png",
])


def _make_copy_provider(result=_MOCK_COPY_RESULT, side_effect=None):
    mock = MagicMock()
    mock.generate_copy = AsyncMock(return_value=result, side_effect=side_effect)
    return mock


def _make_image_provider(result=_MOCK_IMAGE_RESULT, side_effect=None):
    mock = MagicMock()
    mock.generate_images = AsyncMock(return_value=result, side_effect=side_effect)
    return mock


class TestGetCopyProvider:
    def test_get_copy_provider_anthropic(self):
        from app.services.providers.anthropic_copy import AnthropicCopyProvider
        with patch.object(ai_service.settings, "ai_copy_provider", "anthropic"):
            provider = ai_service.get_copy_provider()
        assert isinstance(provider, AnthropicCopyProvider)

    def test_get_copy_provider_deepseek(self):
        from app.services.providers.deepseek_copy import DeepSeekCopyProvider
        with patch.object(ai_service.settings, "ai_copy_provider", "deepseek"):
            with patch("app.services.providers.deepseek_copy.openai.AsyncOpenAI"):
                provider = ai_service.get_copy_provider()
        assert isinstance(provider, DeepSeekCopyProvider)

    def test_get_copy_provider_unknown_raises(self):
        with patch.object(ai_service.settings, "ai_copy_provider", "unknown_provider"):
            with pytest.raises(ValueError, match="Unknown copy provider"):
                ai_service.get_copy_provider()


class TestGenerateCopyWithRetry:
    async def test_copy_success(self):
        with patch.object(ai_service, "get_copy_provider", return_value=_make_copy_provider()):
            result = await ai_service._generate_copy_with_retry(MOCK_COPY_INPUT)
        assert len(result.variants) == 3
        assert result.variants[0].variant_number == 1

    async def test_copy_timeout_raises(self):
        async def slow(*_):
            await asyncio.sleep(100)

        with patch.object(ai_service, "get_copy_provider", return_value=_make_copy_provider(side_effect=slow)):
            with patch.object(ai_service, "_COPY_TIMEOUT", 0.01):
                with pytest.raises(CopyTimeoutError):
                    await ai_service._generate_copy_with_retry(MOCK_COPY_INPUT)

    async def test_copy_invalid_json_retries_and_fails(self):
        """Invalid JSON → retry 2x → CopyInvalidJsonError setelah max retry."""
        import json

        bad = _make_copy_provider(side_effect=json.JSONDecodeError("bad json", "", 0))
        with patch.object(ai_service, "get_copy_provider", return_value=bad):
            with pytest.raises(CopyInvalidJsonError):
                await ai_service._generate_copy_with_retry(MOCK_COPY_INPUT)

        assert bad.generate_copy.call_count == ai_service._COPY_MAX_RETRIES + 1

    async def test_copy_invalid_json_succeeds_on_retry(self):
        """Invalid JSON sekali → sukses di percobaan ke-2."""
        import json

        good_result = _MOCK_COPY_RESULT
        call_count = 0

        async def flaky(_input):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise json.JSONDecodeError("bad", "", 0)
            return good_result

        mock = MagicMock()
        mock.generate_copy = AsyncMock(side_effect=flaky)
        with patch.object(ai_service, "get_copy_provider", return_value=mock):
            result = await ai_service._generate_copy_with_retry(MOCK_COPY_INPUT)

        assert result is good_result
        assert call_count == 2

    async def test_copy_generic_error_raises(self):
        bad = _make_copy_provider(side_effect=RuntimeError("API down"))
        with patch.object(ai_service, "get_copy_provider", return_value=bad):
            with pytest.raises(CopyError):
                await ai_service._generate_copy_with_retry(MOCK_COPY_INPUT)


class TestGenerateImagesSafe:
    async def test_image_success(self):
        with patch.object(ai_service, "get_image_provider", return_value=_make_image_provider()):
            result = await ai_service._generate_images_safe(MOCK_IMAGE_INPUT, "session-1")
        assert result.image_urls[0] == "https://r2.example.com/temp/img1.png"
        assert len(result.image_urls) == 3

    async def test_image_timeout_returns_empty(self):
        async def slow(*_):
            await asyncio.sleep(100)

        with patch.object(ai_service, "get_image_provider", return_value=_make_image_provider(side_effect=slow)):
            with patch.object(ai_service, "_IMAGE_TIMEOUT", 0.01):
                result = await ai_service._generate_images_safe(MOCK_IMAGE_INPUT, "session-1")

        assert result.image_urls == [None, None, None]

    async def test_image_provider_error_returns_empty(self):
        bad = _make_image_provider(side_effect=RuntimeError("Replicate API error"))
        with patch.object(ai_service, "get_image_provider", return_value=bad):
            result = await ai_service._generate_images_safe(MOCK_IMAGE_INPUT, "session-1")

        assert result.image_urls == [None, None, None]


class TestGenerateContent:
    async def test_generate_content_parallel_success(self):
        """Kedua provider dipanggil secara parallel, hasil digabung."""
        called_at = {}

        async def slow_copy(_input):
            called_at["copy"] = asyncio.get_event_loop().time()
            await asyncio.sleep(0.05)
            return _MOCK_COPY_RESULT

        async def slow_image(_input):
            called_at["image"] = asyncio.get_event_loop().time()
            await asyncio.sleep(0.05)
            return _MOCK_IMAGE_RESULT

        copy_mock = MagicMock()
        copy_mock.generate_copy = AsyncMock(side_effect=slow_copy)
        image_mock = MagicMock()
        image_mock.generate_images = AsyncMock(side_effect=slow_image)

        with patch.object(ai_service, "get_copy_provider", return_value=copy_mock):
            with patch.object(ai_service, "get_image_provider", return_value=image_mock):
                copy_result, image_result = await ai_service.generate_content(
                    MOCK_COPY_INPUT, MOCK_IMAGE_INPUT, "session-1"
                )

        assert len(copy_result.variants) == 3
        assert image_result.image_urls[0] is not None
        assert abs(called_at["copy"] - called_at["image"]) < 0.02

    async def test_generate_content_no_image_input(self):
        """Tanpa image_input, hanya copy yang dipanggil."""
        copy_mock = MagicMock()
        copy_mock.generate_copy = AsyncMock(return_value=_MOCK_COPY_RESULT)
        image_mock = MagicMock()
        image_mock.generate_images = AsyncMock()

        with patch.object(ai_service, "get_copy_provider", return_value=copy_mock):
            with patch.object(ai_service, "get_image_provider", return_value=image_mock):
                copy_result, image_result = await ai_service.generate_content(
                    MOCK_COPY_INPUT, None, "session-1"
                )

        image_mock.generate_images.assert_not_called()
        assert image_result.image_urls == [None, None, None]

    async def test_generate_content_copy_failure_propagates(self):
        """Copy failure → raise CopyError (bukan ditangkap)."""
        copy_mock = MagicMock()
        copy_mock.generate_copy = AsyncMock(side_effect=RuntimeError("boom"))
        image_mock = MagicMock()
        image_mock.generate_images = AsyncMock(return_value=_MOCK_IMAGE_RESULT)

        with patch.object(ai_service, "get_copy_provider", return_value=copy_mock):
            with patch.object(ai_service, "get_image_provider", return_value=image_mock):
                with pytest.raises(CopyError):
                    await ai_service.generate_content(
                        MOCK_COPY_INPUT, MOCK_IMAGE_INPUT, "session-1"
                    )

    async def test_generate_content_image_failure_does_not_fail(self):
        """Image failure → copy tetap dikembalikan, image_result kosong."""
        copy_mock = MagicMock()
        copy_mock.generate_copy = AsyncMock(return_value=_MOCK_COPY_RESULT)
        image_mock = MagicMock()
        image_mock.generate_images = AsyncMock(side_effect=RuntimeError("SDXL down"))

        with patch.object(ai_service, "get_copy_provider", return_value=copy_mock):
            with patch.object(ai_service, "get_image_provider", return_value=image_mock):
                copy_result, image_result = await ai_service.generate_content(
                    MOCK_COPY_INPUT, MOCK_IMAGE_INPUT, "session-1"
                )

        assert len(copy_result.variants) == 3
        assert image_result.image_urls == [None, None, None]
