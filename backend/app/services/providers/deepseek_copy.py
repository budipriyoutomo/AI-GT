import json

import openai

from app.config import settings
from app.services.providers.ai_types import CopyInput, CopyResult, CopyVariant
from app.services.providers.copy_prompt import COPY_PROMPT_TEMPLATE, build_carousel_prompt


class DeepSeekCopyProvider:
    def __init__(self):
        self._client = openai.AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com",
        )

    async def generate_copy(self, input: CopyInput) -> CopyResult:
        if input.content_type == "Carousel":
            prompt = build_carousel_prompt(
                slide_count=max(2, input.slide_count),
                business_name=input.business_name,
                industry=input.industry,
                template_theme=input.template_theme,
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
            max_tokens = 3072
        else:
            prompt = COPY_PROMPT_TEMPLATE.format(
                business_name=input.business_name,
                industry=input.industry,
                template_theme=input.template_theme,
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
            max_tokens = 2048

        response = await self._client.chat.completions.create(
            model=settings.ai_copy_model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.choices[0].message.content.strip()
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
