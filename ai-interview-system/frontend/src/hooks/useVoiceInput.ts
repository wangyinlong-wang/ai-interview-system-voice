/**
 * 语音输入 Hook - 基于 Web Speech API
 * 
 * 功能:
 * - 开始/停止录音
 * - 实时转写结果(interim + final)
 * - 3秒静默检测自动结束
 * - 错误处理(no-speech, not-allowed等)
 * - 浏览器兼容性检测
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============ 类型定义 ============

export type VoiceInputError = 
  | 'no-speech' 
  | 'audio-capture' 
  | 'not-allowed' 
  | 'network' 
  | 'aborted' 
  | 'unknown' 
  | null;

export interface VoiceInputState {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  error: VoiceInputError;
  errorMessage: string;
  isSupported: boolean;
  isListening: boolean; // 录音中但未检测到语音
}

export interface UseVoiceInputReturn extends VoiceInputState {
  startRecording: () => void;
  stopRecording: () => void;
  resetTranscript: () => void;
  resetError: () => void;
  checkSupport: () => boolean;
}

// 浏览器兼容性检测
const checkSpeechRecognitionSupport = (): boolean => {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
};

// 全局类型声明
// 扩展 Window 接口以支持 Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// 静音超时时间(ms)
const SILENCE_TIMEOUT = 3000;

/**
 * 语音输入 Hook
 * @param onFinalResult - 识别完成回调，返回最终文字
 * @param onError - 错误回调
 */
export function useVoiceInput(
  onFinalResult?: (transcript: string) => void,
  onError?: (error: VoiceInputError, message: string) => void
): UseVoiceInputReturn {
  // ============ 状态 ============
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    errorMessage: '',
    isSupported: checkSpeechRecognitionSupport(),
    isListening: false,
  });

  // ============ Refs ============
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef('');
  const isRecordingRef = useRef(false);

  // 同步 isRecording ref
  isRecordingRef.current = state.isRecording;

  // ============ 工具函数 ============

  /** 获取错误提示信息 */
  const getErrorMessage = useCallback((error: VoiceInputError): string => {
    switch (error) {
      case 'no-speech':
        return '未检测到语音，请重试';
      case 'audio-capture':
        return '无法访问麦克风，请检查设备';
      case 'not-allowed':
        return '麦克风权限被拒绝，请在浏览器设置中开启';
      case 'network':
        return '网络错误，语音识别服务暂不可用';
      case 'aborted':
        return '语音识别已取消';
      default:
        return '语音识别发生错误';
    }
  }, []);

  /** 清理静默检测定时器 */
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  /** 重置静默检测定时器 */
  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      // 静默3秒，自动停止录音
      if (isRecordingRef.current && finalTranscriptRef.current.trim().length > 0) {
        stopRecordingInternal();
      }
    }, SILENCE_TIMEOUT);
  }, [clearSilenceTimer]);

  /** 内部停止录音（不通过 setState 回调） */
  const stopRecordingInternal = useCallback(() => {
    clearSilenceTimer();
    recognitionRef.current?.stop();
    setState((s) => ({ ...s, isRecording: false, isListening: false }));
    
    // 如果有识别结果，触发回调
    const finalText = finalTranscriptRef.current.trim();
    if (finalText && onFinalResult) {
      onFinalResult(finalText);
    }
  }, [clearSilenceTimer, onFinalResult]);

  // ============ 对外接口 ============

  /** 开始录音 */
  const startRecording = useCallback(() => {
    if (!state.isSupported) {
      const error: VoiceInputError = 'unknown';
      const message = '当前浏览器不支持语音识别';
      setState((s) => ({ ...s, error, errorMessage: message }));
      onError?.(error, message);
      return;
    }

    // 如果正在录音，先停止
    if (isRecordingRef.current) {
      stopRecordingInternal();
      return;
    }

    // 重置状态
    finalTranscriptRef.current = '';
    clearSilenceTimer();

    try {
      // 创建 SpeechRecognition 实例
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionAPI();

      recognition.lang = 'zh-CN';           // 设置中文识别
      recognition.continuous = true;         // 持续识别
      recognition.interimResults = true;     // 返回临时结果
      recognition.maxAlternatives = 1;

      // ============ 事件处理 ============

      recognition.onstart = () => {
        setState((s) => ({ 
          ...s, 
          isRecording: true, 
          error: null, 
          errorMessage: '', 
          transcript: '',
          interimTranscript: '',
          isListening: true,
        }));
        // 启动后也开始静默检测
        silenceTimerRef.current = setTimeout(() => {
          // 初始静默检测 - 3秒内没有声音则提示
          if (isRecordingRef.current && finalTranscriptRef.current.trim().length === 0) {
            setState((s) => ({ ...s, isListening: false }));
          }
        }, SILENCE_TIMEOUT);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        resetSilenceTimer();
        
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        // 累积最终结果
        if (final) {
          finalTranscriptRef.current += final;
        }

        setState((s) => ({
          ...s,
          transcript: finalTranscriptRef.current,
          interimTranscript: interim,
          isListening: false,
        }));
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorType = event.error as VoiceInputError;
        const message = getErrorMessage(errorType);
        
        // 不处理 aborted 错误（这是正常停止）
        if (event.error === 'aborted') {
          return;
        }

        setState((s) => ({
          ...s,
          error: errorType,
          errorMessage: message,
          isRecording: false,
          isListening: false,
        }));

        onError?.(errorType, message);
        clearSilenceTimer();
      };

      recognition.onend = () => {
        // 仅在非正常结束时处理（如被浏览器自动停止）
        if (isRecordingRef.current) {
          setState((s) => ({
            ...s,
            isRecording: false,
            interimTranscript: '',
            isListening: false,
          }));

          const finalText = finalTranscriptRef.current.trim();
          if (finalText && onFinalResult) {
            onFinalResult(finalText);
          }
        }
        clearSilenceTimer();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      const message = '启动语音识别失败';
      setState((s) => ({ 
        ...s, 
        error: 'unknown', 
        errorMessage: message,
        isRecording: false,
        isListening: false,
      }));
      onError?.('unknown', message);
    }
  }, [state.isSupported, clearSilenceTimer, resetSilenceTimer, stopRecordingInternal, getErrorMessage, onFinalResult, onError]);

  /** 停止录音 */
  const stopRecording = useCallback(() => {
    stopRecordingInternal();
  }, [stopRecordingInternal]);

  /** 重置转写结果 */
  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setState((s) => ({ ...s, transcript: '', interimTranscript: '' }));
  }, []);

  /** 重置错误 */
  const resetError = useCallback(() => {
    setState((s) => ({ ...s, error: null, errorMessage: '' }));
  }, []);

  /** 检测浏览器支持 */
  const checkSupport = useCallback((): boolean => {
    const supported = checkSpeechRecognitionSupport();
    setState((s) => ({ ...s, isSupported: supported }));
    return supported;
  }, []);

  // ============ 清理 ============

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      recognitionRef.current?.abort();
    };
  }, [clearSilenceTimer]);

  return {
    ...state,
    startRecording,
    stopRecording,
    resetTranscript,
    resetError,
    checkSupport,
  };
}

export default useVoiceInput;
