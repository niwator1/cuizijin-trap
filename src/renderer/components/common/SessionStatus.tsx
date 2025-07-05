import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

interface SessionStatusProps {
  className?: string;
  showDetails?: boolean;
}

const SessionStatus: React.FC<SessionStatusProps> = ({ 
  className = '',
  showDetails = false 
}) => {
  const { 
    isAuthenticated, 
    sessionExpiresAt, 
    getSessionTimeRemaining 
  } = useAppStore();
  
  const [timeRemaining, setTimeRemaining] = useState(0);

  // 更新剩余时间
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) {
      return;
    }

    const updateTime = () => {
      const remaining = getSessionTimeRemaining();
      setTimeRemaining(remaining);
    };

    // 立即更新一次
    updateTime();

    // 每秒更新一次
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, sessionExpiresAt, getSessionTimeRemaining]);

  // 格式化剩余时间
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return '已过期';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}时${minutes}分`;
    } else if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    } else {
      return `${remainingSeconds}秒`;
    }
  };

  // 获取状态颜色
  const getStatusColor = (seconds: number): string => {
    if (seconds <= 0) return 'text-red-600 dark:text-red-400';
    if (seconds <= 5 * 60) return 'text-yellow-600 dark:text-yellow-400'; // 5分钟内
    if (seconds <= 15 * 60) return 'text-orange-600 dark:text-orange-400'; // 15分钟内
    return 'text-green-600 dark:text-green-400';
  };

  // 获取状态图标
  const getStatusIcon = (seconds: number): JSX.Element => {
    if (seconds <= 0) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (seconds <= 5 * 60) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`flex items-center space-x-1 ${getStatusColor(timeRemaining)}`}>
        {getStatusIcon(timeRemaining)}
        <span className="text-sm font-medium">
          {timeRemaining > 0 ? '会话有效' : '会话过期'}
        </span>
      </div>
      
      {showDetails && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span>剩余: {formatTimeRemaining(timeRemaining)}</span>
          {sessionExpiresAt && (
            <span className="ml-2">
              (至 {sessionExpiresAt.toLocaleTimeString()})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionStatus;
