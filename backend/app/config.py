import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "Smart City Complaint Management System"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    SECRET_KEY: str = "change-this-in-production-to-a-secure-random-64-character-string"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 180
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    DATABASE_URL: str = "sqlite+aiosqlite:///./smart_city.db"

    # Supabase credentials (server-side only)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "complaint-images"

    # Storage backend: 'supabase' or 'local'
    STORAGE_BACKEND: str = "local"
    LOCAL_STORAGE_DIR: str = "storage/uploads"

    # AI Configuration
    AI_MODEL_PATH: str = "app/ml/weights/best_model.pt"
    AI_METADATA_PATH: str = "app/ml/weights/model_metadata.json"
    AI_CONFIDENCE_THRESHOLD: float = 0.80
    MAX_INFERENCE_WORKERS: int = 2

    # Upload constraints
    MAX_UPLOAD_SIZE_MB: int = 5
    ALLOWED_IMAGE_TYPES: Union[List[str], str] = ["image/jpeg", "image/png", "image/webp"]

    # CORS
    ALLOWED_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # Bootstrap Initial Administrator
    INITIAL_ADMIN_EMAIL: str = "admin@smartcity.gov"
    INITIAL_ADMIN_NAME: str = "Municipal System Administrator"
    INITIAL_ADMIN_PASSWORD: str = "Admin@SmartCity2026!"

    @field_validator("ALLOWED_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173", "http://127.0.0.1:5173"]

    @field_validator("ALLOWED_IMAGE_TYPES", mode="before")
    @classmethod
    def assemble_image_types(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["image/jpeg", "image/png", "image/webp"]


settings = Settings()
