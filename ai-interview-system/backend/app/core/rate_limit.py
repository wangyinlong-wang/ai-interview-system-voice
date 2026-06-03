"""
速率限制器模块 — 独立定义，避免从 main.py 导入导致循环依赖
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
