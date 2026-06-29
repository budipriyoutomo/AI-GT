import uuid
from datetime import datetime

from pydantic import BaseModel


class ProjectData(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    session_id: uuid.UUID
    variant_id: uuid.UUID
    title: str | None
    final_config: dict
    exported_image_url: str | None
    thumbnail_url: str | None
    is_exported: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UpdateProjectRequest(BaseModel):
    title: str | None = None
    final_config: dict | None = None
