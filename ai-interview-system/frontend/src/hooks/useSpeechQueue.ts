/**
 * 语音队列管理 Hook
 * 
 * 功能:
 * - 多段文字排队播放(适用于SSE流式文本)
 * - 智能分句(按中文标点分割)
 * - 打断机制
 * - 流式文本缓冲
 * - 播放状态管理
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceOutput } from './useVoiceOutput';

// ============ 类型定义 ============

export interface SpeechQueueItem {
  id: string;
  text: string;
  priority: 'high' | 'normal'; // high 为完整句子，normal 为流中间结果
  addedAt: number;
}

export interface SpeechQueueState {
  isPlaying: boolean;
  queueLength: number;
  bufferText: string;
  currentPlayingText: string;
  isStreaming: boolean;
}

export interface UseSpeechQueueReturn extends SpeechQueueState {
  /** 处理 SSE 流式文本块 */
  handleStreamChunk: (chunk: string) => void;
  /** SSE 流结束，处理剩余缓冲区 */
  handleStreamEnd: () => void;
  /** 开始新的流式会话 */
  startStream: () => void;
  /** 用户打断 */
  interrupt: () => void;
  /** 直接播放文本 */
  speakImmediately: (text: string, onEnd?: () => void) => void;
}

// 句子结束标点的正则表达式
const SENTENCE_END_REGEX = /[。！？；.!?;:]/;

/**
 * 生成唯一ID
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 语音队列管理 Hook
 * 将 SSE 流式文本转换为流畅的语音播报
 */
export function useSpeechQueue(): UseSpeechQueueReturn {
  // ============ 内部状态 ============
  const [state, setState] = useState<SpeechQueueState>({
    isPlaying: false,
    queueLength: 0,
    bufferText: '',
    currentPlayingText: '',
    isStreaming: false,
  });

  // ============ 语音输出 ============
  const {
    speak,
    stop,
    isPlaying: voiceIsPlaying,
    currentText: voiceCurrentText,
  } = useVoiceOutput({ rate: 1.1 });

  // ============ Refs ============
  const bufferRef = useRef('');           // 文本缓冲区
  const isStreamingRef = useRef(false);   // 是否正在接收流
  const queueRef = useRef<SpeechQueueItem[]>([]);
  const playedRef = useRef<Set<string>>(new Set()); // 已播放的文本去重

  // ============ 同步状态 ============

  useEffect(() => {
    setState((s) => ({
      ...s,
      isPlaying: voiceIsPlaying,
      currentPlayingText: voiceCurrentText,
    }));
  }, [voiceIsPlaying, voiceCurrentText]);

  // ============ 内部方法 ============

  /** 播放文本并添加到队列记录 */
  const speakText = useCallback((text: string, priority: 'high' | 'normal' = 'normal', onEnd?: () => void) => {
    const trimmed = text.trim();
    if (!trimmed || playedRef.current.has(trimmed)) return;

    playedRef.current.add(trimmed);
    
    const id = generateId();
    queueRef.current.push({ id, text: trimmed, priority, addedAt: Date.now() });
    
    // 限制队列长度，避免无限增长
    if (queueRef.current.length > 50) {
      queueRef.current = queueRef.current.slice(-30);
    }

    setState((s) => ({ ...s, queueLength: queueRef.current.length }));
    speak(trimmed, onEnd);
  }, [speak]);

  /** 处理缓冲区中的完整句子 */
  const processBuffer = useCallback(() => {
    let buffer = bufferRef.current;
    let hasProcessed = false;

    // 循环处理缓冲区中的完整句子
    while (true) {
      const matchIndex = buffer.search(SENTENCE_END_REGEX);
      if (matchIndex === -1) break;

      // 提取包含标点的完整句子
      const sentence = buffer.slice(0, matchIndex + 1).trim();
      buffer = buffer.slice(matchIndex + 1);

      if (sentence.length > 0) {
        speakText(sentence, 'high');
        hasProcessed = true;
      }

      // 安全限制：避免单次处理过多句子
      if (buffer.length > 5000) {
        buffer = buffer.slice(-2000);
        break;
      }
    }

    bufferRef.current = buffer;
    return hasProcessed;
  }, [speakText]);

  // ============ 对外接口 ============

  /** 处理 SSE 流式文本块 */
  const handleStreamChunk = useCallback((chunk: string) => {
    if (!chunk || !isStreamingRef.current) return;

    bufferRef.current += chunk;
    processBuffer();

    setState((s) => ({
      ...s,
      bufferText: bufferRef.current,
      isStreaming: true,
    }));
  }, [processBuffer]);

  /** SSE 流结束，处理剩余缓冲区 */
  const handleStreamEnd = useCallback(() => {
    isStreamingRef.current = false;

    const remaining = bufferRef.current.trim();
    if (remaining.length > 0) {
      speakText(remaining, 'high');
    }

    bufferRef.current = '';

    setState((s) => ({
      ...s,
      bufferText: '',
      isStreaming: false,
    }));
  }, [speakText]);

  /** 开始新的流式会话 */
  const startStream = useCallback(() => {
    // 停止之前的播放并清空队列
    stop();
    bufferRef.current = '';
    isStreamingRef.current = true;
    playedRef.current.clear();
    queueRef.current = [];

    setState({
      isPlaying: false,
      queueLength: 0,
      bufferText: '',
      currentPlayingText: '',
      isStreaming: true,
    });
  }, [stop]);

  /** 用户打断 */
  const interrupt = useCallback(() => {
    stop();
    bufferRef.current = '';
    isStreamingRef.current = false;
    queueRef.current = [];
    playedRef.current.clear();

    setState((s) => ({
      ...s,
      isPlaying: false,
      queueLength: 0,
      bufferText: '',
      currentPlayingText: '',
      isStreaming: false,
    }));
  }, [stop]);

  /** 直接播放文本（非流式） */
  const speakImmediately = useCallback((text: string, onEnd?: () => void) => {
    if (!text.trim()) return;
    speakText(text, 'high', onEnd);
  }, [speakText]);

  // ============ 清理 ============

  useEffect(() => {
    return () => {
      stop();
      bufferRef.current = '';
      queueRef.current = [];
    };
  }, [stop]);

  return {
    ...state,
    handleStreamChunk,
    handleStreamEnd,
    startStream,
    interrupt,
    speakImmediately,
  };
}

export default useSpeechQueue;
