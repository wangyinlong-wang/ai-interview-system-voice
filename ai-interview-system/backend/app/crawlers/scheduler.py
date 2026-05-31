"""
APScheduler定时调度模块 - 管理爬虫的定时执行
支持: 定时触发、手动触发、动态添加/删除任务
"""

import logging
import threading
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models import CrawlSource, CrawlTask
from app.crawlers.spiders import SPIDER_REGISTRY
from app.crawlers.pipelines import DataPipeline

logger = logging.getLogger(__name__)

# 全局调度器实例
_scheduler: BackgroundScheduler = None


def get_scheduler() -> BackgroundScheduler:
    """获取或创建调度器单例"""
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(
            jobstores={},
            executors={
                "default": {"type": "threadpool", "max_workers": 3},  # 最多3个并发爬虫
            },
            job_defaults={
                "coalesce": True,       # 合并错过的任务
                "max_instances": 1,     # 同一任务只能有一个实例在运行
                "misfire_grace_time": 3600,  # 1小时的容错时间
            },
        )
    return _scheduler


async def run_spider(source_id: int):
    """
    执行单个爬虫任务
    
    流程:
    1. 从数据库读取来源配置
    2. 创建任务记录
    3. 执行爬取
    4. 运行数据管道
    5. 更新任务状态
    """
    async with async_session_factory() as db:
        try:
            # 1. 获取来源配置
            result = await db.execute(
                select(CrawlSource).where(CrawlSource.id == source_id)
            )
            source = result.scalar_one_or_none()
            
            if not source or not source.is_enabled:
                logger.warning(f"[调度器] 来源 {source_id} 不存在或未启用")
                return
            
            # 更新最后运行时间
            source.last_run_at = datetime.now()
            source.last_status = "running"
            await db.commit()
            
            # 2. 创建任务记录
            task = CrawlTask(
                source_name=source.name,
                source_type=source.source_type,
                status="running",
            )
            db.add(task)
            await db.commit()
            await db.refresh(task)
            
            # 3. 获取Spider类
            spider_cls = SPIDER_REGISTRY.get(source.spider_class)
            if not spider_cls:
                raise ValueError(f"未知的Spider类: {source.spider_class}")
            
            # 4. 执行爬取
            spider = spider_cls()
            start_time = datetime.now()
            
            config = source.config or {}
            max_pages = config.get("max_pages", 5)
            
            logger.info(f"[调度器] 开始执行爬虫: {source.name} (max_pages={max_pages})")
            raw_data = spider.crawl(max_pages=max_pages)

            if not raw_data:
                duration = (datetime.now() - start_time).total_seconds()
                spider_error_count = int(getattr(spider, "stats", {}).get("error", 0) or 0)
                task.status = "failed" if spider_error_count > 0 else "no_data"
                task.total_count = 0
                task.new_count = 0
                task.duplicate_count = 0
                task.error_count = spider_error_count
                task.duration_seconds = int(duration)
                task.completed_at = datetime.now()
                task.error_message = (
                    "爬虫请求失败或目标站点返回异常"
                    if spider_error_count > 0
                    else "采集完成但未提取到可入库题目"
                )
                source.last_status = task.status
                await db.commit()
                logger.warning(
                    f"[调度器] 爬虫 {source.name} 未获取到数据: "
                    f"status={task.status}, errors={spider_error_count}, 耗时={duration:.1f}s"
                )
                return
            
            # 5. 数据处理管道
            pipeline = DataPipeline()
            stats = await pipeline.process(raw_data, source.name, db=db)
            
            # 6. 更新任务状态为成功
            duration = (datetime.now() - start_time).total_seconds()
            task.status = "success" if stats["total"] > 0 else "no_data"
            task.total_count = stats["total"]
            task.new_count = stats["new"]
            task.duplicate_count = stats["duplicate"]
            task.error_count = stats["error"]
            task.duration_seconds = int(duration)
            task.completed_at = datetime.now()
            if task.status == "no_data":
                task.error_message = "采集完成但未提取到可入库题目"
            
            source.last_status = task.status
            await db.commit()
            
            logger.info(
                f"[调度器] 爬虫 {source.name} 执行完成: "
                f"状态={task.status}, 总数={stats['total']}, 新增={stats['new']}, "
                f"重复={stats['duplicate']}, 耗时={duration:.1f}s"
            )
            
        except Exception as e:
            logger.error(f"[调度器] 爬虫任务失败: {e}")
            # 更新任务状态为失败
            try:
                if "task" in dir() and task:
                    task.status = "failed"
                    task.error_message = str(e)[:500]
                    task.completed_at = datetime.now()
                if "source" in dir() and source:
                    source.last_status = "failed"
                await db.commit()
            except Exception as inner_e:
                logger.error(f"[调度器] 更新失败状态出错: {inner_e}")


def run_spider_sync(source_id: int):
    """同步包装 - 在后台线程中执行异步爬虫任务"""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    loop.run_until_complete(run_spider(source_id))


async def init_scheduler():
    """初始化调度器 - 从数据库加载启用的来源并创建定时任务"""
    scheduler = get_scheduler()
    
    # 如果调度器已在运行，先关闭
    if scheduler.running:
        scheduler.shutdown()
        global _scheduler
        _scheduler = BackgroundScheduler()
        scheduler = _scheduler
    
    async with async_session_factory() as db:
        try:
            result = await db.execute(
                select(CrawlSource).where(CrawlSource.is_enabled == True)
            )
            sources = result.scalars().all()
            
            for source in sources:
                try:
                    scheduler.add_job(
                        run_spider_sync,  # 使用同步包装
                        trigger=CronTrigger.from_crontab(source.cron_expression),
                        id=f"crawl_{source.id}",
                        args=[source.id],
                        replace_existing=True,
                        misfire_grace_time=3600,
                        name=f"爬虫-{source.name}",
                    )
                    logger.info(
                        f"[调度器] 已添加定时任务: {source.name} "
                        f"({source.cron_expression})"
                    )
                except Exception as e:
                    logger.error(f"[调度器] 添加任务失败 {source.name}: {e}")
            
            scheduler.start()
            logger.info(f"[调度器] 爬虫调度器已启动，共 {len(sources)} 个任务")
            
        except Exception as e:
            logger.error(f"[调度器] 初始化失败: {e}")


def shutdown_scheduler():
    """关闭调度器"""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[调度器] 爬虫调度器已关闭")
    _scheduler = None


def add_source_job(source: CrawlSource):
    """动态添加来源的定时任务"""
    scheduler = get_scheduler()
    job_id = f"crawl_{source.id}"
    
    # 先移除已存在的任务
    try:
        scheduler.remove_job(job_id)
    except Exception:
        pass
    
    if source.is_enabled:
        scheduler.add_job(
            run_spider_sync,
            trigger=CronTrigger.from_crontab(source.cron_expression),
            id=job_id,
            args=[source.id],
            replace_existing=True,
            name=f"爬虫-{source.name}",
        )
        logger.info(f"[调度器] 已添加任务: {source.name}")


def remove_source_job(source_id: int):
    """移除来源的定时任务"""
    scheduler = get_scheduler()
    job_id = f"crawl_{source_id}"
    try:
        scheduler.remove_job(job_id)
        logger.info(f"[调度器] 已移除任务: {job_id}")
    except Exception:
        pass  # 任务不存在则忽略


def get_scheduler_status() -> dict:
    """获取调度器状态"""
    scheduler = get_scheduler()
    jobs = scheduler.get_jobs()
    return {
        "running": scheduler.running,
        "job_count": len(jobs),
        "jobs": [
            {
                "id": j.id,
                "name": j.name,
                "next_run": j.next_run_time.isoformat() if j.next_run_time else None,
            }
            for j in jobs
        ],
    }
