"""
AI service — orchestrator untuk copy dan image generation.
Entry point wajib untuk semua AI call; jangan panggil provider langsung dari router.
"""
import asyncio
import json
import logging

from app.config import settings
from app.services.providers.ai_types import (
    CopyError,
    CopyInput,
    CopyInvalidJsonError,
    CopyResult,
    CopyTimeoutError,
    ImageError,
    ImageInput,
    ImageResult,
    ImageTimeoutError,
)

logger = logging.getLogger(__name__)

_COPY_TIMEOUT = 30.0
_IMAGE_TIMEOUT = 60.0
_COPY_MAX_RETRIES = 2


def get_copy_provider():
    provider_name = settings.ai_copy_provider
    if provider_name == "anthropic":
        from app.services.providers.anthropic_copy import AnthropicCopyProvider
        return AnthropicCopyProvider()
    if provider_name == "deepseek":
        from app.services.providers.deepseek_copy import DeepSeekCopyProvider
        return DeepSeekCopyProvider()
    raise ValueError(f"Unknown copy provider: {provider_name}")


def get_image_provider():
    provider_name = settings.ai_image_provider
    if provider_name == "replicate":
        from app.services.providers.replicate_image import ReplicateImageProvider
        return ReplicateImageProvider()
    raise ValueError(f"Unknown image provider: {provider_name}")


async def _generate_copy_with_retry(copy_input: CopyInput) -> CopyResult:
    """Generate copy dengan timeout 30s dan retry 2x untuk invalid JSON."""
    provider = get_copy_provider()
    last_error: Exception | None = None

    for attempt in range(1, _COPY_MAX_RETRIES + 2):
        try:
            result = await asyncio.wait_for(
                provider.generate_copy(copy_input),
                timeout=_COPY_TIMEOUT,
            )
            return result
        except TimeoutError:
            raise CopyTimeoutError("Copy provider timeout setelah 30 detik.")
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            last_error = CopyInvalidJsonError(f"Invalid JSON dari copy provider: {e}")
            logger.warning("Copy provider returned invalid JSON (attempt %d/%d)", attempt, _COPY_MAX_RETRIES + 1)
            if attempt > _COPY_MAX_RETRIES:
                raise last_error
        except Exception as e:
            raise CopyError(f"Copy provider error: {e}") from e

    raise last_error  # type: ignore[misc]


async def _generate_images_safe(image_input: ImageInput, session_id: str) -> ImageResult:
    """Generate images dengan timeout 60s. Error/timeout → return empty result (session tetap lanjut)."""
    provider = get_image_provider()
    try:
        result = await asyncio.wait_for(
            provider.generate_images(image_input),
            timeout=_IMAGE_TIMEOUT,
        )
        return result
    except TimeoutError:
        logger.warning("Image provider timeout untuk session %s — skip thematic image", session_id)
        return ImageResult()
    except Exception as e:
        logger.warning("Image provider error untuk session %s: %s — skip thematic image", session_id, e)
        return ImageResult()


async def _call_copy_provider_raw(prompt: str, max_tokens: int = 2048) -> str:
    """Kirim prompt bebas ke copy provider aktif, return teks hasil.

    Default max_tokens=2048 agar cukup untuk reasoning model (DeepSeek R/Flash)
    yang mengonsumsi ratusan token thinking sebelum menghasilkan output.
    """
    provider_name = settings.ai_copy_provider
    if provider_name == "anthropic":
        import anthropic as _anthropic
        client = _anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        msg = await client.messages.create(
            model=settings.ai_copy_model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text.strip()
    if provider_name == "deepseek":
        import openai as _openai
        client = _openai.AsyncOpenAI(api_key=settings.deepseek_api_key, base_url="https://api.deepseek.com")
        resp = await client.chat.completions.create(
            model=settings.ai_copy_model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return (resp.choices[0].message.content or "").strip()
    raise ValueError(f"Unknown copy provider: {provider_name}")


async def generate_image_suggestions(
    content_brief: str,
    template_theme: str,
    industry: str,
    target_audience: str = "",
    language_preference: str = "id",
) -> list[str]:
    """Generate 3 prompt saran gambar dari brief + preferensi konten. Return list kosong jika gagal."""
    import json
    import re
    from app.services.providers.copy_prompt import IMAGE_SUGGESTIONS_PROMPT

    prompt = IMAGE_SUGGESTIONS_PROMPT.format(
        content_brief=content_brief,
        template_theme=template_theme or "-",
        industry=industry or "-",
        target_audience=target_audience or "umum",
        language_preference=language_preference or "id",
    )
    try:
        raw = await asyncio.wait_for(_call_copy_provider_raw(prompt), timeout=30.0)
        if not raw:
            logger.warning("generate_image_suggestions: empty response from provider")
            return []
        # Strip markdown code blocks jika ada
        raw = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
        # Ambil JSON object pertama yang ditemukan
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            raw = match.group()
        data = json.loads(raw)
        return data.get("suggestions", [])[:3]
    except Exception as e:
        logger.error("generate_image_suggestions gagal: %s", e)
        return []


async def generate_single_image(prompt: str) -> str | None:
    """Generate satu gambar dari prompt teks. Return URL atau None jika gagal."""
    image_input = ImageInput(theme=prompt, num_outputs=1)
    result = await _generate_images_safe(image_input, "manual")
    return result.image_urls[0] if result.image_urls else None


async def generate_content(
    copy_input: CopyInput,
    image_input: ImageInput | None,
    session_id: str,
) -> tuple[CopyResult, ImageResult]:
    """
    Panggil copy dan image provider secara paralel (asyncio.gather).
    Copy failure → raise CopyError (session jadi failed).
    Image failure → return ImageResult kosong (session tetap completed).
    """
    if image_input:
        copy_result, image_result = await asyncio.gather(
            _generate_copy_with_retry(copy_input),
            _generate_images_safe(image_input, session_id),
        )
    else:
        copy_result = await _generate_copy_with_retry(copy_input)
        image_result = ImageResult()

    return copy_result, image_result
