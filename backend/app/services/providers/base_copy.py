from typing import Protocol, runtime_checkable

from app.services.providers.ai_types import CopyInput, CopyResult


@runtime_checkable
class CopyProvider(Protocol):
    async def generate_copy(self, input: CopyInput) -> CopyResult: ...
