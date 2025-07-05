import React, { useEffect, useState } from 'react';
import Button from '../common/Button';

interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  data?: any;
}

interface SecurityStatus {
  overall: 'secure' | 'warning' | 'critical';
  processProtection: {
    enabled: boolean;
    watchdogActive: boolean;
    protectedProcesses: number;
    lastHeartbeat: string;
  };
  configEncryption: {
    initialized: boolean;
    keyPath: string;
    algorithm: string;
  };
  antiBypass: {
    monitoring: boolean;
  };
  recentEvents: SecurityEvent[];
  lastCheck: string;
}

interface SecurityControlProps {
  className?: string;
}

const SecurityControl: React.FC<SecurityControlProps> = ({ className = '' }) => {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // 页面加载时获取安全状态
  useEffect(() => {
    loadSecurityStatus();
    loadSecurityEvents();
    
    // 定期刷新状态
    const interval = setInterval(() => {
      loadSecurityStatus();
    }, 30000); // 30秒刷新一次
    
    return () => clearInterval(interval);
  }, []);

  // 加载安全状态
  const loadSecurityStatus = async () => {
    try {
      const response = await window.electronAPI.security.getStatus();
      if (response.success && response.data) {
        setSecurityStatus(response.data);
      }
    } catch (error) {
      console.error('Load security status error:', error);
    }
  };

  // 加载安全事件
  const loadSecurityEvents = async () => {
    try {
      const response = await window.electronAPI.security.getEvents(20);
      if (response.success && response.data) {
        setSecurityEvents(response.data);
      }
    } catch (error) {
      console.error('Load security events error:', error);
    }
  };

  // 执行安全扫描
  const handleSecurityScan = async () => {
    setIsScanning(true);
    try {
      const response = await window.electronAPI.security.performScan();
      if (response.success) {
        await loadSecurityStatus();
        await loadSecurityEvents();
      } else {
        console.error('Security scan failed:', response.error);
      }
    } catch (error) {
      console.error('Security scan error:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // 清理安全事件
  const handleClearEvents = async () => {
    setIsLoading(true);
    try {
      const response = await window.electronAPI.security.clearEvents();
      if (response.success) {
        setSecurityEvents([]);
      } else {
        console.error('Clear events failed:', response.error);
      }
    } catch (error) {
      console.error('Clear events error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取状态颜色和图标
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'secure':
        return {
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          text: '安全',
          icon: '🛡️'
        };
      case 'warning':
        return {
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          text: '警告',
          icon: '⚠️'
        };
      case 'critical':
        return {
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          text: '危险',
          icon: '🚨'
        };
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          text: '未知',
          icon: '❓'
        };
    }
  };

  // 获取事件严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-orange-600 dark:text-orange-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!securityStatus) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(securityStatus.overall);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          安全控制中心
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* 整体安全状态 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${statusInfo.bgColor}`}>
              <span className="text-2xl">{statusInfo.icon}</span>
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                系统安全状态
              </h4>
              <p className={`text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.text}
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={handleSecurityScan}
              disabled={isScanning}
              className="min-w-[100px]"
            >
              {isScanning ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  扫描中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  安全扫描
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 安全模块状态 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              进程保护
            </h5>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${securityStatus.processProtection.enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {securityStatus.processProtection.enabled ? '已启用' : '已禁用'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              保护进程: {securityStatus.processProtection.protectedProcesses}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              配置加密
            </h5>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${securityStatus.configEncryption.initialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {securityStatus.configEncryption.initialized ? '已初始化' : '未初始化'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              算法: {securityStatus.configEncryption.algorithm}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              防绕过监控
            </h5>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${securityStatus.antiBypass.monitoring ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {securityStatus.antiBypass.monitoring ? '监控中' : '已停止'}
              </span>
            </div>
          </div>
        </div>

        {/* 最近安全事件 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              最近安全事件
            </h5>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearEvents}
              disabled={isLoading || securityEvents.length === 0}
            >
              清理历史
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {securityEvents.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                暂无安全事件
              </p>
            ) : (
              securityEvents.map((event, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(event.severity).replace('text-', 'bg-')}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {event.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs font-medium ${getSeverityColor(event.severity)}`}>
                        {event.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 最后检查时间 */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          最后检查: {new Date(securityStatus.lastCheck).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default SecurityControl;
