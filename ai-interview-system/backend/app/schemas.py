"""
Pydantic 数据模型 - API 请求/响应的数据校验
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============= 通用响应包装 =============

class ResponseWrapper(BaseModel):
    """统一响应格式"""
    code: int = 200
    message: str = "success"
    data: Any = None
    timestamp: int = 0


class PaginationData(BaseModel):
    """分页数据包装"""
    items: List[Any]
    total: int
    page: int
    page_size: int


# ============= 认证相关 =============

class UserRegister(BaseModel):
    """用户注册请求"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    """用户登录请求"""
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserInfo(BaseModel):
    """用户信息响应"""
    id: int
    username: str
    email: str
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None


class AuthResponse(BaseModel):
    """认证响应（注册/登录）"""
    id: int
    username: str
    email: str
    token: str
    refresh_token: str = ""
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """刷新 Token 请求"""
    refresh_token: str = Field(..., min_length=1)


class RefreshTokenResponse(BaseModel):
    """刷新 Token 响应"""
    token: str
    refresh_token: str
    token_type: str = "bearer"


# ============= 简历相关 =============

class ResumeCreate(BaseModel):
    """创建简历请求"""
    filename: str
    file_type: str
    file_size: int


class ResumeInfo(BaseModel):
    """简历信息响应"""
    id: int
    user_id: int
    filename: str
    file_type: str
    file_size: int
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    skills: Optional[str] = None
    work_experience: Optional[str] = None
    project_experience: Optional[str] = None
    education: Optional[str] = None
    self_evaluation: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = None
    uploaded_at: Optional[datetime] = None
    parsed_at: Optional[datetime] = None


class ResumeParseResult(BaseModel):
    """简历解析结果"""
    id: int
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    skills: Optional[str] = None
    work_experience: Optional[str] = None
    project_experience: Optional[str] = None
    education: Optional[str] = None
    self_evaluation: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = None
    parsed_at: Optional[datetime] = None


# ============= 面试相关 =============

class InterviewCreate(BaseModel):
    """创建面试请求"""
    resume_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=200)
    job_position: str = Field(..., min_length=1, max_length=100)
    interview_type: str = Field(default="comprehensive")
    difficulty: str = Field(default="intermediate")
    question_count: int = Field(default=8, ge=3, le=15)
    # 语音/3D 配置（新增，可选）
    enable_voice: bool = False
    enable_3d: bool = False
    interviewer_model: Optional[str] = "male"
    scene: Optional[str] = "office"


class InterviewInfo(BaseModel):
    """面试信息响应"""
    id: int
    user_id: int
    resume_id: Optional[int] = None
    title: str
    job_position: Optional[str] = None
    interview_type: str
    difficulty: str
    status: str
    message_count: int
    question_count: int
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    overall_score: Optional[int] = None
    # 语音/3D 配置（新增）
    enable_voice: bool = False
    enable_3d: bool = False
    interviewer_model: Optional[str] = "male"
    scene: Optional[str] = "office"


class InterviewMessageCreate(BaseModel):
    """发送消息请求"""
    content: str = Field(..., min_length=1, max_length=5000)


class InterviewMessageInfo(BaseModel):
    """消息信息响应"""
    id: int
    interview_id: int
    role: str
    content: str
    created_at: Optional[datetime] = None


class InterviewComplete(BaseModel):
    """结束面试响应"""
    interview_id: int
    status: str
    message: str


# ============= 评估相关 =============

class EvaluationInfo(BaseModel):
    """评估信息响应"""
    id: int
    interview_id: int
    user_id: int
    overall_score: int
    technical_score: int
    communication_score: int
    logic_score: int
    expression_score: int
    job_fit_score: int
    adaptability_score: int
    overall_comment: str
    strengths: str
    weaknesses: str
    suggestions: str
    dimension_scores: Optional[Dict[str, Any]] = None
    question_reviews: Optional[List[Dict[str, Any]]] = None
    created_at: Optional[datetime] = None


class EvaluationCreate(BaseModel):
    """创建评估请求（内部使用）"""
    interview_id: int
    user_id: int
    overall_score: int
    technical_score: int
    communication_score: int
    logic_score: int
    expression_score: int
    job_fit_score: int
    adaptability_score: int
    overall_comment: str
    strengths: str
    weaknesses: str
    suggestions: str
    dimension_scores: Optional[Dict[str, Any]] = None
    question_reviews: Optional[List[Dict[str, Any]]] = None


# ============= AI 模型配置相关 =============

class AIModelConfigBase(BaseModel):
    """AI 模型配置基础字段"""
    name: str = Field(..., min_length=1, max_length=100)
    provider: str = Field(default="openai-compatible", max_length=50)
    base_url: str = Field(..., min_length=1, max_length=500)
    model: str = Field(..., min_length=1, max_length=100)
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=800, ge=1, le=16000)
    is_enabled: bool = True
    description: Optional[str] = None


class AIModelConfigCreate(AIModelConfigBase):
    """创建 AI 模型配置"""
    api_key: str = Field(default="", max_length=500)
    is_active: bool = False


class AIModelConfigUpdate(BaseModel):
    """更新 AI 模型配置"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    provider: Optional[str] = Field(None, max_length=50)
    base_url: Optional[str] = Field(None, min_length=1, max_length=500)
    model: Optional[str] = Field(None, min_length=1, max_length=100)
    api_key: Optional[str] = Field(None, max_length=500)
    temperature: Optional[float] = Field(None, ge=0, le=2)
    max_tokens: Optional[int] = Field(None, ge=1, le=16000)
    is_enabled: Optional[bool] = None
    description: Optional[str] = None


class AIModelConfigInfo(AIModelConfigBase):
    """AI 模型配置响应"""
    id: int
    is_active: bool = False
    api_key_masked: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============= SSE 流式响应 =============

class SSEMessageChunk(BaseModel):
    """SSE 消息片段"""
    delta: str
    finish_reason: Optional[str] = None


class SSEMessageDone(BaseModel):
    """SSE 消息完成"""
    message_id: int
    total_tokens: int = 0


# =============================================================================
# 题库相关 Schema（新增）
# =============================================================================

class QuestionBankBase(BaseModel):
    """题库基础模型"""
    title: str = Field(..., min_length=1, max_length=500, description="题目内容")
    answer: Optional[str] = Field(None, description="参考答案")
    analysis: Optional[str] = Field(None, description="解析/思路")
    category: Optional[str] = Field(None, description="岗位分类(frontend/backend/algorithm/product/...)")
    sub_category: Optional[str] = Field(None, description="子分类(react/java/system_design/...)")
    difficulty: Optional[str] = Field(None, description="难度(beginner/intermediate/advanced)")
    question_type: Optional[str] = Field(None, description="题型(technical/behavioral/situational/algorithm)")
    tags: Optional[List[str]] = Field(None, description="标签数组")
    source_name: Optional[str] = Field(None, description="来源名称")
    source_url: Optional[str] = Field(None, description="来源URL")


class QuestionBankCreate(QuestionBankBase):
    """创建题库请求"""
    pass


class QuestionBankUpdate(BaseModel):
    """更新题库请求"""
    title: Optional[str] = Field(None, max_length=500)
    answer: Optional[str] = None
    analysis: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    difficulty: Optional[str] = None
    question_type: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None


class QuestionBankInfo(QuestionBankBase):
    """题库详情响应"""
    id: int
    view_count: int = 0
    use_count: int = 0
    status: str = "pending"
    crawled_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class QuestionBankListResponse(BaseModel):
    """题库列表响应"""
    items: List[QuestionBankInfo]
    total: int
    page: int
    page_size: int


class QuestionStats(BaseModel):
    """题库统计响应"""
    total_count: int
    today_new: int
    week_new: int
    approved_count: int
    pending_count: int
    category_distribution: List[Dict[str, Any]]
    source_distribution: List[Dict[str, Any]]


# =============================================================================
# 采集任务相关 Schema（新增）
# =============================================================================

class CrawlTaskInfo(BaseModel):
    """采集任务信息"""
    id: int
    source_name: str
    source_type: str
    status: str
    total_count: int = 0
    new_count: int = 0
    duplicate_count: int = 0
    error_count: int = 0
    duration_seconds: Optional[int] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CrawlTaskListResponse(BaseModel):
    """采集任务列表响应"""
    items: List[CrawlTaskInfo]
    total: int


class CrawlSourceConfig(BaseModel):
    """采集来源配置"""
    name: str = Field(..., min_length=1, max_length=50)
    source_type: str = Field(..., min_length=1, max_length=30)
    base_url: str = Field(..., min_length=1, max_length=500)
    spider_class: str = Field(..., min_length=1, max_length=100)
    cron_expression: Optional[str] = Field("0 2 * * *", max_length=50)
    config: Optional[Dict[str, Any]] = None
    is_enabled: Optional[bool] = True


class CrawlSourceInfo(CrawlSourceConfig):
    """采集来源详情"""
    id: int
    last_run_at: Optional[datetime] = None
    last_status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CrawlSourceListResponse(BaseModel):
    """采集来源列表响应"""
    items: List[CrawlSourceInfo]


class SchedulerStatus(BaseModel):
    """调度器状态响应"""
    running: bool
    job_count: int
    jobs: List[Dict[str, Optional[str]]]
