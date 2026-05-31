"""
牛客网爬虫 - 爬取面经区讨论帖中的面试题
目标: https://www.nowcoder.com/discuss
"""

from typing import List, Dict, Any
import re
import logging

from app.crawlers.base import BaseSpider

logger = logging.getLogger(__name__)


class NowcoderSpider(BaseSpider):
    """牛客网面经爬虫 - 从讨论区提取面试题"""
    
    name = "nowcoder"
    base_url = "https://www.nowcoder.com"
    source_name = "牛客网"
    
    def crawl(self, max_pages: int = 5) -> List[Dict[str, Any]]:
        """
        爬取牛客网面经区
        
        策略: 遍历面经列表页 → 进入详情页 → 提取面试题
        """
        results = []
        self.reset_stats()
        
        # 面经列表页面（按时间排序）
        for page in range(1, max_pages + 1):
            list_url = f"{self.base_url}/discuss?type=2&order=time&page={page}"
            logger.info(f"[牛客网] 正在爬取第 {page} 页: {list_url}")
            
            response = self.get(list_url)
            if not response:
                logger.warning(f"[牛客网] 第 {page} 页请求失败，跳过")
                continue
            
            soup = self.parse_html(response.text)
            
            # 提取面经列表链接 - 尝试多种可能的选择器
            posts = soup.find_all("a", class_=lambda x: x and ("discuss-title" in x or "topic-title" in x))
            if not posts:
                # 备选选择器
                posts = soup.select(".discuss-main a[href*='/discuss/']") or soup.select("a[href*='/discuss/']")
            
            logger.info(f"[牛客网] 第 {page} 页找到 {len(posts)} 个面经链接")
            
            for post in posts[:10]:  # 每页最多处理10条
                try:
                    title = post.get_text(strip=True)
                    href = post.get("href", "")
                    
                    # 补全URL
                    if href and not href.startswith("http"):
                        href = self.base_url + href
                    
                    if not href or not title:
                        continue
                    
                    # 访问详情页获取内容
                    detail = self._parse_detail(href)
                    if detail:
                        results.append(detail)
                        self.stats["total"] += 1
                        
                except Exception as e:
                    logger.error(f"[牛客网] 解析面经失败: {e}")
                    self.stats["error"] += 1
        
        logger.info(f"[牛客网] 爬取完成: 共 {len(results)} 条面经")
        return results
    
    def _parse_detail(self, url: str) -> Dict[str, Any]:
        """解析面经详情页，提取面试题"""
        response = self.get(url)
        if not response:
            return None
        
        soup = self.parse_html(response.text)
        
        # 提取标题
        title_tag = soup.find("h1") or soup.find("h2") or soup.find("title")
        title = title_tag.get_text(strip=True) if title_tag else ""
        
        # 提取正文内容 - 尝试多种可能的内容区选择器
        content_div = (
            soup.find("div", class_=lambda x: x and "post-content" in x)
            or soup.find("div", class_=lambda x: x and "topic" in x)
            or soup.find("div", class_=lambda x: x and "content" in x)
            or soup.find("article")
            or soup.find("main")
        )
        
        content = content_div.get_text("\n", strip=True) if content_div else ""
        
        # 从内容中提取面试题
        questions = self._extract_questions(content)
        
        if not questions:
            return None
        
        return {
            "title": title or questions[0] if questions else "",
            "content": content[:2000],  # 限制长度
            "questions": questions,
            "source_url": url,
            "source_name": self.source_name,
        }
    
    def _extract_questions(self, content: str) -> List[str]:
        """
        从面经正文中提取面试题
        
        匹配模式:
        1. 数字/中文数字开头的行
        2. Q开头的行
        3. 包含疑问词的面试题描述
        """
        questions = []
        lines = content.split("\n")
        
        for line in lines:
            line = line.strip()
            if not line or len(line) < 10:
                continue
            
            # 匹配数字开头的列表: "1. xxx" "一、xxx"
            if re.match(r"^[\d一二三四五六七八九十]+[、.\s]", line):
                if self._is_question_line(line):
                    questions.append(line)
            # 匹配Q开头的: "Q1: xxx"
            elif re.match(r"^Q\d*[\s:.]", line, re.I):
                if len(line) > 10:
                    questions.append(line)
            # 匹配包含面试题特征的行
            elif self._is_question_line(line) and len(line) < 300:
                questions.append(line)
        
        return questions[:20]  # 最多返回20题
    
    def _is_question_line(self, line: str) -> bool:
        """判断一行文本是否是面试题"""
        question_indicators = [
            "?", "？",           # 疑问号
            "什么", "如何", "怎么", "为什么", "哪些",
            "介绍", "解释", "说说", "谈谈", "讲讲",
            "区别", "比较", "对比",
            "原理", "机制", "流程",
            "实现", "优化", "设计",
            "场景", "案例",
        ]
        return any(ind in line for ind in question_indicators)
