from __future__ import annotations

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+asyncpg://geolint:geolint@localhost:5432/geolint"
    database_url_sync: str = "postgresql+psycopg2://geolint:geolint@localhost:5432/geolint"

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"

    # File storage
    storage_dir: str = "/app/storage"

    # File size limits
    kml_max_size_bytes: int = 5 * 1024 * 1024        # 5 MB
    zip_max_size_bytes: int = 20 * 1024 * 1024       # 20 MB
    zip_max_extracted_bytes: int = 100 * 1024 * 1024 # 100 MB

    # Application
    app_env: str = "development"
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
