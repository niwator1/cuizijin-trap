import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import Modal from './Modal';
import Button from './Button';

interface SessionMonitorProps {
  warningThreshold?: number; // 提前多少秒警告，默认5分钟
}

const SessionMonitor: React.FC<SessionMonitorProps> = ({ 
  warningThreshold = 5 * 60 // 5分钟
}) => {
  const { 
    isAuthenticated, 
    sessionExpiresAt, 
    refreshSession, 
    logout,
    getSessionTimeRemaining 
  } = useAppStore();
  
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 监控会话状态
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) {
      setShowWarning(false);
      return;
    }

    const checkSession = () => {
      const remaining = getSessionTimeRemaining();
      setTimeRemaining(remaining);

      // 如果会话即将过期且还没有显示警告
      if (remaining <= warningThreshold && remaining > 0 && !showWarning) {
        setShowWarning(true);
      }

      // 如果会话已过期
      if (remaining <= 0) {
        setShowWarning(false);
      }
    };

    // 立即检查一次
    checkSession();

    // 每秒检查一次
    const interval = setInterval(checkSession, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, sessionExpiresAt, warningThreshold, showWarning, getSessionTimeRemaining]);

  // 处理会话刷新
  const handleRefreshSession = async () => {
    setIsRefreshing(true);
    try {
      await refreshSession();
      setShowWarning(false);
    } catch (error) {
      console.error('Failed to refresh session:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 处理登出
  const handleLogout = async () => {
    setShowWarning(false);
    await logout();
  };

  // 格式化剩余时间
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  };

  if (!showWarning) {
    return null;
  }

  return (
    <Modal
      isOpen={showWarning}
      onClose={() => setShowWarning(false)}
      title="会话即将过期"
      size="sm"
    >
      <div className="text-center space-y-4">
        <div className="text-yellow-600 dark:text-yellow-400">
          <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div>
          <p className="text-gray-900 dark:text-white mb-2">
            您的登录会话将在 <span className="font-bold text-red-600 dark:text-red-400">
              {formatTimeRemaining(timeRemaining)}
            </span> 后过期
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            您可以选择延长会话或重新登录
          </p>
        </div>

        <div className="flex space-x-3 justify-center">
          <Button
            variant="primary"
            onClick={handleRefreshSession}
            disabled={isRefreshing}
            className="min-w-[100px]"
          >
            {isRefreshing ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>延长中...</span>
              </div>
            ) : (
              '延长会话'
            )}
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleLogout}
            disabled={isRefreshing}
            className="min-w-[100px]"
          >
            重新登录
          </Button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>为了您的安全，系统会在一定时间后自动登出</p>
        </div>
      </div>
    </Modal>
  );
};

export default SessionMonitor;
