"""
面试题自动分类模块 - 基于关键词匹配的自动分类器
支持: 岗位分类、子分类、题型分类、难度评估、标签提取
"""

import re
from typing import Optional, List, Dict

# ============ 关键词映射表 ============

# 岗位分类关键词
CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "frontend": ["前端", "html", "css", "javascript", "js", "react", "vue", "angular", "webpack", "dom", "浏览器", "响应式", "es6", "typescript", "sass", "less", "npm", "nodejs", "前端性能"],
    "backend": ["后端", "java", "python", "go", "spring", "mysql", "redis", "nginx", "api", "服务器", "微服务", "rpc", "docker", "k8s", "kubernetes", "tomcat", "netty", "dubbo", "nacos", "rabbitmq", "kafka"],
    "algorithm": ["算法", "排序", "二叉树", "链表", "动态规划", "递归", "时间复杂度", "leetcode", "栈", "队列", "哈希", "图", "贪心", "回溯", "分治", "bfs", "dfs"],
    "product": ["产品", "产品经理", "prd", "需求分析", "用户体验", "竞品分析", "数据指标", "用户画像", "mvp", "axure", "原型", "axure", "用户研究", "ab测试"],
    "operations": ["运营", "活动", "增长", "留存", "转化", "社群", "内容运营", "用户运营", "新媒体", "seo", "sem", "投放"],
    "design": ["设计", "ui", "ux", "交互", "视觉", "figma", "sketch", "用户体验", "设计原则", "色彩", "排版", "动效", "icon"],
    "devops": ["运维", "linux", "shell", "jenkins", "ci/cd", "监控", "日志", "自动化", "ansible", "prometheus", "grafana", "elk", "nginx"],
    "data": ["数据", "数据分析", "sql", "hive", "spark", "hadoop", "etl", "可视化", "bi", "tableau", "powerbi", "数据仓库", "数据建模"],
    "ai": ["机器学习", "深度学习", "神经网络", "nlp", "cv", "模型", "tensorflow", "pytorch", "推荐", "强化学习", "cnn", "rnn", "transformer", "bert", "llm"],
    "mobile": ["移动端", "android", "ios", "flutter", "react native", "app", "小程序", "uniapp", "kotlin", "swift", "objective-c"],
}

# 子分类关键词（按岗位细分）
SUB_CATEGORY_KEYWORDS: Dict[str, Dict[str, List[str]]] = {
    "frontend": {
        "react": ["react", "hooks", "jsx", "redux", "next.js", "usestate", "useeffect"],
        "vue": ["vue", "composition", "vuex", "nuxt", "pinia", "v-model", "vue-router"],
        "css": ["css", "flexbox", "grid", "sass", "less", "tailwind", "响应式", "布局", "动画"],
        "javascript": ["javascript", "js", "es6", "promise", "async", "await", "闭包", "原型链", "事件循环"],
        "performance": ["性能", "优化", "加载", "缓存", "懒加载", "cdn", "webpack优化", "构建优化"],
        "browser": ["浏览器", "dom", "bom", "渲染", "重排", "重绘", "事件冒泡", "事件捕获", "跨域"],
    },
    "backend": {
        "java": ["java", "spring", "jvm", "mybatis", "springboot", "springcloud", "多线程", "nio", "gc"],
        "python": ["python", "django", "flask", "fastapi", "celery", "asyncio", "gunicorn", "wsgi"],
        "database": ["mysql", "redis", "mongodb", "sql", "索引", "事务", "锁", "分库分表", "主从", "缓存"],
        "microservice": ["微服务", "rpc", "consul", "熔断", "限流", "降级", "网关", "注册中心", "配置中心"],
        "middleware": ["kafka", "rabbitmq", "rocketmq", "消息队列", "定时任务", "elasticseach", "分布式"],
    },
    "algorithm": {
        "array": ["数组", "双指针", "滑动窗口", "前缀和", "二分查找"],
        "tree": ["二叉树", "bst", "avl", "红黑树", "线段树", "树状数组", "并查集"],
        "graph": ["图", "最短路", "最小生成树", "拓扑排序", "强连通", "dijkstra"],
        "dp": ["动态规划", "背包", "线性dp", "区间dp", "状态压缩"],
        "string": ["字符串", "kmp", "字典树", "后缀数组", "manacher"],
    },
}

# 题型分类关键词
QUESTION_TYPE_KEYWORDS: Dict[str, List[str]] = {
    "algorithm": ["算法", "实现", "排序", "复杂度", "leetcode", "编写代码", "时间复杂度", "空间复杂度"],
    "technical": ["原理", "机制", "区别", "比较", "实现方式", "底层", "详解", "什么是", "解释一下"],
    "behavioral": ["介绍一下", "说说看", "分享一下", "经历", "项目", "团队", "冲突", "挑战", "成就"],
    "situational": ["如果", "场景", "假设", "遇到", "怎么处理", "如何解决", "面对", "情况下"],
    "system_design": ["设计", "架构", "系统", "方案", "高并发", "分布式", "微服务", "秒杀", "排行榜"],
    "coding": ["写代码", "编程题", "实现函数", "手写", "代码实现", "用.*实现"],
}

# 难度评估关键词
HARD_KEYWORDS = ["优化", "设计", "架构", "分布式", "高并发", "原理", "源码", "深度", "性能调优", "复杂", "深入", "高级", "调优", "瓶颈"]
MEDIUM_KEYWORDS = ["区别", "比较", "实现", "机制", "原理", "使用", "配置", "流程", "介绍一下", "简述"]
EASY_KEYWORDS = ["什么是", "介绍一下", "说说", "基础", "概念", "简单", "初级", "基础概念", "入门级"]


def classify_question(title: str) -> Dict[str, Optional[str]]:
    """
    对面试题进行自动分类
    
    Args:
        title: 面试题标题/内容
        
    Returns:
        包含 category, sub_category, difficulty, question_type, tags 的字典
    """
    if not title or not isinstance(title, str):
        return {
            "category": None,
            "sub_category": None,
            "difficulty": "intermediate",
            "question_type": "technical",
            "tags": [],
        }
    
    title_lower = title.lower()
    
    # 1. 岗位分类 - 按关键词匹配得分最高的
    category = None
    category_scores = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = sum(2 if kw in title else (1 if kw in title_lower else 0) for kw in keywords)
        if score > 0:
            category_scores[cat] = score
    if category_scores:
        category = max(category_scores, key=category_scores.get)
    
    # 2. 子分类
    sub_category = None
    if category and category in SUB_CATEGORY_KEYWORDS:
        sub_scores = {}
        for sub, keywords in SUB_CATEGORY_KEYWORDS[category].items():
            score = sum(2 if kw in title else (1 if kw in title_lower else 0) for kw in keywords)
            if score > 0:
                sub_scores[sub] = score
        if sub_scores:
            sub_category = max(sub_scores, key=sub_scores.get)
    
    # 3. 题型分类
    question_type = None
    type_scores = {}
    for qt, keywords in QUESTION_TYPE_KEYWORDS.items():
        score = sum(2 if kw in title else (1 if kw in title_lower else 0) for kw in keywords)
        if score > 0:
            type_scores[qt] = score
    if type_scores:
        question_type = max(type_scores, key=type_scores.get)
    else:
        question_type = "technical"  # 默认技术题
    
    # 4. 难度评估
    difficulty = estimate_difficulty(title)
    
    # 5. 标签提取
    tags = extract_tags(title)
    
    return {
        "category": category,
        "sub_category": sub_category,
        "difficulty": difficulty,
        "question_type": question_type,
        "tags": tags,
    }


def estimate_difficulty(title: str) -> str:
    """
    根据题目内容评估难度
    
    Returns:
        beginner | intermediate | advanced
    """
    if not title:
        return "intermediate"
    
    title_lower = title.lower()
    
    hard_score = sum(1 for kw in HARD_KEYWORDS if kw in title_lower or kw in title)
    medium_score = sum(1 for kw in MEDIUM_KEYWORDS if kw in title_lower or kw in title)
    easy_score = sum(1 for kw in EASY_KEYWORDS if kw in title_lower or kw in title)
    
    # 简单题目中如果有高难度关键词，提升难度
    if hard_score >= 2:
        return "advanced"
    if easy_score >= 2 and hard_score == 0:
        return "beginner"
    
    # 比较得分
    scores = {"advanced": hard_score, "intermediate": medium_score, "beginner": easy_score}
    return max(scores, key=scores.get)


def extract_tags(title: str, max_tags: int = 5) -> List[str]:
    """
    从标题中提取技术标签
    
    Args:
        title: 面试题标题
        max_tags: 最多返回的标签数量
        
    Returns:
        标签列表
    """
    if not title:
        return []
    
    title_lower = title.lower()
    all_keywords = set()
    for keywords in CATEGORY_KEYWORDS.values():
        all_keywords.update(keywords)
    
    found_tags = []
    for kw in all_keywords:
        if len(kw) >= 2 and (kw in title or kw in title_lower):
            found_tags.append(kw)
    
    # 按长度降序，优先匹配更精确的长关键词
    found_tags.sort(key=len, reverse=True)
    
    return found_tags[:max_tags]
