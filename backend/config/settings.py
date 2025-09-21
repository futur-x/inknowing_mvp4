"""
Application configuration settings
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator
import json


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Application
    APP_NAME: str = Field(default="InKnowing API")
    APP_VERSION: str = Field(default="1.0.0")
    DEBUG: bool = Field(default=False)
    ENVIRONMENT: str = Field(default="development")
    API_V1_PREFIX: str = Field(default="/v1")

    # Server
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres@localhost:5432/inknowing_db"
    )
    DATABASE_POOL_SIZE: int = Field(default=20)
    DATABASE_MAX_OVERFLOW: int = Field(default=0)
    DATABASE_POOL_PRE_PING: bool = Field(default=True)
    DATABASE_ECHO: bool = Field(default=False)

    # Security
    SECRET_KEY: str = Field(default="097c57e3e90d9e07ba607d72bb57568676c25beb50cf6524366a11bb4d775522")
    ADMIN_SECRET_KEY: str = Field(default="7449480e5c12fc2a2764635f6f94b1f4f83c4f019050798c92039978422864b1")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)

    # CORS
    CORS_ORIGINS: List[str] = Field(default=["*"])
    CORS_ALLOW_CREDENTIALS: bool = Field(default=True)
    CORS_ALLOW_METHODS: List[str] = Field(default=["*"])
    CORS_ALLOW_HEADERS: List[str] = Field(default=["*"])

    # Redis (Optional)
    REDIS_URL: Optional[str] = Field(default=None)
    REDIS_CACHE_TTL: int = Field(default=3600)

    # Stripe Configuration (Optional)
    STRIPE_SECRET_KEY: Optional[str] = Field(default=None)
    STRIPE_PUBLISHABLE_KEY: Optional[str] = Field(default=None)
    STRIPE_WEBHOOK_SECRET: Optional[str] = Field(default=None)

    # WeChat Pay Configuration (Optional)
    WECHAT_APP_ID: Optional[str] = Field(default=None)
    WECHAT_APP_SECRET: Optional[str] = Field(default=None)
    WECHAT_MCH_ID: Optional[str] = Field(default=None)
    WECHAT_API_KEY: Optional[str] = Field(default=None)
    WECHAT_API_V3_KEY: Optional[str] = Field(default=None)
    WECHAT_CERT_SERIAL: Optional[str] = Field(default=None)
    WECHAT_PRIVATE_KEY: Optional[str] = Field(default=None)
    WECHAT_CERT: Optional[str] = Field(default=None)
    WECHAT_NOTIFY_URL: Optional[str] = Field(default=None)
    WECHAT_SANDBOX: bool = Field(default=False)

    # Alipay Configuration (Optional)
    ALIPAY_APP_ID: Optional[str] = Field(default=None)
    ALIPAY_PRIVATE_KEY: Optional[str] = Field(default=None)
    ALIPAY_PUBLIC_KEY: Optional[str] = Field(default=None)
    ALIPAY_NOTIFY_URL: Optional[str] = Field(default=None)
    ALIPAY_RETURN_URL: Optional[str] = Field(default=None)
    ALIPAY_SANDBOX: bool = Field(default=False)

    # AI Model Configuration
    AI_PRIMARY_PROVIDER: str = Field(default="openai")
    AI_PRIMARY_MODEL: str = Field(default="gpt-4")
    AI_API_KEY: Optional[str] = Field(default=None)
    AI_MAX_TOKENS: int = Field(default=2000)
    AI_TEMPERATURE: float = Field(default=0.7)

    # File Upload
    UPLOAD_MAX_SIZE: int = Field(default=10485760)  # 10MB
    UPLOAD_ALLOWED_EXTENSIONS: str = Field(default="txt,pdf")
    UPLOAD_PATH: str = Field(default="/tmp/uploads")

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = Field(default=True)
    RATE_LIMIT_FREE_DAILY: int = Field(default=20)
    RATE_LIMIT_BASIC_MONTHLY: int = Field(default=200)
    RATE_LIMIT_PREMIUM_MONTHLY: int = Field(default=500)
    RATE_LIMIT_SUPER_MONTHLY: int = Field(default=1000)

    # Logging
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FILE: Optional[str] = Field(default=None)
    LOG_MAX_SIZE: int = Field(default=10485760)  # 10MB
    LOG_BACKUP_COUNT: int = Field(default=5)

    # Admin
    ADMIN_USERNAME: str = Field(default="admin")
    ADMIN_PASSWORD: str = Field(default="admin123")

    # Monitoring
    ENABLE_METRICS: bool = Field(default=False)
    METRICS_PORT: int = Field(default=9090)

    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            # Try to parse as JSON first
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # If not JSON, split by comma
                return [origin.strip() for origin in v.split(",")]
        return v

    @validator("CORS_ALLOW_METHODS", pre=True)
    def parse_cors_methods(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [method.strip() for method in v.split(",")]
        return v

    @validator("CORS_ALLOW_HEADERS", pre=True)
    def parse_cors_headers(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [header.strip() for header in v.split(",")]
        return v

    @property
    def allowed_extensions_list(self) -> List[str]:
        """Get list of allowed file extensions"""
        return self.UPLOAD_ALLOWED_EXTENSIONS.split(",")

    @property
    def database_url_sync(self) -> str:
        """Get synchronous database URL"""
        return self.DATABASE_URL.replace("+asyncpg", "")

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"


# Create global settings instance
settings = Settings()