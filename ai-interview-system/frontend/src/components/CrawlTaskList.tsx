/**
 * 采集任务列表组件 - 展示爬虫任务执行历史
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { CrawlTask } from '@/types';

interface CrawlTaskListProps {
  tasks: CrawlTask[];
  loading?: boolean;
  onManualRun?: (sourceId: number) => void;
}

const statusConfig: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
  running: {
    label: '执行中',
    class: 'bg-blue-100 text-blue-700',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  success: {
    label: '成功',
    class: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  no_data: {
    label: '无数据',
    class: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  failed: {
    label: '失败',
    class: 'bg-red-100 text-red-700',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

export default function CrawlTaskList({ tasks, loading, onManualRun }: CrawlTaskListProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          采集任务历史
          <Badge variant="secondary" className="ml-auto text-xs">
            {tasks.length} 条记录
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无采集任务记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const status = statusConfig[task.status] || statusConfig.failed;
                const duration = task.duration_seconds
                  ? task.duration_seconds < 60
                    ? `${task.duration_seconds}s`
                    : `${Math.floor(task.duration_seconds / 60)}m${task.duration_seconds % 60}s`
                  : '-';

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    {/* 状态图标 */}
                    <div className={`p-1.5 rounded-md ${status.class} bg-opacity-50`}>
                      {status.icon}
                    </div>

                    {/* 任务信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {task.source_name}
                        </span>
                        <Badge className={`text-xs ${status.class}`}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span>类型: {task.source_type}</span>
                        <span>耗时: {duration}</span>
                        {task.total_count > 0 && (
                          <span>
                            总数: {task.total_count}
                            {task.new_count > 0 && ` / 新增: ${task.new_count}`}
                            {task.duplicate_count > 0 && ` / 重复: ${task.duplicate_count}`}
                          </span>
                        )}
                      </div>
                      {task.error_message && (
                        <p className="text-xs text-red-500 mt-0.5 truncate">
                          错误: {task.error_message}
                        </p>
                      )}
                    </div>

                    {/* 时间 */}
                    <div className="text-xs text-gray-400 shrink-0 text-right">
                      {task.started_at && (
                        <div>{new Date(task.started_at).toLocaleDateString()}</div>
                      )}
                      {task.started_at && (
                        <div className="text-gray-300">
                          {new Date(task.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
