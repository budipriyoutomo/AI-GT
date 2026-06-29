import uuid
from datetime import datetime

from pydantic import BaseModel


class TemplateListData(BaseModel):
    """Kolom untuk list template. template_config disertakan agar galeri bisa live-render
    element-based langsung (lihat scripts/seed_template_data/README.md)."""

    id: uuid.UUID
    name: str
    industry: str
    theme: str
    content_type: str
    layout_type: str
    thumbnail_url: str
    is_premium: bool
    template_config: dict

    model_config = {"from_attributes": True}


class TemplateData(TemplateListData):
    created_at: datetime
