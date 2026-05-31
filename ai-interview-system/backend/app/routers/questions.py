"""
题库API路由 - 提供面试题的查询、搜索、统计、管理功能
"""

from typing import Optional, List
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import QuestionBank, User
from app.schemas import (
    QuestionBankInfo, QuestionBankListResponse, QuestionStats,
    ResponseWrapper,
)
from app.core.security import get_current_user

router = APIRouter(prefix="/questions", tags=["题库"])


def _question_data(question: QuestionBank) -> dict:
    return QuestionBankInfo.model_validate(question).model_dump(mode="json")


@router.get("", response_model=ResponseWrapper)
async def list_questions(
    category: Optional[str] = Query(None, description="岗位分类过滤"),
    sub_category: Optional[str] = Query(None, description="子分类过滤"),
    difficulty: Optional[str] = Query(None, description="难度过滤: beginner/intermediate/advanced"),
    question_type: Optional[str] = Query(None, description="题型过滤: technical/behavioral/situational/algorithm"),
    keyword: Optional[str] = Query(None, description="关键词搜索（标题模糊匹配）"),
    status: Optional[str] = Query(None, description="状态过滤: pending/approved/rejected"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """
    获取题库列表
    
    支持多条件组合筛选和分页
    """
    # 构建查询条件
    conditions = []
    if category:
        conditions.append(QuestionBank.category == category)
    if sub_category:
        conditions.append(QuestionBank.sub_category == sub_category)
    if difficulty:
        conditions.append(QuestionBank.difficulty == difficulty)
    if question_type:
        conditions.append(QuestionBank.question_type == question_type)
    if status:
        conditions.append(QuestionBank.status == status)
    if keyword:
        conditions.append(QuestionBank.title.contains(keyword))
    
    # 构建查询
    query = select(QuestionBank)
    if conditions:
        query = query.where(and_(*conditions))
    
    # 获取总数
    count_query = select(func.count(QuestionBank.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # 分页查询 - 按使用次数降序（热门题目优先）
    query = query.order_by(QuestionBank.use_count.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return ResponseWrapper(
        data={
            "items": [_question_data(item) for item in items],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/search", response_model=ResponseWrapper)
async def search_questions(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    limit: int = Query(10, ge=1, le=50, description="返回数量"),
    db: AsyncSession = Depends(get_db),
):
    """
    搜索面试题 - 标题模糊匹配
    
    用于面试时的快速题目检索
    """
    result = await db.execute(
        select(QuestionBank)
        .where(
            and_(
                QuestionBank.status == "approved",
                QuestionBank.title.contains(q),
            )
        )
        .order_by(QuestionBank.use_count.desc())
        .limit(limit)
    )
    items = result.scalars().all()
    
    return ResponseWrapper(
        data={
            "items": [_question_data(item) for item in items],
            "total": len(items),
        }
    )


@router.get("/stats", response_model=ResponseWrapper)
async def get_question_stats(db: AsyncSession = Depends(get_db)):
    """
    获取题库统计数据
    
    包括: 总题量、今日新增、本周新增、审核状态分布、分类分布、来源分布
    """
    # 总量统计
    total_result = await db.execute(select(func.count(QuestionBank.id)))
    total_count = total_result.scalar()
    
    # 今日新增
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_result = await db.execute(
        select(func.count(QuestionBank.id)).where(QuestionBank.crawled_at >= today_start)
    )
    today_new = today_result.scalar()
    
    # 本周新增
    week_ago = datetime.now() - timedelta(days=7)
    week_result = await db.execute(
        select(func.count(QuestionBank.id)).where(QuestionBank.crawled_at >= week_ago)
    )
    week_new = week_result.scalar()
    
    # 审核状态分布
    approved_result = await db.execute(
        select(func.count(QuestionBank.id)).where(QuestionBank.status == "approved")
    )
    approved_count = approved_result.scalar()
    
    pending_result = await db.execute(
        select(func.count(QuestionBank.id)).where(QuestionBank.status == "pending")
    )
    pending_count = pending_result.scalar()
    
    # 分类分布
    cat_result = await db.execute(
        select(QuestionBank.category, func.count(QuestionBank.id))
        .group_by(QuestionBank.category)
        .order_by(func.count(QuestionBank.id).desc())
    )
    cat_dist = [
        {"name": c or "未分类", "count": n}
        for c, n in cat_result.all()
    ]
    
    # 来源分布
    src_result = await db.execute(
        select(QuestionBank.source_name, func.count(QuestionBank.id))
        .group_by(QuestionBank.source_name)
        .order_by(func.count(QuestionBank.id).desc())
    )
    src_dist = [
        {"name": s or "未知", "count": n}
        for s, n in src_result.all()
    ]
    
    return ResponseWrapper(
        data=QuestionStats(
            total_count=total_count,
            today_new=today_new,
            week_new=week_new,
            approved_count=approved_count,
            pending_count=pending_count,
            category_distribution=cat_dist,
            source_distribution=src_dist,
        )
    )


@router.get("/categories", response_model=ResponseWrapper)
async def get_categories(db: AsyncSession = Depends(get_db)):
    """获取所有分类列表（去重）"""
    result = await db.execute(
        select(QuestionBank.category)
        .where(QuestionBank.category.isnot(None))
        .distinct()
    )
    categories = [c for c in result.scalars().all() if c]
    
    # 子分类
    sub_result = await db.execute(
        select(QuestionBank.sub_category)
        .where(QuestionBank.sub_category.isnot(None))
        .distinct()
    )
    sub_categories = [s for s in sub_result.scalars().all() if s]
    
    return ResponseWrapper(
        data={
            "categories": categories,
            "sub_categories": sub_categories,
        }
    )


@router.get("/{question_id}", response_model=ResponseWrapper)
async def get_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    获取题目详情
    
    自动增加查看次数(view_count)
    """
    result = await db.execute(
        select(QuestionBank).where(QuestionBank.id == question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    
    # 增加查看次数
    question.view_count = (question.view_count or 0) + 1
    await db.commit()
    
    return ResponseWrapper(data=_question_data(question))


@router.put("/{question_id}", response_model=ResponseWrapper)
async def update_question(
    question_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    编辑题目（需要登录）
    
    支持更新的字段: title, answer, analysis, category, sub_category, difficulty, question_type, tags, status
    """
    result = await db.execute(
        select(QuestionBank).where(QuestionBank.id == question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    
    # 允许更新的字段
    allowed_fields = [
        "title", "answer", "analysis", "category", "sub_category",
        "difficulty", "question_type", "tags", "status",
    ]
    
    updated = False
    for field in allowed_fields:
        if field in data:
            setattr(question, field, data[field])
            updated = True
    
    if updated:
        question.updated_at = datetime.now()
        await db.commit()
        await db.refresh(question)
    
    return ResponseWrapper(message="更新成功", data=_question_data(question))


@router.delete("/{question_id}", response_model=ResponseWrapper)
async def delete_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """删除题目（需要登录）"""
    result = await db.execute(
        select(QuestionBank).where(QuestionBank.id == question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    
    await db.delete(question)
    await db.commit()
    
    return ResponseWrapper(message="删除成功")


@router.post("/{question_id}/approve", response_model=ResponseWrapper)
async def approve_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """审核通过题目"""
    result = await db.execute(
        select(QuestionBank).where(QuestionBank.id == question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    
    question.status = "approved"
    await db.commit()
    
    return ResponseWrapper(message="审核通过")


@router.post("/{question_id}/reject", response_model=ResponseWrapper)
async def reject_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """拒绝题目"""
    result = await db.execute(
        select(QuestionBank).where(QuestionBank.id == question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    
    question.status = "rejected"
    await db.commit()
    
    return ResponseWrapper(message="已拒绝")
