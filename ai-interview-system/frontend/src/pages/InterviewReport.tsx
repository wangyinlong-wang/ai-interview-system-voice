/**
 * 面试评估报告页面 - 综合评分、雷达图、逐题点评、改进建议
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  ArrowLeft,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useInterviewStore } from '@/stores/interviewStore';
import { getScoreLevel, getScoreColor } from '@/lib/utils';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function InterviewReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const interviewId = parseInt(id || '0');

  const {
    currentInterview,
    currentEvaluation,
    isLoading,
    error,
    fetchInterview,
    fetchEvaluation,
  } = useInterviewStore();

  // 加载数据
  useEffect(() => {
    if (interviewId) {
      fetchInterview(interviewId);
      fetchEvaluation(interviewId);
    }
  }, [interviewId]);

  // 构建雷达图数据
  const buildRadarData = () => {
    if (!currentEvaluation) return [];
    return [
      { dimension: '技术能力', score: currentEvaluation.technical_score, fullMark: 100 },
      { dimension: '逻辑思维', score: currentEvaluation.logic_score, fullMark: 100 },
      { dimension: '沟通表达', score: currentEvaluation.communication_score, fullMark: 100 },
      { dimension: '语言表达', score: currentEvaluation.expression_score, fullMark: 100 },
      { dimension: '岗位匹配', score: currentEvaluation.job_fit_score, fullMark: 100 },
      { dimension: '应变能力', score: currentEvaluation.adaptability_score, fullMark: 100 },
    ];
  };

  // 分数卡片数据
  const scoreCards = currentEvaluation
    ? [
        { label: '技术能力', score: currentEvaluation.technical_score, description: '技术知识广度与深度' },
        { label: '逻辑思维', score: currentEvaluation.logic_score, description: '问题分析与推理能力' },
        { label: '沟通表达', score: currentEvaluation.communication_score, description: '倾听理解与回应质量' },
        { label: '语言表达', score: currentEvaluation.expression_score, description: '表达流畅度与准确性' },
        { label: '岗位匹配', score: currentEvaluation.job_fit_score, description: '回答与岗位契合度' },
        { label: '应变能力', score: currentEvaluation.adaptability_score, description: '应对追问和难题表现' },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">正在加载评估报告...</p>
        </div>
      </div>
    );
  }

  if (!currentEvaluation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">评估报告不存在</h2>
          <p className="text-gray-600 mb-6">该面试尚未完成或评估报告未生成</p>
          <Button onClick={() => navigate('/history')}>
            查看历史记录
          </Button>
        </div>
      </div>
    );
  }

  const overallLevel = getScoreLevel(currentEvaluation.overall_score);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <div>
              <h1 className="font-semibold text-gray-900">面试评估报告</h1>
              <p className="text-xs text-gray-500">{currentInterview?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/interview/setup')}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              再来一次
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* 头部摘要 */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 综合评分 */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6 text-center">
              <div className="relative inline-block">
                <svg className="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(currentEvaluation.overall_score / 100) * 264} 264`}
                    className={overallLevel.color}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${overallLevel.color}`}>
                    {currentEvaluation.overall_score}
                  </span>
                  <span className="text-sm text-gray-500">综合评分</span>
                </div>
              </div>
              <p className={`font-medium mt-4 ${overallLevel.color}`}>
                {overallLevel.level}
              </p>
            </CardContent>
          </Card>

          {/* 雷达图 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                能力雷达图
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={buildRadarData()}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="本次面试"
                    dataKey="score"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 各维度得分卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              各维度得分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scoreCards.map((card) => {
                const level = getScoreLevel(card.score);
                return (
                  <div
                    key={card.label}
                    className="bg-gray-50 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{card.label}</p>
                        <p className="text-xs text-gray-500">{card.description}</p>
                      </div>
                      <span className={`text-2xl font-bold ${level.color}`}>
                        {card.score}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getScoreColor(card.score)}`}
                        style={{ width: `${card.score}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${level.color}`}>{level.level}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 总体评价 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              总体评价
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">
              {currentEvaluation.overall_comment}
            </p>
          </CardContent>
        </Card>

        {/* 优势与不足 */}
        <div className="grid sm:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-green-700">
                <Trophy className="w-5 h-5" />
                优势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentEvaluation.strengths.split('\n').filter(Boolean).map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{s.replace(/^\d+\.\s*/, '')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-orange-700">
                <AlertTriangle className="w-5 h-5" />
                不足
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentEvaluation.weaknesses.split('\n').filter(Boolean).map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{w.replace(/^\d+\.\s*/, '')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 改进建议 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-blue-700">
              <Lightbulb className="w-5 h-5" />
              改进建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentEvaluation.suggestions.split('\n').filter(Boolean).map((s, i) => (
                <div key={i} className="flex items-start gap-3 bg-blue-50 rounded-lg p-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-700">{s.replace(/^\d+\.\s*/, '')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 逐题点评 */}
        {currentEvaluation.question_reviews && currentEvaluation.question_reviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                逐题点评
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentEvaluation.question_reviews.map((review, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">第 {i + 1} 题</Badge>
                      <span className={`font-bold ${getScoreLevel(review.score).color}`}>
                        {review.score} 分
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Q: {review.question}</p>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">A: {review.answer}</p>
                    <div className="bg-gray-50 rounded p-2 text-sm text-gray-700">
                      <span className="font-medium">点评：</span>{review.comment}
                    </div>
                    {review.suggestion && (
                      <div className="mt-2 bg-blue-50 rounded p-2 text-sm text-blue-700">
                        <span className="font-medium">建议：</span>{review.suggestion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 底部操作栏 */}
        <div className="flex justify-center gap-4 pb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/history')}
          >
            查看历史记录
          </Button>
          <Button onClick={() => navigate('/interview/setup')}>
            再来一次
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
