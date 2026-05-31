"""
采集管理API路由 - 管理爬虫来源、定时任务、手动触发
"""

import threading
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import CrawlTask, CrawlSource
from app.schemas import (
    CrawlTaskInfo, CrawlSourceConfig, CrawlSourceInfo,
    SchedulerStatus, ResponseWrapper,
)
from app.core.security import get_current_user
from app.crawlers.scheduler import (
    run_spider_sync,
    add_source_job,
    remove_source_job,
    get_scheduler,
    get_scheduler_status,
    init_scheduler,
)

router = APIRouter(prefix="/admin/crawl", tags=["采集管理"])


def _task_data(task: CrawlTask) -> dict:
    return CrawlTaskInfo.model_validate(task).model_dump(mode="json")


def _source_data(source: CrawlSource) -> dict:
    return CrawlSourceInfo.model_validate(source).model_dump(mode="json")


@router.get("/tasks", response_model=ResponseWrapper)
async def list_tasks(
    limit: int = Query(20, ge=1, le=100, description="返回数量"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """获取采集任务历史列表 - 按开始时间倒序"""
    result = await db.execute(
        select(CrawlTask)
        .order_by(desc(CrawlTask.started_at))
        .limit(limit)
    )
    tasks = result.scalars().all()
    
    return ResponseWrapper(
        data={
            "items": [_task_data(task) for task in tasks],
            "total": len(tasks),
        }
    )


@router.get("/tasks/{task_id}", response_model=ResponseWrapper)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """获取单个任务详情"""
    result = await db.execute(
        select(CrawlTask).where(CrawlTask.id == task_id)
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return ResponseWrapper(data=_task_data(task))


@router.post("/tasks/{source_id}/run", response_model=ResponseWrapper)
async def manual_run(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    手动触发采集任务
    
    在后台线程中异步执行，立即返回
    """
    result = await db.execute(
        select(CrawlSource).where(CrawlSource.id == source_id)
    )
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="来源不存在")
    
    # 在后台线程中执行爬虫
    thread = threading.Thread(
        target=run_spider_sync,
        args=(source_id,),
        name=f"spider-{source.name}",
        daemon=True,
    )
    thread.start()
    
    return ResponseWrapper(message=f"已手动触发 {source.name} 的采集任务，正在后台执行")


@router.get("/sources", response_model=ResponseWrapper)
async def list_sources(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """获取所有采集来源配置"""
    result = await db.execute(
        select(CrawlSource).order_by(desc(CrawlSource.created_at))
    )
    sources = result.scalars().all()
    
    return ResponseWrapper(
        data={
            "items": [_source_data(source) for source in sources],
            "total": len(sources),
        }
    )


@router.post("/sources", response_model=ResponseWrapper)
async def create_source(
    data: CrawlSourceConfig,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    新增采集来源
    
    自动添加到调度器（如果is_enabled为true）
    """
    # 检查名称是否已存在
    result = await db.execute(
        select(CrawlSource).where(CrawlSource.name == data.name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="来源名称已存在")
    
    source = CrawlSource(**data.dict())
    db.add(source)
    await db.commit()
    await db.refresh(source)
    
    # 添加到调度器
    if source.is_enabled:
        add_source_job(source)
    
    return ResponseWrapper(message="创建成功", data=_source_data(source))


@router.get("/sources/{source_id}", response_model=ResponseWrapper)
async def get_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """获取单个来源详情"""
    result = await db.execute(
        select(CrawlSource).where(CrawlSource.id == source_id)
    )
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="来源不存在")
    
    return ResponseWrapper(data=_source_data(source))


@router.put("/sources/{source_id}", response_model=ResponseWrapper)
async def update_source(
    source_id: int,
    data: CrawlSourceConfig,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    编辑采集来源
    
    更新后自动重新添加到调度器
    """
    result = await db.execute(
        select(CrawlSource).where(CrawlSource.id == source_id)
    )
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="来源不存在")
    
    # 更新字段
    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(source, field, value)
    
    await db.commit()
    await db.refresh(source)
    
    # 重新添加到调度器
    remove_source_job(source_id)
    if source.is_enabled:
        add_source_job(source)
    
    return ResponseWrapper(message="更新成功", data=_source_data(source))


@router.delete("/sources/{source_id}", response_model=ResponseWrapper)
async def delete_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """删除采集来源"""
    result = await db.execute(
        select(CrawlSource).where(CrawlSource.id == source_id)
    )
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="来源不存在")
    
    # 从调度器移除
    remove_source_job(source_id)
    
    await db.delete(source)
    await db.commit()
    
    return ResponseWrapper(message="删除成功")


@router.post("/sources/{source_id}/toggle", response_model=ResponseWrapper)
async def toggle_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """启用/禁用采集来源"""
    result = await db.execute(
        select(CrawlSource).where(CrawlSource.id == source_id)
    )
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="来源不存在")
    
    source.is_enabled = not source.is_enabled
    await db.commit()
    
    # 同步调度器状态
    if source.is_enabled:
        add_source_job(source)
    else:
        remove_source_job(source_id)
    
    status_text = "启用" if source.is_enabled else "禁用"
    return ResponseWrapper(message=f"已{status_text}", data=_source_data(source))


@router.get("/scheduler/status", response_model=ResponseWrapper)
async def scheduler_status(
    current_user: dict = Depends(get_current_user),
):
    """获取调度器状态"""
    status = get_scheduler_status()
    return ResponseWrapper(data=status)


@router.post("/scheduler/restart", response_model=ResponseWrapper)
async def restart_scheduler(
    current_user: dict = Depends(get_current_user),
):
    """重启调度器"""
    import asyncio
    
    # 关闭现有调度器
    from app.crawlers.scheduler import shutdown_scheduler
    shutdown_scheduler()
    
    # 重新初始化
    await init_scheduler()
    
    return ResponseWrapper(message="调度器已重启")
