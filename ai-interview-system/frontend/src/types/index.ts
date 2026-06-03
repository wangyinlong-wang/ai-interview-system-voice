/**
 * 全局类型定义
 */

// ============= 认证相关 =============

export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
  created_at?: string;
}

export interface AuthPayload {
  id: number;
  username: string;
  email: string;
  token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

// ============= 简历相关 =============

export interface Resume {
  id: number;
  user_id: number;
  filename: string;
  file_type: string;
  file_size: number;
  name?: string;
  phone?: string;
  email?: string;
  skills?: string;
  work_experience?: string;
  project_experience?: string;
  education?: string;
  self_evaluation?: string;
  parsed_data?: ResumeParsedData;
  uploaded_at?: string;
  parsed_at?: string;
}

export interface ResumeParsedData {
  name: string;
  phone: string;
  email: string;
  skills: string[];
  work_experience: WorkExperience[];
  project_experience: ProjectExperience[];
  education: Education[];
  self_evaluation: string;
}

export interface WorkExperience {
  company: string;
  period: string;
  position: string;
  description: string;
}

export interface ProjectExperience {
  name: string;
  role: string;
  tech_stack: string;
  description: string;
}

export interface Education {
  school: string;
  major: string;
  degree: string;
  period: string;
}

// ============= 面试相关 =============

export interface Interview {
  id: number;
  user_id: number;
  resume_id?: number;
  title: string;
  job_position?: string;
  interview_type: string;
  difficulty: string;
  status: 'ongoing' | 'completing' | 'completed' | 'failed' | 'aborted';
  message_count: number;
  question_count: number;
  started_at?: string;
  ended_at?: string;
  created_at?: string;
  overall_score?: number;
  enable_voice?: boolean;
  enable_3d?: boolean;
  interviewer_model?: string;
  scene?: string;
}

export interface InterviewMessage {
  id: number;
  interview_id: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface CreateInterviewData {
  resume_id?: number;
  title: string;
  job_position: string;
  interview_type: string;
  difficulty: string;
  question_count: number;
  enable_voice?: boolean;
  enable_3d?: boolean;
  interviewer_model?: string;
  scene?: string;
}

// ============= 评估相关 =============

export interface Evaluation {
  id: number;
  interview_id: number;
  user_id: number;
  overall_score: number;
  technical_score: number;
  communication_score: number;
  logic_score: number;
  expression_score: number;
  job_fit_score: number;
  adaptability_score: number;
  overall_comment: string;
  strengths: string;
  weaknesses: string;
  suggestions: string;
  dimension_scores?: Record<string, number>;
  question_reviews?: QuestionReview[];
  created_at?: string;
}

export interface QuestionReview {
  question: string;
  answer: string;
  score: number;
  comment: string;
  suggestion: string;
}

// ============= API 响应相关 =============

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============= 岗位相关 =============

export interface JobPosition {
  value: string;
  label: string;
  category: string;
}

export const JOB_POSITIONS: JobPosition[] = [
  { value: 'java_backend', label: 'Java 后端工程师', category: '技术' },
  { value: 'python_backend', label: 'Python 后端工程师', category: '技术' },
  { value: 'frontend', label: '前端工程师', category: '技术' },
  { value: 'fullstack', label: '全栈工程师', category: '技术' },
  { value: 'android', label: 'Android 工程师', category: '技术' },
  { value: 'ios', label: 'iOS 工程师', category: '技术' },
  { value: 'algorithm', label: '算法工程师', category: '技术' },
  { value: 'data_engineer', label: '数据工程师', category: '技术' },
  { value: 'devops', label: '运维工程师', category: '技术' },
  { value: 'qa', label: '测试工程师', category: '技术' },
  { value: 'pm', label: '产品经理', category: '产品' },
  { value: 'ui_designer', label: 'UI 设计师', category: '设计' },
  { value: 'ux_designer', label: 'UX 设计师', category: '设计' },
  { value: 'data_analyst', label: '数据分析师', category: '数据' },
  { value: 'operations', label: '运营专员', category: '运营' },
  { value: 'marketing', label: '市场专员', category: '市场' },
  { value: 'sales', label: '销售', category: '销售' },
  { value: 'hr', label: '人力资源', category: '职能' },
  { value: 'finance', label: '财务', category: '职能' },
  { value: 'general_manager', label: '总经理助理', category: '职能' },
];

export const INTERVIEW_TYPES = [
  { value: 'technical', label: '技术面试' },
  { value: 'behavioral', label: '行为面试' },
  { value: 'comprehensive', label: '综合面试' },
];

export const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: '初级' },
  { value: 'intermediate', label: '中级' },
  { value: 'advanced', label: '高级' },
];

export const QUESTION_COUNTS = [5, 8, 10, 15];

// ============= 题库相关（新增） =============

export interface QuestionBank {
  id: number;
  title: string;
  answer?: string;
  analysis?: string;
  category?: string;
  sub_category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  question_type?: 'technical' | 'behavioral' | 'situational' | 'algorithm' | 'system_design' | 'coding';
  tags?: string[];
  source_name?: string;
  source_url?: string;
  view_count: number;
  use_count: number;
  status: 'pending' | 'approved' | 'rejected';
  crawled_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionStats {
  total_count: number;
  today_new: number;
  week_new: number;
  approved_count: number;
  pending_count: number;
  category_distribution: Array<{ name: string; count: number }>;
  source_distribution: Array<{ name: string; count: number }>;
}

export interface CrawlTask {
  id: number;
  source_name: string;
  source_type: string;
  status: 'running' | 'success' | 'no_data' | 'failed';
  total_count: number;
  new_count: number;
  duplicate_count: number;
  error_count: number;
  duration_seconds?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export interface CrawlSource {
  id: number;
  name: string;
  source_type: 'web' | 'api' | 'rss' | 'github';
  base_url: string;
  spider_class: string;
  cron_expression: string;
  config?: Record<string, any>;
  is_enabled: boolean;
  last_run_at?: string;
  last_status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CrawlSourceFormData {
  name: string;
  source_type: string;
  base_url: string;
  spider_class: string;
  cron_expression?: string;
  config?: Record<string, any>;
  is_enabled?: boolean;
}

export interface SchedulerStatus {
  running: boolean;
  job_count: number;
  jobs: Array<{
    id: string;
    name: string;
    next_run: string | null;
  }>;
}

// ============= AI 模型配置相关 =============

export interface AIModelConfig {
  id: number;
  name: string;
  provider: string;
  base_url: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_enabled: boolean;
  is_active: boolean;
  description?: string;
  api_key_masked: string;
  created_at?: string;
  updated_at?: string;
}

export interface AIModelConfigFormData {
  name: string;
  provider: string;
  base_url: string;
  model: string;
  api_key?: string;
  temperature: number;
  max_tokens: number;
  is_enabled: boolean;
  is_active?: boolean;
  description?: string;
}
