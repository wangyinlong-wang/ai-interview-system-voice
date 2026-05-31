/**
 * 语音输出 Hook - 基于 Web Speech API speechSynthesis
 * 
 * 功能:
 * - 语音播报(TTS)
 * - 音色选择(支持中文男声/女声)
 * - 语速控制(0.5-1.5)
 * - 播放/暂停/停止
 * - 播报完成回调
 * - 浏览器兼容性检测
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============ 类型定义 ============

export type TTSError = 'synthesis-failed' | 'voice-unavailable' | 'cancelled' | 'interrupted' | null;

export interface VoiceOption {
  name: string;
  voice: SpeechSynthesisVoice;
  lang: string;
  gender: 'male' | 'female' | 'unknown';
  default?: boolean;
}

export interface VoiceOutputState {
  isPlaying: boolean;
  isPaused: boolean;
  isSupported: boolean;
  currentText: string;
  queueLength: number;
  error: TTSError;
  errorMessage: string;
  rate: number;
  pitch: number;
  volume: number;
  selectedVoice: SpeechSynthesisVoice | null;
  voices: VoiceOption[];
}

export interface UseVoiceOutputReturn extends VoiceOutputState {
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
  refreshVoices: () => void;
  isChineseVoice: (voice: SpeechSynthesisVoice) => boolean;
}

// ============ 工具函数 ============

/** 检测浏览器是否支持 TTS */
const isTTSSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

/** 判断是否为中文语音 */
const isChineseVoice = (voice: SpeechSynthesisVoice): boolean => {
  return voice.lang.startsWith('zh') || voice.lang.startsWith('cmn');
};

/** 猜测语音性别（基于名称启发式） */
const guessGender = (voice: SpeechSynthesisVoice): 'male' | 'female' | 'unknown' => {
  const name = voice.name.toLowerCase();
  if (name.includes('female') || name.includes('woman') || name.includes('女') || name.includes('xiaoyan') || name.includes('xiaoxiao')) {
    return 'female';
  }
  if (name.includes('male') || name.includes('man') || name.includes('男') || name.includes('yunyang') || name.includes('yunjian')) {
    return 'male';
  }
  // 默认根据一些常见中文 TTS 名称判断
  const femaleNames = ['xiaoyan', 'xiaoxiao', 'xiaoyi', 'xiaomeng', 'lulu', 'huihui'];
  const maleNames = ['yunyang', 'yunjian', 'yunyang', 'kangkang'];
  if (femaleNames.some(n => name.includes(n))) return 'female';
  if (maleNames.some(n => name.includes(n))) return 'male';
  return 'unknown';
};

/** 按优先级排序中文语音 */
const sortChineseVoices = (voices: SpeechSynthesisVoice[]): VoiceOption[] => {
  const options = voices
    .filter(isChineseVoice)
    .map((voice, index) => ({
      name: voice.name,
      voice,
      lang: voice.lang,
      gender: guessGender(voice),
      default: index === 0, // 第一个设为默认
    }));
  
  // 排序: 默认/本地语音优先
  return options.sort((a, b) => {
    if (a.voice.localService && !b.voice.localService) return -1;
    if (!a.voice.localService && b.voice.localService) return 1;
    return 0;
  });
};

/**
 * 语音输出 Hook
 * @param options - 默认配置
 */
export function useVoiceOutput(options?: {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}): UseVoiceOutputReturn {
  // ============ 状态 ============
  const [state, setState] = useState<VoiceOutputState>({
    isPlaying: false,
    isPaused: false,
    isSupported: isTTSSupported(),
    currentText: '',
    queueLength: 0,
    error: null,
    errorMessage: '',
    rate: options?.rate ?? 1.0,
    pitch: options?.pitch ?? 1.0,
    volume: options?.volume ?? 1.0,
    selectedVoice: options?.voice ?? null,
    voices: [],
  });

  // ============ Refs ============
  const utteranceQueueRef = useRef<Array<{ text: string; onEnd?: () => void }>>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentOnEndRef = useRef<(() => void) | undefined>(undefined);
  const isProcessingRef = useRef(false);
  const rateRef = useRef(state.rate);
  const pitchRef = useRef(state.pitch);
  const volumeRef = useRef(state.volume);
  const voiceRef = useRef(state.selectedVoice);

  // 同步 Refs
  useEffect(() => { rateRef.current = state.rate; }, [state.rate]);
  useEffect(() => { pitchRef.current = state.pitch; }, [state.pitch]);
  useEffect(() => { volumeRef.current = state.volume; }, [state.volume]);
  useEffect(() => { voiceRef.current = state.selectedVoice; }, [state.selectedVoice]);

  // ============ 语音列表加载 ============

  const refreshVoices = useCallback(() => {
    if (!isTTSSupported()) return;
    
    const synthVoices = window.speechSynthesis.getVoices();
    if (synthVoices.length === 0) return;

    const sortedVoices = sortChineseVoices(synthVoices);
    
    setState((s) => {
      // 如果没有选中语音，自动选择第一个
      const selectedVoice = s.selectedVoice || (sortedVoices[0]?.voice ?? null);
      return {
        ...s,
        voices: sortedVoices,
        selectedVoice,
      };
    });
  }, []);

  // 初始化加载语音列表
  useEffect(() => {
    if (!isTTSSupported()) return;

    // Chrome 需要等待 voiceschanged 事件
    const handleVoicesChanged = () => {
      refreshVoices();
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    
    // 立即尝试加载（某些浏览器可能已经有数据）
    refreshVoices();

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, [refreshVoices]);

  // ============ 队列处理 ============

  /** 处理播放队列 */
  const processQueue = useCallback(() => {
    if (isProcessingRef.current) return;
    
    const queue = utteranceQueueRef.current;
    if (queue.length === 0) {
      setState((s) => ({ ...s, isPlaying: false, currentText: '', queueLength: 0 }));
      return;
    }

    isProcessingRef.current = true;
    const { text, onEnd } = queue.shift()!;
    currentOnEndRef.current = onEnd;

    setState((s) => ({
      ...s,
      isPlaying: true,
      isPaused: false,
      currentText: text,
      queueLength: queue.length,
    }));

    // 创建 utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rateRef.current;
    utterance.pitch = pitchRef.current;
    utterance.volume = volumeRef.current;
    
    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }

    // 事件处理
    utterance.onend = () => {
      isProcessingRef.current = false;
      currentUtteranceRef.current = null;
      currentOnEndRef.current?.();
      currentOnEndRef.current = undefined;
      processQueue(); // 播放下一个
    };

    utterance.onerror = (event) => {
      if (event.error === 'canceled' || event.error === 'interrupted') {
        // 被主动取消，不视为错误
        isProcessingRef.current = false;
        currentUtteranceRef.current = null;
        processQueue();
        return;
      }

      const errorMsg = event.error as string;
      setState((s) => ({
        ...s,
        error: errorMsg as TTSError,
        errorMessage: `TTS 错误: ${errorMsg}`,
      }));

      isProcessingRef.current = false;
      currentUtteranceRef.current = null;
      processQueue();
    };

    utterance.onpause = () => {
      setState((s) => ({ ...s, isPaused: true }));
    };

    utterance.onresume = () => {
      setState((s) => ({ ...s, isPaused: false }));
    };

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  // ============ 对外接口 ============

  /** 添加文本到播放队列 */
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!state.isSupported || !text.trim()) return;

    // 将长文本按句子分割，避免单次合成过长
    const sentenceRegex = /([。！？；.!?;:，,])/g;
    const parts = text.split(sentenceRegex).filter(Boolean);
    
    const sentences: string[] = [];
    let currentSentence = '';
    
    for (let i = 0; i < parts.length; i++) {
      currentSentence += parts[i];
      // 如果遇到标点符号（奇数索引是分隔符）
      if (i % 2 === 1) {
        sentences.push(currentSentence.trim());
        currentSentence = '';
      }
    }
    if (currentSentence.trim()) {
      sentences.push(currentSentence.trim());
    }

    // 如果没有分割成功，整个文本作为一句
    const finalSentences = sentences.length > 0 ? sentences : [text.trim()];

    // 过滤空句子后添加到队列
    const validSentences = finalSentences.filter(s => s.length > 0);
    if (validSentences.length === 0) return;

    // 第一句使用传入的 onEnd，其余使用 undefined
    validSentences.forEach((sentence, index) => {
      utteranceQueueRef.current.push({
        text: sentence,
        onEnd: index === validSentences.length - 1 ? onEnd : undefined,
      });
    });

    setState((s) => ({ ...s, queueLength: utteranceQueueRef.current.length }));
    processQueue();
  }, [state.isSupported, processQueue]);

  /** 打断当前播放 */
  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    utteranceQueueRef.current = [];
    isProcessingRef.current = false;
    currentUtteranceRef.current = null;
    currentOnEndRef.current = undefined;
    setState((s) => ({ 
      ...s, 
      isPlaying: false, 
      isPaused: false,
      currentText: '', 
      queueLength: 0 
    }));
  }, []);

  /** 暂停播放 */
  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setState((s) => ({ ...s, isPaused: true }));
  }, []);

  /** 恢复播放 */
  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setState((s) => ({ ...s, isPaused: false }));
  }, []);

  /** 设置语速 */
  const setRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.5, Math.min(1.5, rate));
    setState((s) => ({ ...s, rate: clampedRate }));
  }, []);

  /** 设置音调 */
  const setPitch = useCallback((pitch: number) => {
    const clampedPitch = Math.max(0.5, Math.min(2.0, pitch));
    setState((s) => ({ ...s, pitch: clampedPitch }));
  }, []);

  /** 设置音量 */
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setState((s) => ({ ...s, volume: clampedVolume }));
  }, []);

  /** 设置语音 */
  const setVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    setState((s) => ({ ...s, selectedVoice: voice }));
  }, []);

  // ============ 清理 ============

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      utteranceQueueRef.current = [];
    };
  }, []);

  // Chrome bug 修复: 定时器防止 speechSynthesis 自动暂停
  useEffect(() => {
    if (!state.isPlaying) return;
    
    const interval = setInterval(() => {
      // 保持 speechSynthesis 活跃
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [state.isPlaying]);

  return {
    ...state,
    speak,
    stop,
    pause,
    resume,
    setRate,
    setPitch,
    setVolume,
    setVoice,
    refreshVoices,
    isChineseVoice,
  };
}

export default useVoiceOutput;
