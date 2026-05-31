/**
 * 题库浏览页面 - 提供面试题的查询、筛选、搜索功能
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
  Filter,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  LayoutDashboard,
} from 'lucide-react';
import QuestionCard from '@/components/QuestionCard';
import QuestionDetail from '@/components/QuestionDetail';
import QuestionStatsCards from '@/components/QuestionStats';
import { questionApi } from '@/services/api';
import type { QuestionBank, QuestionStats } from '@/types';

const PAGE_SIZE = 20;

const difficultyOptions = [
  { value: '', label: '全部难度' },
  { value: 'beginner', label: '初级' },
  { value: 'intermediate', label: '中级' },
  { value: 'advanced', label: '高级' },
];

const typeOptions = [
  { value: '', label: '全部题型' },
  { value: 'technical', label: '技术题' },
  { value: 'behavioral', label: '行为题' },
  { value: 'situational', label: '情景题' },
  { value: 'algorithm', label: '算法题' },
  { value: 'system_design', label: '系统设计' },
];

export default function QuestionBankPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionBank[]>([]);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // 筛选条件
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  // 详情弹窗
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionBank | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const res: any = await questionApi.getStats();
      if (res.code === 200) {
        setStats(res.data);
      }
    } catch (e) {
      console.error('加载统计失败:', e);
    }
  }, []);

  // 加载分类
  const loadCategories = useCallback(async () => {
    try {
      const res: any = await questionApi.getCategories();
      if (res.code === 200) {
        setCategories(res.data?.categories || []);
      }
    } catch (e) {
      console.error('加载分类失败:', e);
    }
  }, []);

  // 加载题目列表
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await questionApi.getList({
        category,
        difficulty,
        question_type: questionType,
        keyword: keyword || undefined,
        status: 'approved',
        page,
        page_size: PAGE_SIZE,
      });
      if (res.code === 200) {
        setQuestions(res.data?.items || []);
        setTotal(res.data?.total || 0);
      }
    } catch (e) {
      console.error('加载题目失败:', e);
    } finally {
      setLoading(false);
    }
  }, [category, difficulty, questionType, keyword, page]);

  useEffect(() => {
    loadStats();
    loadCategories();
  }, [loadStats, loadCategories]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = () => {
    setPage(1);
    loadQuestions();
  };

  const handleReset = () => {
    setCategory('');
    setDifficulty('');
    setQuestionType('');
    setKeyword('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">面试题库</h1>
              <p className="text-sm text-gray-500">浏览和学习各类面试题，提升面试准备效率</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/questions')}
            className="flex items-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            管理后台
          </Button>
        </div>

        {/* 统计卡片 */}
        <QuestionStatsCards stats={stats} loading={loading} />

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* 搜索框 */}
            <div className="flex-1 min-w-[240px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索面试题关键词..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>

            {/* 分类筛选 */}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部分类</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 难度筛选 */}
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="全部难度" />
              </SelectTrigger>
              <SelectContent>
                {difficultyOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 题型筛选 */}
            <Select value={questionType} onValueChange={setQuestionType}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="全部题型" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 按钮组 */}
            <div className="flex items-center gap-2">
              <Button onClick={handleSearch} size="sm">
                <Search className="w-4 h-4 mr-1" />
                搜索
              </Button>
              <Button variant="outline" onClick={handleReset} size="sm">
                重置
              </Button>
            </div>
          </div>

          {/* 已选条件标签 */}
          {(category || difficulty || questionType) && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              {category && (
                <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setCategory('')}>
                  分类: {category} ×
                </Badge>
              )}
              {difficulty && (
                <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setDifficulty('')}>
                  难度: {difficultyOptions.find((o) => o.value === difficulty)?.label} ×
                </Badge>
              )}
              {questionType && (
                <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setQuestionType('')}>
                  题型: {typeOptions.find((o) => o.value === questionType)?.label} ×
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* 结果统计 */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>共 {total} 道题目</span>
          <span>第 {page}/{totalPages || 1} 页</span>
        </div>

        {/* 题目列表 */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">暂无符合条件的题目</p>
            <Button variant="outline" size="sm" onClick={handleReset}>
              清除筛选条件
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                onClick={() => {
                  setSelectedQuestion(q);
                  setDetailOpen(true);
                }}
              />
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 py-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              上一页
            </Button>
            <span className="text-sm text-gray-500">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      <QuestionDetail
        question={selectedQuestion}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
