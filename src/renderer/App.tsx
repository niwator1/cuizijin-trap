import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { ROUTES } from '@shared/constants';

// 页面组件
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import LogsPage from './pages/LogsPage';
import EmergencyPage from './pages/EmergencyPage';
import NotificationHistoryPage from './pages/NotificationHistoryPage';

// 布局组件
import Layout from './components/layout/Layout';

// 通用组件
import LoadingScreen from './components/common/LoadingScreen';
import NotificationContainer from './components/common/NotificationContainer';
import AdvancedNotificationContainer from './components/common/AdvancedNotificationContainer';
import SessionMonitor from './components/common/SessionMonitor';
import { ExitPasswordDialog } from './components/ExitPasswordDialog';
import { realtimeNotificationService } from './services/RealtimeNotificationService';
import { themeService } from './services/ThemeService';

// 路由守卫组件
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAppStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { 
    isAuthenticated, 
    isLoading, 
    theme,
    initialize,
    checkAuth 
  } = useAppStore();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // 应用初始化
  useEffect(() => {
    const initApp = async () => {
      try {
        // 初始化应用状态
        await initialize();
        
        // 检查认证状态
        await checkAuth();

        // 初始化实时通知服务
        realtimeNotificationService.enable();

        // 初始化主题服务
        themeService.setTheme(theme);

        setIsInitialized(true);
      } catch (error) {
        console.error('App initialization failed:', error);
        setIsInitialized(true); // 即使失败也要显示界面
      }
    };

    initApp();
  }, [initialize, checkAuth]);

  // 监听退出密码请求
  useEffect(() => {
    const handleExitPasswordRequest = () => {
      setShowExitDialog(true);
    };

    if (window.electronAPI) {
      window.electronAPI.on('request-exit-password', handleExitPasswordRequest);
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeListener('request-exit-password', handleExitPasswordRequest);
      }
    };
  }, []);

  // 主题切换
  useEffect(() => {
    // 同步store中的主题到ThemeService
    if (themeService.getTheme() !== theme) {
      themeService.setTheme(theme);
    }
  }, [theme]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + Q: 退出应用
      if ((event.metaKey || event.ctrlKey) && event.key === 'q') {
        event.preventDefault();
        if (window.electronAPI) {
          window.electronAPI.app.quit();
        }
      }
      
      // Cmd/Ctrl + R: 刷新应用
      if ((event.metaKey || event.ctrlKey) && event.key === 'r') {
        event.preventDefault();
        window.location.reload();
      }
      
      // Cmd/Ctrl + ,: 打开设置
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        // 导航到设置页面的逻辑
      }
      
      // Escape: 紧急重置（需要确认）
      if (event.key === 'Escape' && event.shiftKey && event.ctrlKey) {
        event.preventDefault();
        // 触发紧急重置的逻辑
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 处理退出密码验证
  const handleExitPasswordConfirm = async (password: string): Promise<boolean> => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.invoke('auth:verify', password);

        if (result.success) {
          // 密码正确，通知主进程可以退出
          window.electronAPI.send('exit-password-result', true);
          setShowExitDialog(false);
          return true;
        } else {
          // 密码错误
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Exit password verification error:', error);
      return false;
    }
  };

  // 处理取消退出
  const handleExitPasswordCancel = () => {
    setShowExitDialog(false);
    if (window.electronAPI) {
      window.electronAPI.send('exit-password-result', false);
    }
  };

  // 应用未初始化时显示加载界面
  if (!isInitialized) {
    return <LoadingScreen message="正在初始化应用..." />;
  }

  return (
    <div className="app min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Routes>
        {/* 登录页面 */}
        <Route 
          path={ROUTES.LOGIN} 
          element={
            isAuthenticated ? (
              <Navigate to={ROUTES.DASHBOARD} replace />
            ) : (
              <LoginPage />
            )
          } 
        />
        
        {/* 受保护的路由 */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  {/* 主控制台 */}
                  <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
                  
                  {/* 设置页面 */}
                  <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />

                  {/* 日志页面 */}
                  <Route path={ROUTES.LOGS} element={<LogsPage />} />

                  {/* 紧急重置页面 */}
                  <Route path={ROUTES.EMERGENCY} element={<EmergencyPage />} />

                  {/* 通知历史页面 */}
                  <Route path="/notifications" element={<NotificationHistoryPage />} />

                  {/* 默认重定向到控制台 */}
                  <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
                  
                  {/* 404页面 */}
                  <Route 
                    path="*" 
                    element={
                      <div className="flex items-center justify-center min-h-screen">
                        <div className="text-center">
                          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            404
                          </h1>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">
                            页面未找到
                          </p>
                          <button
                            onClick={() => window.history.back()}
                            className="btn-primary"
                          >
                            返回上一页
                          </button>
                        </div>
                      </div>
                    } 
                  />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* 全局通知容器 */}
      <NotificationContainer />
      <AdvancedNotificationContainer />

      {/* 会话监控组件 */}
      <SessionMonitor />

      {/* 退出密码验证对话框 */}
      <ExitPasswordDialog
        isOpen={showExitDialog}
        onClose={handleExitPasswordCancel}
        onConfirm={handleExitPasswordConfirm}
      />
    </div>
  );
};

export default App;
