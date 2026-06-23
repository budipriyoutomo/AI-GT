import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.services.providers.auth.base_auth import AuthProvider
from app.services.providers.auth.jwt_auth import JwtAuthProvider
from app.services.providers.auth.supabase_auth import SupabaseAuthProvider
from app.utils.exceptions import AppError, ErrorCode


def get_auth_provider() -> AuthProvider:
    """Return provider yang aktif berdasarkan AUTH_PROVIDER env var."""
    if settings.auth_provider == "supabase":
        return SupabaseAuthProvider()
    return JwtAuthProvider()


async def register_user(
    db: AsyncSession,
    name: str,
    email: str,
    password: str,
) -> User:
    existing = await db.scalar(select(User).where(User.email == email.lower()))
    if existing:
        raise AppError(400, ErrorCode.AUTH_INVALID_CREDENTIALS, "Email sudah terdaftar.")

    provider = get_auth_provider()
    hashed = provider.hash_password(password)

    user = User(
        id=uuid.uuid4(),
        email=email.lower(),
        password_hash=hashed,
        name=name,
        is_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def login_user(
    db: AsyncSession,
    email: str,
    password: str,
) -> tuple[User, str]:
    user = await db.scalar(select(User).where(User.email == email.lower()))
    if not user:
        raise AppError(401, ErrorCode.AUTH_INVALID_CREDENTIALS, "Email atau password salah.")

    provider = get_auth_provider()

    if not provider.verify_password(password, user.password_hash):
        raise AppError(401, ErrorCode.AUTH_INVALID_CREDENTIALS, "Email atau password salah.")

    if not user.is_verified:
        raise AppError(401, ErrorCode.AUTH_EMAIL_NOT_VERIFIED, "Silakan verifikasi email kamu terlebih dahulu.")

    token = provider.create_token(str(user.id))
    return user, token


async def get_user_by_id(db: AsyncSession, user_id: str) -> User:
    user = await db.scalar(select(User).where(User.id == uuid.UUID(user_id)))
    if not user:
        raise AppError(404, ErrorCode.PROFILE_NOT_FOUND, "User tidak ditemukan.")
    return user


def verify_token(token: str) -> str:
    """Shortcut untuk verify token — dipakai oleh FastAPI dependency."""
    provider = get_auth_provider()
    try:
        return provider.verify_token(token)
    except ValueError:
        raise AppError(401, ErrorCode.AUTH_TOKEN_EXPIRED, "Token tidak valid atau sudah expired.")
