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

# Aspect ratio terdekat dari width/height
_ASPECT_RATIO_MAP = [
    (1.0,   "1:1"),
    (1.333, "4:3"),
    (0.75,  "3:4"),
    (1.778, "16:9"),
    (0.5625,"9:16"),
    (1.25,  "5:4"),
    (0.8,   "4:5"),
]


def _build_prompt(theme: str) -> str:
    base = _THEME_PROMPTS.get(theme, f"{theme} themed marketing visual")
    return f"{base}, high quality, professional marketing image, 4k"


def _width_height_to_aspect_ratio(width: int, height: int) -> str:
    ratio = width / height
    return min(_ASPECT_RATIO_MAP, key=lambda x: abs(x[0] - ratio))[1]


def _build_sdxl_input(prompt: str, input: ImageInput) -> dict:
    return {
        "prompt": prompt,
        "negative_prompt": _DEFAULT_NEGATIVE,
        "width": input.width,
        "height": input.height,
        "num_inference_steps": input.num_inference_steps,
        "guidance_scale": input.guidance_scale,
        "num_outputs": input.num_outputs,
    }


def _build_flux_input(prompt: str, input: ImageInput) -> dict:
    return {
        "prompt": prompt,
        "num_outputs": input.num_outputs,
        "num_inference_steps": min(input.num_inference_steps, _FLUX_MAX_STEPS),
        "aspect_ratio": _width_height_to_aspect_ratio(input.width, input.height),
        "output_format": "png",
    }


def _build_model_input(model: str, prompt: str, input: ImageInput) -> dict:
    if "flux" in model:
        return _build_flux_input(prompt, input)
    return _build_sdxl_input(prompt, input)


class ReplicateImageProvider:
    async def generate_images(self, input: ImageInput) -> ImageResult:
        model = settings.ai_image_model
        prompt = _build_prompt(input.theme)

        output = await replicate.async_run(
            model,
            input=_build_model_input(model, prompt, input),
        )

        urls = [str(url) for url in output] if output else []
        while len(urls) < 3:
            urls.append(None)

        return ImageResult(image_urls=urls[:3])
