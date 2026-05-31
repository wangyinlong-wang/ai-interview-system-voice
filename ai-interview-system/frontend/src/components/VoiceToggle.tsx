/**
 * 语音/文字模式切换按钮
 * 
 * 功能:
 * - 切换文字模式/语音模式
 * - 浏览器兼容性检测提示
 * - 切换动画效果
 */

import { useCallback } from 'react';
import { Mic, Keyboard, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InterviewMode } from '@/stores/voiceStore';

// ============ 类型定义 ============

export interface VoiceToggleProps {
  /** 当前模式 */
  currentMode: InterviewMode;
  /** 是否支持语音 */
  isSupported: boolean;
  /** 模式切换回调 */
  onModeChange: (mode: InterviewMode) => void;
  /** 自定义类名 */
  className?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 语音/文字模式切换按钮
 */
export function VoiceToggle({
  currentMode,
  isSupported,
  onModeChange,
  className,
  size = 'md',
}: VoiceToggleProps) {
  /** 处理模式切换 */
  const handleToggle = useCallback(() => {
    if (!isSupported) return;
    const newMode = currentMode === 'text' ? 'voice' : 'text';
    onModeChange(newMode);
  }, [currentMode, isSupported, onModeChange]);

  // 尺寸配置
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const isVoice = currentMode === 'voice';

  // 如果不支持语音，显示提示
  if (!isSupported) {
    return (
      <button
        disabled
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-gray-200',
          'bg-gray-100 text-gray-400 cursor-not-allowed',
          sizeClasses[size],
          className
        )}
        title="您的浏览器不支持语音功能"
      >
        <AlertTriangle className={iconSizes[size]} />
        <span>语音不可用</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={cn(
        'inline-flex items-center rounded-lg border transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        sizeClasses[size],
        isVoice
          ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500 focus:ring-blue-400 shadow-sm'
          : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 focus:ring-gray-300',
        className
      )}
      title={isVoice ? '切换到文字模式' : '切换到语音模式'}
    >
      {isVoice ? (
        <>
          <Mic className={iconSizes[size]} />
          <span>语音模式</span>
        </>
      ) : (
        <>
          <Keyboard className={iconSizes[size]} />
          <span>文字模式</span>
        </>
      )}

      {/* 切换指示器 */}
      <span
        className={cn(
          'ml-1 w-1.5 h-1.5 rounded-full transition-colors',
          isVoice ? 'bg-white' : 'bg-gray-300'
        )}
      />
    </button>
  );
}

export default VoiceToggle;
