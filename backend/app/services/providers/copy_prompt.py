from app.services.providers.ai_types import CopyBrief

# copy_intent = kategori NIAT COPY tiap template. Bukan tema visual, tapi ARAH cara AI menulis:
# apakah template ini "wadah" untuk menjual (promosi), bercerita/mengedukasi (story),
# atau menegaskan brand (brand). Nilai diambil dari kolom template.copy_intent.
COPY_INTENT_GUIDANCE: dict[str, str] = {
    "promotion": (
        "MODE COPY: PROMOSI (jualan/penawaran). Tujuan copy adalah mendorong aksi beli. "
        "Headline singkat & memikat, tonjolkan angka/diskon/benefit penawaran dan rasa urgensi "
        "(mis. terbatas, hari ini saja). Body langsung ke intinya. CTA HARUS kuat & mendesak "
        "(mis. 'Beli Sekarang', 'Klaim Promo'). Gunakan Detail Promo bila tersedia; jangan mengarang diskon."
    ),
    "story": (
        "MODE COPY: CERITA/EDUKASI (narasi). Tujuan copy adalah menarik minat & memberi nilai, bukan hard-sell. "
        "Bangun alur: mulai dari hook/fakta/pain point, beri insight atau manfaat, tutup dengan ajakan LEMBUT. "
        "Body boleh lebih deskriptif & personal. CTA halus (mis. 'Pelajari Selengkapnya', 'Cari Tahu'). "
        "Hindari bahasa diskon/urgensi ala iklan flash sale."
    ),
    "brand": (
        "MODE COPY: BRAND STATEMENT (positioning). Tujuan copy adalah menegaskan nilai/identitas brand "
        "secara aspiratif & ringkas. Headline terasa seperti tagline: percaya diri, tidak menjual diskon. "
        "JANGAN mengarang promo/angka yang tidak diberikan. Body menegaskan janji/keunggulan brand. "
        "CTA opsional & soft (mis. 'Kenali Kami')."
    ),
}

_INTENT_FALLBACK = (
    "MODE COPY: UMUM. Sesuaikan gaya copy dengan Tema Template dan Tujuan Konten di atas."
)


def intent_guidance(copy_intent: str | None) -> str:
    """Kembalikan blok instruksi cara-menulis untuk copy_intent. Tak dikenal/kosong → fallback generic."""
    if not copy_intent:
        return _INTENT_FALLBACK
    return COPY_INTENT_GUIDANCE.get(copy_intent.strip().lower(), _INTENT_FALLBACK)


# Batas kata per slot menurut copy_intent — menjaga copy proporsional dengan tipe template.
# Promosi = paling pendek (punchy, display font); story = paling lapang (naratif); brand = tagline.
COPY_INTENT_LENGTHS: dict[str, dict[str, int]] = {
    "promotion": {"headline": 5, "body": 15, "cta": 4},
    "story":     {"headline": 10, "body": 35, "cta": 5},
    "brand":     {"headline": 6, "body": 20, "cta": 3},
}

# Fallback = batas lama (12/35/5) → template tanpa copy_intent berperilaku persis seperti sebelumnya.
_LENGTH_FALLBACK: dict[str, int] = {"headline": 12, "body": 35, "cta": 5}


def intent_lengths(copy_intent: str | None) -> dict[str, int]:
    """Batas kata {headline, body, cta} untuk copy_intent. Tak dikenal/kosong → fallback nilai lama."""
    if not copy_intent:
        return dict(_LENGTH_FALLBACK)
    return dict(COPY_INTENT_LENGTHS.get(copy_intent.strip().lower(), _LENGTH_FALLBACK))


# Kosakata bind tetap (README §4). Urutan kanonik untuk output slot yang stabil.
_BIND_ORDER: tuple[str, ...] = ("headline", "body", "cta")


def collect_bind_slots(template_config: dict) -> list[str]:
    """Kumpulkan bind yang ADA di template — REKURSIF ke `group.children` (README §6).
    Hanya bind dari kosakata tetap yang dihitung; dikembalikan dalam urutan kanonik."""
    found: set[str] = set()

    def _walk(elements) -> None:
        for el in elements or []:
            bind = el.get("bind")
            if bind:
                found.add(bind)
            if el.get("type") == "group":
                _walk(el.get("children"))

    _walk((template_config or {}).get("elements"))
    return [b for b in _BIND_ORDER if b in found]


def build_copy_brief(template_config: dict, copy_intent: str | None) -> CopyBrief:
    """Kompilasi template_config + copy_intent → CopyBrief: slot yang ada + batas kata per slot.
    Pure & read-only (tak memutasi template_config → aman thd Template Integrity)."""
    lengths = intent_lengths(copy_intent)
    slots = {b: lengths[b] for b in collect_bind_slots(template_config) if b in lengths}
    return CopyBrief(intent=copy_intent, slots=slots)


def render_slot_spec(brief: CopyBrief | None, copy_intent: str | None = None) -> str:
    """Ubah CopyBrief jadi blok instruksi slot untuk prompt. brief None (caller lama) →
    fallback: anggap semua slot ada dengan batas intent (perilaku ~ sebelum brief compiler)."""
    if brief is None:
        brief = CopyBrief(intent=copy_intent, slots=intent_lengths(copy_intent))

    lines = ["Slot teks yang HARUS diisi untuk template ini:"]
    for bind in _BIND_ORDER:
        if bind in brief.slots:
            lines.append(f"- {bind} — maksimal {brief.slots[bind]} kata")
    # Slot opsional yang TIDAK ada di layout → suruh AI set null (jangan mengarang).
    for bind in ("body", "cta"):
        if bind not in brief.slots:
            lines.append(f'Template ini TIDAK punya slot {bind} → set "{bind}" ke null, jangan mengarang.')
    return "\n".join(lines)


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
    copy_intent: str | None = None,
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

{intent_guidance(copy_intent)}

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

{copy_intent_guidance}

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

{slot_spec}

Buat JSON dengan format berikut (HARUS valid JSON, tidak ada teks lain):
{{
  "variants": [
    {{
      "variant_number": 1,
      "copy": {{
        "headline": "Judul utama maksimal {max_headline_words} kata",
        "body": "Body copy maksimal {max_body_words} kata yang meyakinkan",
        "cta": "Teks tombol maksimal {max_cta_words} kata"
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
