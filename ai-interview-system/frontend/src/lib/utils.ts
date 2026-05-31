/**
 * 工具函数库
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 tailwind 类名 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 格式化日期 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 格式化文件大小 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/** 截断文本 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/** 获取分数等级和颜色 */
export function getScoreLevel(score: number): { level: string; color: string } {
  if (score >= 90) return { level: '优秀', color: 'text-green-600' };
  if (score >= 80) return { level: '良好', color: 'text-blue-600' };
  if (score >= 70) return { level: '一般', color: 'text-yellow-600' };
  if (score >= 60) return { level: '较差', color: 'text-orange-600' };
  return { level: '不合格', color: 'text-red-600' };
}

/** 获取分数进度条颜色 */
export function getScoreColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 80) return 'bg-blue-500';
  if (score >= 70) return 'bg-yellow-500';
  if (score >= 60) return 'bg-orange-500';
  return 'bg-red-500';
}

/** 生成唯一 ID */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

/** 防抖函数 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

/** 睡眠函数 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 从映射中获取标签 */
export function getLabelFromValue(
  value: string,
  options: { value: string; label: string }[]
): string {
  return options.find((o) => o.value === value)?.label || value;
}
