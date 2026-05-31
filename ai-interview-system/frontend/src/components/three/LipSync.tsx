/**
 * 口型同步 Hook 组件
 * 
 * 基于 TTS 播放的文字字数和进度驱动嘴部开合
 * - 元音字对应 mouthOpen=1
 * - 辅音对应 mouthOpen=0.3-0.7
 * - 随机交替嘴型，模拟自然说话
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ============ 类型定义 ============

export interface LipSyncState {
  /** 嘴部开合度 (0-1) */
  mouthOpen: number;
  /** 当前口型类型 */
  currentViseme: VisemeType;
  /** 是否正在说话 */
  isSpeaking: boolean;
}

/** 口型类型 */
export type VisemeType =
  | 'silence'   // 静音
  | 'A'         // 啊 - 嘴巴大张
  | 'E'         // 噫 - 嘴角咧开
  | 'I'         // 咿 - 嘴角微张
  | 'O'         // 哦 - 嘴巴圆张
  | 'U'         // 呜 - 嘴巴收圆
  | 'M'         // 闭口
  | 'F';        // 唇齿接触

/** 汉字到口型的映射表 */
const CHAR_TO_LIP_MAP: Record<string, VisemeType> = {
  // 啊类（开口音）
  '啊': 'A', '阿': 'A', '巴': 'A', '妈': 'A', '他': 'A', '大': 'A', '打': 'A',
  '沙': 'A', '啦': 'A', '哈': 'A', '查': 'A', '杀': 'A', '发': 'A',
  // 噫类（咧口音）
  '诶': 'E', '也': 'E', '的': 'E', '了': 'E', '得': 'E', '别': 'E', '些': 'E',
  '天': 'E', '年': 'E', '前': 'E', '面': 'E', '点': 'E',
  // 咿类（微口音）
  '一': 'I', '以': 'I', '你': 'I', '里': 'I', '比': 'I', '地': 'I', '机': 'I',
  '十': 'I', '几': 'I', '力': 'I', '起': 'I', '心': 'I', '因': 'I',
  // 哦类（圆口音）
  '哦': 'O', '我': 'O', '多': 'O', '说': 'O', '过': 'O', '所': 'O', '果': 'O',
  '波': 'O', '活': 'O', '国': 'O', '着': 'O', '可': 'O',
  // 呜类（收口音）
  '呜': 'U', '不': 'U', '出': 'U', '路': 'U', '书': 'U', '读': 'U', '如': 'U',
  '图': 'U', '无': 'U', '数': 'U', '务': 'U', '服': 'U',
  // 闭口
  '嗯': 'M', '么': 'M', '吗': 'M', '嘛': 'M', '门': 'M', '名': 'M', '民': 'M',
  // 唇齿接触
  '飞': 'F', '非': 'F', '费': 'F', '分': 'F', '风': 'F', '方': 'F',
};

/** 口型对应的开合度 */
const VISEME_OPEN_MAP: Record<VisemeType, number> = {
  silence: 0,
  A: 0.85,
  E: 0.6,
  I: 0.45,
  O: 0.7,
  U: 0.5,
  M: 0.1,
  F: 0.25,
};

/**
 * 口型同步 Hook
 * @param text - 当前播报的文字
 * @param isPlaying - 是否正在播报
 * @param duration - 预估播报时长(ms)
 */
export function useLipSync(
  text: string,
  isPlaying: boolean,
  duration: number = 0
): LipSyncState {
  const [state, setState] = useState<LipSyncState>({
    mouthOpen: 0,
    currentViseme: 'silence',
    isSpeaking: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const textRef = useRef(text);
  const durationRef = useRef(duration);

  // 同步 refs
  textRef.current = text;
  durationRef.current = duration;

  /** 获取当前字符对应的口型 */
  const getVisemeForChar = useCallback((char: string): VisemeType => {
    return CHAR_TO_LIP_MAP[char] || 'A';
  }, []);

  /** 计算当前播报进度对应的口型 */
  const updateLipSync = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const currentDuration = durationRef.current;

    if (currentDuration <= 0) return;

    const progress = Math.min(elapsed / currentDuration, 1);
    const currentText = textRef.current;

    if (progress >= 1 || !currentText) {
      setState({
        mouthOpen: 0,
        currentViseme: 'silence',
        isSpeaking: false,
      });
      return;
    }

    // 计算当前字符位置
    const charIndex = Math.floor(progress * currentText.length);
    const currentChar = currentText[charIndex] || '';
    const nextChar = currentText[charIndex + 1] || '';

    // 获取口型
    const viseme = getVisemeForChar(currentChar);
    const baseOpen = VISEME_OPEN_MAP[viseme];

    // 添加自然波动
    const wave = Math.sin(Date.now() * 0.02) * 0.1;
    const mouthOpen = Math.max(0.05, Math.min(0.95, baseOpen + wave));

    setState({
      mouthOpen,
      currentViseme: viseme,
      isSpeaking: true,
    });
  }, [getVisemeForChar]);

  // ============ 监听播放状态 ============

  useEffect(() => {
    if (isPlaying && text) {
      // 开始口型同步
      startTimeRef.current = Date.now();

      // 估算播报时长（中文约 250ms/字）
      const estimatedDuration = duration || text.length * 250;
      durationRef.current = estimatedDuration;

      setState((s) => ({ ...s, isSpeaking: true }));

      // 高频率更新口型
      intervalRef.current = setInterval(updateLipSync, 60);
    } else {
      // 停止口型同步
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setState({
        mouthOpen: 0,
        currentViseme: 'silence',
        isSpeaking: false,
      });
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, text, duration, updateLipSync]);

  return state;
}

/**
 * 口型同步组件 - 将口型状态应用到3D面试官
 * 作为 Interviewer3D 的包装器使用
 */
export interface LipSyncControllerProps {
  /** 是否正在播报 */
  isPlaying: boolean;
  /** 播报文字 */
  text: string;
  /** 预估播报时长 */
  duration?: number;
  /** 口型变更回调 */
  onLipSyncChange?: (mouthOpen: number) => void;
}

export function LipSyncController({
  isPlaying,
  text,
  duration,
  onLipSyncChange,
}: LipSyncControllerProps) {
  const { mouthOpen } = useLipSync(text, isPlaying, duration);

  useEffect(() => {
    onLipSyncChange?.(mouthOpen);
  }, [mouthOpen, onLipSyncChange]);

  return null; // 此组件不渲染任何DOM，只控制口型
}

export default useLipSync;
