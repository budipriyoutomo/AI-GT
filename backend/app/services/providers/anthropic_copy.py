import json

import anthropic

from app.config import settings
from app.services.providers.ai_types import CopyInput, CopyResult, CopyVariant


_PROMPT_TEMPLATE = """
Kamu adalah copywriter marketing profesional untuk UKM Indonesia.

Buat 3 varian copy untuk konten marketing dengan data berikut:
- Nama Bisnis: {business_name}
- Industri: {industry}
- Tema Template: {template_theme}
- Gaya Bahasa: {language_style}
- Bahasa: {language_preference}
- Warna Brand: {brand_colors}
- Data Kampanye: {campaign_data}

Untuk setiap varian, buat JSON dengan format berikut (HARUS valid JSON, tidak ada teks lain):
{{
  "variants": [
    {{
      "variant_number": 1,
      "copy": {{
        "headline": "Judul utama maksimal 12 kata",
        "body": "Body copy maksimal 35 kata yang meyakinkan",
        "cta": "Teks tombol maksimal 5 kata"
      }},
      "typography": {{
        "headline_font": "NamaFont dari Google Fonts",
        "body_font": "NamaFont dari Google Fonts",
        "headline_size": 36,
        "body_size": 16,
        "letter_spacing": 0.5
      }}
    }},
    {{ "variant_number": 2, ... }},
    {{ "variant_number": 3, ... }}
  ]
}}

Pastikan setiap varian memiliki tone yang berbeda (misal: emosional, informatif, urgensi).
Gunakan bahasa {language_preference} untuk semua copy.
Return HANYA JSON, tidak ada penjelasan tambahan.
"""


class AnthropicCopyProvider:
    def __init__(self):
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def generate_copy(self, input: CopyInput) -> CopyResult:
        prompt = _PROMPT_TEMPLATE.format(
            business_name=input.business_name,
            industry=input.industry,
            template_theme=input.template_theme,
            language_style=input.language_style,
            language_preference=input.language_preference,
            brand_colors=", ".join(input.brand_colors) if input.brand_colors else "tidak ditentukan",
            campaign_data=json.dumps(input.campaign_data, ensure_ascii=False) if input.campaign_data else "{}",
        )

        message = await self._client.messages.create(
            model=settings.ai_copy_model,
            max_tokens=2048,
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
