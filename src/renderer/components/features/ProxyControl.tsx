import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import Button from '../common/Button';
import Switch from '../common/Switch';

interface ProxyControlProps {
  className?: string;
}

const ProxyControl: React.FC<ProxyControlProps> = ({ className = '' }) => {
  const { 
    proxyStatus, 
    startProxy, 
    stopProxy, 
    refreshProxyStatus,
    isLoading 
  } = useAppStore();
  
  const [proxyConfig, setProxyConfig] = useState<any>(null);
  const [proxyStats, setProxyStats] = useState<any>(null);
  const [systemProxyEnabled, setSystemProxyEnabled] = useState<boolean>(false);
  const [systemProxyLoading, setSystemProxyLoading] = useState<boolean>(false);

  // 页面加载时获取代理状态
  useEffect(() => {
    const loadProxyInfo = async () => {
      await refreshProxyStatus();
      await loadProxyDetails();
      await checkSystemProxyStatus();
    };

    loadProxyInfo();

    // 定期刷新状态
    const interval = setInterval(() => {
      loadProxyDetails();
      checkSystemProxyStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshProxyStatus]);

  // 加载代理详细信息
  const loadProxyDetails = async () => {
    try {
      const response = await window.electronAPI.invoke('proxy:status');
      if (response.success && response.data) {
        setProxyConfig(response.data.config);
        setProxyStats(response.data.stats);
      }
    } catch (error) {
      console.error('Load proxy details error:', error);
    }
  };

  // 检查系统代理状态
  const checkSystemProxyStatus = async () => {
    try {
      const systemInfo = await window.electronAPI.invoke('system:get-info');
      if (systemInfo.success && systemInfo.data) {
        // 这里可以添加检查系统代理状态的逻辑
        // 暂时根据代理服务器状态来推断
        setSystemProxyEnabled(proxyStatus === 'running');
      }
    } catch (error) {
      console.error('Check system proxy status error:', error);
    }
  };

  // 处理代理开关
  const handleProxyToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        // 启动代理服务器
        await startProxy();

        // 自动配置系统代理
        try {
          const systemProxyResponse = await window.electronAPI.invoke('system:set-proxy', true);
          if (!systemProxyResponse.success) {
            console.warn('Failed to set system proxy:', systemProxyResponse.error);
            // 即使系统代理设置失败，也不阻止代理服务器运行
            // 用户可以手动配置浏览器代理
          }
        } catch (systemProxyError) {
          console.warn('System proxy configuration error:', systemProxyError);
        }
      } else {
        // 停止代理服务器
        await stopProxy();

        // 恢复系统代理设置
        try {
          const systemProxyResponse = await window.electronAPI.invoke('system:set-proxy', false);
          if (!systemProxyResponse.success) {
            console.warn('Failed to restore system proxy:', systemProxyResponse.error);
          }
        } catch (systemProxyError) {
          console.warn('System proxy restoration error:', systemProxyError);
        }
      }
      await loadProxyDetails();
    } catch (error) {
      console.error('Proxy toggle error:', error);
    }
  };

  // 重启代理服务器
  const handleRestart = async () => {
    try {
      const response = await window.electronAPI.invoke('proxy:restart');
      if (response.success) {
        await loadProxyDetails();
      } else {
        throw new Error(response.error || '重启代理失败');
      }
    } catch (error) {
      console.error('Restart proxy error:', error);
    }
  };

  // 手动控制系统代理
  const handleSystemProxyToggle = async (enabled: boolean) => {
    setSystemProxyLoading(true);
    try {
      const response = await window.electronAPI.invoke('system:set-proxy', enabled);
      if (response.success) {
        setSystemProxyEnabled(enabled);
      } else {
        throw new Error(response.error || '设置系统代理失败');
      }
    } catch (error) {
      console.error('System proxy toggle error:', error);
    } finally {
      setSystemProxyLoading(false);
    }
  };

  // 获取状态颜色和图标
  const getStatusInfo = () => {
    switch (proxyStatus) {
      case 'running':
        return {
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          text: '运行中',
          icon: '🟢'
        };
      case 'stopped':
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          text: '已停止',
          icon: '⚫'
        };
      case 'starting':
        return {
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          text: '启动中...',
          icon: '🔵'
        };
      case 'stopping':
        return {
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          text: '停止中...',
          icon: '🟠'
        };
      case 'error':
        return {
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          text: '错误',
          icon: '🔴'
        };
      default:
        return {
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          text: '未知',
          icon: '🟡'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const isRunning = proxyStatus === 'running';
  const isTransitioning = proxyStatus === 'starting' || proxyStatus === 'stopping';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          代理服务器控制
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* 状态显示 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${statusInfo.bgColor}`}>
              <span className="text-2xl">{statusInfo.icon}</span>
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                代理服务器
              </h4>
              <p className={`text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.text}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Switch
              checked={isRunning}
              onChange={handleProxyToggle}
              disabled={isLoading || isTransitioning}
              size="lg"
            />
          </div>
        </div>

        {/* 系统代理状态 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                系统代理设置
              </h5>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {systemProxyEnabled ? '已启用 - 浏览器流量将通过代理服务器' : '未启用 - 需要手动配置浏览器代理'}
              </p>
            </div>
            <Switch
              checked={systemProxyEnabled}
              onChange={handleSystemProxyToggle}
              disabled={systemProxyLoading || !isRunning}
              size="sm"
            />
          </div>
        </div>

        {/* 配置信息 */}
        {proxyConfig && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                HTTP代理
              </h5>
              <p className="text-lg font-mono text-gray-900 dark:text-white">
                {proxyConfig.bindAddress}:{proxyConfig.httpPort}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                HTTPS代理
              </h5>
              <p className="text-lg font-mono text-gray-900 dark:text-white">
                {proxyConfig.bindAddress}:{proxyConfig.httpsPort}
              </p>
            </div>
          </div>
        )}

        {/* 统计信息 */}
        {proxyStats && isRunning && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {proxyStats.totalRequests}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                总请求数
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {proxyStats.blockedRequests}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                已拦截
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {proxyStats.allowedRequests}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                已允许
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.floor(proxyStats.uptime / 1000)}s
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                运行时间
              </p>
            </div>
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex space-x-3 justify-center">
          <Button
            variant="secondary"
            onClick={handleRestart}
            disabled={isLoading || isTransitioning || !isRunning}
            className="min-w-[100px]"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重启代理
          </Button>
          
          <Button
            variant="ghost"
            onClick={loadProxyDetails}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            刷新状态
          </Button>
        </div>

        {/* 使用说明 */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h5 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
            使用说明
          </h5>
          <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
            <li>• <strong>推荐方式</strong>：启用"系统代理设置"，自动配置所有浏览器</li>
            <li>• <strong>手动方式</strong>：在浏览器中配置代理 {proxyConfig?.bindAddress || '127.0.0.1'}:{proxyConfig?.httpPort || '8080'}</li>
            <li>• 代理启动后会自动拦截已启用的黑名单网站</li>
            <li>• 修改网站启用状态后拦截规则会立即更新</li>
            <li>• 支持HTTP和HTTPS网站拦截</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProxyControl;
