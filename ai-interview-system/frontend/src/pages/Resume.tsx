/**
 * 简历管理页面 - 上传、解析、预览、删除简历
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  User,
  Phone,
  Mail,
  GraduationCap,
  Briefcase,
  Wrench,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useResumeStore } from '@/stores/resumeStore';
import { formatFileSize, formatDate } from '@/lib/utils';
import type { Resume } from '@/types';

export default function ResumePage() {
  const navigate = useNavigate();
  const {
    resumes,
    isLoading,
    isUploading,
    isParsing,
    error,
    fetchResumes,
    uploadResume,
    parseResume,
    deleteResume,
  } = useResumeStore();

  const [dragOver, setDragOver] = useState(false);
  const [viewResume, setViewResume] = useState<Resume | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  // 处理文件上传
  const processFile = async (file: File) => {
    // 校验文件类型
    const allowedTypes = ['application/pdf', 'text/plain'];
    const allowedExts = ['.pdf', '.doc', '.docx', '.txt'];
    const isValidType = allowedTypes.includes(file.type) || 
      allowedExts.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      alert('请上传 PDF、DOC、DOCX 或 TXT 格式的文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      return;
    }

    const resume = await uploadResume(file);
    if (resume) {
      // 自动解析
      await parseResume(resume.id);
    }
  };

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  }, []);

  // 解析简历
  const handleParse = async (id: number) => {
    await parseResume(id);
  };

  // 删除简历
  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这份简历吗？此操作不可恢复。')) {
      await deleteResume(id);
    }
  };

  // 解析 JSON 字段
  const parseJsonField = (field: string | undefined) => {
    if (!field) return null;
    try {
      return JSON.parse(field);
    } catch {
      return field;
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">简历管理</h1>
        <p className="text-gray-600 mt-1">上传简历，AI 将自动解析关键信息用于面试</p>
      </div>

      {/* 上传区域 */}
      <Card className={`mb-8 border-2 border-dashed transition-colors ${
        dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}>
        <CardContent className="pt-6">
          <div
            className="text-center py-8 cursor-pointer"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                <p className="text-gray-600">正在上传...</p>
              </div>
            ) : isParsing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                <p className="text-gray-600">正在解析简历...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-900 font-medium mb-1">
                  拖拽文件到此处，或点击选择文件
                </p>
                <p className="text-sm text-gray-500">
                  支持 PDF、DOC、DOCX、TXT 格式，最大 10MB
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* 简历列表 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          我的简历 ({resumes.length})
        </h2>

        {resumes.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">暂无简历，请上传你的第一份简历</p>
          </div>
        )}

        {resumes.map((resume) => (
          <Card key={resume.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* 简历头部信息 */}
              <div className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {resume.name || resume.filename}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                    <span>{formatFileSize(resume.file_size)}</span>
                    <span>{formatDate(resume.uploaded_at)}</span>
                    {resume.parsed_at ? (
                      <Badge variant="success" className="text-xs">已解析</Badge>
                    ) : (
                      <Badge variant="warning" className="text-xs">待解析</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!resume.parsed_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleParse(resume.id)}
                      disabled={isParsing}
                    >
                      {isParsing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span className="ml-1 hidden sm:inline">解析</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewResume(resume)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (resume.parsed_at) {
                        navigate('/interview/setup');
                      } else {
                        alert('请先解析简历');
                      }
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(resume.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 展开/收起解析结果 */}
              {resume.parsed_at && (
                <>
                  <button
                    className="w-full flex items-center justify-center py-2 text-sm text-gray-500 hover:bg-gray-50 border-t"
                    onClick={() => setExpandedId(expandedId === resume.id ? null : resume.id)}
                  >
                    {expandedId === resume.id ? (
                      <>
                        收起详情 <ChevronUp className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        查看解析结果 <ChevronDown className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                  
                  {expandedId === resume.id && resume.parsed_data && (
                    <div className="px-4 pb-4 bg-gray-50 border-t">
                      <div className="grid sm:grid-cols-2 gap-4 mt-4">
                        {/* 基本信息 */}
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" /> 基本信息
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">姓名：</span>{resume.name || '未识别'}</p>
                            <p className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {resume.phone || '未识别'}
                            </p>
                            <p className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {resume.email || '未识别'}
                            </p>
                          </div>
                        </div>
                        
                        {/* 技能 */}
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-green-500" /> 技能
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {resume.parsed_data.skills && Array.isArray(resume.parsed_data.skills) ? (
                              resume.parsed_data.skills.map((skill: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                              ))
                            ) : resume.skills ? (
                              resume.skills.split(',').map((s, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{s.trim()}</Badge>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">未识别</span>
                            )}
                          </div>
                        </div>
                        
                        {/* 工作经历 */}
                        <div className="bg-white rounded-lg p-4 sm:col-span-2">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-purple-500" /> 工作经历
                          </h4>
                          <div className="space-y-3">
                            {resume.parsed_data.work_experience && Array.isArray(resume.parsed_data.work_experience) ? (
                              resume.parsed_data.work_experience.map((exp: any, i: number) => (
                                <div key={i} className="text-sm border-l-2 border-purple-200 pl-3">
                                  <p className="font-medium">{exp.company} · {exp.position}</p>
                                  <p className="text-gray-500">{exp.period}</p>
                                  <p className="text-gray-600 mt-1">{exp.description}</p>
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">未识别</span>
                            )}
                          </div>
                        </div>
                        
                        {/* 教育背景 */}
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-orange-500" /> 教育背景
                          </h4>
                          <div className="space-y-2">
                            {resume.parsed_data.education && Array.isArray(resume.parsed_data.education) ? (
                              resume.parsed_data.education.map((edu: any, i: number) => (
                                <div key={i} className="text-sm">
                                  <p className="font-medium">{edu.school}</p>
                                  <p className="text-gray-500">{edu.major} · {edu.degree}</p>
                                  <p className="text-gray-400">{edu.period}</p>
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">未识别</span>
                            )}
                          </div>
                        </div>
                        
                        {/* 自我评价 */}
                        {resume.parsed_data.self_evaluation && (
                          <div className="bg-white rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-3">自我评价</h4>
                            <p className="text-sm text-gray-600">{resume.parsed_data.self_evaluation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 查看详情对话框 */}
      <Dialog open={!!viewResume} onOpenChange={() => setViewResume(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>简历详情</DialogTitle>
            <DialogDescription>{viewResume?.filename}</DialogDescription>
          </DialogHeader>
          {viewResume?.parsed_data ? (
            <div className="space-y-4 mt-4">
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(viewResume.parsed_data, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">简历尚未解析</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
