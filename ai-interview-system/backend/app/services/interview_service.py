"""
面试服务层 — 封装面试相关的业务逻辑

职责:
- 构建面试 system prompt
- 格式化简历信息
- 生成面试上下文
- 完成面试与评估
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Interview, Message, Evaluation, Resume
from app.services.ai_service import generate_interview_response, generate_evaluation, get_reference_questions

logger = logging.getLogger(__name__)


# ============= 常量 =============

DEFAULT_EVALUATION_SCORES = {
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

DEFAULT_RESUME_FIELDS = {
    "name": "", "phone": "", "email": "",
    "skills": [], "work_experience": [],
    "project_experience": [], "education": [],
    "self_evaluation": "",
}


# ============= 简历格式化 =============

def format_resume_info(parsed_data: Optional[Dict[str, Any]]) -> str:
    """将简历解析数据格式化为 prompt 文本。"""
    if not parsed_data:
        return ""

    def _fmt_list(field: Any) -> str:
        if isinstance(field, list):
            return json.dumps(field, ensure_ascii=False)
        return str(field) if field else "N/A"

    return f"""
候选人姓名: {parsed_data.get('name', '未知')}
技能: {', '.join(parsed_data['skills']) if isinstance(parsed_data.get('skills'), list) else parsed_data.get('skills', 'N/A')}
工作经历: {_fmt_list(parsed_data.get('work_experience'))}
项目经验: {_fmt_list(parsed_data.get('project_experience'))}
教育背景: {_fmt_list(parsed_data.get('education'))}
"""


# ============= Prompt 构建 =============

def build_interview_system_prompt(
    job_position: str,
    interview_type: str,
    difficulty: str,
    question_count: int,
    resume_info: str,
    reference_questions: str,
) -> str:
    """构建面试官 system prompt。"""
    return f"""你是一位专业的面试官，正在面试一位应聘「{job_position}」岗位的候选人。

【你的角色设定】
- 你是一位有10年以上经验的资深面试官
- 面试类型: {interview_type}
- 难度等级: {difficulty}
- 语气专业但不失友好，像真实的面试官一样交流
- 每个问题只问一个核心点，避免复合问题
- 根据候选人回答质量进行智能追问（1-2层）
- 面试共 {question_count} 道题，请合理安排问题节奏

【候选人简历信息】
{resume_info if resume_info else '（未提供简历）'}

{reference_questions}

【面试流程】
1. 开场先问候并简单自我介绍
2. 第一题请候选人做自我介绍
3. 然后根据简历和岗位进行技术/行为问题提问
4. 根据回答进行追问
5. 最后礼貌结束面试

【注意事项】
- 用中文交流
- 不要一次性问多个问题
- 追问要有针对性，基于候选人的回答内容
- 保持面试官的专业形象"""


# ============= 业务方法 =============

async def prepare_interview_context(
    db: AsyncSession,
    interview: Interview,
    resume_id: Optional[int],
    job_position: str,
    interview_type: str,
    difficulty: str,
    question_count: int,
) -> str:
    """准备面试的 system prompt 并保存系统消息。"""
    # 获取简历信息
    resume_info = ""
    if resume_id:
        result = await db.execute(select(Resume).where(Resume.id == resume_id))
        resume = result.scalar_one_or_none()
        if resume and resume.parsed_data:
            resume_info = format_resume_info(resume.parsed_data)

    # 获取参考题目
    reference_questions = await get_reference_questions(job_position=job_position)

    # 构建 system prompt
    system_prompt = build_interview_system_prompt(
        job_position=job_position,
        interview_type=interview_type,
        difficulty=difficulty,
        question_count=question_count,
        resume_info=resume_info,
        reference_questions=reference_questions,
    )

    # 保存系统消息
    system_msg = Message(
        interview_id=interview.id,
        role="system",
        content=system_prompt,
    )
    db.add(system_msg)
    await db.commit()

    return system_prompt


async def get_interview_messages(
    db: AsyncSession,
    interview_id: int,
    limit: int = 20,
) -> tuple[str, list[dict]]:
    """获取面试的 system prompt 和最近对话消息。"""
    result = await db.execute(
        select(Message)
        .where(Message.interview_id == interview_id)
        .order_by(Message.created_at)
    )
    all_messages = result.scalars().all()

    system_content = ""
    messages = []
    for msg in all_messages:
        if msg.role == "system":
            system_content = msg.content
        else:
            messages.append({"role": msg.role, "content": msg.content})

    # 只保留最近 N 条对话
    if len(messages) > limit:
        messages = messages[-limit:]

    return system_content, messages


async def complete_interview_evaluation(
    db: AsyncSession,
    interview: Interview,
    user_id: int,
) -> tuple[str, str]:
    """完成面试并生成评估报告。

    Returns:
        (final_status, response_message)
    """
    # 获取所有对话消息
    result = await db.execute(
        select(Message)
        .where(Message.interview_id == interview.id)
        .order_by(Message.created_at)
    )
    all_messages = result.scalars().all()
    dialog_messages = [m for m in all_messages if m.role in ["user", "assistant"]]

    final_status = "completed"
    response_message = "面试评估已生成，请查看报告"

    try:
        eval_data = await generate_evaluation(
            messages=dialog_messages,
            job_position=interview.job_position,
            interview_type=interview.interview_type,
        )
    except Exception as e:
        logger.error("评估生成异常: %s", e)
        final_status = "failed"
        response_message = "评估生成异常，请重新尝试"
        eval_data = {
            **DEFAULT_EVALUATION_SCORES,
            "overall_comment": f"评估生成异常，使用默认评分。请点击重新生成。",
            "strengths": "未能自动分析优势",
            "weaknesses": "未能自动分析不足",
            "suggestions": "请重新尝试生成评估报告",
        }

    # 写入或更新评估记录
    evaluation_result = await db.execute(
        select(Evaluation).where(Evaluation.interview_id == interview.id)
    )
    evaluation = evaluation_result.scalar_one_or_none()

    eval_fields = {
        "overall_score": eval_data.get("overall_score", 70),
        "technical_score": eval_data.get("technical_score", 70),
        "communication_score": eval_data.get("communication_score", 70),
        "logic_score": eval_data.get("logic_score", 70),
        "expression_score": eval_data.get("expression_score", 70),
        "job_fit_score": eval_data.get("job_fit_score", 70),
        "adaptability_score": eval_data.get("adaptability_score", 70),
        "overall_comment": eval_data.get("overall_comment", ""),
        "strengths": eval_data.get("strengths", ""),
        "weaknesses": eval_data.get("weaknesses", ""),
        "suggestions": eval_data.get("suggestions", ""),
        "dimension_scores": eval_data.get("dimension_scores", {}),
        "question_reviews": eval_data.get("question_reviews", []),
    }

    if evaluation is None:
        evaluation = Evaluation(
            interview_id=interview.id,
            user_id=user_id,
            **eval_fields,
        )
        db.add(evaluation)
    else:
        for field, value in eval_fields.items():
            setattr(evaluation, field, value)

    interview.status = final_status
    await db.commit()

    return final_status, response_message


async def get_interview_list_with_scores(
    db: AsyncSession,
    user_id: int,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """获取面试列表（含评估分数），返回分页数据。"""
    offset = (page - 1) * page_size

    # 查询面试列表
    result = await db.execute(
        select(Interview)
        .where(Interview.user_id == user_id)
        .order_by(desc(Interview.created_at))
        .offset(offset)
        .limit(page_size)
    )
    interviews = result.scalars().all()

    # 总数
    count_result = await db.execute(
        select(func.count(Interview.id)).where(Interview.user_id == user_id)
    )
    total = count_result.scalar()

    # 批量查询评估
    interview_ids = [i.id for i in interviews]
    evaluation_map = {}
    if interview_ids:
        eval_result = await db.execute(
            select(Evaluation).where(Evaluation.interview_id.in_(interview_ids))
        )
        evaluation_map = {
            e.interview_id: e for e in eval_result.scalars().all()
        }

    items = []
    for interview in interviews:
        evaluation = evaluation_map.get(interview.id)
        # 利用 from_attributes 自动映射
        item = {
            "id": interview.id,
            "user_id": interview.user_id,
            "resume_id": interview.resume_id,
            "title": interview.title,
            "job_position": interview.job_position,
            "interview_type": interview.interview_type,
            "difficulty": interview.difficulty,
            "status": interview.status,
            "message_count": interview.message_count,
            "question_count": interview.question_count,
            "started_at": interview.started_at,
            "ended_at": interview.ended_at,
            "created_at": interview.created_at,
            "enable_voice": interview.enable_voice,
            "enable_3d": interview.enable_3d,
            "interviewer_model": interview.interviewer_model,
            "scene": interview.scene,
            "overall_score": evaluation.overall_score if evaluation else None,
        }
        items.append(item)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }
