from typing import Protocol, runtime_checkable

from app.services.providers.ai_types import ImageInput, ImageResult


@runtime_checkable
class ImageProvider(Protocol):
    async def generate_images(self, input: ImageInput) -> ImageResult: ...
