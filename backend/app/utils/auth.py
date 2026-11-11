from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services import auth_service
from app.utils.exceptions import AppError, ErrorCode

_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency — inject user terautentikasi ke endpoint manapun."""
    user_id = auth_service.verify_token(credentials.credentials)
    user = await auth_service.get_user_by_id(db, user_id)
    # Suspend berlaku seketika — token yang sudah terbit tidak ditunggu kedaluwarsa.
    auth_service.assert_active(user)
    return user


ADMIN_ROLES = ("admin", "superadmin")


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency untuk semua endpoint /api/v1/admin.

    Endpoint admin TIDAK BOLEH memakai get_current_user polos — tanpa cek ini,
    user biasa bisa membaca bukti transfer dan data user lain.
    """
    if current_user.role not in ADMIN_ROLES:
        raise AppError(403, ErrorCode.ADMIN_FORBIDDEN, "Akses admin diperlukan.")
    return current_user


async def get_current_superadmin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Untuk aksi yang hanya boleh superadmin (mis. mengangkat admin lain)."""
    if current_user.role != "superadmin":
        raise AppError(403, ErrorCode.ADMIN_FORBIDDEN, "Akses superadmin diperlukan.")
    return current_user
