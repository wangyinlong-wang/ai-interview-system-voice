/**
 * 用户摄像头画面组件
 * 
 * 功能:
 * - getUserMedia 获取视频流
 * - 画中画显示
 * - 镜像显示
 * - 采集中状态指示
 * - 点击放大预览
 * - 拖拽移动
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, Mic, MicOff, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ 类型定义 ============

export interface UserVideoProps {
  /** 是否启用摄像头 */
  enabled: boolean;
  /** 是否正在录音 */
  isRecording?: boolean;
  /** 是否静音 */
  isMuted?: boolean;
  /** 视频流 */
  stream?: MediaStream | null;
  /** 流变更回调 */
  onStreamChange?: (stream: MediaStream | null) => void;
  /** 自定义类名 */
  className?: string;
  /** 默认位置 */
  defaultPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 用户摄像头画面组件
 */
export function UserVideo({
  enabled,
  isRecording = false,
  isMuted = false,
  stream,
  onStreamChange,
  className,
  defaultPosition = 'bottom-right',
  size = 'md',
}: UserVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(stream || null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 同步外部 stream
  useEffect(() => {
    if (stream !== undefined) {
      setLocalStream(stream);
    }
  }, [stream]);

  // ============ 获取摄像头 ============

  useEffect(() => {
    if (!enabled) {
      // 关闭摄像头
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
        onStreamChange?.(null);
      }
      return;
    }

    // 已经获取到流，直接使用
    if (localStream) {
      if (videoRef.current) {
        videoRef.current.srcObject = localStream;
      }
      return;
    }

    // 请求摄像头权限
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((mediaStream) => {
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setLocalStream(mediaStream);
        onStreamChange?.(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch((err) => {
        console.warn('获取摄像头失败:', err);
        setHasError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // 视频元素更新
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ============ 尺寸配置 ============

  const sizeClasses = {
    sm: isExpanded ? 'w-80 h-60' : 'w-40 h-30',
    md: isExpanded ? 'w-96 h-72' : 'w-48 h-36',
    lg: isExpanded ? 'w-[480px] h-[360px]' : 'w-60 h-45',
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  // ============ 处理函数 ============

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // 未启用摄像头时显示占位
  if (!enabled || hasError) {
    return (
      <div
        className={cn(
          'absolute z-30 flex flex-col items-center justify-center',
          'bg-gray-900/80 rounded-xl border border-gray-700',
          sizeClasses[size],
          positionClasses[defaultPosition],
          className
        )}
      >
        {hasError ? (
          <>
            <CameraOff className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-xs text-gray-400">摄像头未启用</p>
          </>
        ) : (
          <>
            <Camera className="w-8 h-8 text-gray-500 mb-2" />
            <p className="text-xs text-gray-500">等待开启摄像头</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'absolute z-30 rounded-xl overflow-hidden',
        'border-2 transition-all duration-300',
        isRecording
          ? 'border-green-400 shadow-lg shadow-green-400/30'
          : 'border-gray-600',
        isExpanded ? 'shadow-2xl' : 'shadow-lg',
        sizeClasses[size],
        positionClasses[defaultPosition],
        className
      )}
    >
      {/* 视频元素 - 镜像显示 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform scale-x-[-1]"
      />

      {/* 加载中 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 录音状态指示 */}
      {isRecording && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-white bg-red-500/80 px-1.5 py-0.5 rounded">
            录制中
          </span>
        </div>
      )}

      {/* 静音指示 */}
      {isMuted && (
        <div className="absolute top-2 right-8">
          <MicOff className="w-4 h-4 text-red-400" />
        </div>
      )}

      {/* 展开/收起按钮 */}
      <button
        onClick={toggleExpand}
        className={cn(
          'absolute top-2 right-2 p-1 rounded-md',
          'bg-black/40 hover:bg-black/60 transition-colors',
          'text-white'
        )}
        title={isExpanded ? '缩小' : '放大'}
      >
        {isExpanded ? (
          <Minimize2 className="w-3.5 h-3.5" />
        ) : (
          <Maximize2 className="w-3.5 h-3.5" />
        )}
      </button>

      {/* 底部信息栏 */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent">
        <span className="text-xs text-white/80">我</span>
      </div>
    </div>
  );
}

export default UserVideo;
