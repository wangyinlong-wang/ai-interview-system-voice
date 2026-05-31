/**
 * 面试状态管理 - Zustand Store
 */

import { create } from 'zustand';
import { interviewApi, sendMessageSSE } from '@/services/api';
import type { Interview, InterviewMessage, CreateInterviewData, Evaluation } from '@/types';

interface InterviewState {
  interviews: Interview[];
  currentInterview: Interview | null;
  messages: InterviewMessage[];
  currentEvaluation: Evaluation | null;
  isLoading: boolean;
  isCreating: boolean;
  isSending: boolean;
  isCompleting: boolean;
  isTyping: boolean;
  streamedContent: string;
  error: string | null;

  fetchInterviews: () => Promise<void>;
  fetchInterview: (id: number) => Promise<void>;
  createInterview: (data: CreateInterviewData) => Promise<number | null>;
  fetchMessages: (id: number) => Promise<void>;
  sendMessage: (interviewId: number, content: string) => Promise<void>;
  completeInterview: (id: number) => Promise<void>;
  fetchEvaluation: (id: number) => Promise<void>;
  deleteInterview: (id: number) => Promise<void>;
  setCurrentInterview: (interview: Interview | null) => void;
  addLocalMessage: (message: InterviewMessage) => void;
  clearStreamedContent: () => void;
  clearError: () => void;
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  interviews: [],
  currentInterview: null,
  messages: [],
  currentEvaluation: null,
  isLoading: false,
  isCreating: false,
  isSending: false,
  isCompleting: false,
  isTyping: false,
  streamedContent: '',
  error: null,

  /** 获取面试列表 */
  fetchInterviews: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await interviewApi.getList();
      const data = response.data;
      set({ interviews: data?.items || [], isLoading: false });
    } catch (error: any) {
      set({ error: typeof error === 'string' ? error : '获取面试列表失败', isLoading: false });
    }
  },

  /** 获取单个面试详情 */
  fetchInterview: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await interviewApi.getDetail(id);
      set({ currentInterview: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: typeof error === 'string' ? error : '获取面试详情失败', isLoading: false });
    }
  },

  /** 创建面试 */
  createInterview: async (data: CreateInterviewData) => {
    set({ isCreating: true, error: null });
    try {
      const response = await interviewApi.create(data);
      const interview = response.data;
      set((state) => ({
        interviews: [interview, ...state.interviews],
        currentInterview: interview,
        isCreating: false,
        messages: [],
      }));
      return interview.id;
    } catch (error: any) {
      set({ error: typeof error === 'string' ? error : '创建面试失败', isCreating: false });
      return null;
    }
  },

  /** 获取消息历史 */
  fetchMessages: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await interviewApi.getMessages(id);
      const msgs = response.data || [];
      // 过滤系统消息
      const visibleMsgs = msgs.filter((m) => m.role !== 'system');
      set({ messages: visibleMsgs, isLoading: false });
    } catch (error: any) {
      set({ error: typeof error === 'string' ? error : '获取消息失败', isLoading: false });
    }
  },

  /** 发送消息（SSE 流式） */
  sendMessage: async (interviewId: number, content: string) => {
    const { messages } = get();
    
    // 先添加用户消息到本地
    const userMsg: InterviewMessage = {
      id: Date.now(),
      interview_id: interviewId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    
    set({
      isSending: true,
      isTyping: true,
      streamedContent: '',
      messages: [...messages, userMsg],
      error: null,
    });

    // 创建临时的 AI 消息占位
    const aiMsgId = Date.now() + 1;
    const aiPlaceholder: InterviewMessage = {
      id: aiMsgId,
      interview_id: interviewId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, aiPlaceholder] }));

    // 发送 SSE 请求
    sendMessageSSE(
      interviewId,
      content,
      // onChunk
      (chunk: string) => {
        set((state) => ({
          streamedContent: state.streamedContent + chunk,
          messages: state.messages.map((m) =>
            m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
          ),
        }));
      },
      // onDone
      () => {
        set({ isSending: false, isTyping: false, streamedContent: '' });
      },
      // onError
      (error: string) => {
        set({
          isSending: false,
          isTyping: false,
          error,
          messages: get().messages.map((m) =>
            m.id === aiMsgId ? { ...m, content: m.content + '\n[响应异常，请重试]' } : m
          ),
        });
      }
    );
  },

  /** 结束面试 */
  completeInterview: async (id: number) => {
    set({ isCompleting: true, error: null });
    try {
      await interviewApi.complete(id);
      set((state) => ({
        currentInterview: state.currentInterview
          ? { ...state.currentInterview, status: 'completed' }
          : null,
        isCompleting: false,
      }));
    } catch (error: any) {
      set({ error: typeof error === 'string' ? error : '结束面试失败', isCompleting: false });
    }
  },

  /** 获取评估报告 */
  fetchEvaluation: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await interviewApi.getEvaluation(id);
      set({ currentEvaluation: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: typeof error === 'string' ? error : '获取评估报告失败', isLoading: false });
    }
  },

  /** 删除面试 */
  deleteInterview: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await interviewApi.delete(id);
      set((state) => ({
        interviews: state.interviews.filter((i) => i.id !== id),
        currentInterview: state.currentInterview?.id === id ? null : state.currentInterview,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: typeof error === 'string' ? error : '删除失败', isLoading: false });
    }
  },

  /** 设置当前面试 */
  setCurrentInterview: (interview) => set({ currentInterview: interview }),

  /** 添加本地消息 */
  addLocalMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] }),
  ),

  /** 清除流式内容 */
  clearStreamedContent: () => set({ streamedContent: '' }),

  /** 清除错误 */
  clearError: () => set({ error: null }),
}));
