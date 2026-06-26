"""
Test ReplicateImageProvider — replicate.async_run di-mock, tidak ada network request.
Verifikasi bahwa input params yang dikirim ke Replicate sesuai dengan model yang aktif.
"""
from unittest.mock import AsyncMock, patch

import pytest

from app.services.providers.ai_types import ImageInput


MOCK_IMAGE_INPUT = ImageInput(
    theme="seasonal_lebaran",
    num_outputs=3,
    width=1024,
    height=1024,
    num_inference_steps=25,
    guidance_scale=7.5,
)


def _make_provider():
    from app.services.providers.replicate_image import ReplicateImageProvider
    return ReplicateImageProvider()


class TestBuildModelInput:
    """Unit test untuk fungsi _build_model_input — tidak perlu mock replicate."""

    def test_sdxl_input_has_negative_prompt(self):
        from app.services.providers.replicate_image import _build_model_input
        payload = _build_model_input("stability-ai/sdxl", "test prompt", MOCK_IMAGE_INPUT)
        assert "negative_prompt" in payload

    def test_sdxl_input_has_width_and_height(self):
        from app.services.providers.replicate_image import _build_model_input
        payload = _build_model_input("stability-ai/sdxl", "test prompt", MOCK_IMAGE_INPUT)
        assert payload["width"] == 1024
        assert payload["height"] == 1024

    def test_sdxl_input_has_guidance_scale(self):
        from app.services.providers.replicate_image import _build_model_input
        payload = _build_model_input("stability-ai/sdxl", "test prompt", MOCK_IMAGE_INPUT)
        assert "guidance_scale" in payload
        assert payload["guidance_scale"] == 7.5

    def test_sdxl_input_prompt_is_set(self):
        from app.services.providers.replicate_image import _build_model_input
        payload = _build_model_input("stability-ai/sdxl", "test prompt", MOCK_IMAGE_INPUT)
        assert payload["prompt"] == "test prompt"

    def test_flux_schnell_input_no_negative_prompt(self):
        from app.services.providers.replicate_image import _build_model_input
        payload = _build_model_input("black-forest-labs/flux-schnell", "test prompt", MOCK_IMAGE_INPUT)
        assert "negative_prompt" not in payload

    def test_flux_schnell_input_no_width_height(self):
        from app.services.providers.replicate_image import _build_model_input
        payload = _build_model_input("black-forest-labs/flux-schnell", "test prompt", MOCK_IMAGE_INPUT)
        assert "width" not in payload
        assert "height" not in payload

    def test_flux_schnell_input_no_guidance_scale(self):
        from app.services.providers.replicate_image import _build_model_input
        payload = _build_model_input("black-forest-labs/flux-schnell", "test prompt", MOCK_IMAGE_INPUT)
        assert "guidance_scale" not in payload

    def test_flux_schnell_input_has_aspect_ratio(self):
        from app.services.providers.replicate_image import _build_model_input
        payload = _build_model_input("black-forest-labs/flux-schnell", "test prompt", MOCK_IMAGE_INPUT)
        assert "aspect_ratio" in payload

    def test_flux_schnell_input_steps_capped_at_4(self):
        """flux-schnell max num_inference_steps adalah 4."""
        from app.services.providers.replicate_image import _build_model_input
        high_steps_input = ImageInput(theme="promo", num_inference_steps=25)
        payload = _build_model_input("black-forest-labs/flux-schnell", "test prompt", high_steps_input)
        assert payload["num_inference_steps"] <= 4

    def test_flux_schnell_input_has_output_format(self):
        from app.services.providers.replicate_image import _build_model_input
        payload = _build_model_input("black-forest-labs/flux-schnell", "test prompt", MOCK_IMAGE_INPUT)
        assert payload["output_format"] == "png"

    def test_flux_schnell_prompt_is_set(self):
        from app.services.providers.replicate_image import _build_model_input
        payload = _build_model_input("black-forest-labs/flux-schnell", "test prompt", MOCK_IMAGE_INPUT)
        assert payload["prompt"] == "test prompt"

    def test_unknown_model_defaults_to_sdxl_style(self):
        """Model yang tidak dikenali → fallback ke format SDXL."""
        from app.services.providers.replicate_image import _build_model_input
        payload = _build_model_input("some-org/some-model", "test prompt", MOCK_IMAGE_INPUT)
        assert "negative_prompt" in payload
        assert "width" in payload

    def test_flux_dev_uses_flux_schnell_input(self):
        """Model flux-dev juga termasuk keluarga flux → pakai flux input builder."""
        from app.services.providers.replicate_image import _build_model_input
        payload = _build_model_input("black-forest-labs/flux-dev", "test prompt", MOCK_IMAGE_INPUT)
        assert "negative_prompt" not in payload
        assert "aspect_ratio" in payload

    def test_num_outputs_forwarded_for_both_models(self):
        from app.services.providers.replicate_image import _build_model_input
        inp = ImageInput(theme="promo", num_outputs=2)
        sdxl = _build_model_input("stability-ai/sdxl", "p", inp)
        flux = _build_model_input("black-forest-labs/flux-schnell", "p", inp)
        assert sdxl["num_outputs"] == 2
        assert flux["num_outputs"] == 2


class TestReplicateImageProviderIntegration:
    """Test generate_images end-to-end dengan mock replicate.async_run."""

    async def test_generate_images_sdxl_success(self):
        mock_output = [
            "https://replicate.delivery/img1.png",
            "https://replicate.delivery/img2.png",
            "https://replicate.delivery/img3.png",
        ]
        with patch("replicate.async_run", new=AsyncMock(return_value=mock_output)):
            with patch("app.services.providers.replicate_image.settings") as mock_settings:
                mock_settings.ai_image_model = "stability-ai/sdxl"
                provider = _make_provider()
                result = await provider.generate_images(MOCK_IMAGE_INPUT)

        assert len(result.image_urls) == 3
        assert result.image_urls[0] == "https://replicate.delivery/img1.png"

    async def test_generate_images_flux_schnell_success(self):
        mock_output = [
            "https://replicate.delivery/flux1.png",
            "https://replicate.delivery/flux2.png",
            "https://replicate.delivery/flux3.png",
        ]
        with patch("replicate.async_run", new=AsyncMock(return_value=mock_output)):
            with patch("app.services.providers.replicate_image.settings") as mock_settings:
                mock_settings.ai_image_model = "black-forest-labs/flux-schnell"
                provider = _make_provider()
                result = await provider.generate_images(MOCK_IMAGE_INPUT)

        assert len(result.image_urls) == 3
        assert result.image_urls[0] == "https://replicate.delivery/flux1.png"

    async def test_generate_images_sdxl_sends_correct_params(self):
        """Verifikasi SDXL params yang dikirim ke replicate.async_run."""
        with patch("replicate.async_run", new=AsyncMock(return_value=[])) as mock_run:
            with patch("app.services.providers.replicate_image.settings") as mock_settings:
                mock_settings.ai_image_model = "stability-ai/sdxl"
                provider = _make_provider()
                await provider.generate_images(MOCK_IMAGE_INPUT)

        _, call_kwargs = mock_run.call_args
        sent_input = call_kwargs["input"]
        assert "negative_prompt" in sent_input
        assert "width" in sent_input
        assert "guidance_scale" in sent_input

    async def test_generate_images_flux_schnell_sends_correct_params(self):
        """Verifikasi flux-schnell params yang dikirim ke replicate.async_run."""
        with patch("replicate.async_run", new=AsyncMock(return_value=[])) as mock_run:
            with patch("app.services.providers.replicate_image.settings") as mock_settings:
                mock_settings.ai_image_model = "black-forest-labs/flux-schnell"
                provider = _make_provider()
                await provider.generate_images(MOCK_IMAGE_INPUT)

        _, call_kwargs = mock_run.call_args
        sent_input = call_kwargs["input"]
        assert "negative_prompt" not in sent_input
        assert "aspect_ratio" in sent_input
        assert sent_input["num_inference_steps"] <= 4

    async def test_generate_images_uses_model_from_settings(self):
        """Model ID yang dikirim ke replicate.async_run dibaca dari settings."""
        with patch("replicate.async_run", new=AsyncMock(return_value=[])) as mock_run:
            with patch("app.services.providers.replicate_image.settings") as mock_settings:
                mock_settings.ai_image_model = "black-forest-labs/flux-schnell"
                provider = _make_provider()
                await provider.generate_images(MOCK_IMAGE_INPUT)

        model_called = mock_run.call_args.args[0]
        assert model_called == "black-forest-labs/flux-schnell"

    async def test_generate_images_pads_urls_to_3_when_output_short(self):
        """Output < 3 → sisa diisi None."""
        with patch("replicate.async_run", new=AsyncMock(return_value=["https://img1.png"])):
            with patch("app.services.providers.replicate_image.settings") as mock_settings:
                mock_settings.ai_image_model = "stability-ai/sdxl"
                provider = _make_provider()
                result = await provider.generate_images(MOCK_IMAGE_INPUT)

        assert result.image_urls[0] == "https://img1.png"
        assert result.image_urls[1] is None
        assert result.image_urls[2] is None

    async def test_generate_images_empty_output_returns_all_none(self):
        """Output kosong → semua None."""
        with patch("replicate.async_run", new=AsyncMock(return_value=[])):
            with patch("app.services.providers.replicate_image.settings") as mock_settings:
                mock_settings.ai_image_model = "stability-ai/sdxl"
                provider = _make_provider()
                result = await provider.generate_images(MOCK_IMAGE_INPUT)

        assert result.image_urls == [None, None, None]
