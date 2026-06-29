import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


GOAL_ENUM = Literal["awareness", "engagement", "conversion", "launch", "promo"]
PLATFORM_ENUM = Literal["instagram_feed", "instagram_story", "facebook", "tiktok"]
LANGUAGE_STYLE_ENUM = Literal["formal", "casual", "persuasive", "fun_playful", "inspiratif"]
IMAGE_SOURCE_ENUM = Literal["upload", "generated", "none"]


class CreateSessionRequest(BaseModel):
    template_id: uuid.UUID
    goal: GOAL_ENUM
    platform: PLATFORM_ENUM
    language_style: LANGUAGE_STYLE_ENUM
    image_source: IMAGE_SOURCE_ENUM = "none"
    thematic_image_theme: str | None = None
    selected_image_prompt: str | None = None
    product_or_service: str
    key_message: str
    promo_detail: str | None = None
    additional_notes: str | None = None
    # null = Quick Generate (free); non-null = Campaign (premium — gated at server)
    campaign_data: dict | None = None


class ImageSuggestionsRequest(BaseModel):
    content_brief: str
    template_theme: str | None = None
    industry: str | None = None
    target_audience: str | None = None
    language_preference: str | None = None


class SelectVariantRequest(BaseModel):
    variant_id: uuid.UUID


class GenerateImageRequest(BaseModel):
    prompt: str
    project_id: uuid.UUID | None = None


class VariantData(BaseModel):
    id: uuid.UUID
    variant_number: int
    copy_data: dict
    typography_data: dict
    thematic_image_url: str | None
    is_selected: bool

    model_config = {"from_attributes": True}


class SessionData(BaseModel):
    id: uuid.UUID
    template_id: uuid.UUID
    status: str
    language_style: str
    goal: str | None
    platform: str | None
    thematic_image_theme: str | None
    campaign_data: dict | None
    expires_at: datetime
    created_at: datetime
    variants: list[VariantData] = []
    project_id: uuid.UUID | None = None

    model_config = {"from_attributes": True}
