/**
 * 模型配置后台 - 动态切换 OpenAI 兼容模型
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Edit3, Loader2, Plus, Power, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { modelConfigApi } from '@/services/api';
import type { AIModelConfig, AIModelConfigFormData } from '@/types';
import { cn } from '@/lib/utils';

const emptyForm: AIModelConfigFormData = {
  name: '',
  provider: 'ollama',
  base_url: 'http://host.docker.internal:11434/v1',
  model: '',
  api_key: 'ollama',
  temperature: 0.7,
  max_tokens: 800,
  is_enabled: true,
  is_active: false,
  description: '',
};

export default function ModelConfigManagePage() {
  const [configs, setConfigs] = useState<AIModelConfig[]>([]);
  const [form, setForm] = useState<AIModelConfigFormData>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeConfig = useMemo(
    () => configs.find((item) => item.is_active),
    [configs]
  );

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await modelConfigApi.getList();
      if (response.code === 200) {
        setConfigs(response.data?.items || []);
      }
    } catch (e: any) {
      setError(typeof e === 'string' ? e : '获取模型配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const updateForm = <K extends keyof AIModelConfigFormData>(
    key: K,
    value: AIModelConfigFormData[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
    setMessage(null);
  };

  const editConfig = (config: AIModelConfig) => {
    setEditingId(config.id);
    setForm({
      name: config.name,
      provider: config.provider,
      base_url: config.base_url,
      model: config.model,
      api_key: '',
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      is_enabled: config.is_enabled,
      is_active: config.is_active,
      description: config.description || '',
    });
    setError(null);
    setMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.base_url.trim() || !form.model.trim()) {
      setError('名称、Base URL 和模型名称不能为空');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingId) {
        const payload: Partial<AIModelConfigFormData> = {
          ...form,
          api_key: form.api_key?.trim() || '',
        };
        delete payload.is_active;
        await modelConfigApi.update(editingId, payload);
        if (form.is_active) {
          await modelConfigApi.activate(editingId);
        }
        setMessage('模型配置已更新');
      } else {
        await modelConfigApi.create(form);
        setMessage('模型配置已创建');
      }
      resetForm();
      await loadConfigs();
    } catch (e: any) {
      setError(typeof e === 'string' ? e : '保存模型配置失败');
    } finally {
      setSaving(false);
    }
  };

  const activate = async (id: number) => {
    setError(null);
    setMessage(null);
    try {
      await modelConfigApi.activate(id);
      setMessage('当前模型已切换');
      await loadConfigs();
    } catch (e: any) {
      setError(typeof e === 'string' ? e : '切换模型失败');
    }
  };

  const remove = async (config: AIModelConfig) => {
    if (config.is_active) {
      setError('当前启用的模型配置不能删除');
      return;
    }
    if (!confirm(`确定删除模型配置「${config.name}」吗？`)) return;

    setError(null);
    setMessage(null);
    try {
      await modelConfigApi.delete(config.id);
      setMessage('模型配置已删除');
      await loadConfigs();
    } catch (e: any) {
      setError(typeof e === 'string' ? e : '删除模型配置失败');
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">模型配置</h1>
            <p className="text-sm text-gray-500 mt-1">
              当前启用：{activeConfig ? `${activeConfig.name} / ${activeConfig.model}` : '未配置'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadConfigs} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            刷新
          </Button>
        </div>

        {(error || message) && (
          <div
            className={cn(
              'rounded-lg border px-4 py-3 text-sm',
              error
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-green-200 bg-green-50 text-green-700'
            )}
          >
            {error || message}
          </div>
        )}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
          <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">配置列表</h2>
              <span className="text-xs text-gray-500">{configs.length} 条</span>
            </div>

            {loading ? (
              <div className="p-8 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                加载中...
              </div>
            ) : configs.length === 0 ? (
              <div className="p-8 text-sm text-gray-500">暂无模型配置</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {configs.map((config) => (
                  <div key={config.id} className="p-4 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">{config.name}</h3>
                          {config.is_active && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              当前启用
                            </Badge>
                          )}
                          {!config.is_enabled && (
                            <Badge variant="outline" className="text-gray-500">
                              已禁用
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-600 break-all">
                          {config.provider} · {config.model} · {config.base_url}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          Key：{config.api_key_masked || '未设置'} · 温度：{config.temperature} · 上限：{config.max_tokens}
                        </div>
                        {config.description && (
                          <p className="mt-2 text-sm text-gray-500">{config.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => activate(config.id)}
                          disabled={config.is_active}
                        >
                          <Power className="w-4 h-4 mr-1" />
                          启用
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => editConfig(config)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => remove(config)}
                          disabled={config.is_active}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                {editingId ? '编辑配置' : '新增配置'}
              </h2>
              {editingId && (
                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                  新增
                </Button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="model-name">配置名称</Label>
                <Input
                  id="model-name"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="ollama-gemma4"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="provider">服务商</Label>
                <select
                  id="provider"
                  value={form.provider}
                  onChange={(event) => updateForm('provider', event.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ollama">Ollama</option>
                  <option value="openai-compatible">OpenAI Compatible</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="qwen">Qwen</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="base-url">Base URL</Label>
                <Input
                  id="base-url"
                  value={form.base_url}
                  onChange={(event) => updateForm('base_url', event.target.value)}
                  placeholder="http://host.docker.internal:11434/v1"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="model">模型名称</Label>
                <Input
                  id="model"
                  value={form.model}
                  onChange={(event) => updateForm('model', event.target.value)}
                  placeholder="gemma4:e4b"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  value={form.api_key || ''}
                  onChange={(event) => updateForm('api_key', event.target.value)}
                  placeholder={editingId ? '留空表示不修改' : 'ollama'}
                  type="password"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="temperature">温度</Label>
                  <Input
                    id="temperature"
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={form.temperature}
                    onChange={(event) => updateForm('temperature', Number(event.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max-tokens">Token 上限</Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    min={1}
                    max={16000}
                    value={form.max_tokens}
                    onChange={(event) => updateForm('max_tokens', Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">备注</Label>
                <textarea
                  id="description"
                  value={form.description || ''}
                  onChange={(event) => updateForm('description', event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="用途、限制或部署说明"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">启用配置</p>
                  <p className="text-xs text-gray-500">禁用后不能被切换为当前模型</p>
                </div>
                <Switch
                  checked={form.is_enabled}
                  onCheckedChange={(checked) => updateForm('is_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">保存后设为当前模型</p>
                  <p className="text-xs text-gray-500">会自动取消其他配置的当前状态</p>
                </div>
                <Switch
                  checked={!!form.is_active}
                  onCheckedChange={(checked) => updateForm('is_active', checked)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : editingId ? (
                  <CheckCircle className="w-4 h-4 mr-1" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                {editingId ? '保存修改' : '创建配置'}
              </Button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}
