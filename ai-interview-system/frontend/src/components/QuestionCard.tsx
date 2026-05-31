/**
 * 题目卡片组件 - 展示单道面试题的摘要信息
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Eye, BookOpen, Tag, ExternalLink } from 'lucide-react';
import type { QuestionBank } from '@/types';

interface QuestionCardProps {
  question: QuestionBank;
  onClick?: (question: QuestionBank) => void;
  showActions?: boolean;
}

/** 难度颜色映射 */
const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 hover:bg-green-200',
  intermediate: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  advanced: 'bg-red-100 text-red-700 hover:bg-red-200',
};

/** 难度中文映射 */
const difficultyLabels: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
};

/** 题型中文映射 */
const typeLabels: Record<string, string> = {
  technical: '技术题',
  behavioral: '行为题',
  situational: '情景题',
  algorithm: '算法题',
  system_design: '系统设计',
  coding: '编程题',
};

/** 分类中文映射 */
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

export default function QuestionCard({ question, onClick, showActions = true }: QuestionCardProps) {
  const diffClass = difficultyColors[question.difficulty || ''] || 'bg-gray-100 text-gray-700';
  const diffLabel = difficultyLabels[question.difficulty || ''] || question.difficulty || '';
  const typeLabel = typeLabels[question.question_type || ''] || question.question_type || '';
  const catLabel = categoryLabels[question.category || ''] || question.category || '';

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-l-4 border-l-blue-500"
      onClick={() => onClick?.(question)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-relaxed flex-1">
            {question.title}
          </h3>
          {question.source_url && showActions && (
            <a
              href={question.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-500 transition-colors shrink-0"
              onClick={(e) => e.stopPropagation()}
              title="查看来源"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* 分类标签 */}
          {catLabel && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {catLabel}
            </Badge>
          )}

          {/* 难度标签 */}
          {diffLabel && (
            <Badge className={`text-xs px-1.5 py-0 ${diffClass}`}>
              {diffLabel}
            </Badge>
          )}

          {/* 题型标签 */}
          {typeLabel && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {typeLabel}
            </Badge>
          )}

          {/* 自定义标签 */}
          {question.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0 text-gray-500">
              <Tag className="w-2.5 h-2.5 mr-0.5" />
              {tag}
            </Badge>
          ))}

          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" />
              {question.view_count || 0}
            </span>
            <span className="flex items-center gap-0.5">
              <BookOpen className="w-3 h-3" />
              {question.use_count || 0}
            </span>
          </div>
        </div>

        {/* 来源信息 */}
        {question.source_name && (
          <p className="text-xs text-gray-400 mt-1.5">
            来源: {question.source_name}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
