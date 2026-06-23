import uuid
from datetime import datetime

from pydantic import BaseModel


class TemplateData(BaseModel):
    id: uuid.UUID
    name: str
    industry: str
    theme: str
    content_type: str
    thumbnail_url: str
    template_config: dict
    is_premium: bool
    created_at: datetime

    model_config = {"from_attributes": True}
