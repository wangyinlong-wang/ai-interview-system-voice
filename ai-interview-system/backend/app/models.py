"""
SQLAlchemy 模型定义 - 数据库表结构

注意：所有 DateTime 默认值使用 func.now()（数据库服务端时间戳），
而非 datetime.now（Python 模块加载时求值，会导致所有记录使用同一时间）。
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Index, Boolean, Float, func
from sqlalchemy.orm import relationship


from app.database import Base


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False, unique=True)
    email = Column(String(100), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # 关联关系
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="user", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_users_email", "email"),
        Index("idx_users_created_at", "created_at"),
    )


class Resume(Base):
    """简历表"""
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=False)
    file_size = Column(Integer, nullable=False)

    # 解析后的信息
    name = Column(String(50), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    skills = Column(Text, nullable=True)  # JSON 字符串
    work_experience = Column(Text, nullable=True)  # JSON 字符串
    project_experience = Column(Text, nullable=True)  # JSON 字符串
    education = Column(Text, nullable=True)  # JSON 字符串
    self_evaluation = Column(Text, nullable=True)
    parsed_data = Column(JSON, nullable=True)  # 完整解析数据

    uploaded_at = Column(DateTime, server_default=func.now())
    parsed_at = Column(DateTime, nullable=True)

    # 关联关系
    user = relationship("User", back_populates="resumes")
    interviews = relationship("Interview", back_populates="resume")

    __table_args__ = (
        Index("idx_resumes_user_id", "user_id"),
        Index("idx_resumes_uploaded_at", "uploaded_at"),
    )


class Interview(Base):
    """面试会话表"""
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    title = Column(String(200), nullable=False)
    job_position = Column(String(100), nullable=True)
    interview_type = Column(String(50), nullable=False, default="comprehensive")
    difficulty = Column(String(20), nullable=False, default="intermediate")
    status = Column(String(20), nullable=False, default="ongoing")  # ongoing / completing / completed / failed / aborted
    message_count = Column(Integer, default=0)
    question_count = Column(Integer, default=8)
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # 语音/3D 面试配置
    enable_voice = Column(Boolean, default=False)
    enable_3d = Column(Boolean, default=False)
    interviewer_model = Column(String(50), nullable=True, default="male")
    scene = Column(String(50), nullable=True, default="office")

    # 关联关系
    user = relationship("User", back_populates="interviews")
    resume = relationship("Resume", back_populates="interviews")
    messages = relationship("Message", back_populates="interview", cascade="all, delete-orphan", order_by="Message.created_at")
    evaluation = relationship("Evaluation", back_populates="interview", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_interviews_user_id", "user_id"),
        Index("idx_interviews_status", "status"),
        Index("idx_interviews_created_at", "created_at"),
    )


class Message(Base):
    """消息表"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    role = Column(String(20), nullable=False)  # system / user / assistant
    content = Column(Text, nullable=False)
    token_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    # 关联关系
    interview = relationship("Interview", back_populates="messages")

    __table_args__ = (
        Index("idx_messages_interview_id", "interview_id"),
        Index("idx_messages_created_at", "created_at"),
    )


class Evaluation(Base):
    """评估表"""
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False, unique=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    overall_score = Column(Integer, nullable=False)
    technical_score = Column(Integer, nullable=False)
    communication_score = Column(Integer, nullable=False)
    logic_score = Column(Integer, nullable=False)
    expression_score = Column(Integer, nullable=False)
    job_fit_score = Column(Integer, nullable=False, default=75)
    adaptability_score = Column(Integer, nullable=False, default=75)
    overall_comment = Column(Text, nullable=False)
    strengths = Column(Text, nullable=False)
    weaknesses = Column(Text, nullable=False)
    suggestions = Column(Text, nullable=False)
    dimension_scores = Column(JSON, nullable=True)
    question_reviews = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # 关联关系
    interview = relationship("Interview", back_populates="evaluation")
    user = relationship("User", back_populates="evaluations")

    __table_args__ = (
        Index("idx_evaluations_user_id", "user_id"),
        Index("idx_evaluations_overall_score", "overall_score"),
    )


class AIModelConfig(Base):
    """AI 模型配置表 - 支持后台动态切换 OpenAI 兼容模型。"""
    __tablename__ = "ai_model_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    provider = Column(String(50), nullable=False, default="openai-compatible")
    base_url = Column(String(500), nullable=False)
    model = Column(String(100), nullable=False)
    api_key = Column(String(500), nullable=False, default="")  # Fernet 加密存储
    temperature = Column(Float, nullable=False, default=0.7)
    max_tokens = Column(Integer, nullable=False, default=800)
    is_active = Column(Boolean, default=False)
    is_enabled = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_ai_model_configs_active", "is_active"),
        Index("idx_ai_model_configs_enabled", "is_enabled"),
    )


# =============================================================================
# 题库与爬虫相关模型
# =============================================================================

class QuestionBank(Base):
    """题库表 - 存储爬取的面试题"""
    __tablename__ = "question_bank"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    answer = Column(Text, nullable=True)
    analysis = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)
    sub_category = Column(String(50), nullable=True)
    difficulty = Column(String(20), nullable=True)
    question_type = Column(String(30), nullable=True)
    tags = Column(JSON, nullable=True)
    source_name = Column(String(50), nullable=True)
    source_url = Column(String(500), nullable=True)
    view_count = Column(Integer, default=0)
    use_count = Column(Integer, default=0)
    status = Column(String(20), default="pending")
    crawled_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_question_bank_category", "category"),
        Index("idx_question_bank_difficulty", "difficulty"),
        Index("idx_question_bank_status", "status"),
        Index("idx_question_bank_source", "source_name"),
        Index("idx_question_bank_crawled_at", "crawled_at"),
    )


class CrawlTask(Base):
    """采集任务表 - 记录每次爬取任务的执行结果"""
    __tablename__ = "crawl_tasks"

    id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String(50), nullable=False)
    source_type = Column(String(30), nullable=False)
    status = Column(String(20), default="running")
    total_count = Column(Integer, default=0)
    new_count = Column(Integer, default=0)
    duplicate_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    duration_seconds = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)


class CrawlSource(Base):
    """采集来源配置表 - 管理爬虫来源和定时规则"""
    __tablename__ = "crawl_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)
    source_type = Column(String(30), nullable=False)
    base_url = Column(String(500), nullable=False)
    spider_class = Column(String(100), nullable=False)
    cron_expression = Column(String(50), default="0 2 * * *")
    config = Column(JSON, nullable=True)
    is_enabled = Column(Boolean, default=True)
    last_run_at = Column(DateTime, nullable=True)
    last_status = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
