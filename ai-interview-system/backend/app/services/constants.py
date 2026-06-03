"""
服务层共享常量 — 避免循环导入的唯一来源

ai_service / interview_service 等模块统一从此处导入默认值常量。
"""

# ============= 简历解析默认值 =============

DEFAULT_RESUME_FIELDS = {
    "name": "", "phone": "", "email": "",
    "skills": [], "work_experience": [],
    "project_experience": [], "education": [],
    "self_evaluation": "",
}

# ============= 评估报告默认值 =============

DEFAULT_EVALUATION_SCORES = {
    "overall_score": 70,
    "technical_score": 70,
    "communication_score": 70,
    "logic_score": 70,
    "expression_score": 70,
    "job_fit_score": 70,
    "adaptability_score": 70,
    "overall_comment": "评估完成",
    "strengths": "",
    "weaknesses": "",
    "suggestions": "",
    "dimension_scores": {},
    "question_reviews": [],
}
