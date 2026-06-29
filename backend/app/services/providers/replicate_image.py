import replicate

from app.config import settings
from app.services.providers.ai_types import ImageInput, ImageResult


_THEME_PROMPTS = {
    "lebaran": "Eid al-Fitr celebration, crescent moon and lanterns, warm golden light, Indonesian cultural elements, marketing banner style",
    "harbolnas": "12.12 Harbolnas sale celebration, confetti explosion, shopping bags, vibrant colors, promotional banner style",
    "hari-buruh": "International Labor Day, workers solidarity, red and white colors, Indonesian patriotic style, marketing banner",
    "hut-ri": "Indonesian Independence Day 17 August, red white flag, patriotic celebration, gold accents, marketing banner",
    "tahun-baru": "New Year celebration, fireworks, gold confetti, festive party atmosphere, marketing banner style",
    "valentine": "Valentine's Day, red hearts, roses, romantic mood, soft pink and red tones, marketing banner",
    "natal": "Christmas celebration, pine trees, snow, red and green colors, gift boxes, festive marketing banner",
    "grand-opening": "Grand Opening celebration, ribbon cutting, celebratory balloons, gold confetti, store opening, marketing banner",
    "promo": "promotional sale banner, vibrant colors, modern graphic design, clean layout",
    "outdoor_nature": "fresh outdoor nature, green landscape, natural light, product lifestyle photography style",
}

_DEFAULT_NEGATIVE = "text, watermark, logo, blurry, low quality, distorted"

_FLUX_MAX_STEPS = 4

_ASPECT_RATIO_MAP = [
    (1.0,    "1:1"),
    (1.333,  "4:3"),
    (0.75,   "3:4"),
    (1.778,  "16:9"),
    (0.5625, "9:16"),
    (1.25,   "5:4"),
    (0.8,    "4:5"),
]


def _build_prompt(theme: str) -> str:
    # Jika theme adalah key di _THEME_PROMPTS, expand ke deskripsi lengkap.
    # Jika tidak (text prompt langsung dari user), gunakan apa adanya.
    base = _THEME_PROMPTS.get(theme, theme)
    return f"{base}, high quality, professional marketing image, 4k"


def _width_height_to_aspect_ratio(width: int, height: int) -> str:
    ratio = width / height
    return min(_ASPECT_RATIO_MAP, key=lambda x: abs(x[0] - ratio))[1]


def _build_sdxl_input(prompt: str, inp: ImageInput) -> dict:
    return {
        "prompt": prompt,
        "negative_prompt": _DEFAULT_NEGATIVE,
        "width": inp.width,
        "height": inp.height,
        "num_inference_steps": inp.num_inference_steps,
        "guidance_scale": inp.guidance_scale,
        "num_outputs": inp.num_outputs,
    }


def _build_flux_input(prompt: str, inp: ImageInput) -> dict:
    return {
        "prompt": prompt,
        "num_outputs": inp.num_outputs,
        "num_inference_steps": min(inp.num_inference_steps, _FLUX_MAX_STEPS),
        "aspect_ratio": _width_height_to_aspect_ratio(inp.width, inp.height),
        "output_format": "png",
    }


def _build_model_input(model: str, prompt: str, inp: ImageInput) -> dict:
    if "flux" in model:
        return _build_flux_input(prompt, inp)
    return _build_sdxl_input(prompt, inp)


class ReplicateImageProvider:
    def _client(self) -> replicate.Client:
        # Explicit token agar tidak bergantung pada env var REPLICATE_API_TOKEN.
        return replicate.Client(api_token=settings.replicate_api_token)

    async def generate_images(self, inp: ImageInput) -> ImageResult:
        client = self._client()
        model = settings.ai_image_model
        prompt = _build_prompt(inp.theme)

        output = await client.async_run(
            model,
            input=_build_model_input(model, prompt, inp),
        )

        urls = [str(url) for url in output] if output else []
        return ImageResult(image_urls=urls[:1])
