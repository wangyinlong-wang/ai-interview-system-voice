"""
AI 模型配置管理路由 - 后台动态切换 OpenAI 兼容模型

API Key 写入数据库前自动加密，读取时脱敏展示。
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db
from app.models import AIModelConfig
from app.schemas import (
    AIModelConfigCreate,
    AIModelConfigInfo,
    AIModelConfigUpdate,
    ResponseWrapper,
)
from app.services.model_config_service import (
    activate_model_config,
    encrypt_api_key_for_storage,
    get_masked_api_key,
)

router = APIRouter(prefix="/admin/model-configs", tags=["模型配置"])


def _config_data(config: AIModelConfig) -> dict:
    """将 ORM 对象转为响应 dict，API Key 脱敏展示。"""
    data = AIModelConfigInfo.model_validate(config).model_dump(mode="json")
    data["api_key_masked"] = get_masked_api_key(config.api_key)
    return data


@router.get("", response_model=ResponseWrapper)
async def list_model_configs(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """获取模型配置列表"""
    result = await db.execute(
        select(AIModelConfig).order_by(desc(AIModelConfig.is_active), desc(AIModelConfig.updated_at))
    )
    configs = result.scalars().all()
    return ResponseWrapper(data={
        "items": [_config_data(config) for config in configs],
        "total": len(configs),
    })


@router.post("", response_model=ResponseWrapper)
async def create_model_config(
    data: AIModelConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """创建模型配置"""
    result = await db.execute(select(AIModelConfig).where(AIModelConfig.name == data.name))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="模型配置名称已存在")

    payload = data.model_dump()
    # 写入前加密 API Key
    payload["api_key"] = encrypt_api_key_for_storage(payload.get("api_key", ""))
    config = AIModelConfig(**payload)
    db.add(config)
    await db.commit()
    await db.refresh(config)

    if data.is_active:
        config = await activate_model_config(db, config)

    return ResponseWrapper(message="模型配置已创建", data=_config_data(config))


@router.get("/{config_id}", response_model=ResponseWrapper)
async def get_model_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """获取单个模型配置"""
    result = await db.execute(select(AIModelConfig).where(AIModelConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="模型配置不存在")
    return ResponseWrapper(data=_config_data(config))


@router.put("/{config_id}", response_model=ResponseWrapper)
async def update_model_config(
    config_id: int,
    data: AIModelConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """更新模型配置。api_key 为空字符串时保留原值。"""
    result = await db.execute(select(AIModelConfig).where(AIModelConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="模型配置不存在")

    update_data = data.model_dump(exclude_unset=True)
    if "api_key" in update_data:
        if update_data["api_key"] == "":
            # 空字符串表示保留原值
            update_data.pop("api_key")
        else:
            # 非空值：加密后存储
            update_data["api_key"] = encrypt_api_key_for_storage(update_data["api_key"])

    for field, value in update_data.items():
        setattr(config, field, value)
    config.updated_at = datetime.now()

    await db.commit()
    await db.refresh(config)
    return ResponseWrapper(message="模型配置已更新", data=_config_data(config))


@router.post("/{config_id}/activate", response_model=ResponseWrapper)
async def activate_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """启用指定模型配置，并取消其他配置的启用状态"""
    result = await db.execute(select(AIModelConfig).where(AIModelConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="模型配置不存在")

    config = await activate_model_config(db, config)
    return ResponseWrapper(message="已切换当前模型配置", data=_config_data(config))


@router.delete("/{config_id}", response_model=ResponseWrapper)
async def delete_model_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """删除未启用的模型配置"""
    result = await db.execute(select(AIModelConfig).where(AIModelConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="模型配置不存在")
    if config.is_active:
        raise HTTPException(status_code=400, detail="当前启用的模型配置不能删除")

    await db.delete(config)
    await db.commit()
    return ResponseWrapper(message="模型配置已删除")
