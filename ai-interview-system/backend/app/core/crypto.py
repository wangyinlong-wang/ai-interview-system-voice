"""
加密工具模块 — 用于敏感字段（如 AI 模型 API Key）的对称加密存储。

使用 Fernet (AES-128-CBC + HMAC-SHA256) 对称加密。
加密密钥从 Settings.ENCRYPTION_KEY 获取；若未配置则自动从 SECRET_KEY 派生。
"""

import base64
import hashlib
import logging

from cryptography.fernet import Fernet

from app.config import get_settings

logger = logging.getLogger(__name__)

_fernet_instance: Fernet | None = None


def _get_fernet() -> Fernet:
    """获取 Fernet 实例（懒初始化单例）。"""
    global _fernet_instance
    if _fernet_instance is not None:
        return _fernet_instance

    settings = get_settings()
    # 优先使用专用加密密钥，否则从 SECRET_KEY 派生
    raw_key = settings.ENCRYPTION_KEY or settings.SECRET_KEY
    # Fernet 要求 32 字节 URL-safe base64 编码密钥
    derived = hashlib.sha256(raw_key.encode("utf-8")).digest()
    fernet_key = base64.urlsafe_b64encode(derived)
    _fernet_instance = Fernet(fernet_key)
    return _fernet_instance


def encrypt_api_key(plain: str) -> str:
    """加密 API Key，返回 Fernet token 字符串。空字符串原样返回。"""
    if not plain:
        return ""
    return _get_fernet().encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt_api_key(cipher: str) -> str:
    """解密 API Key。空字符串或解密失败时返回空字符串。"""
    if not cipher:
        return ""
    try:
        return _get_fernet().decrypt(cipher.encode("utf-8")).decode("utf-8")
    except Exception:
        logger.warning("API Key 解密失败，可能由密钥变更导致，返回空值")
        return ""


def mask_api_key(plain: str) -> str:
    """对明文 API Key 做脱敏展示，如 sk-****abcd。"""
    if not plain or len(plain) < 8:
        return "****"
    return f"{plain[:4]}****{plain[-4:]}"
