/**
 * 音色/语速设置面板组件
 * 
 * 功能:
 * - 音色选择(中文男声/女声)
 * - 语速调节(0.5x - 1.5x)
 * - 音量调节
 * - 试听功能
 * - 设置保存
 */

import { useState, useCallback } from 'react';
import { Settings, Volume2, Gauge, UserCircle, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ 类型定义 ============

export interface VoiceSettingsData {
  /** 选中的语音URI */
  selectedVoiceUri: string;
  /** 语速 0.5-1.5 */
  rate: number;
  /** 音量 0-1 */
  volume: number;
}

export interface VoiceSettingsProps {
  /** 是否展开 */
  isOpen: boolean;
  /** 当前设置 */
  settings: VoiceSettingsData;
  /** 可用语音列表 */
  voices: Array<{
    name: string;
    voice: SpeechSynthesisVoice;
    lang: string;
    gender: 'male' | 'female' | 'unknown';
  }>;
  /** 设置变更回调 */
  onSettingsChange: (settings: Partial<VoiceSettingsData>) => void;
  /** 关闭回调 */
  onClose: () => void;
  /** 试听回调 */
  onTestVoice?: (text: string) => void;
  /** 自定义类名 */
  className?: string;
}

/** 语速选项 */
const RATE_OPTIONS = [
  { value: 0.5, label: '慢速' },
  { value: 0.75, label: '偏慢' },
  { value: 1.0, label: '正常' },
  { value: 1.25, label: '偏快' },
  { value: 1.5, label: '快速' },
];

/**
 * 语音设置面板组件
 */
export function VoiceSettings({
  isOpen,
  settings,
  voices,
  onSettingsChange,
  onClose,
  onTestVoice,
  className,
}: VoiceSettingsProps) {
  const [isTesting, setIsTesting] = useState(false);

  // ============ 处理函数 ============

  /** 处理语速变更 */
  const handleRateChange = useCallback((rate: number) => {
    onSettingsChange({ rate });
  }, [onSettingsChange]);

  /** 处理音量变更 */
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ volume: parseFloat(e.target.value) });
  }, [onSettingsChange]);

  /** 处理语音变更 */
  const handleVoiceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ selectedVoiceUri: e.target.value });
  }, [onSettingsChange]);

  /** 试听 */
  const handleTest = useCallback(() => {
    const testTexts = [
      '你好，我是你的AI面试官。准备好了吗？让我们开始吧！',
      '接下来我会问几个关于你项目经验的问题，请详细回答。',
    ];
    const randomText = testTexts[Math.floor(Math.random() * testTexts.length)];
    
    setIsTesting(true);
    onTestVoice?.(randomText);
    
    // 3秒后重置测试状态
    setTimeout(() => setIsTesting(false), 3000);
  }, [onTestVoice]);

  // 未展开时不渲染
  if (!isOpen) return null;

  // 过滤并分类语音
  const maleVoices = voices.filter((v) => v.gender === 'male');
  const femaleVoices = voices.filter((v) => v.gender === 'female');
  const otherVoices = voices.filter((v) => v.gender === 'unknown');

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 w-80 bg-white/95 backdrop-blur-md shadow-xl',
        'border-l border-gray-200 z-50 flex flex-col',
        'animate-in slide-in-from-right duration-300',
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">语音设置</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 音色选择 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <UserCircle className="w-4 h-4" />
            <span>面试官音色</span>
          </div>

          <select
            value={settings.selectedVoiceUri}
            onChange={handleVoiceChange}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {/* 默认选项 */}
            <option value="default">默认语音</option>

            {/* 男声 */}
            {maleVoices.length > 0 && (
              <optgroup label="中文男声">
                {maleVoices.map((v) => (
                  <option key={v.voice.voiceURI} value={v.voice.voiceURI}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
            )}

            {/* 女声 */}
            {femaleVoices.length > 0 && (
              <optgroup label="中文女声">
                {femaleVoices.map((v) => (
                  <option key={v.voice.voiceURI} value={v.voice.voiceURI}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
            )}

            {/* 其他 */}
            {otherVoices.length > 0 && (
              <optgroup label="其他语音">
                {otherVoices.map((v) => (
                  <option key={v.voice.voiceURI} value={v.voice.voiceURI}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {/* 试听按钮 */}
          <button
            onClick={handleTest}
            disabled={isTesting || voices.length === 0}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
              'border border-gray-200 hover:bg-gray-50',
              isTesting && 'opacity-70 cursor-wait'
            )}
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isTesting ? '播放中...' : '试听音色'}</span>
          </button>
        </div>

        {/* 语速选择 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Gauge className="w-4 h-4" />
            <span>播报语速</span>
          </div>

          <div className="flex gap-2">
            {RATE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleRateChange(option.value)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-medium transition-all',
                  'border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                  Math.abs(settings.rate - option.value) < 0.01
                    ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                {option.value}x
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-400 text-center">
            当前: {RATE_OPTIONS.find((r) => Math.abs(r.value - settings.rate) < 0.01)?.label || '自定义'}
          </div>
        </div>

        {/* 音量调节 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Volume2 className="w-4 h-4" />
              <span>播报音量</span>
            </div>
            <span className="text-xs text-gray-500">{Math.round(settings.volume * 100)}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.volume}
            onChange={handleVolumeChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />

          <div className="flex justify-between text-xs text-gray-400">
            <span>静音</span>
            <span>最大</span>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
          <p className="font-medium">提示</p>
          <p>不同浏览器可用的音色不同，推荐使用 Chrome 或 Edge 以获得最佳语音体验。</p>
          <p className="text-blue-500 mt-1">当前可用音色: {voices.length} 个</p>
        </div>
      </div>
    </div>
  );
}

export default VoiceSettings;
