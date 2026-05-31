"""
爬虫模块 - 定时采集面试题并扩充知识库
包含: 爬虫基类、具体Spider、数据管道、去重、分类、调度器
"""

from .base import BaseSpider, USER_AGENTS
from .pipelines import DataPipeline
from .dedup import QuestionDeduplicator, SimHash
from .classifier import classify_question, estimate_difficulty, extract_tags

__all__ = [
    "BaseSpider",
    "USER_AGENTS",
    "DataPipeline",
    "QuestionDeduplicator",
    "SimHash",
    "classify_question",
    "estimate_difficulty",
    "extract_tags",
]
