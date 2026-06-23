from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.config import settings


class JwtAuthProvider:
    """Custom JWT provider — default saat AUTH_PROVIDER=jwt."""

    def verify_token(self, token: str) -> str:
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
            )
            user_id: str | None = payload.get("sub")
            if not user_id:
                raise ValueError("Token payload tidak valid")
            return user_id
        except JWTError as e:
            raise ValueError(f"Token tidak valid atau expired: {e}") from e

    def create_token(self, user_id: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours)
        return jwt.encode(
            {"sub": user_id, "exp": expire},
            settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        )

    def hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def verify_password(self, plain: str, hashed: str) -> bool:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
