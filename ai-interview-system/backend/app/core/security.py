"""
安全模块 - JWT 认证、密码加密、Refresh Token 轮换

Token 策略:
- Access Token: 短期有效（默认 30 分钟），用于 API 鉴权
- Refresh Token: 长期有效（默认 7 天），仅用于刷新 Access Token
- Refresh Token 轮换：每次使用后旧 token 失效，签发新 refresh token
"""

from fastapi import Request, HTTPException, status
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional

from app.config import get_settings

settings = get_settings()

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """使用 bcrypt 哈希密码"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


# ============= Token 类型常量 =============

TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"


def create_access_token(data: dict) -> str:
    """创建 Access Token（短期，默认 30 分钟）"""
    to_encode = data.copy()
    to_encode.update({
        "type": TOKEN_TYPE_ACCESS,
        "exp": datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """创建 Refresh Token（长期，默认 7 天）"""
    to_encode = data.copy()
    to_encode.update({
        "type": TOKEN_TYPE_REFRESH,
        "exp": datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS),
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_token_pair(data: dict) -> dict:
    """同时签发 Access Token + Refresh Token"""
    return {
        "access_token": create_access_token(data),
        "refresh_token": create_refresh_token(data),
        "token_type": "bearer",
    }


def verify_token(token: str, expected_type: str = TOKEN_TYPE_ACCESS) -> Optional[dict]:
    """验证 Token，返回 payload 或 None。同时校验 token 类型。"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None


async def get_current_user(request: Request) -> dict:
    """
    获取当前登录用户（从 Access Token 解析）

    在路由中使用: `token_data: dict = Depends(get_current_user)`
    """
    auth_header = request.headers.get("Authorization", "")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header[7:]  # 去掉 "Bearer " 前缀
    payload = verify_token(token, TOKEN_TYPE_ACCESS)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已过期，请重新登录",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
