"""
AI 模型配置服务 - 管理运行时可切换的大模型配置
"""

from dataclasses import dataclass
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import async_session_factory
from app.models import AIModelConfig

settings = get_settings()


@dataclass
class RuntimeModelConfig:
    """AIService 调用模型接口所需的最小运行时配置。"""

    name: str
    api_key: str
    base_url: str
    model: str
    temperature: float = 0.7
    max_tokens: int = 800


def mask_api_key(api_key: str) -> str:
    """脱敏展示 API Key，避免后台列表泄露完整密钥。"""
    if not api_key:
        return ""
    if len(api_key) <= 8:
        return "*" * len(api_key)
    return f"{api_key[:4]}****{api_key[-4:]}"


def settings_runtime_config() -> RuntimeModelConfig:
    """从环境变量构造兜底配置，仅用于首次种子或数据库不可用场景。"""
    return RuntimeModelConfig(
        name="env-default",
        api_key=settings.OPENAI_API_KEY or "ollama",
        base_url=settings.OPENAI_BASE_URL.rstrip("/"),
        model=settings.OPENAI_MODEL,
        temperature=0.7,
        max_tokens=800,
    )


def runtime_config_from_model(config: AIModelConfig) -> RuntimeModelConfig:
    return RuntimeModelConfig(
        name=config.name,
        api_key=config.api_key,
        base_url=config.base_url.rstrip("/"),
        model=config.model,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
    )


class DatabaseModelConfigProvider:
    """从数据库读取当前启用模型配置。"""

    async def get_active_config(self) -> RuntimeModelConfig:
        try:
            async with async_session_factory() as db:
                config = await get_active_model_config(db)
                if config:
                    return runtime_config_from_model(config)
        except Exception:
            return settings_runtime_config()
        return settings_runtime_config()


async def get_active_model_config(db: AsyncSession) -> Optional[AIModelConfig]:
    result = await db.execute(
        select(AIModelConfig)
        .where(AIModelConfig.is_active == True, AIModelConfig.is_enabled == True)
        .order_by(AIModelConfig.updated_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def activate_model_config(db: AsyncSession, config: AIModelConfig) -> AIModelConfig:
    active_result = await db.execute(
        select(AIModelConfig).where(AIModelConfig.is_active == True)
    )
    for item in active_result.scalars().all():
        item.is_active = False

    config.is_enabled = True
    config.is_active = True
    await db.commit()
    await db.refresh(config)
    return config
