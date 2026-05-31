"""
认证路由 - 用户注册、登录、信息获取
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas import (
    UserRegister, UserLogin, AuthResponse, UserInfo, ResponseWrapper
)
from app.core.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register", response_model=ResponseWrapper)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    用户注册
    
    - **username**: 用户名（3-50字符）
    - **email**: 邮箱地址
    - **password**: 密码（至少6位）
    """
    # 检查邮箱是否已注册
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被注册"
        )
    
    # 检查用户名是否已存在
    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该用户名已被使用"
        )
    
    # 创建新用户
    new_user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # 生成 JWT Token
    token = create_access_token({
        "user_id": new_user.id,
        "email": new_user.email,
        "username": new_user.username,
    })
    
    return ResponseWrapper(
        message="注册成功",
        data=AuthResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            token=token,
        )
    )


@router.post("/login", response_model=ResponseWrapper)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    用户登录
    
    - **email**: 邮箱地址
    - **password**: 密码
    """
    # 查找用户
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )
    
    # 验证密码
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )
    
    # 生成 JWT Token
    token = create_access_token({
        "user_id": user.id,
        "email": user.email,
        "username": user.username,
    })
    
    return ResponseWrapper(
        message="登录成功",
        data=AuthResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            token=token,
        )
    )


@router.get("/me", response_model=ResponseWrapper)
async def get_me(
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user),
):
    """获取当前登录用户信息"""
    result = await db.execute(select(User).where(User.id == token_data["user_id"]))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return ResponseWrapper(
        data=UserInfo(
            id=user.id,
            username=user.username,
            email=user.email,
            avatar_url=user.avatar_url,
            created_at=user.created_at,
        )
    )
