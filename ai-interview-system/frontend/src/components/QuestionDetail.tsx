/**
 * 题目详情弹窗组件 - 展示题目的完整信息（题干、答案、解析）
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, BookOpen, Tag, ExternalLink, Lightbulb, FileText } from 'lucide-react';
import type { QuestionBank } from '@/types';

interface QuestionDetailProps {
  question: QuestionBank | null;
  open: boolean;
  onClose: () => void;
}

const difficultyLabels: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
};

const typeLabels: Record<string, string> = {
  technical: '技术题',
  behavioral: '行为题',
  situational: '情景题',
  algorithm: '算法题',
  system_design: '系统设计',
  coding: '编程题',
};

const categoryLabels: Record<string, string> = {
  frontend: '前端',
  backend: '后端',
  algorithm: '算法',
  product: '产品',
  operations: '运营',
  design: '设计',
  devops: '运维',
  data: '数据',
  ai: 'AI',
  mobile: '移动端',
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

export default function QuestionDetail({ question, open, onClose }: QuestionDetailProps) {
  if (!question) return null;

  const diffLabel = difficultyLabels[question.difficulty || ''] || question.difficulty || '';
  const diffClass = difficultyColors[question.difficulty || ''] || '';
  const typeLabel = typeLabels[question.question_type || ''] || question.question_type || '';
  const catLabel = categoryLabels[question.category || ''] || question.category || '';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-base font-semibold leading-relaxed pr-4">
            {question.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 max-h-[calc(85vh-80px)]">
          {/* 标签区域 */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {catLabel && (
              <Badge variant="secondary" className="text-xs">
                {catLabel}
                {question.sub_category && ` / ${question.sub_category}`}
              </Badge>
            )}
            {diffLabel && (
              <Badge className={`text-xs ${diffClass}`}>{diffLabel}</Badge>
            )}
            {typeLabel && (
              <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
            )}
            <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {question.view_count || 0} 次查看
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {question.use_count || 0} 次引用
              </span>
            </div>
          </div>

          {/* 自定义标签 */}
          {question.tags && question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {question.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs text-gray-500">
                  <Tag className="w-2.5 h-2.5 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* 答案区域 */}
          {question.answer && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-blue-500" />
                参考答案
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {question.answer}
              </div>
            </div>
          )}

          {/* 解析区域 */}
          {question.analysis && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                解析/思路
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {question.analysis}
              </div>
            </div>
          )}

          {/* 来源信息 */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t">
            <span>
              来源: {question.source_name || '未知'}
              {question.crawled_at && ` · 采集于 ${new Date(question.crawled_at).toLocaleDateString()}`}
            </span>
            {question.source_url && (
              <a
                href={question.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                查看原文
              </a>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
