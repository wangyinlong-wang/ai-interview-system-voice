"""
FastAPI 应用入口 - AI 模拟面试系统后端
"""

import os
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.core.rate_limit import limiter
from app.database import init_db, close_db

# 导入路由
from app.routers import auth, resumes, interviews, questions, crawl, model_configs

logger = logging.getLogger(__name__)
settings = get_settings()


# ============= 生命周期管理（lifespan） =============

@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """应用生命周期管理 — 替代已弃用的 @app.on_event"""
    # ---- startup ----
    # 安全配置校验
    settings.check_security()

    # 初始化数据库（自动创建表）
    await init_db()

    # 创建上传目录
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)

    # 初始化爬虫调度器（异步方式，替代线程+sleep）
    import asyncio
    scheduler_ready = False

    async def init_scheduler_async():
        nonlocal scheduler_ready
        try:
            # 等待数据库完全就绪
            await asyncio.sleep(2)
            from app.crawlers.scheduler import init_scheduler
            await init_scheduler()
            scheduler_ready = True
            logger.info("🕷️ 爬虫调度器已启动")
        except Exception as e:
            logger.warning("⚠️ 爬虫调度器启动失败: %s", e)

    scheduler_task = asyncio.create_task(init_scheduler_async())

    logger.info("🚀 %s v%s 启动成功", settings.APP_NAME, settings.APP_VERSION)
    logger.info("📖 API 文档: http://localhost:8000/docs")
    logger.info("📁 上传目录: %s", upload_dir)

    yield  # ---- 应用运行中 ----

    # ---- shutdown ----
    # 取消调度器初始化任务（若仍在进行）
    if not scheduler_ready:
        scheduler_task.cancel()

    # 关闭爬虫调度器
    try:
        from app.crawlers.scheduler import shutdown_scheduler
        shutdown_scheduler()
        logger.info("🕷️ 爬虫调度器已关闭")
    except Exception as e:
        logger.warning("爬虫调度器关闭异常: %s", e)

    # 关闭 AI Service 的 HTTP 客户端
    try:
        from app.services.ai_service import get_ai_service
        ai = get_ai_service()
        await ai.close()
        logger.info("AI Service HTTP 客户端已关闭")
    except Exception as e:
        logger.warning("AI Service 关闭异常: %s", e)

    await close_db()
    logger.info("👋 应用已关闭")


# ============= 创建 FastAPI 应用实例 =============

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI 模拟面试系统 - 提供简历管理、AI 模拟面试、评估报告等功能",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# 注册速率限制
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 注册 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============= 中间件 =============

@app.middleware("http")
async def add_process_time(request: Request, call_next):
    """添加响应时间头"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time, 4))
    return response


# ============= 异常处理 =============

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP 异常处理"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.status_code,
            "message": exc.detail,
            "data": None,
            "timestamp": int(time.time()),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """通用异常处理 — 不向客户端泄露内部错误细节"""
    logging.getLogger(__name__).exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "message": "服务器内部错误，请稍后重试",
            "data": None,
            "timestamp": int(time.time()),
        },
    )


# ============= 路由注册 =============

# 认证路由（无需认证）
app.include_router(auth.router, prefix="/api/v1")

# 简历路由（认证由各自路由处理）
app.include_router(resumes.router, prefix="/api/v1")

# 面试路由
app.include_router(interviews.router, prefix="/api/v1")

# 题库路由（新增）
app.include_router(questions.router, prefix="/api/v1")

# 采集管理路由（新增）- 需要管理员权限
app.include_router(crawl.router, prefix="/api/v1")

# 模型配置管理路由
app.include_router(model_configs.router, prefix="/api/v1")


# ============= 根路由 =============

@app.get("/", tags=["根"])
async def root():
    """根路径 - API 信息"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health", tags=["健康检查"])
async def health_check():
    """健康检查接口"""
    return {"status": "healthy", "timestamp": int(time.time())}
