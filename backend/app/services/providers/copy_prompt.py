def build_carousel_prompt(
    slide_count: int,
    business_name: str,
    industry: str,
    template_theme: str,
    goal: str,
    platform: str,
    language_style: str,
    language_preference: str,
    brand_colors: str,
    product_or_service: str,
    key_message: str,
    promo_detail: str,
    additional_notes: str,
) -> str:
    """Bangun prompt carousel dengan contoh slide yang lengkap dan dinamis."""
    penultimate = max(2, slide_count - 1)

    slide_examples = []
    slide_examples.append(
        '{"slide_number": 1, "type": "cover", "headline": "Maks 10 kata", "body": "Maks 20 kata", "cta": "Maks 5 kata"}'
    )
    for i in range(2, slide_count):
        slide_examples.append(
            f'{{"slide_number": {i}, "type": "content", "headline": "Maks 10 kata", "body": "Maks 25 kata", "cta": null}}'
        )
    slide_examples.append(
        f'{{"slide_number": {slide_count}, "type": "closing", "headline": "Maks 10 kata", "body": "Maks 20 kata", "cta": "Maks 5 kata"}}'
    )
    slides_json = ",\n          ".join(slide_examples)

    return f"""Kamu adalah copywriter marketing profesional untuk UKM Indonesia.

Buat copy untuk KONTEN CAROUSEL {slide_count} slide dengan data berikut:
- Nama Bisnis: {business_name}
- Industri: {industry}
- Tema Template: {template_theme}
- Tujuan Konten: {goal}
- Platform: {platform}
- Gaya Bahasa: {language_style}
- Bahasa: {language_preference}
- Warna Brand: {brand_colors}
- Produk/Layanan: {product_or_service}
- Pesan Utama: {key_message}
- Detail Promo: {promo_detail}
- Catatan Tambahan: {additional_notes}

Struktur {slide_count} slide yang harus dibuat:
- Slide 1 (cover): Headline utama yang menarik perhatian, body teaser singkat, CTA kuat
- Slide 2 s/d {penultimate} (content): Subtopik/manfaat/poin berbeda per slide, body deskriptif, cta boleh null
- Slide {slide_count} (closing): Rangkuman singkat, ajakan kuat, CTA utama

Buat JSON dengan format berikut (HARUS valid JSON, tidak ada teks lain):
{{
  "variants": [
    {{
      "variant_number": 1,
      "copy": {{
        "content_type": "Carousel",
        "slides": [
          {slides_json}
        ]
      }},
      "typography": {{
        "headline_font": "NamaFont dari Google Fonts",
        "body_font": "NamaFont dari Google Fonts",
        "headline_size": 34,
        "body_size": 15,
        "letter_spacing": 0.5
      }}
    }}
  ]
}}

PENTING:
- Array slides HARUS berisi tepat {slide_count} elemen sesuai contoh di atas
- Slide 1 selalu type "cover", slide {slide_count} selalu type "closing", sisanya type "content"
- Setiap slide punya sudut pandang/poin yang BERBEDA
- Gunakan bahasa {language_preference} untuk semua copy
- Return HANYA JSON, tidak ada penjelasan tambahan
"""

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

Buat 1 copy untuk konten marketing dengan data berikut:
- Nama Bisnis: {business_name}
- Industri: {industry}
- Tema Template: {template_theme}
- Tujuan Konten: {goal}
- Platform: {platform}
- Gaya Bahasa: {language_style}
- Bahasa: {language_preference}
- Warna Brand: {brand_colors}
- Produk/Layanan: {product_or_service}
- Pesan Utama: {key_message}
- Detail Promo: {promo_detail}
- Catatan Tambahan: {additional_notes}
- Data Kampanye Tambahan: {campaign_data}

Buat JSON dengan format berikut (HARUS valid JSON, tidak ada teks lain):
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
    }}
  ]
}}

Gunakan bahasa {language_preference} untuk semua copy.
Pastikan copy sesuai tujuan {goal} dan dioptimalkan untuk platform {platform}.
Return HANYA JSON, tidak ada penjelasan tambahan.
"""
