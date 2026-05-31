"""
简历路由 - 简历上传、列表、详情、解析、删除
"""

import os
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Resume
from app.schemas import ResumeInfo, ResumeParseResult, ResponseWrapper
from app.core.security import get_current_user
from app.utils.helpers import (
    generate_random_filename, extract_text_from_file, get_file_extension
)
from app.services.ai_service import parse_resume_with_ai

router = APIRouter(prefix="/resumes", tags=["简历"])

# 允许的文件类型
ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("", response_model=ResponseWrapper)
async def upload_resume(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """
    上传简历文件
    
    - **file**: PDF/DOC/DOCX/TXT 文件，最大 10MB
    """
    # 校验文件类型
    file_type = file.content_type or ""
    if file_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {file_type}，请上传 PDF/DOC/DOCX/TXT 文件"
        )
    
    # 读取文件内容
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过 10MB 限制")
    
    # 创建用户上传目录
    upload_dir = os.environ.get("UPLOAD_DIR", "./uploads/resumes")
    user_dir = os.path.join(upload_dir, f"user_{token_data['user_id']}")
    os.makedirs(user_dir, exist_ok=True)
    
    # 生成随机文件名
    safe_filename = generate_random_filename(file.filename or "resume.pdf")
    file_path = os.path.join(user_dir, safe_filename)
    
    # 保存文件
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 创建数据库记录
    resume = Resume(
        user_id=token_data["user_id"],
        filename=file.filename or "resume",
        file_path=file_path,
        file_type=file_type,
        file_size=len(content),
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    
    return ResponseWrapper(
        message="简历上传成功",
        data=ResumeInfo(
            id=resume.id,
            user_id=resume.user_id,
            filename=resume.filename,
            file_type=resume.file_type,
            file_size=resume.file_size,
            uploaded_at=resume.uploaded_at,
        )
    )


@router.get("", response_model=ResponseWrapper)
async def get_resume_list(
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """获取当前用户的简历列表"""
    result = await db.execute(
        select(Resume)
        .where(Resume.user_id == token_data["user_id"])
        .order_by(desc(Resume.uploaded_at))
    )
    resumes = result.scalars().all()
    
    return ResponseWrapper(
        data=[
            ResumeInfo(
                id=r.id,
                user_id=r.user_id,
                filename=r.filename,
                file_type=r.file_type,
                file_size=r.file_size,
                name=r.name,
                skills=r.skills,
                uploaded_at=r.uploaded_at,
                parsed_at=r.parsed_at,
            )
            for r in resumes
        ]
    )


@router.get("/{resume_id}", response_model=ResponseWrapper)
async def get_resume_detail(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """获取简历详情"""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    
    if resume.user_id != token_data["user_id"]:
        raise HTTPException(status_code=403, detail="无权访问该简历")
    
    return ResponseWrapper(data=ResumeInfo(
        id=resume.id,
        user_id=resume.user_id,
        filename=resume.filename,
        file_type=resume.file_type,
        file_size=resume.file_size,
        name=resume.name,
        phone=resume.phone,
        email=resume.email,
        skills=resume.skills,
        work_experience=resume.work_experience,
        project_experience=resume.project_experience,
        education=resume.education,
        self_evaluation=resume.self_evaluation,
        parsed_data=resume.parsed_data,
        uploaded_at=resume.uploaded_at,
        parsed_at=resume.parsed_at,
    ))


@router.post("/{resume_id}/parse", response_model=ResponseWrapper)
async def parse_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """
    解析简历 - 使用 AI 提取结构化信息
    
    从简历文件中提取姓名、联系方式、技能、工作经历等关键信息
    """
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    
    if resume.user_id != token_data["user_id"]:
        raise HTTPException(status_code=403, detail="无权访问该简历")
    
    # 提取文本
    resume_text = extract_text_from_file(resume.file_path, resume.file_type)
    if not resume_text:
        raise HTTPException(status_code=400, detail="无法从文件中提取文本，请检查文件格式")
    
    # 使用 AI 解析
    try:
        parsed = await parse_resume_with_ai(resume_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 解析失败: {str(e)}")
    
    # 更新数据库记录
    resume.name = parsed.get("name", "")
    resume.phone = parsed.get("phone", "")
    resume.email = parsed.get("email", "")
    resume.skills = ", ".join(parsed.get("skills", [])) if isinstance(parsed.get("skills"), list) else parsed.get("skills", "")
    
    # 序列化复杂对象为 JSON 字符串
    work_exp = parsed.get("work_experience", [])
    if isinstance(work_exp, list):
        resume.work_experience = json.dumps(work_exp, ensure_ascii=False)
    else:
        resume.work_experience = str(work_exp)
    
    proj_exp = parsed.get("project_experience", [])
    if isinstance(proj_exp, list):
        resume.project_experience = json.dumps(proj_exp, ensure_ascii=False)
    else:
        resume.project_experience = str(proj_exp)
    
    edu = parsed.get("education", [])
    if isinstance(edu, list):
        resume.education = json.dumps(edu, ensure_ascii=False)
    else:
        resume.education = str(edu)
    
    resume.self_evaluation = parsed.get("self_evaluation", "")
    resume.parsed_data = parsed
    resume.parsed_at = datetime.now()
    
    await db.commit()
    await db.refresh(resume)
    
    return ResponseWrapper(
        message="简历解析成功",
        data=ResumeParseResult(
            id=resume.id,
            name=resume.name,
            phone=resume.phone,
            email=resume.email,
            skills=resume.skills,
            work_experience=resume.work_experience,
            project_experience=resume.project_experience,
            education=resume.education,
            self_evaluation=resume.self_evaluation,
            parsed_data=resume.parsed_data,
            parsed_at=resume.parsed_at,
        )
    )


@router.delete("/{resume_id}", response_model=ResponseWrapper)
async def delete_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """删除简历"""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    
    if resume.user_id != token_data["user_id"]:
        raise HTTPException(status_code=403, detail="无权删除该简历")
    
    # 删除物理文件
    try:
        if os.path.exists(resume.file_path):
            os.remove(resume.file_path)
    except Exception:
        pass
    
    await db.delete(resume)
    await db.commit()
    
    return ResponseWrapper(message="简历删除成功")
