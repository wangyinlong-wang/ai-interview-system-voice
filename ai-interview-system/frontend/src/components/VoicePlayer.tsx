/**
 * 语音播放器控制组件
 * 
 * 功能:
 * - 显示当前播报状态
 * - 音频波动画
 * - 暂停/继续/停止控制
 * - 当前播报文字高亮
 */

import { useEffect, useRef } from 'react';
import { Pause, Play, Square, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ 类型定义 ============

export interface VoicePlayerProps {
  /** 是否正在播报 */
  isPlaying: boolean;
  /** 是否暂停 */
  isPaused?: boolean;
  /** 当前播报的文字 */
  currentText: string;
  /** 队列长度 */
  queueLength?: number;
  /** 暂停回调 */
  onPause?: () => void;
  /** 继续回调 */
  onResume?: () => void;
  /** 停止回调 */
  onStop?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 语音播放器控制组件
 */
export function VoicePlayer({
  isPlaying,
  isPaused = false,
  currentText,
  queueLength = 0,
  onPause,
  onResume,
  onStop,
  className,
}: VoicePlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // ============ 音频波动画 ============

  useEffect(() => {
    if (!isPlaying || isPaused || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;

    let offset = 0;

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bars = 12;
      const barWidth = canvas.width / bars;
      const centerY = canvas.height / 2;

      for (let i = 0; i < bars; i++) {
        const time = offset * 0.08;
        const wave1 = Math.sin(time + i * 0.4) * 0.5 + 0.5;
        const wave2 = Math.sin(time * 1.5 + i * 0.7) * 0.3 + 0.7;
        const height = wave1 * wave2 * canvas.height * 0.8;

        const x = i * barWidth;
        const y = centerY - height / 2;

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
        gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.5)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0.2)');

        // 圆角柱状
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x + 1, y, barWidth - 2, height, 4);
        ctx.fill();
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
  }, [isPlaying, isPaused]);

  // 未在播报时不渲染
  if (!isPlaying && !currentText) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200',
        className
      )}
    >
      {/* 音量图标或波形 */}
      <div className="flex-shrink-0 w-6 h-6 relative">
        {isPlaying && !isPaused ? (
          <canvas ref={canvasRef} className="w-full h-full" />
        ) : (
          <Volume2 className="w-5 h-5 text-green-600" />
        )}
      </div>

      {/* 当前播报文字 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-green-700 truncate">
          {isPlaying
            ? isPaused
              ? '已暂停'
              : 'AI 正在播报...'
            : '播报准备中'}
        </p>
        {currentText && (
          <p className="text-sm text-gray-700 truncate">
            {currentText}
          </p>
        )}
      </div>

      {/* 队列指示器 */}
      {queueLength > 0 && (
        <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
          +{queueLength}
        </span>
      )}

      {/* 控制按钮 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isPlaying && !isPaused && onPause && (
          <button
            onClick={onPause}
            className="p-1.5 rounded-full hover:bg-green-200 transition-colors"
            title="暂停"
          >
            <Pause className="w-4 h-4 text-green-700" />
          </button>
        )}
        {isPaused && onResume && (
          <button
            onClick={onResume}
            className="p-1.5 rounded-full hover:bg-green-200 transition-colors"
            title="继续"
          >
            <Play className="w-4 h-4 text-green-700" />
          </button>
        )}
        {onStop && (
          <button
            onClick={onStop}
            className="p-1.5 rounded-full hover:bg-red-200 transition-colors"
            title="停止"
          >
            <Square className="w-4 h-4 text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
}

export default VoicePlayer;
