/**
 * 应用布局组件 - 侧边栏 + 顶部导航 + 内容区
 */

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  History,
  LogOut,
  ChevronRight,
  BookOpen,
  Settings,
  SlidersHorizontal,
  Database,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';

// 导航菜单项
const navItems = [
  { path: '/resume', label: '简历管理', icon: FileText },
  { path: '/interview/setup', label: '开始面试', icon: MessageSquare },
  { path: '/history', label: '历史记录', icon: History },
  { path: '/question-bank', label: '面试题库', icon: BookOpen },
];

// 管理后台菜单
const adminItems = [
  { path: '/admin/questions', label: '题库管理', icon: Settings },
  { path: '/admin/crawl', label: '采集管理', icon: Database },
  { path: '/admin/model-configs', label: '模型配置', icon: SlidersHorizontal },
];

const allMenuItems = [...navItems, ...adminItems];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside className="sticky top-0 z-40 h-screen w-20 lg:w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo 区域 */}
        <div className="h-16 flex items-center justify-center lg:justify-start px-2 lg:px-6 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="hidden lg:inline font-bold text-lg text-gray-900 truncate">
              AI 面试官
            </span>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-2 lg:p-4 space-y-1 overflow-y-auto">
          {/* 仪表盘 */}
          <button
            onClick={() => navigate('/interview/setup')}
            className={cn(
              "w-full flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 px-2 lg:px-3 py-2.5 rounded-lg text-[11px] lg:text-sm font-medium transition-colors",
              location.pathname === '/interview/setup'
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="leading-tight text-center lg:text-left">仪表盘</span>
            <ChevronRight className="hidden lg:block w-4 h-4 ml-auto opacity-50" />
          </button>

          <div className="hidden lg:block pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              功能模块
            </p>
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 px-2 lg:px-3 py-2.5 rounded-lg text-[11px] lg:text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="leading-tight text-center lg:text-left">{item.label}</span>
                <ChevronRight className="hidden lg:block w-4 h-4 ml-auto opacity-50" />
              </button>
            );
          })}

          {/* 管理后台 */}
          <div className="hidden lg:block pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              管理后台
            </p>
          </div>

          {adminItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 px-2 lg:px-3 py-2.5 rounded-lg text-[11px] lg:text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="leading-tight text-center lg:text-left">{item.label}</span>
                <ChevronRight className="hidden lg:block w-4 h-4 ml-auto opacity-50" />
              </button>
            );
          })}
        </nav>

        {/* 用户信息 */}
        <div className="p-2 lg:p-4 border-t border-gray-200">
          <div className="flex flex-col lg:flex-row items-center gap-2 lg:gap-3">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.username || '用户'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部导航栏 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-8">
          {/* 面包屑导航 */}
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <span>AI 面试官</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">
              {allMenuItems.find((item) => location.pathname.startsWith(item.path))?.label || '页面'}
            </span>
          </nav>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
