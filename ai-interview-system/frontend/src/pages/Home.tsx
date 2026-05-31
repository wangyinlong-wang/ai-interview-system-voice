/**
 * 首页 / Landing 页 - 产品展示
 */

import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  FileText,
  BarChart3,
  Zap,
  ArrowRight,
  CheckCircle2,
  Shield,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

// 功能亮点数据
const features = [
  {
    icon: FileText,
    title: '简历智能解析',
    description: '上传简历后，AI 自动提取技能、项目经验、工作经历等关键信息，生成个性化面试问题。',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: MessageSquare,
    title: '沉浸式模拟面试',
    description: 'AI 扮演真实面试官，支持实时追问，模拟真实面试场景，支持文字对话交流。',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: BarChart3,
    title: '多维度评估报告',
    description: '从技术能力、逻辑思维、沟通表达等6个维度进行全面评分，附带详细改进建议。',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Zap,
    title: '随时随地练习',
    description: '24小时可用的 AI 面试官，无需预约，无需等待，随时开始你的面试练习。',
    color: 'bg-orange-100 text-orange-600',
  },
];

// 使用步骤
const steps = [
  { step: '01', title: '上传简历', desc: '支持 PDF、DOC、DOCX、TXT 格式' },
  { step: '02', title: '配置面试', desc: '选择岗位、难度和面试类型' },
  { step: '03', title: '开始面试', desc: '与 AI 面试官进行实时对话' },
  { step: '04', title: '查看报告', desc: '获取多维度评估和改进建议' },
];

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/interview/setup');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">AI 面试官</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                登录
              </Button>
              <Button onClick={handleStart}>免费开始</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero 区域 */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            <span>AI 驱动的面试练习平台</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            每一次练习，
            <br />
            <span className="text-blue-600">都是向 offer 更进一步</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            基于大语言模型的 AI 模拟面试系统，上传简历即可开始个性化面试训练，
            获得专业级反馈，快速补齐短板。
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={handleStart} className="gap-2 text-lg px-8">
              立即开始模拟面试
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
              注册账号
            </Button>
          </div>

          {/* 数据指标 */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div>
              <p className="text-3xl font-bold text-gray-900">15+</p>
              <p className="text-sm text-gray-500">覆盖岗位</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">6</p>
              <p className="text-sm text-gray-500">评估维度</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">24/7</p>
              <p className="text-sm text-gray-500">随时可用</p>
            </div>
          </div>
        </div>
      </section>

      {/* 功能亮点 */}
      <section className="py-20 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">核心功能</h2>
            <p className="text-gray-600">全方位提升你的面试能力</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 使用步骤 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">简单四步，开始练习</h2>
            <p className="text-gray-600">无需复杂设置，即刻开始你的面试训练</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <div key={index} className="relative text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-full">
                    <ArrowRight className="w-6 h-6 text-gray-300 mx-auto" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 优势说明 */}
      <section className="py-20 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                为什么选择 AI 面试官？
              </h2>
              <div className="space-y-4">
                {[
                  { icon: CheckCircle2, text: '基于简历内容的个性化提问，针对性强' },
                  { icon: Clock, text: '7x24 小时随时可用，不受时间和地点限制' },
                  { icon: Shield, text: '安全私密的练习环境，无需担心尴尬' },
                  { icon: BarChart3, text: '6 维度综合评估，精准定位能力短板' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="bg-blue-50 rounded-lg rounded-tl-none p-3">
                    <p className="text-sm text-gray-800">
                      你好！我是今天的面试官。请简单介绍一下你自己，以及你为什么想应聘这个岗位？
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">我</span>
                  </div>
                  <div className="bg-gray-100 rounded-lg rounded-tr-none p-3">
                    <p className="text-sm text-gray-800">
                      您好！我叫小王，毕业于浙江大学计算机专业。在校期间我参与了多个项目开发...
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="bg-blue-50 rounded-lg rounded-tl-none p-3">
                    <p className="text-sm text-gray-800">
                      很好！你提到了分布式系统项目，能详细说说你在其中负责的模块以及遇到的技术挑战吗？
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            准备好提升你的面试能力了吗？
          </h2>
          <p className="text-gray-600 mb-8">
            立即注册账号，开始你的第一次 AI 模拟面试
          </p>
          <Button size="lg" onClick={handleStart} className="gap-2 px-8">
            免费开始
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* 底部信息 */}
      <footer className="py-8 border-t border-gray-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          <p> AI 模拟面试系统 - 每一次练习，都是向 offer 更进一步</p>
        </div>
      </footer>
    </div>
  );
}
