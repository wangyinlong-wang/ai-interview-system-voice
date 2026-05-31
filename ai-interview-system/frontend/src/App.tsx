/**
 * 应用入口组件 - 路由配置和全局布局
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

// 页面组件
import Home from '@/pages/Home';
import Auth from '@/pages/Auth';
import Resume from '@/pages/Resume';
import InterviewSetup from '@/pages/InterviewSetup';
import InterviewRoom from '@/pages/InterviewRoom';
import FaceToFaceRoom from '@/pages/FaceToFaceRoom';
import InterviewReport from '@/pages/InterviewReport';
import History from '@/pages/History';
import QuestionBank from '@/pages/QuestionBank';
import QuestionManage from '@/pages/admin/QuestionManage';
import CrawlManage from '@/pages/admin/CrawlManage';
import ModelConfigManage from '@/pages/admin/ModelConfigManage';

// 布局组件
import AppLayout from '@/components/AppLayout';

// 路由守卫组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const { init } = useAuthStore();

  // 初始化认证状态
  useEffect(() => {
    init();
  }, []);

  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<Auth />} />
      
      {/* 需要登录的路由 */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/resume" element={<Resume />} />
        <Route path="/interview/setup" element={<InterviewSetup />} />
        {/* 文字面试（支持语音模式切换） */}
        <Route path="/interview/:id" element={<InterviewRoom />} />
        {/* 面对面 3D 面试（新增） */}
        <Route path="/interview/face-to-face/:id" element={<FaceToFaceRoom />} />
        <Route path="/interview/:id/report" element={<InterviewReport />} />
        <Route path="/history" element={<History />} />
        <Route path="/question-bank" element={<QuestionBank />} />
        <Route path="/admin/questions" element={<QuestionManage />} />
        <Route path="/admin/crawl" element={<CrawlManage />} />
        <Route path="/admin/model-configs" element={<ModelConfigManage />} />
      </Route>
      
      {/* 404 重定向到首页 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
