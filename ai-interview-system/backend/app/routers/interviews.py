"""
面试路由 - 面试创建、消息对话(SSE)、评估生成
"""

import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_factory
from app.models import Interview, Message, Evaluation, Resume
from app.schemas import (
    InterviewCreate, InterviewInfo, InterviewMessageCreate,
    InterviewMessageInfo, InterviewComplete, EvaluationInfo, ResponseWrapper
)
from app.core.security import get_current_user
from app.services.ai_service import generate_interview_response, generate_evaluation, get_reference_questions

router = APIRouter(prefix="/interviews", tags=["面试"])


@router.post("", response_model=ResponseWrapper)
async def create_interview(
    data: InterviewCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """创建新面试会话"""
    # 验证简历归属
    if data.resume_id:
        result = await db.execute(select(Resume).where(Resume.id == data.resume_id))
        resume = result.scalar_one_or_none()
        if not resume or resume.user_id != token_data["user_id"]:
            raise HTTPException(status_code=403, detail="无权使用该简历")
    
    # 创建面试记录
    interview = Interview(
        user_id=token_data["user_id"],
        resume_id=data.resume_id,
        title=data.title,
        job_position=data.job_position,
        interview_type=data.interview_type,
        difficulty=data.difficulty,
        question_count=data.question_count,
        enable_voice=data.enable_voice,
        enable_3d=data.enable_3d,
        interviewer_model=data.interviewer_model,
        scene=data.scene,
        status="ongoing",
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)
    
    # 创建系统消息，设定 AI 面试官角色
    resume_info = ""
    if data.resume_id:
        result = await db.execute(select(Resume).where(Resume.id == data.resume_id))
        resume = result.scalar_one_or_none()
        if resume and resume.parsed_data:
            rd = resume.parsed_data
            resume_info = f"""
候选人姓名: {rd.get('name', '未知')}
技能: {', '.join(rd.get('skills', [])) if isinstance(rd.get('skills'), list) else rd.get('skills', 'N/A')}
工作经历: {json.dumps(rd.get('work_experience', []), ensure_ascii=False) if isinstance(rd.get('work_experience'), list) else rd.get('work_experience', 'N/A')}
项目经验: {json.dumps(rd.get('project_experience', []), ensure_ascii=False) if isinstance(rd.get('project_experience'), list) else rd.get('project_experience', 'N/A')}
教育背景: {json.dumps(rd.get('education', []), ensure_ascii=False) if isinstance(rd.get('education'), list) else rd.get('education', 'N/A')}
"""
    
    reference_questions = await get_reference_questions(job_position=data.job_position)

    system_prompt = f"""你是一位专业的面试官，正在面试一位应聘「{data.job_position}」岗位的候选人。

【你的角色设定】
- 你是一位有10年以上经验的资深面试官
- 面试类型: {data.interview_type}
- 难度等级: {data.difficulty}
- 语气专业但不失友好，像真实的面试官一样交流
- 每个问题只问一个核心点，避免复合问题
- 根据候选人回答质量进行智能追问（1-2层）
- 面试共 {data.question_count} 道题，请合理安排问题节奏

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

    system_msg = Message(
        interview_id=interview.id,
        role="system",
        content=system_prompt,
    )
    db.add(system_msg)
    await db.commit()
    
    return ResponseWrapper(
        message="面试创建成功",
        data=InterviewInfo(
            id=interview.id,
            user_id=interview.user_id,
            resume_id=interview.resume_id,
            title=interview.title,
            job_position=interview.job_position,
            interview_type=interview.interview_type,
            difficulty=interview.difficulty,
            status=interview.status,
            message_count=interview.message_count,
            question_count=interview.question_count,
            started_at=interview.started_at,
            created_at=interview.created_at,
            enable_voice=interview.enable_voice,
            enable_3d=interview.enable_3d,
            interviewer_model=interview.interviewer_model,
            scene=interview.scene,
        )
    )


@router.get("", response_model=ResponseWrapper)
async def get_interview_list(
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
    page: int = 1,
    page_size: int = 20,
):
    """获取面试列表"""
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Interview)
        .where(Interview.user_id == token_data["user_id"])
        .order_by(desc(Interview.created_at))
        .offset(offset)
        .limit(page_size)
    )
    interviews = result.scalars().all()
    
    # 获取总数
    count_result = await db.execute(
        select(func.count(Interview.id)).where(Interview.user_id == token_data["user_id"])
    )
    total = count_result.scalar()

    interview_ids = [interview.id for interview in interviews]
    evaluation_by_interview_id = {}
    if interview_ids:
        evaluation_result = await db.execute(
            select(Evaluation).where(Evaluation.interview_id.in_(interview_ids))
        )
        evaluation_by_interview_id = {
            evaluation.interview_id: evaluation
            for evaluation in evaluation_result.scalars().all()
        }
    
    data = []
    for interview in interviews:
        evaluation = evaluation_by_interview_id.get(interview.id)
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
            "overall_score": evaluation.overall_score if evaluation else None,
        }
        data.append(item)
    
    return ResponseWrapper(data={
        "items": data,
        "total": total,
        "page": page,
        "page_size": page_size,
    })


@router.get("/{interview_id}", response_model=ResponseWrapper)
async def get_interview_detail(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """获取面试详情"""
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="面试不存在")
    
    if interview.user_id != token_data["user_id"]:
        raise HTTPException(status_code=403, detail="无权访问该面试")
    
    return ResponseWrapper(data=InterviewInfo(
        id=interview.id,
        user_id=interview.user_id,
        resume_id=interview.resume_id,
        title=interview.title,
        job_position=interview.job_position,
        interview_type=interview.interview_type,
        difficulty=interview.difficulty,
        status=interview.status,
        message_count=interview.message_count,
        question_count=interview.question_count,
        started_at=interview.started_at,
        ended_at=interview.ended_at,
        created_at=interview.created_at,
        enable_voice=interview.enable_voice,
        enable_3d=interview.enable_3d,
        interviewer_model=interview.interviewer_model,
        scene=interview.scene,
    ))


@router.post("/{interview_id}/messages")
async def send_message_sse(
    interview_id: int,
    data: InterviewMessageCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """
    发送消息 - SSE 流式输出
    
    使用 Server-Sent Events 实现 AI 面试官的打字机效果回复
    """
    # 获取面试信息
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="面试不存在")
    
    if interview.user_id != token_data["user_id"]:
        raise HTTPException(status_code=403, detail="无权访问该面试")
    
    if interview.status != "ongoing":
        raise HTTPException(status_code=400, detail="面试已结束，无法发送消息")
    
    # 保存用户消息
    user_msg = Message(
        interview_id=interview_id,
        role="user",
        content=data.content,
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)
    
    # 更新消息计数
    interview.message_count += 1
    await db.commit()
    
    # 获取历史消息作为上下文
    result = await db.execute(
        select(Message)
        .where(Message.interview_id == interview_id)
        .order_by(Message.created_at)
    )
    all_messages = result.scalars().all()
    
    # 构建消息历史（限制最近 20 条，跳过系统消息）
    messages = []
    system_content = ""
    for msg in all_messages:
        if msg.role == "system":
            system_content = msg.content
        else:
            messages.append({"role": msg.role, "content": msg.content})
    
    # 只保留最近 20 条对话
    messages = messages[-20:] if len(messages) > 20 else messages
    
    async def sse_generator():
        """SSE 流式生成器"""
        full_content = ""
        assistant_msg_id = None
        
        try:
            # 发送开始事件
            yield f"event: start\ndata: {{}}\n\n"
            
            # 调用 AI 服务生成流式回复
            async for chunk in generate_interview_response(
                system_content=system_content,
                messages=messages,
                job_position=interview.job_position,
                difficulty=interview.difficulty,
            ):
                if chunk:
                    full_content += chunk
                    # 发送内容片段
                    json_data = json.dumps({"delta": chunk, "finish_reason": None}, ensure_ascii=False)
                    yield f"event: message\ndata: {json_data}\n\n"
            
            # 保存完整的 AI 回复到数据库
            try:
                async with async_session_factory() as new_session:
                    assistant_msg = Message(
                        interview_id=interview_id,
                        role="assistant",
                        content=full_content,
                    )
                    new_session.add(assistant_msg)
                    await new_session.commit()
                    await new_session.refresh(assistant_msg)
                    assistant_msg_id = assistant_msg.id
            except Exception as e:
                print(f"保存 AI 消息失败: {e}")
            
            # 发送完成事件
            json_data = json.dumps({
                "message_id": assistant_msg_id or 0,
                "total_tokens": len(full_content),
            }, ensure_ascii=False)
            yield f"event: done\ndata: {json_data}\n\n"
            
        except Exception as e:
            error_data = json.dumps({"error": str(e)}, ensure_ascii=False)
            yield f"event: error\ndata: {error_data}\n\n"
    
    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{interview_id}/messages", response_model=ResponseWrapper)
async def get_message_history(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """获取面试消息历史"""
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="面试不存在")
    
    if interview.user_id != token_data["user_id"]:
        raise HTTPException(status_code=403, detail="无权访问该面试")
    
    result = await db.execute(
        select(Message)
        .where(Message.interview_id == interview_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    
    return ResponseWrapper(data=[
        InterviewMessageInfo(
            id=m.id,
            interview_id=m.interview_id,
            role=m.role,
            content=m.content,
            created_at=m.created_at,
        )
        for m in messages
    ])


@router.post("/{interview_id}/complete", response_model=ResponseWrapper)
async def complete_interview(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """结束面试并生成评估报告"""
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="面试不存在")
    
    if interview.user_id != token_data["user_id"]:
        raise HTTPException(status_code=403, detail="无权访问该面试")
    
    evaluation_result = await db.execute(
        select(Evaluation).where(Evaluation.interview_id == interview_id)
    )
    existing_evaluation = evaluation_result.scalar_one_or_none()

    if interview.status in ["completed", "failed"] and existing_evaluation:
        return ResponseWrapper(
            message="面试已结束，评估报告已存在",
            data=InterviewComplete(
                interview_id=interview_id,
                status=interview.status,
                message="请查看已有评估报告",
            )
        )

    if interview.status == "completing":
        raise HTTPException(status_code=409, detail="评估正在生成，请稍后查看报告")

    if interview.status != "ongoing":
        raise HTTPException(status_code=400, detail="面试已结束")

    interview.status = "completing"
    interview.ended_at = datetime.now()
    await db.commit()
    
    # 获取所有对话消息
    result = await db.execute(
        select(Message)
        .where(Message.interview_id == interview_id)
        .order_by(Message.created_at)
    )
    all_messages = result.scalars().all()
    
    # 过滤掉系统消息，只保留对话
    dialog_messages = [m for m in all_messages if m.role in ["user", "assistant"]]
    
    final_status = "completed"
    response_message = "面试评估已生成，请查看报告"

    # 调用 AI 生成评估
    try:
        eval_data = await generate_evaluation(
            messages=dialog_messages,
            job_position=interview.job_position,
            interview_type=interview.interview_type,
        )
    except Exception as e:
        # AI 评估失败时使用默认评估
        final_status = "failed"
        response_message = "评估生成异常，已生成默认报告"
        eval_data = {
            "overall_score": 70,
            "technical_score": 70,
            "communication_score": 70,
            "logic_score": 70,
            "expression_score": 70,
            "job_fit_score": 70,
            "adaptability_score": 70,
            "overall_comment": f"评估生成异常，使用默认评分。错误: {str(e)}",
            "strengths": "未能自动分析优势",
            "weaknesses": "未能自动分析不足",
            "suggestions": "请重新尝试生成评估报告",
            "dimension_scores": {},
            "question_reviews": [],
        }
    
    evaluation_result = await db.execute(
        select(Evaluation).where(Evaluation.interview_id == interview_id)
    )
    evaluation = evaluation_result.scalar_one_or_none()
    if evaluation is None:
        evaluation = Evaluation(
            interview_id=interview_id,
            user_id=token_data["user_id"],
            overall_score=eval_data["overall_score"],
            technical_score=eval_data["technical_score"],
            communication_score=eval_data["communication_score"],
            logic_score=eval_data["logic_score"],
            expression_score=eval_data["expression_score"],
            job_fit_score=eval_data.get("job_fit_score", 70),
            adaptability_score=eval_data.get("adaptability_score", 70),
            overall_comment=eval_data["overall_comment"],
            strengths=eval_data["strengths"],
            weaknesses=eval_data["weaknesses"],
            suggestions=eval_data["suggestions"],
            dimension_scores=eval_data.get("dimension_scores", {}),
            question_reviews=eval_data.get("question_reviews", []),
        )
        db.add(evaluation)
    else:
        evaluation.overall_score = eval_data["overall_score"]
        evaluation.technical_score = eval_data["technical_score"]
        evaluation.communication_score = eval_data["communication_score"]
        evaluation.logic_score = eval_data["logic_score"]
        evaluation.expression_score = eval_data["expression_score"]
        evaluation.job_fit_score = eval_data.get("job_fit_score", 70)
        evaluation.adaptability_score = eval_data.get("adaptability_score", 70)
        evaluation.overall_comment = eval_data["overall_comment"]
        evaluation.strengths = eval_data["strengths"]
        evaluation.weaknesses = eval_data["weaknesses"]
        evaluation.suggestions = eval_data["suggestions"]
        evaluation.dimension_scores = eval_data.get("dimension_scores", {})
        evaluation.question_reviews = eval_data.get("question_reviews", [])

    interview.status = final_status
    await db.commit()
    
    return ResponseWrapper(
        message="面试已结束，评估生成完成" if final_status == "completed" else response_message,
        data=InterviewComplete(
            interview_id=interview_id,
            status=final_status,
            message=response_message,
        )
    )


@router.get("/{interview_id}/evaluation", response_model=ResponseWrapper)
async def get_evaluation(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """获取面试评估报告"""
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="面试不存在")
    
    if interview.user_id != token_data["user_id"]:
        raise HTTPException(status_code=403, detail="无权访问该面试")
    
    evaluation_result = await db.execute(
        select(Evaluation).where(Evaluation.interview_id == interview_id)
    )
    ev = evaluation_result.scalar_one_or_none()
    
    if not ev:
        raise HTTPException(status_code=404, detail="评估报告尚未生成")
    
    return ResponseWrapper(data=EvaluationInfo(
        id=ev.id,
        interview_id=ev.interview_id,
        user_id=ev.user_id,
        overall_score=ev.overall_score,
        technical_score=ev.technical_score,
        communication_score=ev.communication_score,
        logic_score=ev.logic_score,
        expression_score=ev.expression_score,
        job_fit_score=ev.job_fit_score,
        adaptability_score=ev.adaptability_score,
        overall_comment=ev.overall_comment,
        strengths=ev.strengths,
        weaknesses=ev.weaknesses,
        suggestions=ev.suggestions,
        dimension_scores=ev.dimension_scores,
        question_reviews=ev.question_reviews,
        created_at=ev.created_at,
    ))


@router.delete("/{interview_id}", response_model=ResponseWrapper)
async def delete_interview(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """删除面试记录"""
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="面试不存在")
    
    if interview.user_id != token_data["user_id"]:
        raise HTTPException(status_code=403, detail="无权删除该面试")
    
    await db.delete(interview)
    await db.commit()
    
    return ResponseWrapper(message="面试记录已删除")
