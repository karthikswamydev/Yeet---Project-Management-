from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://yeet:yeet@localhost:5432/yeet"
    cors_origins: list[str] = ["http://localhost:5173"]

    # "dev": no login, everyone is the test user (switch with the X-Dev-User header).
    # "stytch": require a Stytch B2B session JWT (see app/auth.py).
    auth_mode: Literal["dev", "stytch"] = "dev"
    # Dev auth lets anyone act as anyone, so it only runs when explicitly local.
    # Defaults to "production" so a server started without config fails safe.
    app_env: Literal["local", "production"] = "production"
    stytch_project_id: str = ""
    stytch_env: Literal["test", "live"] = "test"


settings = Settings()
