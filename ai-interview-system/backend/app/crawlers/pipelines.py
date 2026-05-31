"""
数据管道: 清洗 → 去重 → 分类 → 存储
连接爬虫和数据库的核心模块
"""

import logging
import re
from typing import List, Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models import QuestionBank
from app.crawlers.dedup import QuestionDeduplicator
from app.crawlers.classifier import classify_question

logger = logging.getLogger(__name__)


class DataPipeline:
    """数据处理管道 - 完整的处理链路"""
    
    def __init__(self):
        self.deduplicator = QuestionDeduplicator()
    
    async def _init_existing_hashes(self, db: AsyncSession):
        """初始化已有题目的hash缓存 - 从数据库加载已审核的题目"""
        try:
            result = await db.execute(
                select(QuestionBank.title).where(QuestionBank.status == "approved")
            )
            existing = result.scalars().all()
            for title in existing:
                self.deduplicator.add_hash(title)
            logger.info(f"[数据管道] 去重缓存初始化完成，已有 {len(existing)} 条记录")
        except Exception as e:
            logger.error(f"[数据管道] 初始化去重缓存失败: {e}")
    
    async def process(
        self,
        raw_data: List[Dict[str, Any]],
        source_name: str,
        db: AsyncSession = None,
    ) -> Dict[str, int]:
        """
        处理原始数据: 清洗、去重、分类、存储
        
        Args:
            raw_data: 爬虫返回的原始数据列表
            source_name: 数据来源名称
            db: 数据库会话（可选，不提供则自动创建）
            
        Returns:
            统计字典: {total, new, duplicate, error}
        """
        stats = {"total": 0, "new": 0, "duplicate": 0, "error": 0}
        
        # 自动管理数据库会话
        if db is None:
            async with async_session_factory() as session:
                return await self._do_process(raw_data, source_name, session, stats)
        else:
            return await self._do_process(raw_data, source_name, db, stats)
    
    async def _do_process(
        self,
        raw_data: List[Dict[str, Any]],
        source_name: str,
        db: AsyncSession,
        stats: Dict[str, int],
    ) -> Dict[str, int]:
        """实际处理逻辑"""
        
        # 初始化去重缓存
        await self._init_existing_hashes(db)
        
        for item in raw_data:
            stats["total"] += 1
            
            try:
                # 1. 数据清洗
                cleaned = self._clean(item)
                if not cleaned:
                    continue
                
                # 2. 去重检查
                if self.deduplicator.is_duplicate(cleaned["title"]):
                    stats["duplicate"] += 1
                    continue
                
                # 3. 自动分类
                classification = classify_question(cleaned["title"])
                cleaned.update(classification)
                
                # 4. 使用item中已有的字段覆盖（爬虫可能已提供更精确的分类）
                cleaned["source_name"] = item.get("source_name", source_name)
                cleaned["source_url"] = item.get("source_url", "")
                cleaned["category"] = item.get("category") or cleaned.get("category")
                cleaned["sub_category"] = item.get("sub_category") or cleaned.get("sub_category")
                cleaned["difficulty"] = item.get("difficulty") or cleaned.get("difficulty", "intermediate")
                cleaned["question_type"] = item.get("question_type") or cleaned.get("question_type", "technical")
                cleaned["tags"] = item.get("tags") or cleaned.get("tags", [])
                
                # 确保tags是JSON可序列化的列表
                if cleaned["tags"] and isinstance(cleaned["tags"], str):
                    cleaned["tags"] = [cleaned["tags"]]
                
                # 5. 存储到数据库
                question = QuestionBank(
                    title=cleaned["title"],
                    answer=item.get("answer"),
                    analysis=item.get("analysis"),
                    category=cleaned.get("category"),
                    sub_category=cleaned.get("sub_category"),
                    difficulty=cleaned.get("difficulty", "intermediate"),
                    question_type=cleaned.get("question_type", "technical"),
                    tags=cleaned.get("tags"),
                    source_name=cleaned["source_name"],
                    source_url=cleaned["source_url"],
                    status="pending",  # 默认待审核
                    crawled_at=None,  # 使用数据库默认值
                )
                db.add(question)
                await db.commit()
                
                # 6. 添加到去重缓存
                self.deduplicator.add_hash(cleaned["title"])
                stats["new"] += 1
                
            except Exception as e:
                logger.error(f"[数据管道] 处理题目失败: {e}")
                stats["error"] += 1
                await db.rollback()
        
        logger.info(
            f"[数据管道] 处理完成: 总数={stats['total']}, "
            f"新增={stats['new']}, 重复={stats['duplicate']}, 错误={stats['error']}"
        )
        return stats
    
    def _clean(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """
        清洗单条数据
        
        规则:
        - 标题长度: 10-500字符
        - 去除HTML标签
        - 去除特殊控制字符
        """
        title = item.get("title", "").strip()
        
        # 长度过滤
        if len(title) < 10 or len(title) > 500:
            return None
        
        # 去除HTML标签
        title = re.sub(r"<[^>]+>", "", title)
        
        # 去除Markdown格式符号
        title = re.sub(r"[*#`\[\]]+", "", title)
        
        # 去除特殊控制字符
        title = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", title)
        
        # 去除多余空白
        title = re.sub(r"\s+", " ", title).strip()
        
        if not title:
            return None
        
        return {"title": title}
    
    def reset(self):
        """重置管道状态"""
        self.deduplicator.clear()
