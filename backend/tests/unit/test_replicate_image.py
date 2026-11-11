"""
Test ReplicateImageProvider — replicate.Client di-mock, tidak ada network request.
Verifikasi bahwa input params yang dikirim ke Replicate sesuai dengan model yang aktif.
"""
from unittest.mock import AsyncMock, MagicMock, patch

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
    """Test generate_images end-to-end dengan mock `replicate.Client` — tanpa network.

    Diperbarui (P3-2): provider memanggil lewat `replicate.Client(api_token=...).async_run`,
    bukan `replicate.async_run` modul — patch lama tidak kena sehingga test menembak
    Replicate sungguhan. Provider juga kini hanya mengembalikan 1 gambar
    ("1 generation = 1 visual"), bukan dilengkapi None sampai 3.
    """

    async def _generate(self, model: str, output):
        """Panggil provider dengan `replicate.Client` & settings di-patch; return (result, async_run, Client)."""
        run = AsyncMock(return_value=output)
        with patch("app.services.providers.replicate_image.replicate.Client", return_value=MagicMock(async_run=run)) as cls, \
             patch("app.services.providers.replicate_image.settings") as mock_settings:
            mock_settings.ai_image_model = model
            mock_settings.replicate_api_token = "r8_test"
            result = await _make_provider().generate_images(MOCK_IMAGE_INPUT)
        return result, run, cls

    async def test_generate_images_sdxl_success(self):
        result, _, _ = await self._generate("stability-ai/sdxl", [
            "https://replicate.delivery/img1.png", "https://replicate.delivery/img2.png",
        ])
        assert result.image_urls == ["https://replicate.delivery/img1.png"]

    async def test_generate_images_flux_schnell_success(self):
        result, _, _ = await self._generate("black-forest-labs/flux-schnell", ["https://replicate.delivery/flux1.png"])
        assert result.image_urls == ["https://replicate.delivery/flux1.png"]

    async def test_uses_explicit_api_token(self):
        _, _, cls = await self._generate("stability-ai/sdxl", [])
        cls.assert_called_once_with(api_token="r8_test")

    async def test_generate_images_sdxl_sends_correct_params(self):
        _, run, _ = await self._generate("stability-ai/sdxl", [])
        sent_input = run.call_args.kwargs["input"]
        assert "negative_prompt" in sent_input
        assert "width" in sent_input
        assert "guidance_scale" in sent_input

    async def test_generate_images_flux_schnell_sends_correct_params(self):
        _, run, _ = await self._generate("black-forest-labs/flux-schnell", [])
        sent_input = run.call_args.kwargs["input"]
        assert "negative_prompt" not in sent_input
        assert "aspect_ratio" in sent_input
        assert sent_input["num_inference_steps"] <= 4

    async def test_generate_images_uses_model_from_settings(self):
        _, run, _ = await self._generate("black-forest-labs/flux-schnell", [])
        assert run.call_args.args[0] == "black-forest-labs/flux-schnell"

    async def test_output_urls_are_stringified(self):
        """Replicate bisa mengembalikan FileOutput, bukan str."""
        class FileOutput:
            def __str__(self):
                return "https://replicate.delivery/file.png"
        result, _, _ = await self._generate("stability-ai/sdxl", [FileOutput()])
        assert result.image_urls == ["https://replicate.delivery/file.png"]

    async def test_generate_images_empty_output_returns_empty(self):
        for output in ([], None):
            result, _, _ = await self._generate("stability-ai/sdxl", output)
            assert result.image_urls == []

    def test_build_prompt_expands_theme_key_or_uses_raw_text(self):
        from app.services.providers.replicate_image import _THEME_PROMPTS, _build_prompt
        key = next(iter(_THEME_PROMPTS))
        assert _build_prompt(key).startswith(_THEME_PROMPTS[key])
        assert _build_prompt("kopi susu gula aren").startswith("kopi susu gula aren")
