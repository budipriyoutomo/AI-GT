import uuid
from datetime import datetime

from pydantic import BaseModel


class TemplateListData(BaseModel):
    """Kolom ringan untuk list template — preview_config adalah subset dari template_config."""

    id: uuid.UUID
    name: str
    industry: str
    theme: str
    content_type: str
    layout_type: str
    thumbnail_url: str
    is_premium: bool
    preview_config: dict

    model_config = {"from_attributes": True}


class TemplateData(TemplateListData):
    template_config: dict
    created_at: datetime
    # preview_config tidak relevan di single view — sudah ada template_config
    preview_config: dict = {}
