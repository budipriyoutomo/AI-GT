from dataclasses import dataclass, field


@dataclass
class CopyBrief:
    """Ringkasan slot AI yang dikompilasi dari template_config untuk mengarahkan prompt copy.
    `slots` = bind yang BENAR-BENAR ada di template (headline/body/cta) → batas kata per slot.
    Slot yang tak ada tidak dimasukkan → prompt menyuruh AI set null (hindari CTA yang mubazir).
    `static_context` = teks statis yang sudah tercetak di template (eyebrow/tanggal/S&K) sebagai
    (role, teks) → diberikan ke AI sbagai konteks 'jangan diulang'."""
    intent: str | None
    slots: dict[str, int]
    static_context: list[tuple[str, str]] = field(default_factory=list)
    # Batas KARAKTER per slot, diturunkan dari geometri template (lebar × fontSize × baris
    # yang muat). Batas kata menjaga GAYA; batas karakter menjaga copy MUAT di layout —
    # jumlah kata tak berkorelasi dengan wrap. Slot tanpa geometri absolut (anak group)
    # tidak punya entri di sini.
    char_limits: dict[str, int] = field(default_factory=dict)


@dataclass
class CopyInput:
    business_name: str
    industry: str
    language_style: str
    language_preference: str
    template_theme: str
    copy_intent: str | None = None   # niat copy template: "promotion" | "story" | "brand"
    copy_brief: "CopyBrief | None" = None
    goal: str | None = None
    platform: str | None = None
    product_or_service: str | None = None
    key_message: str | None = None
    promo_detail: str | None = None
    additional_notes: str | None = None
    brand_colors: list[str] | None = None
    campaign_data: dict | None = None
    content_type: str = "Single"   # "Single" | "Carousel"
    slide_count: int = 1


@dataclass
class CopyVariant:
    variant_number: int
    copy: dict
    typography: dict


@dataclass
class CopyResult:
    variants: list[CopyVariant]


@dataclass
class ImageInput:
    theme: str
    num_outputs: int = 1
    width: int = 1024
    height: int = 1024
    num_inference_steps: int = 25
    guidance_scale: float = 7.5


@dataclass
class ImageResult:
    image_urls: list[str | None] = field(default_factory=lambda: [None])


class CopyError(Exception):
    pass


class CopyTimeoutError(CopyError):
    pass


class CopyInvalidJsonError(CopyError):
    pass


class ImageError(Exception):
    pass


class ImageTimeoutError(ImageError):
    pass


class ImageProviderError(ImageError):
    pass
