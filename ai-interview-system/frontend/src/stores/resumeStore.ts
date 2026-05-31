/**
 * 简历状态管理 - Zustand Store
 */

import { create } from 'zustand';
import { resumeApi } from '@/services/api';
import type { Resume } from '@/types';

interface ResumeState {
  resumes: Resume[];
  currentResume: Resume | null;
  isLoading: boolean;
  isUploading: boolean;
  isParsing: boolean;
  error: string | null;

  fetchResumes: () => Promise<void>;
  uploadResume: (file: File) => Promise<Resume | null>;
  parseResume: (id: number) => Promise<void>;
  deleteResume: (id: number) => Promise<void>;
  setCurrentResume: (resume: Resume | null) => void;
  clearError: () => void;
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumes: [],
  currentResume: null,
  isLoading: false,
  isUploading: false,
  isParsing: false,
  error: null,

  /** 获取简历列表 */
  fetchResumes: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await resumeApi.getList();
      set({ resumes: response.data || [], isLoading: false });
    } catch (error: any) {
      set({ error: typeof error === 'string' ? error : '获取简历列表失败', isLoading: false });
    }
  },

  /** 上传简历 */
  uploadResume: async (file: File) => {
    set({ isUploading: true, error: null });
    try {
      const response = await resumeApi.upload(file);
      const resume = response.data;
      set((state) => ({
        resumes: [resume, ...state.resumes],
        isUploading: false,
      }));
      return resume;
    } catch (error: any) {
      set({ error: typeof error === 'string' ? error : '上传失败，请检查文件格式', isUploading: false });
      return null;
    }
  },

  /** 解析简历 */
  parseResume: async (id: number) => {
    set({ isParsing: true, error: null });
    try {
      const response = await resumeApi.parse(id);
      const parsed = response.data;
      set((state) => ({
        resumes: state.resumes.map((r) => (r.id === id ? { ...r, ...parsed } : r)),
        currentResume: state.currentResume?.id === id ? { ...state.currentResume, ...parsed } : state.currentResume,
        isParsing: false,
      }));
    } catch (error: any) {
      set({ error: typeof error === 'string' ? error : '解析失败', isParsing: false });
    }
  },

  /** 删除简历 */
  deleteResume: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await resumeApi.delete(id);
      set((state) => ({
        resumes: state.resumes.filter((r) => r.id !== id),
        currentResume: state.currentResume?.id === id ? null : state.currentResume,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: typeof error === 'string' ? error : '删除失败', isLoading: false });
    }
  },

  /** 设置当前简历 */
  setCurrentResume: (resume) => set({ currentResume: resume }),

  /** 清除错误 */
  clearError: () => set({ error: null }),
}));
