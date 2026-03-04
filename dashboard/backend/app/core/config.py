import os
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Paths
    ansible_project_dir: str = os.environ.get(
        "ANSIBLE_PROJECT_DIR",
        str(Path(__file__).resolve().parents[4]),  # repo root
    )
    history_dir: str = os.environ.get("HISTORY_DIR", "/tmp/kikkoui_history")
    data_dir: str = str(Path(__file__).resolve().parents[1] / "data")

    # Auth
    secret_key: str = os.environ.get(
        "SECRET_KEY", "change-me-in-production-with-a-real-secret"
    )
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_prefix = "KIKKOUI_"


settings = Settings()
