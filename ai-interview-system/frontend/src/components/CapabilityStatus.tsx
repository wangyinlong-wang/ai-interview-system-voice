/**
 * 浏览器能力状态提示 - 用于语音/视频/3D 降级提示
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Camera, Mic, Monitor, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type CapabilityMode = 'interview' | 'face-to-face';
type Tone = 'light' | 'dark';

interface CapabilityStatusProps {
  mode?: CapabilityMode;
  tone?: Tone;
  className?: string;
}

interface CapabilityIssue {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function hasWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

function detectIssues(mode: CapabilityMode): CapabilityIssue[] {
  if (typeof window === 'undefined') return [];

  const issues: CapabilityIssue[] = [];
  const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  const hasSpeechSynthesis = 'speechSynthesis' in window;
  const hasMediaDevices = !!navigator.mediaDevices?.getUserMedia;

  if (!hasSpeechRecognition) {
    issues.push({
      key: 'speech-recognition',
      label: '语音识别不可用，已保留文字输入',
      icon: Mic,
    });
  }

  if (!hasSpeechSynthesis) {
    issues.push({
      key: 'speech-synthesis',
      label: '语音播报不可用，AI 回复将以文字显示',
      icon: Volume2,
    });
  }

  if (mode === 'face-to-face') {
    if (!hasMediaDevices) {
      issues.push({
        key: 'media-devices',
        label: '摄像头或麦克风设备接口不可用',
        icon: Camera,
      });
    }

    if (!hasWebGLSupport()) {
      issues.push({
        key: 'webgl',
        label: '3D 渲染不可用，可切换普通面试',
        icon: Monitor,
      });
    }
  }

  return issues;
}

export default function CapabilityStatus({
  mode = 'interview',
  tone = 'light',
  className,
}: CapabilityStatusProps) {
  const [issues, setIssues] = useState<CapabilityIssue[]>([]);

  useEffect(() => {
    setIssues(detectIssues(mode));
  }, [mode]);

  if (issues.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 text-sm',
        tone === 'dark'
          ? 'border-yellow-400/30 bg-yellow-500/15 text-yellow-100 backdrop-blur-md'
          : 'border-yellow-200 bg-yellow-50 text-yellow-800',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {issues.map((issue) => (
            <span key={issue.key} className="inline-flex items-center gap-1">
              <issue.icon className="w-3.5 h-3.5" />
              {issue.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
