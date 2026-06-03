/**
 * 面试房间页面 - AI 实时对话面试（核心功能）
 * 
 * 功能:
 * - 展示历史消息
 * - 用户输入消息（文字 + 语音）
 * - SSE 流式接收 AI 回复（打字机效果）
 * - 语音模式支持（语音输入 + AI 语音播报）
 * - 展示面试进度
 * - 结束面试按钮
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send,
  Loader2,
  Flag,
  User,
  Bot,
  Clock,
  AlertCircle,
  MessageSquare,
  Mic,
  Square,
  Volume2,
  VolumeX,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInterviewStore } from '@/stores/interviewStore';
import { useVoiceStore } from '@/stores/voiceStore';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useVoiceOutput } from '@/hooks/useVoiceOutput';
import { VoiceToggle } from '@/components/VoiceToggle';
import { VoiceSettings } from '@/components/VoiceSettings';
import CapabilityStatus from '@/components/CapabilityStatus';
import { cn } from '@/lib/utils';

export default function InterviewRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const interviewId = parseInt(id || '0');

  const {
    currentInterview,
    messages,
    isLoading,
    isSending,
    isTyping,
    isCompleting,
    error,
    fetchInterview,
    fetchMessages,
    sendMessage,
    completeInterview,
  } = useInterviewStore();

  // 语音状态
  const { mode: voiceMode, isVoiceSupported, setMode: setVoiceMode } = useVoiceStore();
  const isVoiceMode = voiceMode === 'voice';

  // 语音输入
  const {
    isRecording,
    transcript,
    interimTranscript,
    error: voiceError,
    startRecording,
    stopRecording,
    resetTranscript,
    resetError: resetVoiceError,
  } = useVoiceInput(
    // 识别完成回调
    useCallback(
      (finalTranscript: string) => {
        if (finalTranscript.trim() && !isSending) {
          handleSendVoice(finalTranscript.trim());
        }
      },
      [interviewId, isSending]
    )
  );

  // 语音输出
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

  const [inputText, setInputText] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 最后一条AI消息
  const lastAiMessage = messages.filter((m) => m.role === 'assistant').pop();

  // 消息数量
  const messageCount = messages.filter((m) => m.role !== 'system').length;
  const aiMessageCount = messages.filter((m) => m.role === 'assistant').length;
  const totalQuestions = currentInterview?.question_count || 8;

  // ============ 初始化 ============

  useEffect(() => {
    if (interviewId) {
      fetchInterview(interviewId);
      fetchMessages(interviewId);
    }
    return () => {
      stopTTS();
    };
  }, [interviewId, fetchInterview, fetchMessages, stopTTS]);

  // 面试刚创建、尚无对话时，自动发送开场消息触发 AI 面试官
  useEffect(() => {
    if (
      currentInterview?.status === 'ongoing' &&
      messages.length === 0 &&
      !isSending &&
      !isTyping
    ) {
      sendMessage(interviewId, '你好，我准备好了，请开始面试吧。');
    }
  }, [currentInterview?.status, messages.length, isSending, isTyping, interviewId, sendMessage]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 计时器
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // AI回复时自动TTS播报
  useEffect(() => {
    if (
      lastAiMessage?.content &&
      !isTyping &&
      isVoiceMode &&
      !isMuted
    ) {
      speak(lastAiMessage.content);
    }
  }, [lastAiMessage?.content, isTyping, isVoiceMode, isMuted, speak]);

  // ============ 格式化时间 ============

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ============ 发送消息 ============

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    const content = inputText.trim();
    setInputText('');
    await sendMessage(interviewId, content);
  };

  /** 发送语音消息 */
  const handleSendVoice = useCallback(
    async (content: string) => {
      if (!content.trim() || isSending) return;
      resetTranscript();
      stopTTS();
      await sendMessage(interviewId, content);
    },
    [interviewId, isSending, resetTranscript, stopTTS, sendMessage]
  );

  // ============ 按键处理 ============

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ============ 麦克风控制 ============

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      // 打断当前播报
      stopTTS();
      resetTranscript();
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording, stopTTS, resetTranscript]);

  // ============ 结束面试 ============

  const handleEndInterview = async () => {
    setShowEndConfirm(false);
    stopTTS();
    await completeInterview(interviewId);
    navigate(`/interview/${interviewId}/report`);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
      {/* ============ 顶部状态栏 ============ */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            {/* 面试信息 */}
            <div>
              <h2 className="font-semibold text-gray-900 text-sm lg:text-base">
                {currentInterview?.title || '模拟面试'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>{currentInterview?.job_position}</span>
                <span>·</span>
                <span className="capitalize">
                  {currentInterview?.difficulty === 'beginner'
                    ? '初级'
                    : currentInterview?.difficulty === 'advanced'
                    ? '高级'
                    : '中级'}
                </span>
              </div>
            </div>
          </div>

          {/* 中间: 进度和时间 */}
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(elapsedTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MessageSquare className="w-4 h-4" />
              <span>
                问题 {Math.min(aiMessageCount, totalQuestions)}/{totalQuestions}
              </span>
            </div>
            {/* 进度条 */}
            <div className="hidden md:block w-24">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min((aiMessageCount / totalQuestions) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 右侧: 语音模式切换 + 设置 + 结束按钮 */}
          <div className="flex items-center gap-2">
            {/* 语音模式切换 */}
            <VoiceToggle
              currentMode={voiceMode}
              isSupported={isVoiceSupported}
              onModeChange={setVoiceMode}
              size="sm"
            />

            {/* 设置按钮（语音模式下显示） */}
            {isVoiceMode && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  showSettings
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
                title="语音设置"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* 结束按钮 */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowEndConfirm(true)}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Flag className="w-4 h-4 mr-1" />
                  结束
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ============ 错误提示 ============ */}
      {error && (
        <div className="mx-4 mt-2 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <CapabilityStatus className="mx-4 mt-2" />

      {/* ============ 语音播报指示器 ============ */}
      {isVoiceMode && isTTSPlaying && (
        <div className="mx-4 mt-2 flex items-center justify-between gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
          <div className="flex items-center gap-2 min-w-0">
            <Volume2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-xs text-green-700 truncate">
              {ttsCurrentText || 'AI 正在播报...'}
            </span>
          </div>
          <button
            onClick={() => stopTTS()}
            className="p-1 rounded hover:bg-green-200 transition-colors flex-shrink-0"
          >
            <Square className="w-3.5 h-3.5 text-green-700" />
          </button>
        </div>
      )}

      {/* ============ 消息列表区域 ============ */}
      <div className="flex-1 overflow-auto px-4 lg:px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* 欢迎消息 */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">面试即将开始</h3>
              <p className="text-gray-500 text-sm">
                AI 面试官正在准备，请稍候...
              </p>
              {isVoiceMode && (
                <p className="text-blue-500 text-xs mt-2">
                  已开启语音模式，您可以点击麦克风按钮开始说话
                </p>
              )}
            </div>
          )}

          {/* 消息列表 */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* 头像 */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  msg.role === 'user' ? 'bg-gray-200' : 'bg-blue-100'
                )}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-gray-600" />
                ) : (
                  <Bot className="w-4 h-4 text-blue-600" />
                )}
              </div>

              {/* 消息气泡 */}
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-md shadow-sm'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      msg.role === 'user' ? 'text-blue-100' : 'text-blue-600'
                    )}
                  >
                    {msg.role === 'user' ? '你' : 'AI 面试官'}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}

          {/* AI 正在输入指示器 */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-blue-600 font-medium mb-1 block">
                    AI 面试官
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ============ 语音设置面板 ============ */}
      {showSettings && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setShowSettings(false)}
          />
          <div className="absolute top-16 right-4 z-50 w-72">
            <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-4 space-y-4">
              {/* 音色选择 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  音色
                </label>
                <select
                  value={selectedVoice?.voiceURI || 'default'}
                  onChange={(e) => {
                    const voice = voices.find((v) => v.voice.voiceURI === e.target.value);
                    if (voice) setVoice(voice.voice);
                  }}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="default">默认</option>
                  {voices.map((v) => (
                    <option key={v.voice.voiceURI} value={v.voice.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 语速 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  语速: {rate.toFixed(2)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.25"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>慢</span>
                  <span>正常</span>
                  <span>快</span>
                </div>
              </div>

              {/* 音量 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  音量: {Math.round(volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* 试听 */}
              <button
                onClick={() => speak('你好，我是你的AI面试官。')}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm rounded-lg transition-colors"
              >
                试听音色
              </button>
            </div>
          </div>
        </>
      )}

      {/* ============ 输入区域 ============ */}
      <div className="bg-white border-t border-gray-200 px-4 lg:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          {/* 语音输入相关 */}
          {isVoiceMode && (
            <div className="mb-3">
              {/* 语音转写预览 */}
              {(transcript || interimTranscript) && (
                <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {transcript}
                    {interimTranscript && (
                      <span className="text-gray-400">{interimTranscript}</span>
                    )}
                  </p>
                </div>
              )}

              {/* 语音错误提示 */}
              {voiceError && (
                <div className="mb-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{voiceError}</span>
                </div>
              )}

              {/* 麦克风按钮（语音模式主输入） */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleMicClick}
                  disabled={isSending}
                  className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-full transition-all',
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/30'
                      : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md',
                    isSending && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isRecording ? (
                    <Square className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>

                <div className="flex-1 text-sm text-gray-500">
                  {isRecording ? (
                    <span className="text-red-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      正在录音... 点击停止
                    </span>
                  ) : (
                    <span>点击麦克风开始说话</span>
                  )}
                </div>

                {/* 静音按钮 */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isMuted
                      ? 'bg-red-50 text-red-500'
                      : 'text-gray-500 hover:bg-gray-100'
                  )}
                  title={isMuted ? '取消静音' : '静音'}
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>

                {/* 打断播报 */}
                {isTTSPlaying && (
                  <button
                    onClick={() => stopTTS()}
                    className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors"
                    title="停止播报"
                  >
                    <Square className="w-5 h-5 fill-orange-500" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 文字输入 */}
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isVoiceMode
                    ? '也可以手动输入...（Enter 发送，Shift+Enter 换行）'
                    : '输入你的回答...（Enter 发送，Shift+Enter 换行）'
                }
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                disabled={isSending}
              />
              <span className="absolute right-3 bottom-3 text-xs text-gray-400">
                {inputText.length}/500
              </span>
            </div>
            <Button
              onClick={handleSend}
              disabled={!inputText.trim() || isSending}
              className="h-[60px] px-4"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-400 mt-2 text-center">
            AI 生成内容仅供参考，请以实际面试要求为准
            {isVoiceMode && isVoiceSupported && (
              <span className="ml-2 text-blue-400">
                · 语音模式已启用
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ============ 结束面试确认对话框 ============ */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">结束面试？</h3>
            <p className="text-gray-600 text-sm mb-6">
              结束面试后将生成评估报告。已回答的问题仍会参与评分。
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowEndConfirm(false)}>
                继续面试
              </Button>
              <Button
                variant="destructive"
                onClick={handleEndInterview}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    处理中...
                  </>
                ) : (
                  '结束并查看报告'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
