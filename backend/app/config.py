"""
GoalFlow — Application Configuration
Loads all settings from environment variables via Pydantic BaseSettings.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./goalflow.db"

    # JWT
    SECRET_KEY: str = "change-this-to-a-super-secret-key-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Groq AI
    GROQ_API_KEY: str = ""

    # Brevo Email
    BREVO_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@goalflow.app"
    FROM_NAME: str = "GoalFlow"

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    # Environment
    ENVIRONMENT: str = "development"

    # Thrust area defaults
    DEFAULT_THRUST_AREAS: list[str] = [
        "Revenue Growth",
        "Customer Satisfaction",
        "Cost Optimization",
        "Quality Improvement",
        "Innovation",
        "People Development",
        "Safety",
        "Compliance",
        "Digital Transformation",
    ]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
