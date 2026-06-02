"""
数据库模块 - 管理数据库连接和会话
"""

import os
from urllib.parse import urlparse

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from contextlib import asynccontextmanager

from app.config import get_settings

settings = get_settings()

# 创建异步数据库引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    poolclass=NullPool,
)

# 创建异步会话工厂
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# 声明基类
Base = declarative_base()


async def get_db():
    """获取数据库会话（依赖注入用）"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_session():
    """上下文管理器方式获取数据库会话"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """初始化数据库 - 创建所有表"""
    import app.models  # noqa: F401 - 注册 SQLAlchemy 模型到 Base.metadata

    ensure_sqlite_parent_dir()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await seed_default_crawl_sources()
    await seed_default_ai_model_config()


def ensure_sqlite_parent_dir():
    """确保 SQLite 数据库文件所在目录存在。"""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    parsed = urlparse(settings.DATABASE_URL)
    db_path = parsed.path
    if parsed.netloc:
        db_path = f"/{parsed.netloc}{parsed.path}"
    if db_path.startswith("/./"):
        db_path = db_path[1:]
    if db_path and db_path != ":memory:":
        parent = os.path.dirname(db_path)
        if parent:
            os.makedirs(parent, exist_ok=True)


async def seed_default_crawl_sources():
    """创建默认爬虫来源，保证调度器和采集后台有可用配置。"""
    from sqlalchemy import select
    from app.models import CrawlSource

    defaults = [
        {
            "name": "nowcoder",
            "source_type": "web",
            "base_url": "https://www.nowcoder.com",
            "spider_class": "NowcoderSpider",
            "cron_expression": "0 2 * * *",
            "config": {"max_pages": 1},
            "is_enabled": True,
        },
        {
            "name": "leetcode",
            "source_type": "api",
            "base_url": "https://leetcode.cn",
            "spider_class": "LeetCodeSpider",
            "cron_expression": "30 2 * * *",
            "config": {"max_pages": 1},
            "is_enabled": True,
        },
        {
            "name": "github_interview",
            "source_type": "github",
            "base_url": "https://raw.githubusercontent.com",
            "spider_class": "GitHubInterviewSpider",
            "cron_expression": "0 3 * * *",
            "config": {"max_pages": 1},
            "is_enabled": True,
        },
    ]

    async with async_session_factory() as session:
        for item in defaults:
            result = await session.execute(
                select(CrawlSource).where(CrawlSource.name == item["name"])
            )
            if result.scalar_one_or_none() is None:
                session.add(CrawlSource(**item))
        await session.commit()


async def seed_default_ai_model_config():
    """创建默认 AI 模型配置，避免运行时继续依赖写死的配置文件值。"""
    from sqlalchemy import select
    from app.models import AIModelConfig
    from app.core.crypto import encrypt_api_key

    provider = "ollama" if "ollama" in settings.OPENAI_BASE_URL.lower() or "11434" in settings.OPENAI_BASE_URL else "openai-compatible"
    default_name = "ollama-default" if provider == "ollama" else "env-default"

    async with async_session_factory() as session:
        result = await session.execute(select(AIModelConfig).limit(1))
        if result.scalar_one_or_none() is not None:
            return

        session.add(AIModelConfig(
            name=default_name,
            provider=provider,
            base_url=settings.OPENAI_BASE_URL.rstrip("/"),
            model=settings.OPENAI_MODEL,
            api_key=encrypt_api_key(settings.OPENAI_API_KEY or "ollama"),
            temperature=0.7,
            max_tokens=800,
            is_active=True,
            is_enabled=True,
            description="系统首次启动时根据环境变量自动生成，可在后台模型配置中修改。",
        ))
        await session.commit()


async def close_db():
    """关闭数据库连接"""
    await engine.dispose()
