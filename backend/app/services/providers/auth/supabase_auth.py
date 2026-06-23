from jose import JWTError, jwt

from app.config import settings


class SupabaseAuthProvider:
    """
    Supabase auth provider — aktifkan dengan AUTH_PROVIDER=supabase.

    Login/register dan password hashing ditangani oleh Supabase di sisi frontend.
    Backend hanya perlu memverifikasi JWT yang dikirim dari frontend.

    JWT Secret: Settings > API > JWT Secret di Supabase dashboard.
    Tambahkan ke .env: SUPABASE_JWT_SECRET=...
    """

    def verify_token(self, token: str) -> str:
        try:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            user_id: str | None = payload.get("sub")
            if not user_id:
                raise ValueError("Token Supabase tidak mengandung sub")
            return user_id
        except JWTError as e:
            raise ValueError(f"Token Supabase tidak valid atau expired: {e}") from e

    def create_token(self, user_id: str) -> str:
        raise NotImplementedError(
            "Supabase provider tidak support create_token — "
            "token dibuat oleh Supabase di frontend."
        )

    def hash_password(self, password: str) -> str:
        raise NotImplementedError(
            "Supabase provider tidak support hash_password — "
            "password dikelola oleh Supabase."
        )

    def verify_password(self, plain: str, hashed: str) -> bool:
        raise NotImplementedError(
            "Supabase provider tidak support verify_password — "
            "password dikelola oleh Supabase."
        )
