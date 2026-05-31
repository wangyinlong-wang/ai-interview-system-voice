/**
 * 面试官状态指示器组件
 * 
 * 功能:
 * - 显示当前面试官状态（倾听中/思考中/提问中/评价中）
 * - 状态切换动画
 * - 不同状态对应不同颜色
 * - 浮动在面试官头顶
 */

import { useEffect, useState, useRef } from 'react';
import { 
  Ear, 
  Brain, 
  MessageCircle, 
  ClipboardCheck, 
  Loader2,
  Clock
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ 类型定义 ============

export type InterviewStatusType = 
  | 'waiting'    // 等待中
  | 'listening'  // 倾听中
  | 'thinking'   // 思考中
  | 'speaking'   // 提问中/播报中
  | 'evaluating' // 评价中
  | 'processing';// 处理中

export interface InterviewStatusProps {
  /** 当前状态 */
  status: InterviewStatusType;
  /** 自定义类名 */
  className?: string;
  /** 是否显示动画 */
  animated?: boolean;
}

/** 状态配置 */
const statusConfig: Record<InterviewStatusType, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: LucideIcon;
  pulseColor: string;
}> = {
  waiting: {
    label: '等待中',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-300',
    icon: Clock,
    pulseColor: 'bg-gray-400',
  },
  listening: {
    label: '倾听中',
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-400',
    icon: Ear,
    pulseColor: 'bg-green-400',
  },
  thinking: {
    label: '思考中',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-400',
    icon: Brain,
    pulseColor: 'bg-yellow-400',
  },
  speaking: {
    label: '提问中',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-400',
    icon: MessageCircle,
    pulseColor: 'bg-blue-400',
  },
  evaluating: {
    label: '评价中',
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-400',
    icon: ClipboardCheck,
    pulseColor: 'bg-purple-400',
  },
  processing: {
    label: '处理中',
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-400',
    icon: Loader2,
    pulseColor: 'bg-orange-400',
  },
};

/**
 * 面试官状态指示器
 */
export function InterviewStatus({
  status,
  className,
  animated = true,
}: InterviewStatusProps) {
  const config = statusConfig[status] || statusConfig.waiting;
  const Icon = config.icon;
  const [isAnimating, setIsAnimating] = useState(false);
  const prevStatusRef = useRef(status);

  // 状态切换时触发动画
  useEffect(() => {
    if (status !== prevStatusRef.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 400);
      prevStatusRef.current = status;
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full',
        'border backdrop-blur-md',
        'transition-all duration-300',
        config.bgColor,
        config.borderColor,
        isAnimating && animated && 'scale-110',
        className
      )}
    >
      {/* 状态图标 */}
      <div className="relative flex-shrink-0">
        <Icon className={cn('w-4 h-4', config.color)} />
        
        {/* 动态指示器 */}
        {animated && status !== 'waiting' && (
          <span className={cn(
            'absolute inset-0 rounded-full',
            config.pulseColor,
            status === 'processing' || status === 'thinking'
              ? 'animate-ping opacity-50'
              : 'animate-pulse opacity-40'
          )} />
        )}
      </div>

      {/* 状态文字 */}
      <span className={cn('text-sm font-medium', config.color)}>
        {config.label}
      </span>

      {/* 旋转loading（处理中状态） */}
      {status === 'processing' && (
        <Loader2 className={cn('w-3.5 h-3.5 animate-spin', config.color)} />
      )}
    </div>
  );
}

/**
 * 状态指示器包装器 - 用于3D场景上方浮动显示
 */
export interface FloatingStatusProps extends InterviewStatusProps {
  /** 是否可见 */
  visible?: boolean;
}

export function FloatingInterviewStatus({
  status,
  visible = true,
  className,
  animated,
}: FloatingStatusProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'absolute top-8 left-1/2 -translate-x-1/2 z-20',
        'animate-in fade-in slide-in-from-top-2 duration-300',
        className
      )}
    >
      <InterviewStatus status={status} animated={animated} />
    </div>
  );
}

export default InterviewStatus;
