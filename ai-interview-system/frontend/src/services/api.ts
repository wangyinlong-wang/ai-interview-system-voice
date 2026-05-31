/**
 * API 服务层 - 封装所有后端接口调用
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  ApiResponse,
  User,
  LoginFormData,
  RegisterFormData,
  Resume,
  Interview,
  InterviewMessage,
  CreateInterviewData,
  Evaluation,
  QuestionBank,
  QuestionStats,
  PaginationResponse,
  CrawlTask,
  CrawlSource,
  CrawlSourceFormData,
  SchedulerStatus,
  AIModelConfig,
  AIModelConfigFormData,
} from '@/types';

type ApiClient = AxiosInstance & {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
};

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
}) as ApiClient;

type AuthPayload = { id: number; username: string; email: string; token: string };

const getApi = <T>(url: string, config?: AxiosRequestConfig) =>
  api.get<ApiResponse<T>, ApiResponse<T>>(url, config);

const postApi = <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
  api.post<ApiResponse<T>, ApiResponse<T>>(url, data, config);

const putApi = <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
  api.put<ApiResponse<T>, ApiResponse<T>>(url, data, config);

const deleteApi = <T>(url: string, config?: AxiosRequestConfig) =>
  api.delete<ApiResponse<T>, ApiResponse<T>>(url, config);

// 请求拦截器 - 添加 Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期，清除登录状态
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    return Promise.reject(error.response?.data?.message || error.message || '请求失败');
  }
);

// ============= 认证相关 API =============

export const authApi = {
  /** 用户注册 */
  register: (data: RegisterFormData) =>
    postApi<AuthPayload>(
      '/auth/register',
      data
    ),

  /** 用户登录 */
  login: (data: LoginFormData) =>
    postApi<AuthPayload>(
      '/auth/login',
      data
    ),

  /** 获取当前用户 */
  getMe: () => getApi<User>('/auth/me'),
};

// ============= 简历相关 API =============

export const resumeApi = {
  /** 上传简历 */
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return postApi<Resume>('/resumes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** 获取简历列表 */
  getList: () => getApi<Resume[]>('/resumes'),

  /** 获取简历详情 */
  getDetail: (id: number) => getApi<Resume>(`/resumes/${id}`),

  /** 解析简历 */
  parse: (id: number) => postApi<Resume>(`/resumes/${id}/parse`),

  /** 删除简历 */
  delete: (id: number) => deleteApi<void>(`/resumes/${id}`),
};

// ============= 面试相关 API =============

export const interviewApi = {
  /** 创建面试 */
  create: (data: CreateInterviewData) =>
    postApi<Interview>('/interviews', data),

  /** 获取面试列表 */
  getList: (page: number = 1, pageSize: number = 20) =>
    getApi<{ items: Interview[]; total: number; page: number; page_size: number }>(
      `/interviews?page=${page}&page_size=${pageSize}`
    ),

  /** 获取面试详情 */
  getDetail: (id: number) => getApi<Interview>(`/interviews/${id}`),

  /** 获取消息历史 */
  getMessages: (id: number) =>
    getApi<InterviewMessage[]>(`/interviews/${id}/messages`),

  /** 发送消息（SSE 流式） */
  sendMessageStream: (id: number, content: string): EventSource => {
    const token = localStorage.getItem('token');
    const url = `/api/v1/interviews/${id}/messages`;
    
    // 使用 fetch + ReadableStream 方式
    return null as any; // 占位，实际使用 sendMessageSSE 函数
  },

  /** 结束面试 */
  complete: (id: number) =>
    postApi<{ interview_id: number; status: string; message: string }>(
      `/interviews/${id}/complete`
    ),

  /** 获取评估报告 */
  getEvaluation: (id: number) =>
    getApi<Evaluation>(`/interviews/${id}/evaluation`),

  /** 删除面试 */
  delete: (id: number) => deleteApi<void>(`/interviews/${id}`),
};

// SSE 发送消息（手动实现，不使用 axios）
export function sendMessageSSE(
  interviewId: number,
  content: string,
  onChunk: (chunk: string) => void,
  onDone: (data: { message_id: number; total_tokens: number }) => void,
  onError: (error: string) => void
): () => void {
  const token = localStorage.getItem('token');
  const url = `/api/v1/interviews/${interviewId}/messages`;
  
  // 使用 fetch API 实现 SSE
  const controller = new AbortController();
  
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            // 读取下一行的 data
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine && dataLine.startsWith('data: ')) {
              const data = dataLine.slice(6);
              try {
                if (eventType === 'message') {
                  const parsed = JSON.parse(data);
                  if (parsed.delta) {
                    onChunk(parsed.delta);
                  }
                } else if (eventType === 'done') {
                  const parsed = JSON.parse(data);
                  onDone(parsed);
                } else if (eventType === 'error') {
                  const parsed = JSON.parse(data);
                  onError(parsed.error || '未知错误');
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message || '请求失败');
      }
    });
  
  // 返回取消函数
  return () => controller.abort();
}

// ============= 题库相关 API（新增） =============

export const questionApi = {
  /** 获取题库列表 */
  getList: (params?: {
    category?: string;
    sub_category?: string;
    difficulty?: string;
    question_type?: string;
    keyword?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) =>
    getApi<PaginationResponse<QuestionBank>>('/questions', { params }),

  /** 搜索面试题 */
  search: (q: string, limit?: number) =>
    getApi<{ items: QuestionBank[]; total: number }>('/questions/search', { params: { q, limit } }),

  /** 获取题库统计 */
  getStats: () =>
    getApi<QuestionStats>('/questions/stats'),

  /** 获取分类列表 */
  getCategories: () =>
    getApi<{ categories: string[]; sub_categories: string[] }>('/questions/categories'),

  /** 获取题目详情 */
  getDetail: (id: number) =>
    getApi<QuestionBank>(`/questions/${id}`),

  /** 更新题目 */
  update: (id: number, data: Partial<QuestionBank>) =>
    putApi<QuestionBank>(`/questions/${id}`, data),

  /** 删除题目 */
  delete: (id: number) =>
    deleteApi<void>(`/questions/${id}`),

  /** 审核通过 */
  approve: (id: number) =>
    postApi<void>(`/questions/${id}/approve`, {}),

  /** 审核拒绝 */
  reject: (id: number) =>
    postApi<void>(`/questions/${id}/reject`, {}),
};

// ============= 采集管理 API（新增） =============

export const crawlApi = {
  /** 获取采集任务列表 */
  getTasks: (limit?: number) =>
    getApi<{ items: CrawlTask[]; total: number }>('/admin/crawl/tasks', { params: { limit } }),

  /** 手动触发采集 */
  manualRun: (sourceId: number) =>
    postApi<void>(`/admin/crawl/tasks/${sourceId}/run`, {}),

  /** 获取来源列表 */
  getSources: () =>
    getApi<{ items: CrawlSource[]; total: number }>('/admin/crawl/sources'),

  /** 创建来源 */
  createSource: (data: CrawlSourceFormData) =>
    postApi<CrawlSource>('/admin/crawl/sources', data),

  /** 更新来源 */
  updateSource: (id: number, data: CrawlSourceFormData) =>
    putApi<CrawlSource>(`/admin/crawl/sources/${id}`, data),

  /** 删除来源 */
  deleteSource: (id: number) =>
    deleteApi<void>(`/admin/crawl/sources/${id}`),

  /** 启用/禁用来源 */
  toggleSource: (id: number) =>
    postApi<CrawlSource>(`/admin/crawl/sources/${id}/toggle`, {}),

  /** 获取调度器状态 */
  getSchedulerStatus: () =>
    getApi<SchedulerStatus>('/admin/crawl/scheduler/status'),

  /** 重启调度器 */
  restartScheduler: () =>
    postApi<void>('/admin/crawl/scheduler/restart', {}),
};

// ============= AI 模型配置 API =============

export const modelConfigApi = {
  /** 获取模型配置列表 */
  getList: () =>
    getApi<{ items: AIModelConfig[]; total: number }>('/admin/model-configs'),

  /** 创建模型配置 */
  create: (data: AIModelConfigFormData) =>
    postApi<AIModelConfig>('/admin/model-configs', data),

  /** 更新模型配置 */
  update: (id: number, data: Partial<AIModelConfigFormData>) =>
    putApi<AIModelConfig>(`/admin/model-configs/${id}`, data),

  /** 激活模型配置 */
  activate: (id: number) =>
    postApi<AIModelConfig>(`/admin/model-configs/${id}/activate`, {}),

  /** 删除模型配置 */
  delete: (id: number) =>
    deleteApi<void>(`/admin/model-configs/${id}`),
};

export default api;
