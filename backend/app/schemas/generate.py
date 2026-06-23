import uuid
from datetime import datetime

from pydantic import BaseModel


class CreateSessionRequest(BaseModel):
    template_id: uuid.UUID
    language_style: str
    thematic_image_theme: str | None = None
    campaign_data: dict | None = None


class SelectVariantRequest(BaseModel):
    variant_id: uuid.UUID


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
