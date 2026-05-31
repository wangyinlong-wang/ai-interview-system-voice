/**
 * 题库管理后台 - 题目审核、编辑、删除
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import QuestionStatsCards from '@/components/QuestionStats';
import QuestionDetail from '@/components/QuestionDetail';
import { questionApi } from '@/services/api';
import type { QuestionBank, QuestionStats } from '@/types';

const PAGE_SIZE = 15;

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
];

const difficultyOptions = [
  { value: '', label: '全部难度' },
  { value: 'beginner', label: '初级' },
  { value: 'intermediate', label: '中级' },
  { value: 'advanced', label: '高级' },
];

export default function QuestionManagePage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionBank[]>([]);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [keyword, setKeyword] = useState('');

  const [selectedQuestion, setSelectedQuestion] = useState<QuestionBank | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res: any = await questionApi.getStats();
      if (res.code === 200) {
        setStats(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await questionApi.getList({
        status: status || undefined,
        difficulty: difficulty || undefined,
        keyword: keyword || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      if (res.code === 200) {
        setQuestions(res.data?.items || []);
        setTotal(res.data?.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [status, difficulty, keyword, page]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleApprove = async (id: number) => {
    try {
      await questionApi.approve(id);
      loadQuestions();
      loadStats();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await questionApi.reject(id);
      loadQuestions();
      loadStats();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这道题吗？')) return;
    try {
      await questionApi.delete(id);
      loadQuestions();
      loadStats();
    } catch (e) {
      console.error(e);
    }
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const statusLabel: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 标题栏 */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/question-bank')}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">题库管理</h1>
            <p className="text-sm text-gray-500">审核和管理面试题目</p>
          </div>
        </div>

        {/* 统计 */}
        <QuestionStatsCards stats={stats} loading={loading} />

        {/* 筛选 */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索题目..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setPage(1); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {difficultyOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={loadQuestions}>筛选</Button>
          </div>
        </div>

        {/* 表格 */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">题目</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 w-24">分类</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 w-20">难度</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 w-24">状态</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 w-28">来源</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700 w-32">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-3">
                        <Skeleton className="h-8" />
                      </td>
                    </tr>
                  ))
                ) : questions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  questions.map((q) => (
                    <tr key={q.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div
                          className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 line-clamp-2"
                          onClick={() => { setSelectedQuestion(q); setDetailOpen(true); }}
                        >
                          {q.title}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {q.category || '未分类'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {q.difficulty && (
                          <Badge className={`text-xs ${
                            q.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                            q.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {q.difficulty === 'beginner' ? '初级' : q.difficulty === 'intermediate' ? '中级' : '高级'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${statusColor[q.status] || ''}`}>
                          {statusLabel[q.status] || q.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {q.source_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {q.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleApprove(q.id)}
                                title="通过"
                              >
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleReject(q.id)}
                                title="拒绝"
                              >
                                <XCircle className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => { setSelectedQuestion(q); setDetailOpen(true); }}
                            title="查看"
                          >
                            <Edit className="w-4 h-4 text-gray-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleDelete(q.id)}
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-gray-500">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      </div>

      <QuestionDetail question={selectedQuestion} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </div>
  );
}
