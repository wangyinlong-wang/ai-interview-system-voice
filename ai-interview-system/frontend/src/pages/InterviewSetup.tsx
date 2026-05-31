/**
 * 面试准备页面 - 选择岗位、难度、面试配置
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  BarChart3,
  MessageSquare,
  Loader2,
  ChevronRight,
  FileText,
  CheckCircle2,
  Settings,
  Mic,
  Video,
  UserCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useResumeStore } from '@/stores/resumeStore';
import { useInterviewStore } from '@/stores/interviewStore';
import {
  JOB_POSITIONS,
  INTERVIEW_TYPES,
  DIFFICULTY_LEVELS,
  QUESTION_COUNTS,
} from '@/types';

export default function InterviewSetup() {
  const navigate = useNavigate();
  const { resumes, fetchResumes } = useResumeStore();
  const { createInterview, isCreating } = useInterviewStore();

  const [selectedResumeId, setSelectedResumeId] = useState<number | undefined>();
  const [jobPosition, setJobPosition] = useState('');
  const [interviewType, setInterviewType] = useState('comprehensive');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [questionCount, setQuestionCount] = useState(8);
  const [enableVoice, setEnableVoice] = useState(false);
  const [enable3D, setEnable3D] = useState(false);
  const [interviewerModel, setInterviewerModel] = useState<'male' | 'female'>('male');
  const [sceneType, setSceneType] = useState<'office' | 'modern'>('office');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResumes();
  }, []);

  // 选择简历
  const handleSelectResume = (id: number) => {
    setSelectedResumeId(id);
    // 自动从简历中提取岗位建议
    const resume = resumes.find((r) => r.id === id);
    if (resume?.parsed_data?.skills) {
      // 根据技能猜测岗位（简化逻辑）
      const skills = JSON.stringify(resume.parsed_data.skills).toLowerCase();
      if (skills.includes('java')) setJobPosition('java_backend');
      else if (skills.includes('python')) setJobPosition('python_backend');
      else if (skills.includes('react') || skills.includes('vue')) setJobPosition('frontend');
    }
  };

  // 开始面试
  const handleStartInterview = async () => {
    setError('');
    
    if (!jobPosition) {
      setError('请选择目标岗位');
      return;
    }
    
    const positionLabel = JOB_POSITIONS.find((p) => p.value === jobPosition)?.label || jobPosition;
    
    const interviewId = await createInterview({
      resume_id: selectedResumeId,
      title: `${positionLabel} - ${INTERVIEW_TYPES.find(t => t.value === interviewType)?.label || '面试'}`,
      job_position: positionLabel,
      interview_type: interviewType,
      difficulty,
      question_count: questionCount,
      enable_voice: enableVoice,
      enable_3d: enable3D,
      interviewer_model: interviewerModel,
      scene: sceneType,
    });

    if (interviewId) {
      // 根据是否启用3D模式选择路由
      if (enable3D) {
        navigate(`/interview/face-to-face/${interviewId}`);
      } else {
        navigate(`/interview/${interviewId}`);
      }
    }
  };

  // 步骤标题
  const stepTitles = ['选择简历', '配置面试', '确认开始'];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">开始面试</h1>
        <p className="text-gray-600 mt-1">选择简历并配置面试参数，准备开始 AI 模拟面试</p>
      </div>

      {/* 步骤指示器 */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {stepTitles.map((title, index) => (
            <div key={index} className="flex items-center gap-2">
              <button
                onClick={() => setStep(index + 1)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  step === index + 1
                    ? 'bg-blue-600 text-white'
                    : step > index + 1
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {step > index + 1 ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                )}
                {title}
              </button>
              {index < stepTitles.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 步骤 1: 选择简历 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              选择简历（可选）
            </CardTitle>
            <CardDescription>
              选择已解析的简历可以让 AI 生成更个性化的面试问题
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 不使用简历选项 */}
            <button
              onClick={() => {
                setSelectedResumeId(undefined);
                setStep(2);
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors mb-4 ${
                selectedResumeId === undefined
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-gray-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">不使用简历</p>
                <p className="text-sm text-gray-500">基于岗位进行通用面试</p>
              </div>
            </button>

            {/* 简历列表 */}
            {resumes.filter((r) => r.parsed_at).length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-4">暂无已解析的简历</p>
                <Button variant="outline" onClick={() => navigate('/resume')}>
                  去上传简历
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {resumes
                  .filter((r) => r.parsed_at)
                  .map((resume) => (
                    <button
                      key={resume.id}
                      onClick={() => handleSelectResume(resume.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors text-left ${
                        selectedResumeId === resume.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {resume.name || resume.filename}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {resume.skills?.split(',').slice(0, 5).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {selectedResumeId === resume.id && (
                        <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep(2)} variant="outline">
                下一步 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤 2: 配置面试 */}
      {step === 2 && (
        <div className="space-y-6">
          {/* 岗位选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                目标岗位
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {JOB_POSITIONS.map((pos) => (
                  <button
                    key={pos.value}
                    onClick={() => setJobPosition(pos.value)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors text-left ${
                      jobPosition === pos.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 面试类型 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                面试类型
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {INTERVIEW_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setInterviewType(type.value)}
                    className={`px-6 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      interviewType === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 难度和题数 */}
          <div className="grid sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  难度等级
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  {DIFFICULTY_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setDifficulty(level.value)}
                      className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                        difficulty === level.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-orange-600" />
                  问题数量
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  {QUESTION_COUNTS.map((count) => (
                    <button
                      key={count}
                      onClick={() => setQuestionCount(count)}
                      className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                        questionCount === count
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {count} 题
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 语音/3D 面试模式配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-pink-600" />
                面试模式
              </CardTitle>
              <CardDescription>
                选择额外的面试体验模式（可选）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 语音模式开关 */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">语音面试模式</p>
                    <p className="text-xs text-gray-500">支持语音输入和 AI 语音播报</p>
                  </div>
                </div>
                <button
                  onClick={() => setEnableVoice(!enableVoice)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    enableVoice ? 'bg-pink-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      enableVoice ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* 3D 面对面模式开关 */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Video className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">面对面 3D 面试</p>
                    <p className="text-xs text-gray-500">沉浸式3D面试官 + 口型同步 + 表情动画</p>
                  </div>
                </div>
                <button
                  onClick={() => setEnable3D(!enable3D)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    enable3D ? 'bg-indigo-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      enable3D ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* 3D 面试官配置（仅在3D模式下显示） */}
              {enable3D && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-600">3D 面试官配置</p>
                  
                  {/* 面试官形象 */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setInterviewerModel('male')}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                        interviewerModel === 'male'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <UserCircle className="w-5 h-5 text-indigo-600" />
                      <div className="text-left">
                        <p className="text-sm font-medium">陈总监</p>
                        <p className="text-[10px] text-gray-500">男性技术面试官</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setInterviewerModel('female')}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                        interviewerModel === 'female'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <UserCircle className="w-5 h-5 text-pink-600" />
                      <div className="text-left">
                        <p className="text-sm font-medium">林经理</p>
                        <p className="text-[10px] text-gray-500">女性产品面试官</p>
                      </div>
                    </button>
                  </div>

                  {/* 场景选择 */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSceneType('office')}
                      className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                        sceneType === 'office'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      标准会议室
                    </button>
                    <button
                      onClick={() => setSceneType('modern')}
                      className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                        sceneType === 'modern'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      现代办公室
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              上一步
            </Button>
            <Button onClick={() => setStep(3)}>
              下一步 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* 步骤 3: 确认配置 */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>确认面试配置</CardTitle>
            <CardDescription>请确认以下信息无误后，开始面试</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-500">面试标题</span>
                <span className="font-medium">
                  {JOB_POSITIONS.find((p) => p.value === jobPosition)?.label || jobPosition}面试
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-500">目标岗位</span>
                <Badge>{JOB_POSITIONS.find((p) => p.value === jobPosition)?.label || jobPosition}</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-500">面试类型</span>
                <Badge variant="secondary">
                  {INTERVIEW_TYPES.find((t) => t.value === interviewType)?.label}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-500">难度等级</span>
                <Badge variant="outline">
                  {DIFFICULTY_LEVELS.find((d) => d.value === difficulty)?.label}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-500">问题数量</span>
                <span className="font-medium">{questionCount} 题</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-500">使用简历</span>
                <span className="font-medium">
                  {selectedResumeId
                    ? resumes.find((r) => r.id === selectedResumeId)?.name || '已选择'
                    : '不使用'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-500">语音模式</span>
                <Badge variant={enableVoice ? 'default' : 'outline'} className={enableVoice ? 'bg-pink-500' : ''}>
                  {enableVoice ? '已启用' : '未启用'}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">3D 面试</span>
                <Badge variant={enable3D ? 'default' : 'outline'} className={enable3D ? 'bg-indigo-500' : ''}>
                  {enable3D ? `${interviewerModel === 'male' ? '陈总监' : '林经理'} · ${sceneType === 'office' ? '会议室' : '办公室'}` : '未启用'}
                </Badge>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                上一步
              </Button>
              <Button
                onClick={handleStartInterview}
                disabled={isCreating || !jobPosition}
                className="gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    开始面试
                    <MessageSquare className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
