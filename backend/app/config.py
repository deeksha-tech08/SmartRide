"""Application configuration loaded from environment variables.

Uses pydantic-settings to validate and type-cast all config values.
All fare rates, JWT settings, and API keys are configurable here.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from .env file and environment variables."""

    # MongoDB
    MONGODB_URL: str = Field(..., description="MongoDB Atlas connection string")
    DATABASE_NAME: str = Field(default="smartride", description="MongoDB database name")

    # JWT Authentication
    JWT_SECRET: str = Field(..., description="Secret key for JWT token signing")
    JWT_EXPIRY_HOURS: int = Field(default=168, description="JWT token expiry in hours (default: 7 days)")

    # Gemini AI
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API key (optional)")
    GEMINI_MODEL: str = Field(default="gemini-2.0-flash", description="Gemini model name")

    # Fare Configuration
    BASE_FARE: float = Field(default=40.0, description="Base fare in INR")
    PER_KM_RATE: float = Field(default=10.0, description="Rate per kilometer in INR")
    PER_MINUTE_RATE: float = Field(default=1.0, description="Rate per minute in INR")
    AVG_SPEED_KMPH: float = Field(default=30.0, description="Average speed for duration estimation in km/h")

    # CORS
    FRONTEND_URL: str = Field(default="http://localhost:5173", description="Frontend URL for CORS")

    # Environment
    ENVIRONMENT: str = Field(default="development", description="Current environment")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


# Singleton settings instance — imported throughout the application
settings = Settings()
