/**
 * 来源配置表单组件 - 添加/编辑爬虫来源
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Power, Settings } from 'lucide-react';
import type { CrawlSource, CrawlSourceFormData } from '@/types';

interface CrawlSourceConfigProps {
  sources: CrawlSource[];
  loading?: boolean;
  onCreate?: (data: CrawlSourceFormData) => void;
  onUpdate?: (id: number, data: CrawlSourceFormData) => void;
  onDelete?: (id: number) => void;
  onToggle?: (id: number) => void;
  onManualRun?: (sourceId: number) => void;
}

const SPIDER_OPTIONS = [
  { value: 'NowcoderSpider', label: '牛客网爬虫' },
  { value: 'LeetCodeSpider', label: '力扣爬虫' },
  { value: 'GitHubInterviewSpider', label: 'GitHub爬虫' },
];

const SOURCE_TYPE_OPTIONS = [
  { value: 'web', label: '网页' },
  { value: 'api', label: 'API' },
  { value: 'rss', label: 'RSS' },
  { value: 'github', label: 'GitHub' },
];

const DEFAULT_FORM: CrawlSourceFormData = {
  name: '',
  source_type: 'web',
  base_url: '',
  spider_class: 'NowcoderSpider',
  cron_expression: '0 2 * * *',
  config: { max_pages: 5 },
  is_enabled: true,
};

export default function CrawlSourceConfigComponent({
  sources,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onToggle,
  onManualRun,
}: CrawlSourceConfigProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CrawlSourceFormData>(DEFAULT_FORM);
  const [showForm, setShowForm] = useState(false);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (source: CrawlSource) => {
    setForm({
      name: source.name,
      source_type: source.source_type,
      base_url: source.base_url,
      spider_class: source.spider_class,
      cron_expression: source.cron_expression,
      config: source.config || { max_pages: 5 },
      is_enabled: source.is_enabled,
    });
    setEditingId(source.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.base_url.trim()) return;

    if (editingId) {
      onUpdate?.(editingId, form);
    } else {
      onCreate?.(form);
    }
    resetForm();
  };

  const isEditing = editingId !== null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500" />
            采集来源配置
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            添加来源
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* 表单 */}
        {showForm && (
          <div className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
            <h4 className="text-sm font-medium text-gray-700">
              {isEditing ? '编辑来源' : '新增来源'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">来源名称 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如: 牛客网面经"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">来源类型</Label>
                <Select
                  value={form.source_type}
                  onValueChange={(v) => setForm({ ...form, source_type: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">基础URL *</Label>
                <Input
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                  placeholder="https://www.example.com"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">爬虫类</Label>
                <Select
                  value={form.spider_class}
                  onValueChange={(v) => setForm({ ...form, spider_class: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPIDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Cron表达式</Label>
                <Input
                  value={form.cron_expression}
                  onChange={(e) => setForm({ ...form, cron_expression: e.target.value })}
                  placeholder="0 2 * * *"
                  className="h-8 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">最大页数</Label>
                <Input
                  type="number"
                  value={form.config?.max_pages || 5}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      config: { ...form.config, max_pages: parseInt(e.target.value) || 5 },
                    })
                  }
                  className="h-8 text-sm"
                  min={1}
                  max={20}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_enabled}
                  onCheckedChange={(v) => setForm({ ...form, is_enabled: v })}
                />
                <Label className="text-xs">启用</Label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button size="sm" onClick={handleSubmit}>
                {isEditing ? '保存修改' : '创建'}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 来源列表 */}
        <div className="space-y-2">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
            ))
          ) : sources.length === 0 ? (
            <div className="text-center text-gray-400 py-6 text-sm">
              暂无采集来源，点击"添加来源"按钮创建
            </div>
          ) : (
            sources.map((source) => (
              <div
                key={source.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  source.is_enabled ? 'bg-white' : 'bg-gray-50 opacity-70'
                }`}
              >
                {/* 启用状态 */}
                <button
                  onClick={() => onToggle?.(source.id)}
                  className={`p-1.5 rounded-md transition-colors ${
                    source.is_enabled
                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={source.is_enabled ? '已启用' : '已禁用'}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>

                {/* 来源信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {source.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {source.source_type}
                    </Badge>
                    {source.last_status && (
                      <Badge
                        className={`text-xs ${
                          source.last_status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : source.last_status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : source.last_status === 'running'
                            ? 'bg-blue-100 text-blue-700'
                            : ''
                        }`}
                      >
                        {source.last_status}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span className="truncate">{source.base_url}</span>
                    <span className="shrink-0">{source.spider_class}</span>
                    <span className="shrink-0 font-mono">{source.cron_expression}</span>
                  </div>
                  {source.last_run_at && (
                    <div className="text-xs text-gray-400">
                      上次运行: {new Date(source.last_run_at).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => onManualRun?.(source.id)}
                    title="立即执行"
                  >
                    <Power className="w-3.5 h-3.5 text-blue-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => startEdit(source)}
                    title="编辑"
                  >
                    <Edit className="w-3.5 h-3.5 text-gray-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      if (confirm(`确定删除来源 "${source.name}" 吗？`)) {
                        onDelete?.(source.id);
                      }
                    }}
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
