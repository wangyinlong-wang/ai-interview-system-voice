/**
 * 语音状态管理 - Zustand Store
 * 
 * 管理语音面试的全局状态:
 * - 面试模式(文字/语音)
 * - 录音/播放状态
 * - 语音设置(音色/语速/音量)
 * - 音频队列
 * - 浏览器兼容性检测
 */

import { create } from 'zustand';

// ============ 类型定义 ============

/** 面试模式 */
export type InterviewMode = 'text' | 'voice';

/** 语音状态 */
export type VoiceStatus = 'idle' | 'recording' | 'processing' | 'playing' | 'error';

/** 音频队列项 */
export interface AudioQueueItem {
  id: string;
  text: string;
  priority: 'high' | 'normal';
  addedAt: number;
}

/** 语音设置 */
export interface VoiceSettings {
  selectedVoice: string;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  autoPlay: boolean;
}

/** 语音状态接口 */
export interface VoiceState extends VoiceSettings {
  // 模式
  mode: InterviewMode;
  isVoiceSupported: boolean;
  
  // 状态
  status: VoiceStatus;
  isRecording: boolean;
  isPlaying: boolean;
  
  // 识别结果
  transcript: string;
  interimTranscript: string;
  
  // 音频队列
  audioQueue: AudioQueueItem[];
  
  // 操作
  setMode: (mode: InterviewMode) => void;
  setStatus: (status: VoiceStatus) => void;
  setRecording: (recording: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setTranscript: (text: string) => void;
  setInterimTranscript: (text: string) => void;
  addToQueue: (item: Omit<AudioQueueItem, 'id' | 'addedAt'>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  setVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  checkSupport: () => boolean;
  reset: () => void;
}

// ============ 工具函数 ============

/** 检测浏览器语音支持 */
const checkVoiceSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hasSTT = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  const hasTTS = 'speechSynthesis' in window;
  return hasSTT && hasTTS;
};

/** 生成唯一ID */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ============ Store 默认值 ============

const defaultSettings: VoiceSettings = {
  selectedVoice: 'default',
  speechRate: 1.0,
  speechPitch: 1.0,
  speechVolume: 1.0,
  autoPlay: true,
};

// ============ Store 创建 ============

export const useVoiceStore = create<VoiceState>((set, get) => ({
  // 初始状态
  mode: 'text',
  isVoiceSupported: checkVoiceSupport(),
  status: 'idle',
  isRecording: false,
  isPlaying: false,
  transcript: '',
  interimTranscript: '',
  audioQueue: [],
  ...defaultSettings,

  // ============ 模式操作 ============

  setMode: (mode) => {
    // 切换到文字模式时，清理语音相关状态
    if (mode === 'text') {
      window.speechSynthesis?.cancel();
    }
    set({
      mode,
      isRecording: false,
      isPlaying: false,
      status: mode === 'voice' ? 'idle' : get().status,
      transcript: '',
      interimTranscript: '',
    });
  },

  // ============ 状态操作 ============

  setStatus: (status) => set({ status }),
  
  setRecording: (recording) => set({ 
    isRecording: recording,
    status: recording ? 'recording' : 'idle',
  }),
  
  setPlaying: (playing) => set({ 
    isPlaying: playing,
    status: playing ? 'playing' : 'idle',
  }),

  // ============ 转写操作 ============

  setTranscript: (text) => set({ transcript: text }),
  
  setInterimTranscript: (text) => set({ interimTranscript: text }),

  // ============ 队列操作 ============

  addToQueue: (item) => {
    const fullItem: AudioQueueItem = {
      ...item,
      id: generateId(),
      addedAt: Date.now(),
    };
    set((state) => ({
      audioQueue: [...state.audioQueue, fullItem],
    }));
  },

  removeFromQueue: (id) =>
    set((state) => ({
      audioQueue: state.audioQueue.filter((item) => item.id !== id),
    })),

  clearQueue: () => {
    window.speechSynthesis?.cancel();
    set({ audioQueue: [], isPlaying: false });
  },

  // ============ 设置操作 ============

  setVoiceSettings: (settings) =>
    set((state) => ({ ...state, ...settings })),

  // ============ 兼容性检测 ============

  checkSupport: () => {
    const supported = checkVoiceSupport();
    set({ isVoiceSupported: supported });
    return supported;
  },

  // ============ 重置 ============

  reset: () => {
    window.speechSynthesis?.cancel();
    set({
      mode: 'text',
      status: 'idle',
      isRecording: false,
      isPlaying: false,
      transcript: '',
      interimTranscript: '',
      audioQueue: [],
      ...defaultSettings,
    });
  },
}));

export default useVoiceStore;
