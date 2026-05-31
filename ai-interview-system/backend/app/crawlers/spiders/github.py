"""
GitHub面试题仓库爬虫 - 从开源仓库的Markdown文件提取面试题
支持多个知名面试题仓库
"""

from typing import List, Dict, Any
import re
import logging

from app.crawlers.base import BaseSpider

logger = logging.getLogger(__name__)


class GitHubInterviewSpider(BaseSpider):
    """GitHub面试题仓库爬虫 - 读取raw文件内容提取题目"""
    
    name = "github_interview"
    base_url = "https://raw.githubusercontent.com"
    source_name = "GitHub"
    
    # 要爬取的GitHub面试题仓库列表
    # 每个仓库指定: 所有者、仓库名、文件路径、分类
    REPOS = [
        {
            "owner": "haizlin",
            "repo": "fe-interview",
            "path": "category/history.md",
            "category": "frontend",
            "description": "前端面试每日一题",
        },
        {
            "owner": "TrimConstru",
            "repo": "Java-Interview-Questions",
            "path": "README.md",
            "category": "backend",
            "description": "Java面试题集合",
        },
        {
            "owner": "0voice",
            "repo": "interview_internal_reference",
            "path": "README.md",
            "category": "backend",
            "description": "互联网大厂面试题",
        },
    ]
    
    def crawl(self, max_pages: int = 5) -> List[Dict[str, Any]]:
        """
        爬取GitHub面试题仓库
        
        策略: 读取各仓库的raw Markdown文件 → 解析提取面试题
        """
        results = []
        self.reset_stats()
        
        for repo_info in self.REPOS[:max_pages]:
            try:
                owner = repo_info["owner"]
                repo = repo_info["repo"]
                path = repo_info["path"]
                category = repo_info["category"]
                
                # 构建raw文件URL（使用main分支，失败时回退到master）
                branches = ["main", "master"]
                content = None
                
                for branch in branches:
                    raw_url = f"{self.base_url}/{owner}/{repo}/{branch}/{path}"
                    logger.info(f"[GitHub] 正在读取: {owner}/{repo}/{path} (branch: {branch})")
                    
                    response = self.get(raw_url)
                    if response and response.status_code == 200:
                        content = response.text
                        break
                    logger.warning(f"[GitHub] {branch} 分支不存在，尝试下一个")
                
                if not content:
                    logger.error(f"[GitHub] 无法读取仓库: {owner}/{repo}")
                    self.stats["error"] += 1
                    continue
                
                # 从Markdown内容中提取面试题
                questions = self._extract_from_markdown(content, category)
                logger.info(f"[GitHub] {owner}/{repo} 提取了 {len(questions)} 道题目")
                
                for q in questions:
                    results.append({
                        "title": q if len(q) <= 500 else q[:500],
                        "questions": [q],
                        "source_url": f"https://github.com/{owner}/{repo}",
                        "source_name": self.source_name,
                        "category": category,
                        "question_type": "technical",
                    })
                    self.stats["total"] += 1
                    
            except Exception as e:
                logger.error(f"[GitHub] 爬取失败 {repo_info}: {e}")
                self.stats["error"] += 1
        
        logger.info(f"[GitHub] 爬取完成: 共 {len(results)} 道题目")
        return results
    
    def _extract_from_markdown(self, content: str, category: str) -> List[str]:
        """
        从Markdown内容中提取面试题
        
        匹配模式:
        1. ##/### 标题格式的问题
        2. 数字列表格式的问题
        3. - 列表格式的问题
        """
        questions = []
        lines = content.split("\n")
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 匹配Markdown标题格式: "## xxx" "### xxx"
            if line.startswith("## ") or line.startswith("### "):
                title = line.lstrip("# ").strip()
                if self._is_valid_question(title):
                    questions.append(title)
            # 匹配数字列表: "1. xxx" "2. xxx"
            elif re.match(r"^\d+\.\s+", line) and len(line) > 15:
                q = re.sub(r"^\d+\.\s+", "", line).strip()
                # 去除Markdown链接格式 [text](url)
                q = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", q)
                if self._is_valid_question(q):
                    questions.append(q)
            # 匹配 - 列表格式
            elif line.startswith("- ") and len(line) > 15:
                q = line[2:].strip()
                q = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", q)
                if self._is_valid_question(q):
                    questions.append(q)
        
        # 去重并限制数量
        seen = set()
        unique_questions = []
        for q in questions:
            normalized = q.lower().strip()
            if normalized not in seen and len(q) <= 500:
                seen.add(normalized)
                unique_questions.append(q)
        
        return unique_questions[:50]  # 每个仓库最多50题
    
    def _is_valid_question(self, text: str) -> bool:
        """判断文本是否是有效的面试题"""
        if not text or len(text) < 10 or len(text) > 500:
            return False
        
        # 过滤掉代码块、链接、图片等
        if text.startswith("```") or text.startswith("!") or text.startswith("<"):
            return False
        
        # 包含疑问特征或技术关键词
        question_indicators = [
            "?", "？",
            "什么", "如何", "怎么", "为什么",
            "介绍", "解释", "说说", "谈谈",
            "区别", "比较", "对比",
            "原理", "机制", "流程", "原理",
            "实现", "优化", "设计",
        ]
        
        # 至少包含一个疑问词或长度合适的标题
        has_indicator = any(ind in text for ind in question_indicators)
        is_reasonable_length = 15 <= len(text) <= 300
        
        return has_indicator or is_reasonable_length
