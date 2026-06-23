import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenData(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserData(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}
