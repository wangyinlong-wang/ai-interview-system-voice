/**
 * 3D 面对面面试状态管理 - Zustand Store
 * 
 * 管理3D面试房间的全局状态:
 * - 面试官配置（形象/场景）
 * - 动画/表情状态
 * - 用户摄像头
 * - 加载状态
 * - 性能等级
 */

import { create } from 'zustand';

// ============ 类型定义 ============

/** 面试官动画状态 */
export type InterviewerAnimation =
  | 'idle'       // 待机
  | 'greeting'   // 问候
  | 'listening'  // 倾听
  | 'thinking'   // 思考
  | 'speaking'   // 说话
  | 'nodding'    // 点头
  | 'ending';    // 结束

/** 面试官表情 */
export type InterviewerExpression =
  | 'neutral'    // 自然
  | 'smile'      // 微笑
  | 'serious'    // 严肃
  | 'thinking'   // 思考
  | 'surprised'  // 惊讶
  | 'encourage'; // 鼓励

/** 性能等级 */
export type PerformanceTier = 'high' | 'medium' | 'low';

/** 场景类型 */
export type SceneType = 'office' | 'modern';

/** 面试官模型类型 */
export type InterviewerModelType = 'male' | 'female';

/** 面试官配置 */
export interface InterviewerConfig {
  modelType: InterviewerModelType;
  scene: SceneType;
  skin: string;
}

/** 显示设置 */
export interface DisplaySettings {
  showSubtitle: boolean;
  showUserVideo: boolean;
  showStatusIndicator: boolean;
}

/** 3D面试状态 */
export interface FaceToFaceState extends InterviewerConfig, DisplaySettings {
  // 加载状态
  isLoading: boolean;
  loadingProgress: number;
  loadingStage: string;

  // 动画/表情
  currentAnimation: InterviewerAnimation;
  currentExpression: InterviewerExpression;

  // 口型同步
  mouthOpen: number;

  // 用户摄像头
  userCameraEnabled: boolean;
  userStream: MediaStream | null;

  // 性能
  performanceTier: PerformanceTier;
  enableShadows: boolean;
  enablePostProcessing: boolean;

  // 面试状态
  interviewStatus: 'waiting' | 'listening' | 'thinking' | 'speaking' | 'evaluating';

  // 操作
  setLoading: (loading: boolean, progress?: number, stage?: string) => void;
  setInterviewerConfig: (config: Partial<InterviewerConfig>) => void;
  setAnimation: (animation: InterviewerAnimation) => void;
  setExpression: (expression: InterviewerExpression) => void;
  setMouthOpen: (open: number) => void;
  setUserCamera: (enabled: boolean) => void;
  setUserStream: (stream: MediaStream | null) => void;
  setDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  setPerformanceTier: (tier: PerformanceTier) => void;
  setInterviewStatus: (status: FaceToFaceState['interviewStatus']) => void;
  reset: () => void;
}

// ============ 性能等级配置 ============

const performanceConfig: Record<PerformanceTier, {
  enableShadows: boolean;
  enablePostProcessing: boolean;
}> = {
  high: {
    enableShadows: true,
    enablePostProcessing: true,
  },
  medium: {
    enableShadows: true,
    enablePostProcessing: false,
  },
  low: {
    enableShadows: false,
    enablePostProcessing: false,
  },
};

// ============ 动画到面试状态的映射 ============

const animationToStatusMap: Record<InterviewerAnimation, FaceToFaceState['interviewStatus']> = {
  idle: 'waiting',
  greeting: 'speaking',
  listening: 'listening',
  thinking: 'thinking',
  speaking: 'speaking',
  nodding: 'listening',
  ending: 'evaluating',
};

// ============ Store 创建 ============

export const useFaceToFaceStore = create<FaceToFaceState>((set, get) => ({
  // 初始状态
  isLoading: false,
  loadingProgress: 0,
  loadingStage: '',
  modelType: 'male',
  scene: 'office',
  skin: 'default',
  currentAnimation: 'idle',
  currentExpression: 'neutral',
  mouthOpen: 0,
  userCameraEnabled: false,
  userStream: null,
  performanceTier: 'high',
  enableShadows: true,
  enablePostProcessing: true,
  showSubtitle: true,
  showUserVideo: true,
  showStatusIndicator: true,
  interviewStatus: 'waiting',

  // ============ 加载状态 ============

  setLoading: (loading, progress = 0, stage = '') =>
    set({
      isLoading: loading,
      loadingProgress: progress,
      loadingStage: stage,
    }),

  // ============ 面试官配置 ============

  setInterviewerConfig: (config) =>
    set((state) => ({ ...state, ...config })),

  // ============ 动画/表情 ============

  setAnimation: (animation) => {
    const status = animationToStatusMap[animation] || get().interviewStatus;
    set({
      currentAnimation: animation,
      interviewStatus: status,
    });
  },

  setExpression: (expression) => set({ currentExpression: expression }),

  setMouthOpen: (open) => set({ mouthOpen: Math.max(0, Math.min(1, open)) }),

  // ============ 用户摄像头 ============

  setUserCamera: (enabled) => set({ userCameraEnabled: enabled }),

  setUserStream: (stream) => set({ userStream: stream }),

  // ============ 显示设置 ============

  setDisplaySettings: (settings) =>
    set((state) => ({ ...state, ...settings })),

  // ============ 性能等级 ============

  setPerformanceTier: (tier) => {
    const config = performanceConfig[tier];
    set({
      performanceTier: tier,
      enableShadows: config.enableShadows,
      enablePostProcessing: config.enablePostProcessing,
    });
  },

  // ============ 面试状态 ============

  setInterviewStatus: (status) => set({ interviewStatus: status }),

  // ============ 重置 ============

  reset: () => {
    const state = get();
    // 关闭摄像头
    if (state.userStream) {
      state.userStream.getTracks().forEach((track) => track.stop());
    }
    set({
      isLoading: false,
      loadingProgress: 0,
      loadingStage: '',
      currentAnimation: 'idle',
      currentExpression: 'neutral',
      mouthOpen: 0,
      userCameraEnabled: false,
      userStream: null,
      interviewStatus: 'waiting',
    });
  },
}));

export default useFaceToFaceStore;
