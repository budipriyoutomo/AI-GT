import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    category: str | None = None
    message: str

    @field_validator("name", "message")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Kolom wajib diisi.")
        return v.strip()


class ContactMessageData(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    category: str | None
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}
