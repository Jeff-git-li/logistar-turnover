from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # WMS API Configuration
    WMS_API_BASE_URL: str = "http://hx.wms.yunwms.com/default/svc-for-api/web-service"
    WMS_USER_TOKEN: str = "6b8546d4-2760-afa0-0d86-8e17f81b3886"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./turnover.db"
    DATABASE_SYNC_URL: str = "sqlite:///./turnover.db"

    # Sync settings
    SYNC_INTERVAL_MINUTES: int = 60  # How often to sync data from WMS
    DEFAULT_PAGE_SIZE: int = 100000

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_PORT: int = 8001

    # Warehouse
    DEFAULT_WAREHOUSE_CODE: str = "DEW"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
