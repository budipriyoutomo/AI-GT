from dataclasses import dataclass, field


@dataclass
class CopyInput:
    business_name: str
    industry: str
    language_style: str
    language_preference: str
    template_theme: str
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
