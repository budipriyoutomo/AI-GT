import json

import openai

from app.config import settings
from app.services.providers.ai_types import CopyInput, CopyResult, CopyVariant
from app.services.providers.copy_prompt import COPY_PROMPT_TEMPLATE


class DeepSeekCopyProvider:
    def __init__(self):
        self._client = openai.AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com",
        )

    async def generate_copy(self, input: CopyInput) -> CopyResult:
        prompt = COPY_PROMPT_TEMPLATE.format(
            business_name=input.business_name,
            industry=input.industry,
            template_theme=input.template_theme,
            language_style=input.language_style,
            language_preference=input.language_preference,
            brand_colors=", ".join(input.brand_colors) if input.brand_colors else "tidak ditentukan",
            content_brief=input.content_brief or "tidak diisi",
            target_audience=input.target_audience or "umum",
            campaign_data=json.dumps(input.campaign_data, ensure_ascii=False) if input.campaign_data else "{}",
        )

        response = await self._client.chat.completions.create(
            model=settings.ai_copy_model,
            max_tokens=2048,
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
