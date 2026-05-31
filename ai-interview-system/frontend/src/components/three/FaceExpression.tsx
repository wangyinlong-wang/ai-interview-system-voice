/**
 * 表情控制器组件
 * 
 * 功能:
 * - 微笑/严肃/思考/点头/惊讶等表情切换
 * - 表情过渡动画
 * - 基于内容自动推断表情
 * - 表情状态机管理
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============ 类型定义 ============

export type Expression = 
  | 'neutral'   // 自然
  | 'smile'     // 微笑
  | 'serious'   // 严肃
  | 'thinking'  // 思考
  | 'surprised' // 惊讶
  | 'encourage'; // 鼓励

export interface FaceExpressionState {
  expression: Expression;
  /** 表情过渡进度 (0-1) */
  transitionProgress: number;
  /** 是否正在过渡 */
  isTransitioning: boolean;
}

/** 表情配置 */
export const expressionConfig: Record<Expression, {
  eyebrowY: number;
  eyebrowAngle: number;
  mouthScaleY: number;
  mouthScaleX: number;
  eyeScaleY: number;
  headTilt: number;
}> = {
  neutral: {
    eyebrowY: 0,
    eyebrowAngle: 0,
    mouthScaleY: 1,
    mouthScaleX: 1,
    eyeScaleY: 1,
    headTilt: 0,
  },
  smile: {
    eyebrowY: 0.02,
    eyebrowAngle: -0.1,
    mouthScaleY: 0.4,
    mouthScaleX: 1.4,
    eyeScaleY: 0.9,
    headTilt: 0,
  },
  serious: {
    eyebrowY: -0.01,
    eyebrowAngle: 0.15,
    mouthScaleY: 0.3,
    mouthScaleX: 1,
    eyeScaleY: 1,
    headTilt: 0.02,
  },
  thinking: {
    eyebrowY: 0.04,
    eyebrowAngle: 0.2,
    mouthScaleY: 0.5,
    mouthScaleX: 0.8,
    eyeScaleY: 0.85,
    headTilt: 0.05,
  },
  surprised: {
    eyebrowY: 0.06,
    eyebrowAngle: 0,
    mouthScaleY: 0.7,
    mouthScaleX: 0.9,
    eyeScaleY: 1.15,
    headTilt: -0.03,
  },
  encourage: {
    eyebrowY: 0.01,
    eyebrowAngle: -0.05,
    mouthScaleY: 0.5,
    mouthScaleX: 1.2,
    eyeScaleY: 0.95,
    headTilt: -0.02,
  },
};

/**
 * 表情关键词映射
 * 用于根据AI回复内容自动推断表情
 */
const expressionKeywords: Record<Expression, string[]> = {
  smile: ['很好', '不错', '优秀', '出色', '赞', '厉害', '完美', '太棒了', '恭喜'],
  serious: ['注意', '重要', '关键', '必须', '需要', '问题', '错误', '缺陷'],
  thinking: ['思考', '考虑', '深入', '原理', '为什么', '如何', '分析'],
  surprised: ['惊讶', '没想到', '居然', '竟然', '太厉害了', '不可思议'],
  encourage: ['加油', '相信', '努力', '进步', '潜力', '继续', '别灰心'],
  neutral: [],
};

// ============ Hook ============

/**
 * 表情状态机 Hook
 * 管理3D面试官的表情状态
 */
export function useFaceExpression(defaultExpression: Expression = 'neutral') {
  const [state, setState] = useState<FaceExpressionState>({
    expression: defaultExpression,
    transitionProgress: 1,
    isTransitioning: false,
  });

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentExpressionRef = useRef(defaultExpression);

  // 同步 ref
  currentExpressionRef.current = state.expression;

  /**
   * 设置表情
   * @param expression 目标表情
   * @param duration 过渡时长(ms)
   */
  const setExpression = useCallback((expression: Expression, duration: number = 300) => {
    // 如果表情相同，不执行过渡
    if (expression === currentExpressionRef.current) return;

    // 清除之前的定时器
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }

    setState((prev) => ({
      ...prev,
      isTransitioning: true,
      transitionProgress: 0,
    }));

    // 执行过渡
    const startTime = Date.now();
    const transitionInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1) {
        clearInterval(transitionInterval);
        setState({
          expression,
          transitionProgress: 1,
          isTransitioning: false,
        });
      } else {
        setState((prev) => ({
          ...prev,
          transitionProgress: progress,
        }));
      }
    }, 16); // ~60fps

    // 保存定时器引用以便清理
    transitionTimerRef.current = setTimeout(() => {
      clearInterval(transitionInterval);
    }, duration + 50);

    // 立即更新目标表情
    setState((prev) => ({
      ...prev,
      expression,
      isTransitioning: true,
    }));
  }, []);

  /**
   * 根据内容自动推断表情
   */
  const inferExpression = useCallback((content: string): Expression => {
    const lowerContent = content.toLowerCase();
    
    // 计算每种表情的匹配分数
    const scores: Record<string, number> = {};
    
    for (const [expr, keywords] of Object.entries(expressionKeywords)) {
      scores[expr] = keywords.reduce((score, keyword) => {
        return lowerContent.includes(keyword.toLowerCase()) ? score + 1 : score;
      }, 0);
    }

    // 找出最高分
    let bestExpression: Expression = 'neutral';
    let bestScore = 0;

    for (const [expr, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestExpression = expr as Expression;
      }
    }

    return bestExpression;
  }, []);

  /**
   * 设置表情并基于内容推断
   */
  const setExpressionByContent = useCallback((content: string) => {
    const expression = inferExpression(content);
    if (expression !== 'neutral') {
      setExpression(expression, 400);
    }
  }, [inferExpression, setExpression]);

  // 清理
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  return {
    ...state,
    config: expressionConfig[state.expression],
    setExpression,
    inferExpression,
    setExpressionByContent,
  };
}

/**
 * 表情控制器组件
 * 可独立使用，也可配合 useFaceExpression Hook
 */
export interface FaceExpressionControllerProps {
  expression: Expression;
  onExpressionChange?: (config: typeof expressionConfig.neutral) => void;
}

export function FaceExpressionController({
  expression,
  onExpressionChange,
}: FaceExpressionControllerProps) {
  useEffect(() => {
    onExpressionChange?.(expressionConfig[expression]);
  }, [expression, onExpressionChange]);

  return null;
}

export default useFaceExpression;
