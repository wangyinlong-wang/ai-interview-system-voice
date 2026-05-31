/**
 * 统计卡片组件 - 展示题库的关键统计数据
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, TrendingUp, Calendar, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import type { QuestionStats as QuestionStatsType } from '@/types';

interface QuestionStatsProps {
  stats: QuestionStatsType | null;
  loading?: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
  loading?: boolean;
}

function StatCard({ title, value, icon, colorClass, loading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">{title}</p>
            {loading ? (
              <div className="h-6 w-16 bg-gray-100 animate-pulse rounded" />
            ) : (
              <p className="text-xl font-bold text-gray-900">{value}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${colorClass}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function QuestionStatsCards({ stats, loading }: QuestionStatsProps) {
  if (!stats && !loading) return null;

  const safeStats = stats || {
    total_count: 0,
    today_new: 0,
    week_new: 0,
    approved_count: 0,
    pending_count: 0,
    category_distribution: [],
    source_distribution: [],
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatCard
        title="总题量"
        value={safeStats.total_count}
        icon={<Database className="w-5 h-5 text-blue-600" />}
        colorClass="bg-blue-50"
        loading={loading}
      />
      <StatCard
        title="今日新增"
        value={safeStats.today_new}
        icon={<TrendingUp className="w-5 h-5 text-green-600" />}
        colorClass="bg-green-50"
        loading={loading}
      />
      <StatCard
        title="本周新增"
        value={safeStats.week_new}
        icon={<Calendar className="w-5 h-5 text-purple-600" />}
        colorClass="bg-purple-50"
        loading={loading}
      />
      <StatCard
        title="已通过"
        value={safeStats.approved_count}
        icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
        colorClass="bg-emerald-50"
        loading={loading}
      />
      <StatCard
        title="待审核"
        value={safeStats.pending_count}
        icon={<Clock className="w-5 h-5 text-orange-600" />}
        colorClass="bg-orange-50"
        loading={loading}
      />
    </div>
  );
}
