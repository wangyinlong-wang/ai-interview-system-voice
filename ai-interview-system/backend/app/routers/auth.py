"""
认证路由 - 用户注册、登录、Token 刷新、信息获取
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas import (
    UserRegister, UserLogin, AuthResponse, UserInfo,
    RefreshTokenRequest, RefreshTokenResponse, ResponseWrapper,
)
from app.core.security import (
    hash_password, verify_password,
    create_token_pair, verify_token, get_current_user,
    TOKEN_TYPE_REFRESH, TOKEN_TYPE_ACCESS,
)
from app.main import limiter

router = APIRouter(prefix="/auth", tags=["认证"])


def _build_user_claims(user: User) -> dict:
    """构建 JWT payload 中的用户标识字段。"""
    return {
        "user_id": user.id,
        "email": user.email,
        "username": user.username,
    }


@router.post("/register", response_model=ResponseWrapper)
@limiter.limit("5/minute")
async def register(request: Request, data: UserRegister, db: AsyncSession = Depends(get_db)):
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

    # 签发 Access + Refresh Token
    claims = _build_user_claims(new_user)
    tokens = create_token_pair(claims)

    return ResponseWrapper(
        message="注册成功",
        data=AuthResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
        )
    )


@router.post("/login", response_model=ResponseWrapper)
@limiter.limit("10/minute")
async def login(request: Request, data: UserLogin, db: AsyncSession = Depends(get_db)):
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

    # 签发 Access + Refresh Token
    claims = _build_user_claims(user)
    tokens = create_token_pair(claims)

    return ResponseWrapper(
        message="登录成功",
        data=AuthResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
        )
    )


@router.post("/refresh", response_model=ResponseWrapper)
@limiter.limit("20/minute")
async def refresh_token(
    request: Request,
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    使用 Refresh Token 刷新 Access Token

    实现令牌轮换：每次刷新后签发新的 refresh token，旧 token 自动失效。
    """
    payload = verify_token(data.refresh_token, TOKEN_TYPE_REFRESH)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh Token 无效或已过期，请重新登录",
        )

    # 验证用户是否仍然存在
    user_id = payload.get("user_id")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在，请重新登录",
        )

    # 轮换：签发新的 token pair
    claims = _build_user_claims(user)
    tokens = create_token_pair(claims)

    return ResponseWrapper(
        message="Token 已刷新",
        data=RefreshTokenResponse(
            token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
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
