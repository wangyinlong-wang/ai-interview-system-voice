/**
 * 认证页面 - 登录/注册
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';

export default function Auth() {
  const navigate = useNavigate();
  const { login, register, isLoading, error, clearError } = useAuthStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearError();
    setLocalError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    
    if (!isLogin) {
      // 注册校验
      if (!formData.username || formData.username.length < 3) {
        setLocalError('用户名至少 3 个字符');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setLocalError('两次输入的密码不一致');
        return;
      }
    }
    
    if (!formData.email) {
      setLocalError('请输入邮箱');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setLocalError('密码至少 6 位');
      return;
    }

    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password });
        navigate('/interview/setup');
      } else {
        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
        navigate('/interview/setup');
      }
    } catch {
      // 错误已在 store 中处理
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-4">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AI 面试官</h1>
          <p className="text-gray-500 mt-1">{isLogin ? '登录你的账号' : '创建新账号'}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isLogin ? '用户登录' : '用户注册'}</CardTitle>
            <CardDescription>
              {isLogin
                ? '请输入邮箱和密码登录'
                : '请填写以下信息完成注册'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    用户名
                  </label>
                  <Input
                    name="username"
                    placeholder="请输入用户名（至少3位）"
                    value={formData.username}
                    onChange={handleChange}
                  />
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  邮箱地址
                </label>
                <Input
                  name="email"
                  type="email"
                  placeholder="请输入邮箱"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  密码
                </label>
                <div className="relative">
                  <Input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入密码（至少6位）"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {!isLogin && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    确认密码
                  </label>
                  <div className="relative">
                    <Input
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="请再次输入密码"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* 错误提示 */}
              {(error || localError) && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {localError || error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    处理中...
                  </>
                ) : isLogin ? (
                  '登录'
                ) : (
                  '注册'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              {isLogin ? (
                <p className="text-gray-600">
                  还没有账号？
                  <button
                    type="button"
                    className="text-blue-600 hover:underline ml-1 font-medium"
                    onClick={() => {
                      setIsLogin(false);
                      clearError();
                      setLocalError('');
                    }}
                  >
                    立即注册
                  </button>
                </p>
              ) : (
                <p className="text-gray-600">
                  已有账号？
                  <button
                    type="button"
                    className="text-blue-600 hover:underline ml-1 font-medium"
                    onClick={() => {
                      setIsLogin(true);
                      clearError();
                      setLocalError('');
                    }}
                  >
                    去登录
                  </button>
                </p>
              )}
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-gray-400 hover:text-gray-600"
                onClick={() => navigate('/')}
              >
                返回首页
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
