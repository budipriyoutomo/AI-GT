from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services import auth_service

_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency — inject user terautentikasi ke endpoint manapun."""
    user_id = auth_service.verify_token(credentials.credentials)
    return await auth_service.get_user_by_id(db, user_id)
