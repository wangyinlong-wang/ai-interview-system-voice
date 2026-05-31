/**
 * 认证状态管理 - Zustand Store
 */

import { create } from 'zustand';
import { authApi } from '@/services/api';
import type { User, LoginFormData, RegisterFormData } from '@/types';

interface AuthState {
  // 状态
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // 方法
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  clearError: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  /** 初始化 - 检查本地 token */
  init: () => {
    const token = localStorage.getItem('token');
    if (token) {
      set({ token, isAuthenticated: true });
      get().fetchUser();
    }
  },

  /** 登录 */
  login: async (data: LoginFormData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(data);
      const { token, id, username, email } = response.data;
      localStorage.setItem('token', token);
      set({
        token,
        user: { id, username, email },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: typeof error === 'string' ? error : '登录失败，请检查邮箱和密码',
        isLoading: false,
      });
      throw error;
    }
  },

  /** 注册 */
  register: async (data: RegisterFormData) => {
    set({ isLoading: true, error: null });
    try {
      const { confirmPassword, ...registerData } = data;
      const response = await authApi.register(registerData);
      const { token, id, username, email } = response.data;
      localStorage.setItem('token', token);
      set({
        token,
        user: { id, username, email },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: typeof error === 'string' ? error : '注册失败，请检查输入信息',
        isLoading: false,
      });
      throw error;
    }
  },

  /** 登出 */
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false, error: null });
    window.location.href = '/auth';
  },

  /** 获取当前用户信息 */
  fetchUser: async () => {
    try {
      const response = await authApi.getMe();
      set({ user: response.data, isAuthenticated: true });
    } catch {
      // Token 无效，清除状态
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  /** 清除错误 */
  clearError: () => set({ error: null }),
}));
