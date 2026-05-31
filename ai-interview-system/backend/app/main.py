"""
FastAPI 应用入口 - AI 模拟面试系统后端
"""

import os
import time
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import init_db, close_db

# 导入路由
from app.routers import auth, resumes, interviews, questions, crawl, model_configs

settings = get_settings()

# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI 模拟面试系统 - 提供简历管理、AI 模拟面试、评估报告等功能",
    docs_url="/docs",
    redoc_url="/redoc",
)

# 注册 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============= 生命周期事件 =============

@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    # 初始化数据库（自动创建表）
    await init_db()
    
    # 创建上传目录
    upload_dir = os.environ.get("UPLOAD_DIR", "./uploads/resumes")
    os.makedirs(upload_dir, exist_ok=True)
    
    # 初始化爬虫调度器（延迟启动，确保数据库就绪）
    import threading
    def delayed_init_scheduler():
        """延迟初始化调度器"""
        import time
        import asyncio
        time.sleep(3)  # 等待数据库和应用完全启动
        try:
            from app.crawlers.scheduler import init_scheduler
            asyncio.run(init_scheduler())
            print("🕷️ 爬虫调度器已启动")
        except Exception as e:
            print(f"⚠️ 爬虫调度器启动失败: {e}")
    
    thread = threading.Thread(target=delayed_init_scheduler, daemon=True, name="scheduler-init")
    thread.start()
    
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} 启动成功")
    print(f"📖 API 文档: http://localhost:8000/docs")
    print(f"📁 上传目录: {upload_dir}")
    print(f"🕷️ 爬虫调度器正在初始化...")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行"""
    # 关闭爬虫调度器
    from app.crawlers.scheduler import shutdown_scheduler
    shutdown_scheduler()
    print("🕷️ 爬虫调度器已关闭")
    
    await close_db()
    print("👋 应用已关闭")


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
    """通用异常处理"""
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "message": f"服务器内部错误: {str(exc)}",
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
