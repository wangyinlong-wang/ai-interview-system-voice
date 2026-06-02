"""
配置文件 - 管理应用的所有配置项
"""

import os
import logging
from pydantic_settings import BaseSettings
from functools import lru_cache

logger = logging.getLogger(__name__)

# 生产环境不安全的默认密钥黑名单
_INSECURE_SECRET_KEYS = {
    "your-secret-key-change-in-production",
    "secret",
    "changeme",
    "password",
    "test",
}


class Settings(BaseSettings):
    """应用配置类"""

    # 应用基础配置
    APP_NAME: str = "AI 模拟面试系统"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.environ.get("DEBUG", "false").lower() == "true"

    # 安全配置
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30  # Access Token 有效期缩短至 30 分钟
    JWT_REFRESH_EXPIRE_DAYS: int = 7  # Refresh Token 有效期 7 天

    # 数据库配置
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./uploads/interview.db")

    # AI 大模型配置
    OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.environ.get("OPENAI_MODEL", "gpt-3.5-turbo")

    # 文件上传配置
    UPLOAD_DIR: str = os.environ.get("UPLOAD_DIR", "./uploads/resumes")
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_FILE_TYPES: list = ["application/pdf", "text/plain"]

    # CORS 配置
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]

    # 面试配置
    MAX_INTERVIEW_QUESTIONS: int = 10
    MAX_MESSAGE_HISTORY: int = 20

    # API Key 加密密钥（用于加密存储 AI 模型的 API Key）
    ENCRYPTION_KEY: str = os.environ.get("ENCRYPTION_KEY", "")

    class Config:
        env_file = ".env"
        case_sensitive = True

    def check_security(self) -> None:
        """启动时校验关键安全配置，生产环境使用不安全默认值时抛出异常。"""
        is_production = not self.DEBUG

        if self.SECRET_KEY in _INSECURE_SECRET_KEYS:
            if is_production:
                raise RuntimeError(
                    f"⛔ 生产环境禁止使用不安全的 SECRET_KEY ({self.SECRET_KEY!r})，"
                    "请在 .env 中设置随机强密钥，例如: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
                )
            logger.warning(
                "⚠️ SECRET_KEY 使用了不安全的默认值，仅限开发环境使用！"
            )


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()
