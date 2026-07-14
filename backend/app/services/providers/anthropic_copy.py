import json
import logging

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)
from app.services.providers.ai_types import CopyInput, CopyResult, CopyVariant
from app.services.providers.copy_prompt import (
    COPY_PROMPT_TEMPLATE,
    build_carousel_prompt,
    intent_guidance,
    intent_lengths,
    render_slot_spec,
)


class AnthropicCopyProvider:
    def __init__(self):
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def generate_copy(self, input: CopyInput) -> CopyResult:
        if input.content_type == "Carousel":
            prompt = self._build_carousel_prompt(input)
            max_tokens = 3072  # carousel needs more tokens for N slides
        else:
            prompt = self._build_single_prompt(input)
            max_tokens = 2048

        logger.info(
            "AI COPY PROMPT [provider=anthropic model=%s content_type=%s]:\n%s",
            settings.ai_copy_model, input.content_type, prompt,
        )

        message = await self._client.messages.create(
            model=settings.ai_copy_model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        data = json.loads(raw)

        return CopyResult(
            variants=[
                CopyVariant(
                    variant_number=v["variant_number"],
                    copy=v["copy"],
                    typography=v["typography"],
                )
                for v in data["variants"]
            ]
        )

    def _build_single_prompt(self, input: CopyInput) -> str:
        lengths = intent_lengths(input.copy_intent)
        return COPY_PROMPT_TEMPLATE.format(
            business_name=input.business_name,
            industry=input.industry,
            template_theme=input.template_theme,
            copy_intent_guidance=intent_guidance(input.copy_intent),
            slot_spec=render_slot_spec(input.copy_brief, input.copy_intent),
            max_headline_words=lengths["headline"],
            max_body_words=lengths["body"],
            max_cta_words=lengths["cta"],
            goal=input.goal or "promo",
            platform=input.platform or "instagram_feed",
            language_style=input.language_style,
            language_preference=input.language_preference,
            brand_colors=", ".join(input.brand_colors) if input.brand_colors else "tidak ditentukan",
            product_or_service=input.product_or_service or "tidak diisi",
            key_message=input.key_message or "tidak diisi",
            promo_detail=input.promo_detail or "-",
            additional_notes=input.additional_notes or "-",
            campaign_data=json.dumps(input.campaign_data, ensure_ascii=False) if input.campaign_data else "{}",
        )

    def _build_carousel_prompt(self, input: CopyInput) -> str:
        return build_carousel_prompt(
            slide_count=max(2, input.slide_count),
            business_name=input.business_name,
            industry=input.industry,
            template_theme=input.template_theme,
            copy_intent=input.copy_intent,
            goal=input.goal or "promo",
            platform=input.platform or "instagram_feed",
            language_style=input.language_style,
            language_preference=input.language_preference,
            brand_colors=", ".join(input.brand_colors) if input.brand_colors else "tidak ditentukan",
            product_or_service=input.product_or_service or "tidak diisi",
            key_message=input.key_message or "tidak diisi",
            promo_detail=input.promo_detail or "-",
            additional_notes=input.additional_notes or "-",
        )
