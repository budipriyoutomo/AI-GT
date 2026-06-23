import uuid
from datetime import datetime

from pydantic import BaseModel


class CompanyProfileCreate(BaseModel):
    business_name: str
    industry: str
    brand_colors: list[str] | None = None
    language_preference: str = "id"


class CompanyProfileUpdate(BaseModel):
    business_name: str | None = None
    industry: str | None = None
    logo_url: str | None = None
    brand_colors: list[str] | None = None
    language_preference: str | None = None


class CompanyProfileData(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    business_name: str
    industry: str
    logo_url: str | None
    brand_colors: list[str] | None
    language_preference: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
