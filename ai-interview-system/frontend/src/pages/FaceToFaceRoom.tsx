/**
 * 面对面面试房间页面
 * 
 * 功能:
 * - 全屏3D场景（Three.js Canvas）
 * - 3D虚拟面试官 + 口型同步 + 表情动画
 * - 用户摄像头画中画
 * - 语音对话集成（语音输入 + AI语音播报）
 * - 字幕显示（可收起）
 * - 悬浮控制面板
 * - 设置面板
 */

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import {
  Mic,
  MicOff,
  Square,
  Settings,
  Subtitles,
  CaptionsOff,
  ChevronUp,
  ChevronDown,
  Camera,
  CameraOff,
  AlertCircle,
  Volume2,
  VolumeX,
  ArrowLeft,
  Loader2,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInterviewStore } from '@/stores/interviewStore';
import { useFaceToFaceStore } from '@/stores/faceToFaceStore';
import { useVoiceStore } from '@/stores/voiceStore';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useVoiceOutput } from '@/hooks/useVoiceOutput';
import { useSpeechQueue } from '@/hooks/useSpeechQueue';
import { useLipSync } from '@/components/three/LipSync';
import { useFaceExpression } from '@/components/three/FaceExpression';

// 3D 组件
import { Interviewer3D } from '@/components/three/Interviewer3D';
import { Scene3D } from '@/components/three/Scene3D';

// UI 组件
import { UserVideo } from '@/components/UserVideo';
import { InterviewStatus } from '@/components/InterviewStatus';
import { VoiceSettings } from '@/components/VoiceSettings';
import CapabilityStatus from '@/components/CapabilityStatus';
import { cn } from '@/lib/utils';

/**
 * 加载中占位组件
 */
function LoadingFallback() {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#3b82f6" wireframe />
    </mesh>
  );
}

/**
 * 兼容性检测
 */
function checkWebGLSupport(): boolean {
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

/**
 * 面对面面试房间主组件
 */
export default function FaceToFaceRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const interviewId = parseInt(id || '0');

  // ============ Store ============
  const {
    currentInterview,
    messages,
    isLoading: isInterviewLoading,
    isSending,
    isTyping,
    fetchInterview,
    fetchMessages,
    sendMessage,
    completeInterview,
  } = useInterviewStore();

  const {
    modelType,
    scene,
    currentAnimation,
    currentExpression,
    interviewStatus,
    showSubtitle,
    showUserVideo,
    userCameraEnabled,
    performanceTier,
    setAnimation,
    setExpression,
    setMouthOpen,
    setUserCamera,
    setDisplaySettings,
    reset: resetFaceToFace,
  } = useFaceToFaceStore();

  const { mode: voiceMode, setMode: setVoiceMode } = useVoiceStore();

  // ============ 状态 ============
  const [isWebGLSupported, setIsWebGLSupported] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [localVoiceMode, setLocalVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 最后一条AI消息
  const lastAiMessage = messages.filter((m) => m.role === 'assistant').pop();
  const isAiSpeaking = isTyping;

  // ============ 语音 Hooks ============
  const {
    isRecording,
    transcript,
    interimTranscript,
    error: voiceError,
    isSupported: isVoiceSupported,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useVoiceInput(
    // 识别完成回调
    useCallback((finalTranscript: string) => {
      if (finalTranscript.trim()) {
        handleSendVoice(finalTranscript.trim());
      }
    }, [interviewId])
  );

  const {
    isPlaying: isTTSPlaying,
    currentText: ttsCurrentText,
    speak,
    stop: stopTTS,
    voices,
    selectedVoice,
    setVoice,
    setRate,
    rate,
    volume,
    setVolume,
  } = useVoiceOutput();

  const { interrupt: interruptSpeech } = useSpeechQueue();

  // ============ 口型同步 ============
  const { mouthOpen } = useLipSync(
    lastAiMessage?.content || '',
    isTTSPlaying,
    (lastAiMessage?.content?.length || 0) * 250
  );

  // ============ 表情控制 ============
  const { config: expressionConfig, setExpressionByContent } = useFaceExpression(currentExpression);

  // ============ 初始化 ============

  useEffect(() => {
    // 检测WebGL支持
    if (!checkWebGLSupport()) {
      setIsWebGLSupported(false);
      return;
    }

    if (interviewId) {
      fetchInterview(interviewId);
      fetchMessages(interviewId);
    }

    // 初始化语音支持
    if (isVoiceSupported) {
      setLocalVoiceMode(true);
    }

    return () => {
      resetFaceToFace();
      stopTTS();
    };
  }, [interviewId]);

  // ============ 计时器 ============

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ============ 口型同步联动 ============

  useEffect(() => {
    setMouthOpen(mouthOpen);
  }, [mouthOpen, setMouthOpen]);

  // ============ 表情联动 ============

  useEffect(() => {
    if (isInterviewLoading || isSending) {
      setAnimation('thinking');
      setExpression('thinking');
    } else if (isTyping) {
      setAnimation('speaking');
      setExpression('neutral');
    } else if (isRecording) {
      setAnimation('listening');
      setExpression('neutral');
    } else {
      setAnimation('idle');
      setExpression('neutral');
    }
  }, [isInterviewLoading, isSending, isTyping, isRecording, setAnimation, setExpression]);

  // ============ AI回复时自动TTS ============

  useEffect(() => {
    if (lastAiMessage?.content && !isTyping && localVoiceMode && !isMuted) {
      speak(lastAiMessage.content);
      setExpressionByContent(lastAiMessage.content);
    }
  }, [lastAiMessage?.content, isTyping]);

  // ============ 自动滚动字幕 ============

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============ 格式化时间 ============

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ============ 发送语音消息 ============

  const handleSendVoice = useCallback(
    async (content: string) => {
      if (!content.trim() || isSending) return;
      resetTranscript();
      stopTTS();
      interruptSpeech();
      await sendMessage(interviewId, content);
    },
    [interviewId, isSending, resetTranscript, stopTTS, interruptSpeech, sendMessage]
  );

  // ============ 麦克风控制 ============

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      // 打断当前播报
      stopTTS();
      interruptSpeech();
      resetTranscript();
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording, stopTTS, interruptSpeech, resetTranscript]);

  // ============ 结束面试 ============

  const handleEndInterview = useCallback(async () => {
    setShowEndConfirm(false);
    stopTTS();
    resetFaceToFace();
    await completeInterview(interviewId);
    navigate(`/interview/${interviewId}/report`);
  }, [interviewId, navigate, stopTTS, resetFaceToFace, completeInterview]);

  // ============ 打断 ============

  const handleInterrupt = useCallback(() => {
    stopTTS();
    interruptSpeech();
  }, [stopTTS, interruptSpeech]);

  // ============ WebGL不支持降级 ============

  if (!isWebGLSupported) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center space-y-4 max-w-md px-4">
          <Monitor className="w-16 h-16 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold">您的浏览器不支持 3D 渲染</h2>
          <p className="text-gray-400 text-sm">
            面对面模拟面试需要 WebGL 支持。请使用 Chrome、Edge 或 Firefox 浏览器的最新版本。
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              返回
            </Button>
            <Button onClick={() => navigate(`/interview/${interviewId}`)}>
              切换文字面试
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============ 渲染 ============

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-black">
      {/* ============ 3D Canvas ============ */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 1.2, 3], fov: 45, near: 0.1, far: 100 }}
          gl={{
            antialias: true,
            toneMapping: 4, // ACESFilmicToneMapping
            toneMappingExposure: 1.2,
            alpha: false,
          }}
          shadows={performanceTier !== 'low'}
        >
          <Suspense fallback={<LoadingFallback />}>
            <Scene3D
              sceneType={scene}
              showShadows={performanceTier !== 'low'}
              ambientIntensity={0.4}
            >
              {/* 3D 面试官 */}
              <Interviewer3D
                modelType={modelType}
                mouthOpen={mouthOpen}
                expression={currentExpression}
                lookAtAngle={0}
              />
            </Scene3D>

            {/* 环境贴图 */}
            <Environment preset="city" />

            {/* 后处理 */}
            {performanceTier === 'high' && (
              <></>
              // 注意: @react-three/postprocessing 需要额外安装
              // 为简化依赖暂不启用，后续可添加
            )}
          </Suspense>

          {/* 相机控制 */}
          <OrbitControls
            target={[0, 1.0, 0]}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.2}
            minDistance={2}
            maxDistance={5}
            enablePan={false}
            enableDamping
            dampingFactor={0.05}
          />
        </Canvas>
      </div>

      {/* ============ 顶部状态栏 ============ */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between px-4 py-3">
          {/* 左侧: 返回 + 信息 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEndConfirm(true)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
              title="结束面试"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div>
              <h1 className="text-sm font-medium text-white">
                {currentInterview?.title || '模拟面试'}
              </h1>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span>{currentInterview?.job_position}</span>
                <span>·</span>
                <span>{formatTime(elapsedTime)}</span>
              </div>
            </div>
          </div>

          {/* 中间: 状态指示器 */}
          <div className="hidden sm:block">
            <InterviewStatus status={interviewStatus} />
          </div>

          {/* 右侧: 设置 */}
          <div className="flex items-center gap-2">
            {/* 静音按钮 */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                'p-2 rounded-lg backdrop-blur-sm transition-colors',
                isMuted
                  ? 'bg-red-500/30 hover:bg-red-500/50'
                  : 'bg-white/10 hover:bg-white/20'
              )}
              title={isMuted ? '取消静音' : '静音'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>

            {/* 设置按钮 */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'p-2 rounded-lg backdrop-blur-sm transition-colors',
                showSettings
                  ? 'bg-blue-500/30'
                  : 'bg-white/10 hover:bg-white/20'
              )}
              title="设置"
            >
              <Settings className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      <CapabilityStatus
        mode="face-to-face"
        tone="dark"
        className="absolute top-16 left-4 right-4 z-20 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-2xl"
      />

      {/* ============ 用户视频 ============ */}
      {showUserVideo && (
        <UserVideo
          enabled={userCameraEnabled}
          isRecording={isRecording}
          isMuted={isMuted}
          onStreamChange={(stream) => {
            setUserCamera(!!stream);
          }}
          size="md"
          defaultPosition="bottom-right"
          className="bottom-24"
        />
      )}

      {/* ============ 字幕区域 ============ */}
      {showSubtitle && showSubtitlePanel && (
        <div className="absolute bottom-24 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-20">
          <div className="bg-black/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
            {/* 字幕头部 */}
            <button
              onClick={() => setShowSubtitlePanel(false)}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/5 transition-colors"
            >
              <span className="text-xs text-white/50">字幕</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/50" />
            </button>

            {/* 消息列表 */}
            <div className="max-h-40 overflow-y-auto px-3 py-2 space-y-2">
              {messages.length === 0 && (
                <p className="text-xs text-white/30 text-center py-2">
                  面试即将开始...
                </p>
              )}
              {messages.slice(-6).map((msg) => (
                <div key={msg.id} className="flex gap-2">
                  <span
                    className={cn(
                      'text-xs font-medium flex-shrink-0',
                      msg.role === 'user' ? 'text-blue-400' : 'text-green-400'
                    )}
                  >
                    {msg.role === 'user' ? '我' : 'AI'}
                  </span>
                  <p className="text-xs text-white/80 line-clamp-2">
                    {msg.content}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 正在输入 */}
            {isTyping && (
              <div className="px-3 py-1.5 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 text-green-400 animate-spin" />
                <span className="text-xs text-green-400/70">AI 正在回复...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 字幕收起按钮 */}
      {showSubtitle && !showSubtitlePanel && (
        <button
          onClick={() => setShowSubtitlePanel(true)}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20
                     px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm
                     flex items-center gap-1.5 text-white/60 hover:text-white
                     hover:bg-black/60 transition-all text-xs"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span>展开字幕</span>
        </button>
      )}

      {/* ============ 底部控制面板 ============ */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="bg-gradient-to-t from-black/80 to-transparent pb-4 pt-8 px-4">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {/* 麦克风按钮 */}
            {isVoiceSupported && (
              <button
                onClick={handleMicClick}
                disabled={isSending}
                className={cn(
                  'flex flex-col items-center gap-1 group',
                  isSending && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center',
                    'transition-all duration-200 shadow-lg',
                    isRecording
                      ? 'bg-red-500 shadow-red-500/40 animate-pulse'
                      : 'bg-white/15 hover:bg-white/25 backdrop-blur-sm'
                  )}
                >
                  {isRecording ? (
                    <Square className="w-6 h-6 text-white" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </div>
                <span className="text-[10px] text-white/60">
                  {isRecording ? '停止' : '录音'}
                </span>
              </button>
            )}

            {/* 打断按钮 */}
            {isTTSPlaying && (
              <button
                onClick={handleInterrupt}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-orange-500/20 hover:bg-orange-500/40
                                flex items-center justify-center transition-all">
                  <Square className="w-5 h-5 text-orange-400 fill-orange-400" />
                </div>
                <span className="text-[10px] text-white/60">打断</span>
              </button>
            )}

            {/* 字幕开关 */}
            <button
              onClick={() => setDisplaySettings({ showSubtitle: !showSubtitle })}
              className="flex flex-col items-center gap-1"
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  'transition-all',
                  showSubtitle
                    ? 'bg-blue-500/30'
                    : 'bg-white/15 hover:bg-white/25'
                )}
              >
                {showSubtitle ? (
                  <Subtitles className="w-5 h-5 text-blue-400" />
                ) : (
                  <CaptionsOff className="w-5 h-5 text-white/60" />
                )}
              </div>
              <span className="text-[10px] text-white/60">字幕</span>
            </button>

            {/* 摄像头开关 */}
            <button
              onClick={() => setUserCamera(!userCameraEnabled)}
              className="flex flex-col items-center gap-1"
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  'transition-all',
                  userCameraEnabled
                    ? 'bg-blue-500/30'
                    : 'bg-white/15 hover:bg-white/25'
                )}
              >
                {userCameraEnabled ? (
                  <Camera className="w-5 h-5 text-blue-400" />
                ) : (
                  <CameraOff className="w-5 h-5 text-white/60" />
                )}
              </div>
              <span className="text-[10px] text-white/60">视频</span>
            </button>

            {/* 结束按钮 */}
            <button
              onClick={() => setShowEndConfirm(true)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 hover:bg-red-500/40
                              flex items-center justify-center transition-all">
                <Square className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-[10px] text-white/60">结束</span>
            </button>
          </div>

          {/* 语音状态提示 */}
          {isRecording && (transcript || interimTranscript) && (
            <div className="mt-3 text-center">
              <p className="text-xs text-white/70 bg-white/10 inline-block px-3 py-1 rounded-full">
                {transcript || interimTranscript}
                {interimTranscript && !transcript && (
                  <span className="animate-pulse">...</span>
                )}
              </p>
            </div>
          )}

          {/* 语音错误提示 */}
          {voiceError && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{voiceError}</span>
            </div>
          )}
        </div>
      </div>

      {/* ============ 设置面板 ============ */}
      <VoiceSettings
        isOpen={showSettings}
        settings={{
          selectedVoiceUri: selectedVoice?.voiceURI || 'default',
          rate,
          volume,
        }}
        voices={voices}
        onSettingsChange={(settings) => {
          if (settings.rate !== undefined) setRate(settings.rate);
          if (settings.volume !== undefined) setVolume(settings.volume);
          if (settings.selectedVoiceUri) {
            const voice = voices.find((v) => v.voice.voiceURI === settings.selectedVoiceUri);
            if (voice) setVoice(voice.voice);
          }
        }}
        onClose={() => setShowSettings(false)}
        onTestVoice={(text) => speak(text)}
      />

      {/* 设置面板遮罩 */}
      {showSettings && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* ============ 结束面试确认 ============ */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">结束面试？</h3>
            <p className="text-gray-400 text-sm mb-6">
              结束面试后将生成评估报告。已回答的问题仍会参与评分。
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowEndConfirm(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                继续面试
              </Button>
              <Button
                variant="destructive"
                onClick={handleEndInterview}
              >
                结束并查看报告
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
