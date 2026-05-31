"""
爬虫集合 - 各站点的具体爬虫实现
"""

from .nowcoder import NowcoderSpider
from .leetcode import LeetCodeSpider
from .github import GitHubInterviewSpider

__all__ = [
    "NowcoderSpider",
    "LeetCodeSpider",
    "GitHubInterviewSpider",
]

# Spider注册表 - 供调度器使用
SPIDER_REGISTRY = {
    "NowcoderSpider": NowcoderSpider,
    "LeetCodeSpider": LeetCodeSpider,
    "GitHubInterviewSpider": GitHubInterviewSpider,
}
