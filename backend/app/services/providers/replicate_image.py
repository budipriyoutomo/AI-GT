import replicate

from app.config import settings
from app.services.providers.ai_types import ImageInput, ImageResult


_THEME_PROMPTS = {
    "seasonal_lebaran": "Eid al-Fitr celebration, crescent moon and lanterns, warm golden light, Indonesian cultural elements, marketing banner style",
    "seasonal_harbolnas": "11.11 sale celebration, confetti explosion, shopping bags, vibrant colors, promotional banner style",
    "promo": "promotional sale banner, vibrant colors, modern graphic design, clean layout",
    "outdoor_nature": "fresh outdoor nature, green landscape, natural light, product lifestyle photography style",
}

_DEFAULT_NEGATIVE = "text, watermark, logo, blurry, low quality, distorted"


def _build_prompt(theme: str) -> str:
    base = _THEME_PROMPTS.get(theme, f"{theme} themed marketing visual")
    return f"{base}, high quality, professional marketing image, 4k"


class ReplicateImageProvider:
    async def generate_images(self, input: ImageInput) -> ImageResult:
        prompt = _build_prompt(input.theme)

        output = await replicate.async_run(
            settings.ai_image_model,
            input={
                "prompt": prompt,
                "negative_prompt": _DEFAULT_NEGATIVE,
                "width": input.width,
                "height": input.height,
                "num_inference_steps": input.num_inference_steps,
                "guidance_scale": input.guidance_scale,
                "num_outputs": input.num_outputs,
            },
        )

        urls = [str(url) for url in output] if output else []
        while len(urls) < 3:
            urls.append(None)

        return ImageResult(image_urls=urls[:3])
