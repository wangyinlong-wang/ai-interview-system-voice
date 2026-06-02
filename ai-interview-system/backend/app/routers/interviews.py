"""
面试路由 - 面试创建、消息对话(SSE)、评估生成

业务逻辑委托给 interview_service，路由层仅负责参数校验与响应组装。
"""

import json
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_factory
from app.models import Interview, Message, Evaluation, Resume
from app.schemas import (
    InterviewCreate, InterviewInfo, InterviewMessageCreate,
    InterviewMessageInfo, InterviewComplete, EvaluationInfo, ResponseWrapper,
)
from app.core.security import get_current_user
from app.services.ai_service import generate_interview_response
from app.services.interview_service import (
    prepare_interview_context,
    get_interview_messages,
    complete_interview_evaluation,
    get_interview_list_with_scores,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interviews", tags=["面试"])


# ============= 辅助 =============

async def _get_owned_interview(
    interview_id: int, user_id: int, db: AsyncSession
) -> Interview:
    """获取面试记录并校验归属权，不存在或无权限时抛 404/403。"""
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="面试不存在")
    if interview.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权访问该面试")
    return interview


# ============= 路由 =============

@router.post("", response_model=ResponseWrapper)
async def create_interview(
    data: InterviewCreate,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """创建新面试会话"""
    user_id = token_data["user_id"]

    # 验证简历归属
    if data.resume_id:
        result = await db.execute(select(Resume).where(Resume.id == data.resume_id))
        resume = result.scalar_one_or_none()
        if not resume or resume.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权使用该简历")

    # 创建面试记录
    interview = Interview(
        user_id=user_id,
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

    # 准备面试上下文（prompt 构建 + 系统消息）
    await prepare_interview_context(
        db=db,
        interview=interview,
        resume_id=data.resume_id,
        job_position=data.job_position,
        interview_type=data.interview_type,
        difficulty=data.difficulty,
        question_count=data.question_count,
    )

    return ResponseWrapper(
        message="面试创建成功",
        data=InterviewInfo.model_validate(interview),
    )


@router.get("", response_model=ResponseWrapper)
async def get_interview_list(
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
    page: int = 1,
    page_size: int = 20,
):
    """获取面试列表"""
    data = await get_interview_list_with_scores(
        db=db,
        user_id=token_data["user_id"],
        page=page,
        page_size=page_size,
    )
    return ResponseWrapper(data=data)


@router.get("/{interview_id}", response_model=ResponseWrapper)
async def get_interview_detail(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """获取面试详情"""
    interview = await _get_owned_interview(interview_id, token_data["user_id"], db)
    return ResponseWrapper(data=InterviewInfo.model_validate(interview))


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
    interview = await _get_owned_interview(interview_id, token_data["user_id"], db)

    if interview.status != "ongoing":
        raise HTTPException(status_code=400, detail="面试已结束，无法发送消息")

    # 保存用户消息
    user_msg = Message(
        interview_id=interview_id,
        role="user",
        content=data.content,
    )
    db.add(user_msg)
    interview.message_count += 1
    await db.commit()
    await db.refresh(user_msg)

    # 获取历史消息上下文
    system_content, messages = await get_interview_messages(db, interview_id)

    async def sse_generator():
        """SSE 流式生成器"""
        full_content = ""
        assistant_msg_id = None

        try:
            yield f"event: start\ndata: {{}}\n\n"

            async for chunk in generate_interview_response(
                system_content=system_content,
                messages=messages,
                job_position=interview.job_position,
                difficulty=interview.difficulty,
            ):
                if chunk:
                    full_content += chunk
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
                    # 同步更新 message_count
                    await new_session.execute(
                        Interview.__table__.update()
                        .where(Interview.id == interview_id)
                        .values(message_count=Interview.message_count + 1)
                    )
                    await new_session.commit()
                    await new_session.refresh(assistant_msg)
                    assistant_msg_id = assistant_msg.id
            except Exception as e:
                logger.error("保存 AI 消息失败: %s", e)

            # 发送完成事件
            json_data = json.dumps({
                "message_id": assistant_msg_id or 0,
                "total_tokens": len(full_content),
            }, ensure_ascii=False)
            yield f"event: done\ndata: {json_data}\n\n"

        except Exception as e:
            logger.error("SSE 生成异常: %s", e)
            error_data = json.dumps({"error": "响应异常，请稍后重试"}, ensure_ascii=False)
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
    await _get_owned_interview(interview_id, token_data["user_id"], db)

    result = await db.execute(
        select(Message)
        .where(Message.interview_id == interview_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()

    return ResponseWrapper(data=[
        InterviewMessageInfo.model_validate(m) for m in messages
    ])


@router.post("/{interview_id}/complete", response_model=ResponseWrapper)
async def complete_interview(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """结束面试并生成评估报告"""
    interview = await _get_owned_interview(interview_id, token_data["user_id"], db)

    # 检查是否已有评估
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
    interview.ended_at = datetime.utcnow()
    await db.commit()

    # 委托 service 层完成评估
    final_status, response_message = await complete_interview_evaluation(
        db=db,
        interview=interview,
        user_id=token_data["user_id"],
    )

    success = final_status == "completed"
    return ResponseWrapper(
        message="面试已结束，评估生成完成" if success else response_message,
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
    await _get_owned_interview(interview_id, token_data["user_id"], db)

    evaluation_result = await db.execute(
        select(Evaluation).where(Evaluation.interview_id == interview_id)
    )
    ev = evaluation_result.scalar_one_or_none()

    if not ev:
        raise HTTPException(status_code=404, detail="评估报告尚未生成")

    return ResponseWrapper(data=EvaluationInfo.model_validate(ev))


@router.delete("/{interview_id}", response_model=ResponseWrapper)
async def delete_interview(
    interview_id: int,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """删除面试记录"""
    interview = await _get_owned_interview(interview_id, token_data["user_id"], db)
    await db.delete(interview)
    await db.commit()
    return ResponseWrapper(message="面试记录已删除")
