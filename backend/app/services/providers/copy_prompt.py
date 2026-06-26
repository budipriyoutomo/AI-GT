IMAGE_SUGGESTIONS_PROMPT = """
Kamu adalah creative director untuk konten marketing UKM Indonesia.

Brief konten: {content_brief}
Industri: {industry}
Tema template: {template_theme}
Target audiens: {target_audience}
Bahasa konten: {language_preference}

Buat tepat 3 prompt deskripsi gambar yang berbeda-beda sebagai saran elemen visual untuk konten ini.
Setiap prompt:
- Maksimal 15 kata, deskriptif dan mudah divisualisasikan
- Relevan dengan brief konten dan sesuai target audiens di atas
- Berbeda sudut pandang (contoh: fokus produk, suasana tempat, ekspresi pelanggan)
- Dalam bahasa Indonesia

Return HANYA JSON valid (tidak ada teks lain):
{{"suggestions": ["prompt 1", "prompt 2", "prompt 3"]}}
"""

COPY_PROMPT_TEMPLATE = """
Kamu adalah copywriter marketing profesional untuk UKM Indonesia.

Buat 3 varian copy untuk konten marketing dengan data berikut:
- Nama Bisnis: {business_name}
- Industri: {industry}
- Tema Template: {template_theme}
- Gaya Bahasa: {language_style}
- Bahasa: {language_preference}
- Warna Brand: {brand_colors}
- Brief Konten: {content_brief}
- Target Audiens: {target_audience}
- Data Kampanye Tambahan: {campaign_data}

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
