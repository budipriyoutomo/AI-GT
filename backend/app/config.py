from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str

    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24

    # AI — copy
    ai_copy_provider: str = "anthropic"
    ai_copy_model: str = "claude-haiku-4-5"

    # AI — image
    ai_image_provider: str = "replicate"
    ai_image_model: str = "stability-ai/sdxl"

    # API keys
    anthropic_api_key: str = ""
    replicate_api_token: str = ""

    # Cloudflare R2
    cloudflare_r2_account_id: str = ""
    cloudflare_r2_access_key: str = ""
    cloudflare_r2_secret_key: str = ""
    cloudflare_r2_bucket_name: str = "ai-gt-bucket"


settings = Settings()
