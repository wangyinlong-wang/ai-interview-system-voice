/**
 * 认证状态管理 - Zustand Store
 *
 * 支持 Access Token + Refresh Token 双令牌机制:
 * - Access Token: 短期有效（30 分钟），用于 API 鉴权
 * - Refresh Token: 长期有效（7 天），用于自动续期
 * - 401 时由 api.ts 拦截器自动刷新，无需用户感知
 */

import { create } from 'zustand';
import { authApi } from '@/services/api';
import type { User, LoginFormData, RegisterFormData } from '@/types';

interface AuthState {
  // 状态
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // 方法
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => void;
  refreshTokens: (newToken: string, newRefreshToken: string) => void;
  fetchUser: () => Promise<void>;
  clearError: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refresh_token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  /** 初始化 - 检查本地 token */
  init: () => {
    const token = localStorage.getItem('token');
    if (token) {
      set({ token, refreshToken: localStorage.getItem('refresh_token'), isAuthenticated: true });
      get().fetchUser();
    }
  },

  /** 登录 */
  login: async (data: LoginFormData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(data);
      const { token, refresh_token, id, username, email } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refresh_token', refresh_token);
      set({
        token,
        refreshToken: refresh_token,
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
      const { token, refresh_token, id, username, email } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refresh_token', refresh_token);
      set({
        token,
        refreshToken: refresh_token,
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
    localStorage.removeItem('refresh_token');
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false, error: null });
    window.location.href = '/auth';
  },

  /** 刷新 Token（供 api.ts 拦截器调用） */
  refreshTokens: (newToken: string, newRefreshToken: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('refresh_token', newRefreshToken);
    set({ token: newToken, refreshToken: newRefreshToken });
  },

  /** 获取当前用户信息 */
  fetchUser: async () => {
    try {
      const response = await authApi.getMe();
      set({ user: response.data, isAuthenticated: true });
    } catch {
      // Token 无效，清除状态
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    }
  },

  /** 清除错误 */
  clearError: () => set({ error: null }),
}));
