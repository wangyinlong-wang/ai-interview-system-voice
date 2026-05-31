"""
爬虫基类 - 所有爬虫Spider的抽象基类
提供: HTTP请求(带重试和延迟)、HTML解析、统一接口
"""

import requests
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
import random
import time
import logging

logger = logging.getLogger(__name__)

# 预设User-Agent列表 - 模拟不同浏览器
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.1 Safari/605.1.15",
]


class BaseSpider(ABC):
    """爬虫基类 - 所有具体爬虫必须继承此类"""
    
    name: str = "base"           # 爬虫标识名
    base_url: str = ""           # 目标站点基础URL
    source_name: str = ""        # 来源显示名称
    
    def __init__(self):
        # 创建会话保持cookies
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
        })
        # 统计信息
        self.stats = {
            "total": 0,      # 处理总数
            "new": 0,        # 新增数量
            "duplicate": 0,  # 重复数量
            "error": 0,      # 错误数量
        }
    
    def get(self, url: str, **kwargs) -> Optional[requests.Response]:
        """
        发送GET请求，带重试和延迟
        
        策略:
        - 随机延迟1-3秒，避免被封
        - 最多3次重试
        - 指数退避: 1s, 2s, 4s
        """
        for attempt in range(3):
            try:
                time.sleep(random.uniform(1, 3))  # 随机延迟1-3秒
                response = self.session.get(url, timeout=10, **kwargs)
                response.raise_for_status()
                return response
            except requests.exceptions.HTTPError as e:
                if response.status_code == 429:  # 限流
                    wait_time = 2 ** attempt * 5
                    logger.warning(f"触发限流，等待 {wait_time}s 后重试: {url}")
                    time.sleep(wait_time)
                else:
                    logger.error(f"请求失败 (尝试 {attempt+1}/3): {url}, 状态码: {response.status_code}")
                    time.sleep(2 ** attempt)
            except Exception as e:
                logger.error(f"请求失败 (尝试 {attempt+1}/3): {url}, 错误: {e}")
                time.sleep(2 ** attempt)  # 指数退避
        return None
    
    def post(self, url: str, **kwargs) -> Optional[requests.Response]:
        """发送POST请求，带重试和延迟"""
        for attempt in range(3):
            try:
                time.sleep(random.uniform(0.5, 1.5))
                response = self.session.post(url, timeout=15, **kwargs)
                response.raise_for_status()
                return response
            except Exception as e:
                logger.error(f"POST请求失败 (尝试 {attempt+1}/3): {url}, 错误: {e}")
                time.sleep(2 ** attempt)
        return None
    
    @abstractmethod
    def crawl(self, max_pages: int = 5) -> List[Dict[str, Any]]:
        """
        执行爬取，返回原始数据列表
        
        Args:
            max_pages: 最大爬取页数
            
        Returns:
            原始数据字典列表，每个字典包含:
            - title: 题目内容(必须)
            - answer: 参考答案(可选)
            - analysis: 解析(可选)
            - questions: 问题列表(可选)
            - difficulty: 难度(可选)
            - tags: 标签列表(可选)
            - category: 分类(可选)
            - question_type: 题型(可选)
            - source_url: 来源URL(可选)
            - source_name: 来源名称(可选)
        """
        pass
    
    def parse_html(self, html: str) -> BeautifulSoup:
        """解析HTML为BeautifulSoup对象"""
        return BeautifulSoup(html, "lxml")
    
    def reset_stats(self):
        """重置统计信息"""
        self.stats = {"total": 0, "new": 0, "duplicate": 0, "error": 0}
