/**
 * 语音录制按钮组件
 * 
 * 功能:
 * - 麦克风按钮（点击开始/停止录音）
 * - 录音状态可视化（波形动画/呼吸灯效果）
 * - 实时转写文字显示
 * - 录音时长显示
 * - 错误提示
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, AlertCircle, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ 类型定义 ============

export interface VoiceRecorderProps {
  /** 是否正在录音 */
  isRecording: boolean;
  /** 临时转写文字（实时） */
  interimTranscript: string;
  /** 最终转写文字 */
  transcript: string;
  /** 是否有错误 */
  error?: string | null;
  /** 是否可用 */
  disabled?: boolean;
  /** 开始录音回调 */
  onStartRecording: () => void;
  /** 停止录音回调 */
  onStopRecording: () => void;
  /** 重置错误回调 */
  onResetError?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 语音录制按钮组件
 */
export function VoiceRecorder({
  isRecording,
  interimTranscript,
  transcript,
  error,
  disabled = false,
  onStartRecording,
  onStopRecording,
  onResetError,
  className,
}: VoiceRecorderProps) {
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // ============ 录音计时器 ============

  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // ============ 波形动画 ============

  useEffect(() => {
    if (!isRecording || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置 canvas 尺寸
    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    };
    resize();

    let offset = 0;
    const bars = 20;

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / bars;
      const centerY = canvas.height / 2;

      for (let i = 0; i < bars; i++) {
        // 使用正弦波 + 随机扰动模拟音频波形
        const time = offset * 0.05;
        const noise = Math.sin(time + i * 0.5) * 0.5 + 0.5;
        const height = (noise * canvas.height * 0.6) + (Math.random() * canvas.height * 0.2);

        const x = i * barWidth;
        const y = centerY - height / 2;

        // 渐变色
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 2, height);
      }

      offset++;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording]);

  // ============ 格式化时间 ============

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  // ============ 处理点击 ============

  const handleClick = useCallback(() => {
    if (error && onResetError) {
      onResetError();
      return;
    }

    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  }, [isRecording, error, onStartRecording, onStopRecording, onResetError]);

  // ============ 渲染 ============

  const displayText = transcript || interimTranscript;
  const hasText = displayText.length > 0;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* 波形动画区域 */}
      {isRecording && (
        <div className="w-full max-w-[200px] h-8 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />
        </div>
      )}

      {/* 转写文字预览 */}
      {isRecording && hasText && (
        <div className="max-w-xs px-3 py-1.5 bg-blue-50 rounded-lg text-sm text-gray-700 text-center">
          <span className={interimTranscript && !transcript ? 'text-gray-400' : ''}>
            {displayText}
          </span>
        </div>
      )}

      {/* 录音计时器 */}
      {isRecording && (
        <div className="text-xs text-red-500 font-mono">
          {formatTime(recordingTime)}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 px-2 py-1 bg-red-50 rounded">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-center">{error}</span>
        </div>
      )}

      {/* 麦克风按钮 */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          'relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400 animate-pulse'
            : error
            ? 'bg-red-100 hover:bg-red-200 text-red-500 focus:ring-red-300'
            : 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400',
          disabled && 'opacity-50 cursor-not-allowed',
          // 录音中呼吸灯效果
          isRecording && 'shadow-lg shadow-red-500/30'
        )}
        title={isRecording ? '停止录音' : error ? '点击重试' : '开始录音'}
      >
        {isRecording ? (
          <Square className="w-5 h-5" />
        ) : error ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}

        {/* 录音中圆环动画 */}
        {isRecording && (
          <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30" />
        )}
      </button>

      {/* 提示文字 */}
      <span className="text-xs text-gray-400">
        {isRecording ? '点击结束' : '点击说话'}
      </span>
    </div>
  );
}

export default VoiceRecorder;
