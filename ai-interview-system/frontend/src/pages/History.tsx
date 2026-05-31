/**
 * 历史记录页面 - 面试列表、查看详情
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MessageSquare,
  Trophy,
  Clock,
  Loader2,
  Trash2,
  Eye,
  ChevronRight,
  Filter,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInterviewStore } from '@/stores/interviewStore';
import { formatDate, getScoreLevel, getScoreColor } from '@/lib/utils';
import type { Interview } from '@/types';

export default function History() {
  const navigate = useNavigate();
  const {
    interviews,
    isLoading,
    error,
    fetchInterviews,
    deleteInterview,
  } = useInterviewStore();

  const [filter, setFilter] = useState<'all' | 'completed' | 'ongoing'>('all');

  useEffect(() => {
    fetchInterviews();
  }, []);

  // 过滤面试记录
  const filteredInterviews = interviews.filter((i) => {
    if (filter === 'completed') return i.status === 'completed' || i.status === 'failed';
    if (filter === 'ongoing') return i.status === 'ongoing' || i.status === 'completing';
    return true;
  });

  // 统计数据
  const totalCount = interviews.length;
  const completedCount = interviews.filter((i) => i.status === 'completed' || i.status === 'failed').length;
  const scoredInterviews = interviews.filter((i) => i.overall_score);
  const avgScore = scoredInterviews.length > 0
    ? Math.round(
        scoredInterviews.reduce((sum, i) => sum + (i.overall_score || 0), 0) / scoredInterviews.length
      )
    : 0;

  // 删除面试
  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这条面试记录吗？')) {
      await deleteInterview(id);
    }
  };

  // 状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">已完成</Badge>;
      case 'failed':
        return <Badge variant="destructive">默认报告</Badge>;
      case 'completing':
        return <Badge variant="warning">生成中</Badge>;
      case 'ongoing':
        return <Badge variant="warning">进行中</Badge>;
      case 'aborted':
        return <Badge variant="destructive">已中止</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">历史记录</h1>
        <p className="text-gray-600 mt-1">查看和管理你的所有模拟面试记录</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                <p className="text-sm text-gray-500">总面试次数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
                <p className="text-sm text-gray-500">已完成</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {avgScore || '-'}
                </p>
                <p className="text-sm text-gray-500">平均分</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 过滤和操作 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'all' as const, label: '全部' },
              { key: 'completed' as const, label: '已完成' },
              { key: 'ongoing' as const, label: '进行中' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === item.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" onClick={() => navigate('/interview/setup')}>
          开始新面试
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* 面试列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">
            {filter === 'all' ? '暂无面试记录' : '该分类下暂无记录'}
          </p>
          <Button onClick={() => navigate('/interview/setup')}>
            开始第一次面试
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInterviews.map((interview) => (
            <Card
              key={interview.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                if (interview.status === 'completed' || interview.status === 'failed') {
                  navigate(`/interview/${interview.id}/report`);
                } else {
                  navigate(`/interview/${interview.id}`);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* 分数或图标 */}
                  <div className="flex-shrink-0">
                    {(interview.status === 'completed' || interview.status === 'failed') && interview.overall_score ? (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getScoreColor(interview.overall_score)} text-white`}>
                        {interview.overall_score}
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                      </div>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {interview.title}
                      </h3>
                      {getStatusBadge(interview.status)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{interview.job_position}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(interview.created_at)}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {interview.message_count} 条对话
                      </span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                      {interview.status === 'completed' || interview.status === 'failed' ? (
                        <Button
                          variant="outline"
                          size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/interview/${interview.id}/report`);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        查看报告
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/interview/${interview.id}`);
                        }}
                      >
                        继续面试
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(interview.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
