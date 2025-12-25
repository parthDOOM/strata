"""
Application configuration using pydantic-settings.

Loads environment variables from .env file and provides
type-safe access to configuration values.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # =========================
    # Application Environment
    # =========================
    api_env: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Application environment",
    )

    # =========================
    # API Server Configuration
    # =========================
    api_host: str = Field(default="0.0.0.0", description="API server host")
    api_port: int = Field(default=8000, description="API server port")
    api_reload: bool = Field(default=True, description="Enable hot reload in development")

    # =========================
    # Database Configuration
    # =========================
    database_url: str = Field(
        default="sqlite:///../data/quant.db",
        description="Database connection URL",
    )

    # =========================
    # Alpaca Trading API
    # =========================
    alpaca_api_key: str = Field(
        default="",
        description="Alpaca API key for market data and trading",
    )
    alpaca_secret_key: str = Field(
        default="",
        description="Alpaca secret key for authentication",
    )

    # =========================
    # Computed Properties
    # =========================
    @computed_field
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.api_env == "development"

    @computed_field
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.api_env == "production"


@lru_cache
def get_settings() -> Settings:
    """
    Get cached application settings.

    Uses lru_cache to ensure settings are only loaded once
    and reused across the application lifecycle.
    """
    return Settings()


# Export a default instance for convenience
settings = get_settings()
