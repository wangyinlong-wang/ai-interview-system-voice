"""
力扣爬虫 - 调用力扣公开GraphQL API获取题目
目标: https://leetcode.cn/graphql
"""

from typing import List, Dict, Any
import logging

from app.crawlers.base import BaseSpider

logger = logging.getLogger(__name__)


class LeetCodeSpider(BaseSpider):
    """力扣爬虫 - 调用公开GraphQL API获取算法题"""
    
    name = "leetcode"
    base_url = "https://leetcode.cn"
    source_name = "力扣"
    
    # GraphQL查询 - 获取题目列表
    PROBLEM_LIST_QUERY = """
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
        problemsetQuestionList: questionList(
            categorySlug: $categorySlug
            limit: $limit
            skip: $skip
            filters: $filters
        ) {
            total: totalNum
            questions: data {
                acRate
                difficulty
                frontendQuestionId: questionFrontendId
                title
                titleCn
                titleSlug
                topicTags {
                    name
                    nameTranslated
                    id
                    slug
                }
                hasSolution
                hasVideoSolution
            }
        }
    }
    """
    
    # GraphQL查询 - 获取题目详情
    PROBLEM_DETAIL_QUERY = """
    query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
            title
            titleCn
            content
            difficulty
            topicTags {
                name
                nameTranslated
                slug
            }
            codeSnippets {
                lang
                code
            }
        }
    }
    """
    
    def crawl(self, max_pages: int = 5) -> List[Dict[str, Any]]:
        """
        爬取力扣面试题
        
        策略: 调用GraphQL API获取题目列表 → 提取题目信息
        """
        results = []
        self.reset_stats()
        
        limit = 50  # 每页数量
        total_fetched = 0
        target_count = max_pages * 10  # 目标获取数量
        
        for skip in range(0, target_count, limit):
            variables = {
                "categorySlug": "",
                "skip": skip,
                "limit": limit,
                "filters": {}
            }
            
            try:
                response = self.session.post(
                    f"{self.base_url}/graphql",
                    json={"query": self.PROBLEM_LIST_QUERY, "variables": variables},
                    timeout=15,
                    headers={
                        "Content-Type": "application/json",
                        "Referer": f"{self.base_url}/problemset/",
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                questions = data.get("data", {}).get("problemsetQuestionList", {}).get("questions", [])
                
                if not questions:
                    break
                
                for q in questions:
                    if not q:  # 跳过空数据
                        continue
                    
                    title_cn = q.get("titleCn", "")
                    title_en = q.get("title", "")
                    title = title_cn or title_en
                    
                    if not title:
                        continue
                    
                    # 获取标签
                    tags = []
                    for tag in q.get("topicTags", []):
                        tag_name = tag.get("nameTranslated") or tag.get("name", "")
                        if tag_name:
                            tags.append(tag_name)
                    
                    difficulty = q.get("difficulty", "").lower()
                    ac_rate = q.get("acRate", "")
                    
                    results.append({
                        "title": f"【算法题】{title}",
                        "answer": f"难度: {difficulty}\n通过率: {ac_rate}%\n" if ac_rate else "",
                        "analysis": f"题目编号: {q.get('frontendQuestionId', '')}",
                        "questions": [title],
                        "difficulty": difficulty,
                        "tags": tags,
                        "source_url": f"{self.base_url}/problems/{q.get('titleSlug', '')}",
                        "source_name": self.source_name,
                        "category": "algorithm",
                        "question_type": "algorithm",
                    })
                    self.stats["total"] += 1
                
                total_fetched += len(questions)
                logger.info(f"[力扣] 已获取 {total_fetched} 道题目")
                
                if len(questions) < limit:
                    break  # 没有更多数据
                    
            except Exception as e:
                logger.error(f"[力扣] API请求失败: {e}")
                self.stats["error"] += 1
                break
        
        logger.info(f"[力扣] 爬取完成: 共 {len(results)} 道题目")
        return results
    
    def _fetch_detail(self, title_slug: str) -> Dict[str, Any]:
        """获取单题详情（可选，如需更详细内容可调用）"""
        variables = {"titleSlug": title_slug}
        
        try:
            response = self.session.post(
                f"{self.base_url}/graphql",
                json={"query": self.PROBLEM_DETAIL_QUERY, "variables": variables},
                timeout=15,
                headers={"Content-Type": "application/json"}
            )
            data = response.json()
            question = data.get("data", {}).get("question", {})
            return question
        except Exception as e:
            logger.error(f"[力扣] 获取详情失败 {title_slug}: {e}")
            return {}
