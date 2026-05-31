/**
 * 采集管理页面 - 管理爬虫来源、手动触发、查看任务历史
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, RefreshCw, Activity } from 'lucide-react';
import CrawlTaskList from '@/components/CrawlTaskList';
import CrawlSourceConfigComponent from '@/components/CrawlSourceConfig';
import { crawlApi, questionApi } from '@/services/api';
import type { CrawlTask, CrawlSource, SchedulerStatus, QuestionStats, CrawlSourceFormData } from '@/types';

export default function CrawlManagePage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<CrawlTask[]>([]);
  const [sources, setSources] = useState<CrawlSource[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res: any = await crawlApi.getTasks(30);
      if (res.code === 200) {
        setTasks(res.data?.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await crawlApi.getSources();
      if (res.code === 200) {
        setSources(res.data?.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSchedulerStatus = useCallback(async () => {
    try {
      const res: any = await crawlApi.getSchedulerStatus();
      if (res.code === 200) {
        setSchedulerStatus(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

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

  const loadAll = useCallback(() => {
    loadTasks();
    loadSources();
    loadSchedulerStatus();
    loadStats();
  }, [loadTasks, loadSources, loadSchedulerStatus, loadStats]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCreateSource = async (data: CrawlSourceFormData) => {
    try {
      await crawlApi.createSource(data);
      loadSources();
      loadSchedulerStatus();
    } catch (e) {
      console.error(e);
      alert('创建失败，请检查数据');
    }
  };

  const handleUpdateSource = async (id: number, data: CrawlSourceFormData) => {
    try {
      await crawlApi.updateSource(id, data);
      loadSources();
      loadSchedulerStatus();
    } catch (e) {
      console.error(e);
      alert('更新失败');
    }
  };

  const handleDeleteSource = async (id: number) => {
    try {
      await crawlApi.deleteSource(id);
      loadSources();
      loadSchedulerStatus();
    } catch (e) {
      console.error(e);
      alert('删除失败');
    }
  };

  const handleToggleSource = async (id: number) => {
    try {
      await crawlApi.toggleSource(id);
      loadSources();
      loadSchedulerStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualRun = async (sourceId: number) => {
    try {
      await crawlApi.manualRun(sourceId);
      alert('已触发采集任务，请稍后刷新查看结果');
      setTimeout(loadTasks, 3000);
    } catch (e) {
      console.error(e);
      alert('触发失败');
    }
  };

  const handleRestartScheduler = async () => {
    try {
      await crawlApi.restartScheduler();
      alert('调度器已重启');
      loadSchedulerStatus();
    } catch (e) {
      console.error(e);
      alert('重启失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/question-bank')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回题库
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">采集管理</h1>
              <p className="text-sm text-gray-500">管理爬虫来源和定时任务</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAll}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestartScheduler}
            >
              <Activity className="w-4 h-4 mr-1" />
              重启调度器
            </Button>
          </div>
        </div>

        {/* 调度器状态 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">调度器状态</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  schedulerStatus?.running ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`} />
                <span className="text-sm">
                  {schedulerStatus?.running ? '运行中' : '已停止'}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs">
                任务数: {schedulerStatus?.job_count || 0}
              </Badge>
              <div className="text-sm text-gray-500">
                题库: {stats?.total_count || 0} 题
                {stats?.today_new ? ` · 今日新增 ${stats.today_new}` : ''}
              </div>
              {schedulerStatus?.jobs && schedulerStatus.jobs.length > 0 && (
                <div className="w-full mt-2 space-y-1">
                  <p className="text-xs text-gray-500">即将执行的任务:</p>
                  <div className="flex flex-wrap gap-2">
                    {schedulerStatus.jobs.map((job) => (
                      <Badge key={job.id} variant="outline" className="text-xs">
                        {job.name}
                        {job.next_run && (
                          <span className="text-gray-400 ml-1">
                            {new Date(job.next_run).toLocaleString()}
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 来源配置 */}
        <CrawlSourceConfigComponent
          sources={sources}
          loading={loading}
          onCreate={handleCreateSource}
          onUpdate={handleUpdateSource}
          onDelete={handleDeleteSource}
          onToggle={handleToggleSource}
          onManualRun={handleManualRun}
        />

        {/* 任务历史 */}
        <CrawlTaskList
          tasks={tasks}
          loading={tasksLoading}
        />
      </div>
    </div>
  );
}
