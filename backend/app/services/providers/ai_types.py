from dataclasses import dataclass, field


@dataclass
class CopyInput:
    business_name: str
    industry: str
    language_style: str
    language_preference: str
    template_theme: str
    brand_colors: list[str] | None = None
    content_brief: str | None = None
    target_audience: str | None = None
    campaign_data: dict | None = None


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
    num_outputs: int = 3
    width: int = 1024
    height: int = 1024
    num_inference_steps: int = 25
    guidance_scale: float = 7.5


@dataclass
class ImageResult:
    image_urls: list[str | None] = field(default_factory=lambda: [None, None, None])


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
