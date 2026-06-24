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
