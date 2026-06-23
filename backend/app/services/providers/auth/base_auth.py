from typing import Protocol, runtime_checkable


@runtime_checkable
class AuthProvider(Protocol):
    """
    Kontrak yang harus diikuti semua auth provider.
    Ganti provider via AUTH_PROVIDER env var — tidak ada perubahan kode.
    """

    def verify_token(self, token: str) -> str:
        """Verifikasi token, return user_id. Raise ValueError jika invalid/expired."""
        ...

    def create_token(self, user_id: str) -> str:
        """Generate token untuk user_id. Raise NotImplementedError jika provider tidak support."""
        ...

    def hash_password(self, password: str) -> str:
        """Hash plain password. Raise NotImplementedError jika provider tidak support."""
        ...

    def verify_password(self, plain: str, hashed: str) -> bool:
        """Verifikasi plain password vs hash. Raise NotImplementedError jika provider tidak support."""
        ...
