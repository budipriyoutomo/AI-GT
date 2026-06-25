import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class CampaignData(BaseModel):
    content_brief: str | None = None
    image_source: Literal["upload", "suggestion", "none"] = "none"
    image_prompt: str | None = None
    target_audience: str | None = None
    language_preference: str | None = None


class ImageSuggestionsRequest(BaseModel):
    content_brief: str
    template_theme: str | None = None
    industry: str | None = None
    target_audience: str | None = None
    language_preference: str | None = None


class CreateSessionRequest(BaseModel):
    template_id: uuid.UUID
    language_style: str
    campaign_data: CampaignData | None = None


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
    thematic_image_theme: str | None
    campaign_data: dict | None
    expires_at: datetime
    created_at: datetime
    variants: list[VariantData] = []

    model_config = {"from_attributes": True}
