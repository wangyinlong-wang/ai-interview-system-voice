"""
AI 服务模块 - 封装大模型 API 调用
负责: 简历解析、面试对话生成、评估报告生成
"""

import json
import httpx
import logging
from typing import List, Dict, Any, AsyncGenerator, Optional

from app.config import get_settings
from app.services.model_config_service import DatabaseModelConfigProvider, RuntimeModelConfig

settings = get_settings()
logger = logging.getLogger(__name__)


class AIService:
    """AI 服务封装类 - 兼容 OpenAI 格式的 API"""
    
    def __init__(self, config_provider=None):
        self.config_provider = config_provider or DatabaseModelConfigProvider()
        self.client = httpx.AsyncClient(timeout=60.0, trust_env=False)

    async def get_runtime_config(self) -> RuntimeModelConfig:
        return await self.config_provider.get_active_config()
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False,
        max_tokens: Optional[int] = None,
    ) -> Any:
        """
        发送聊天请求
        
        Args:
            messages: 消息列表，格式为 [{"role": "user", "content": "..."}, ...]
            stream: 是否使用流式输出
            max_tokens: 最大生成 token 数
        """
        runtime_config = await self.get_runtime_config()
        url = f"{runtime_config.base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {runtime_config.api_key}",
            "Content-Type": "application/json",
        }
        data = {
            "model": runtime_config.model,
            "messages": messages,
            "stream": stream,
            "max_tokens": max_tokens or runtime_config.max_tokens,
            "temperature": runtime_config.temperature,
        }
        
        response = await self.client.post(url, headers=headers, json=data, timeout=60.0)
        response.raise_for_status()
        
        if stream:
            return response  # 返回原始响应对象，由调用方处理流
        return response.json()
    
    async def chat_stream(self, messages: List[Dict[str, str]], max_tokens: Optional[int] = None) -> AsyncGenerator[str, None]:
        """
        流式聊天 - 逐字返回 AI 回复
        
        Yields:
            每个 chunk 的内容字符串
        """
        runtime_config = await self.get_runtime_config()
        url = f"{runtime_config.base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {runtime_config.api_key}",
            "Content-Type": "application/json",
        }
        data = {
            "model": runtime_config.model,
            "messages": messages,
            "stream": True,
            "max_tokens": max_tokens or runtime_config.max_tokens,
            "temperature": runtime_config.temperature,
        }
        
        async with httpx.AsyncClient(timeout=60.0, trust_env=False) as client:
            async with client.stream("POST", url, headers=headers, json=data) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line or not line.startswith("data: "):
                        continue
                    
                    json_str = line[6:]  # 去掉 "data: " 前缀
                    if json_str == "[DONE]":
                        break
                    
                    try:
                        chunk = json.loads(json_str)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, IndexError, KeyError):
                        continue
    
    async def close(self):
        """关闭 HTTP 客户端"""
        await self.client.aclose()


# 全局 AI 服务实例
_ai_service = None

def get_ai_service() -> AIService:
    """获取 AI 服务单例"""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service


# ============= 简历解析 =============

def extract_json_object(content: str) -> Dict[str, Any]:
    """从模型输出中提取第一个 JSON 对象。"""
    text = (content or "").strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    if start < 0:
        raise json.JSONDecodeError("No JSON object found", text, 0)

    depth = 0
    in_string = False
    escape = False
    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == "\"":
                in_string = False
            continue
        if char == "\"":
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                parsed = json.loads(text[start:index + 1])
                if isinstance(parsed, dict):
                    return parsed
                break

    raise json.JSONDecodeError("No complete JSON object found", text, start)

RESUME_PARSE_PROMPT = """你是一位专业的简历解析专家。请从以下简历文本中提取关键信息，并以结构化 JSON 格式输出。

【提取要求】
请提取以下字段：
1. name: 姓名
2. phone: 联系电话
3. email: 邮箱地址
4. skills: 技能列表（数组格式，每个技能单独一项）
5. work_experience: 工作经历（数组，每项包含 company/period/position/description）
6. project_experience: 项目经验（数组，每项包含 name/role/tech_stack/description）
7. education: 教育背景（数组，每项包含 school/major/degree/period）
8. self_evaluation: 自我评价

【输出格式】
严格按以下 JSON 格式输出，不要添加任何其他说明文字：
{{
  "name": "",
  "phone": "",
  "email": "",
  "skills": [],
  "work_experience": [{{"company":"","period":"","position":"","description":""}}],
  "project_experience": [{{"name":"","role":"","tech_stack":"","description":""}}],
  "education": [{{"school":"","major":"","degree":"","period":""}}],
  "self_evaluation": ""
}}

【简历文本】
{resume_text}
"""


async def parse_resume_with_ai(resume_text: str) -> Dict[str, Any]:
    """
    使用 AI 解析简历文本
    
    Args:
        resume_text: 从简历文件中提取的纯文本
        
    Returns:
        解析后的结构化字典
    """
    ai = get_ai_service()
    prompt = RESUME_PARSE_PROMPT.format(resume_text=resume_text[:8000])  # 限制长度
    
    messages = [{"role": "user", "content": prompt}]
    
    try:
        response = await ai.chat_completion(messages, stream=False, max_tokens=2000)
        content = response["choices"][0]["message"]["content"]
        
        parsed = extract_json_object(content)
        
        # 确保必要字段存在
        defaults = {
            "name": "", "phone": "", "email": "",
            "skills": [], "work_experience": [],
            "project_experience": [], "education": [],
            "self_evaluation": "",
        }
        for key, default_val in defaults.items():
            if key not in parsed or parsed[key] is None:
                parsed[key] = default_val
        
        return parsed
        
    except json.JSONDecodeError:
        # JSON 解析失败时返回空结构
        return {
            "name": "", "phone": "", "email": "",
            "skills": [], "work_experience": [],
            "project_experience": [], "education": [],
            "self_evaluation": "",
        }
    except Exception as e:
        raise Exception(f"AI 解析服务异常: {str(e)}")


# ============= 面试对话生成 =============

async def generate_interview_response(
    system_content: str,
    messages: List[Dict[str, str]],
    job_position: str = "",
    difficulty: str = "intermediate",
) -> AsyncGenerator[str, None]:
    """
    生成面试对话回复 - 流式输出
    
    Args:
        system_content: 系统提示词（面试官角色设定）
        messages: 历史对话消息列表
        job_position: 目标职位
        difficulty: 难度等级
        
    Yields:
        每个文本片段
    """
    ai = get_ai_service()
    
    # 构建完整的消息列表
    full_messages = [{"role": "system", "content": system_content}]
    
    # 添加历史对话
    for msg in messages:
        if msg["role"] in ["user", "assistant"]:
            full_messages.append(msg)
    
    # 调用流式 API
    try:
        async for chunk in ai.chat_stream(full_messages, max_tokens=800):
            yield chunk
    except Exception as e:
        yield f"\n[面试官响应异常，请稍后重试。错误: {str(e)}]"


# ============= 评估报告生成 =============

EVALUATION_PROMPT = """你是一位专业的面试评估专家。请根据以下面试对话记录，对候选人进行全面评估。

【评估维度】
1. 技术能力 (technical_score): 技术知识广度与深度，项目经验匹配度 (权重25%)
2. 沟通表达 (communication_score): 倾听理解能力，回应质量，主动沟通意识 (权重20%)
3. 逻辑思维 (logic_score): 问题分析能力，思路清晰度，举一反三能力 (权重20%)
4. 语言表达 (expression_score): 表达流畅度，术语使用准确性，举例生动性 (权重15%)
5. 岗位匹配度 (job_fit_score): 回答内容与岗位要求的契合程度 (权重10%)
6. 应变能力 (adaptability_score): 面对追问和难题时的应对表现 (权重10%)

【面试信息】
目标职位: {job_position}
面试类型: {interview_type}

【面试对话记录】
{interview_transcript}

【输出格式】
请严格按以下 JSON 格式输出评估结果，不要添加任何其他说明文字：
{{
  "overall_score": 82,
  "technical_score": 85,
  "communication_score": 80,
  "logic_score": 83,
  "expression_score": 78,
  "job_fit_score": 80,
  "adaptability_score": 75,
  "overall_comment": "总体评价文字...",
  "strengths": "优势分析...",
  "weaknesses": "不足分析...",
  "suggestions": "改进建议...",
  "dimension_scores": {{
    "knowledge_breadth": 80,
    "knowledge_depth": 85,
    "problem_analysis": 83,
    "thinking_clarity": 84,
    "response_quality": 80,
    "expression_fluency": 78
  }},
  "question_reviews": [
    {{
      "question": "问题内容",
      "answer": "回答摘要",
      "score": 80,
      "comment": "点评内容",
      "suggestion": "改进建议"
    }}
  ]
}}

【评分标准】
- 90-100: 优秀，远超岗位要求
- 80-89: 良好，符合岗位要求
- 70-79: 一般，基本符合但有明显不足
- 60-69: 较差，需大量提升
- 0-59: 不合格"""


# ============= 知识库检索（新增）=============

KNOWLEDGE_BASE_PROMPT_FRAGMENT = """

【参考题库题目（仅供参考风格，不要直接照搬）】
{reference_questions}

你可以参考以上题目的风格和考察方向来设计面试问题，但请根据候选人的实际情况灵活调整，确保问题有针对性和深度。
"""


async def get_reference_questions(
    job_position: str = "",
    category: str = None,
    limit: int = 8,
) -> str:
    """
    从知识库检索参考题目 - 用于辅助AI面试官生成更专业的问题
    
    策略:
    1. 优先按岗位分类匹配
    2. 模糊匹配职位关键词
    3. 随机抽样增加多样性
    4. 自动增加use_count（引用计数）
    
    Args:
        job_position: 目标职位名称
        category: 岗位分类(frontend/backend/algorithm等)
        limit: 返回题目数量
        
    Returns:
        格式化的参考题目文本，如为空则返回空字符串
    """
    from sqlalchemy import select, func
    from app.database import async_session_factory
    from app.models import QuestionBank
    import random
    
    try:
        async with async_session_factory() as db:
            # 构建查询
            query = select(QuestionBank).where(QuestionBank.status == "approved")
            
            # 按分类过滤
            if category:
                query = query.where(QuestionBank.category == category)
            
            # 模糊匹配职位关键词
            if job_position and not category:
                # 尝试从职位名推断分类
                position_lower = job_position.lower()
                category_map = {
                    "前端": "frontend", "frontend": "frontend", "react": "frontend",
                    "vue": "frontend", "angular": "frontend", "js": "frontend",
                    "后端": "backend", "backend": "backend", "java": "backend",
                    "python": "backend", "go": "backend", "spring": "backend",
                    "算法": "algorithm", "algorithm": "algorithm",
                    "产品": "product", "产品经理": "product", "pm": "product",
                    "运维": "devops", "devops": "devops", "linux": "devops",
                    "数据": "data", "数据分析": "data", "大数据": "data",
                    "ai": "ai", "机器学习": "ai", "深度学习": "ai",
                    "移动": "mobile", "android": "mobile", "ios": "mobile",
                    "设计": "design", "ui": "design", "ux": "design",
                }
                matched_category = None
                for keyword, cat in category_map.items():
                    if keyword in position_lower:
                        matched_category = cat
                        break
                
                if matched_category:
                    query = query.where(QuestionBank.category == matched_category)
                else:
                    # fallback: 标题包含职位关键词
                    query = query.where(QuestionBank.title.contains(job_position))
            
            # 获取热门题目（按引用次数排序）
            query = query.order_by(QuestionBank.use_count.desc())
            query = query.limit(limit * 3)  # 多取一些用于随机抽样
            
            result = await db.execute(query)
            candidates = result.scalars().all()
            
            if not candidates:
                return ""
            
            # 随机抽样增加多样性
            selected = random.sample(
                candidates,
                min(limit, len(candidates))
            ) if len(candidates) > limit else candidates
            
            # 增加use_count（引用计数）
            for q in selected:
                q.use_count = (q.use_count or 0) + 1
            
            await db.commit()
            
            # 格式化输出
            questions_text = "\n".join([
                f"{i+1}. [{q.category or '通用'}] {q.title}"
                for i, q in enumerate(selected)
            ])
            
            return KNOWLEDGE_BASE_PROMPT_FRAGMENT.format(
                reference_questions=questions_text
            )
            
    except Exception as e:
        logger.error(f"[知识库] 检索参考题目失败: {e}")
        return ""  # 失败时返回空，不影响主流程


# ============= 评估报告生成 =============

async def generate_evaluation(
    messages: List[Any],
    job_position: str = "",
    interview_type: str = "comprehensive",
) -> Dict[str, Any]:
    """
    生成面试评估报告
    
    Args:
        messages: 面试对话消息列表（SQLAlchemy Message 对象）
        job_position: 目标职位
        interview_type: 面试类型
        
    Returns:
        评估结果字典
    """
    ai = get_ai_service()
    
    # 构建对话记录文本
    transcript_lines = []
    for msg in messages:
        role_name = "面试官" if msg.role == "assistant" else "候选人"
        transcript_lines.append(f"{role_name}: {msg.content}")
    
    interview_transcript = "\n".join(transcript_lines)
    
    # 截断过长的对话
    if len(interview_transcript) > 8000:
        interview_transcript = interview_transcript[:8000] + "\n...（对话已截断）"
    
    prompt = EVALUATION_PROMPT.format(
        job_position=job_position or "未指定",
        interview_type=interview_type,
        interview_transcript=interview_transcript,
    )
    
    messages_ai = [{"role": "user", "content": prompt}]
    defaults = {
        "overall_score": 70,
        "technical_score": 70,
        "communication_score": 70,
        "logic_score": 70,
        "expression_score": 70,
        "job_fit_score": 70,
        "adaptability_score": 70,
        "overall_comment": "评估完成",
        "strengths": "",
        "weaknesses": "",
        "suggestions": "",
        "dimension_scores": {},
        "question_reviews": [],
    }
    
    try:
        response = await ai.chat_completion(messages_ai, stream=False, max_tokens=2000)
        content = response["choices"][0]["message"]["content"]
        
        eval_data = extract_json_object(content)
        
        for key, val in defaults.items():
            if key not in eval_data or eval_data[key] is None:
                eval_data[key] = val
        
        # 确保分数在 1-100 范围内
        for score_key in ["overall_score", "technical_score", "communication_score", 
                          "logic_score", "expression_score", "job_fit_score", "adaptability_score"]:
            score = eval_data.get(score_key, 70)
            if not isinstance(score, int) or score < 0 or score > 100:
                eval_data[score_key] = 70
        
        return eval_data
        
    except json.JSONDecodeError:
        # 返回默认评估
        return defaults
    except Exception as e:
        raise Exception(f"评估生成失败: {str(e)}")
