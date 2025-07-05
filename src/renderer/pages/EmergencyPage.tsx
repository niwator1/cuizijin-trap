import React, { useState } from 'react';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

interface EmergencyAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  danger: boolean;
  action: () => Promise<void>;
}

const EmergencyPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<EmergencyAction | null>(null);

  // 重置网站拦截
  const handleResetSiteBlocking = async () => {
    try {
      const response = await window.electronAPI.invoke('sites:reset');
      if (response.success) {
        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '重置成功',
            message: '所有网站拦截规则已清除'
          });
        }
      } else {
        throw new Error(response.error || '重置网站拦截失败');
      }
    } catch (error) {
      console.error('Reset site blocking error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '重置失败',
          message: '网站拦截重置失败，请重试'
        });
      }
    }
  };

  // 重置代理设置
  const handleResetProxy = async () => {
    try {
      const response = await window.electronAPI.invoke('proxy:reset');
      if (response.success) {
        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '重置成功',
            message: '代理设置已恢复默认值'
          });
        }
      } else {
        throw new Error(response.error || '重置代理设置失败');
      }
    } catch (error) {
      console.error('Reset proxy error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '重置失败',
          message: '代理设置重置失败，请重试'
        });
      }
    }
  };

  // 重置用户配置
  const handleResetUserConfig = async () => {
    try {
      const response = await window.electronAPI.invoke('config:reset');
      if (response.success) {
        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '重置成功',
            message: '用户配置已恢复默认值'
          });
        }
      } else {
        throw new Error(response.error || '重置用户配置失败');
      }
    } catch (error) {
      console.error('Reset user config error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '重置失败',
          message: '用户配置重置失败，请重试'
        });
      }
    }
  };

  // 完全重置应用
  const handleFullReset = async () => {
    try {
      const response = await window.electronAPI.invoke('app:fullReset');
      if (response.success) {
        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '重置成功',
            message: '应用程序已完全重置，即将重启'
          });
        }
        // 延迟重启应用
        setTimeout(() => {
          window.electronAPI.invoke('app:restart');
        }, 2000);
      } else {
        throw new Error(response.error || '完全重置失败');
      }
    } catch (error) {
      console.error('Full reset error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '重置失败',
          message: '应用完全重置失败，请重试'
        });
      }
    }
  };

  // 清除所有数据
  const handleClearAllData = async () => {
    try {
      const response = await window.electronAPI.invoke('data:clearAll');
      if (response.success) {
        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '清除成功',
            message: '所有应用数据已清除'
          });
        }
      } else {
        throw new Error(response.error || '清除数据失败');
      }
    } catch (error) {
      console.error('Clear all data error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '清除失败',
          message: '数据清除失败，请重试'
        });
      }
    }
  };

  // 强制停止所有服务
  const handleStopAllServices = async () => {
    try {
      const response = await window.electronAPI.invoke('services:stopAll');
      if (response.success) {
        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '停止成功',
            message: '所有服务已强制停止'
          });
        }
      } else {
        throw new Error(response.error || '停止服务失败');
      }
    } catch (error) {
      console.error('Stop all services error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '停止失败',
          message: '服务停止失败，请重试'
        });
      }
    }
  };

  // 紧急操作列表
  const emergencyActions: EmergencyAction[] = [
    {
      id: 'reset-sites',
      title: '重置网站拦截',
      description: '清除所有网站拦截规则，恢复正常网络访问',
      icon: '🌐',
      danger: false,
      action: handleResetSiteBlocking
    },
    {
      id: 'reset-proxy',
      title: '重置代理设置',
      description: '恢复代理服务器的默认配置',
      icon: '🔄',
      danger: false,
      action: handleResetProxy
    },
    {
      id: 'stop-services',
      title: '停止所有服务',
      description: '强制停止代理服务和网站拦截功能',
      icon: '⏹️',
      danger: false,
      action: handleStopAllServices
    },
    {
      id: 'reset-config',
      title: '重置用户配置',
      description: '恢复所有用户设置为默认值',
      icon: '⚙️',
      danger: true,
      action: handleResetUserConfig
    },
    {
      id: 'clear-data',
      title: '清除所有数据',
      description: '删除所有应用数据，包括日志和缓存',
      icon: '🗑️',
      danger: true,
      action: handleClearAllData
    },
    {
      id: 'full-reset',
      title: '完全重置应用',
      description: '重置所有设置和数据，应用将重启',
      icon: '💥',
      danger: true,
      action: handleFullReset
    }
  ];

  // 执行紧急操作
  const executeAction = async (action: EmergencyAction) => {
    setSelectedAction(action);
    if (action.danger) {
      setShowConfirmModal(true);
    } else {
      await performAction(action);
    }
  };

  // 执行操作
  const performAction = async (action: EmergencyAction) => {
    setIsLoading(true);
    try {
      await action.action();
    } finally {
      setIsLoading(false);
      setShowConfirmModal(false);
      setSelectedAction(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题和警告 */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          紧急重置
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          当应用程序出现问题时，您可以使用以下紧急操作来恢复正常状态。
          请谨慎操作，某些操作不可撤销。
        </p>
      </div>

      {/* 警告提示 */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              注意事项
            </h3>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
              <li>• 标记为危险的操作将永久删除数据，无法恢复</li>
              <li>• 建议在执行重置操作前导出重要配置</li>
              <li>• 某些操作可能需要重启应用程序</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 紧急操作网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {emergencyActions.map((action) => (
          <div
            key={action.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border-2 transition-all hover:shadow-xl ${
              action.danger
                ? 'border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                  action.danger
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  {action.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {action.title}
                  </h3>
                  {action.danger && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      危险操作
                    </span>
                  )}
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {action.description}
              </p>

              <Button
                variant={action.danger ? 'danger' : 'primary'}
                onClick={() => executeAction(action)}
                loading={isLoading && selectedAction?.id === action.id}
                disabled={isLoading}
                className="w-full"
              >
                {action.danger ? '执行危险操作' : '执行操作'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* 快速操作 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            快速操作
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="secondary"
              onClick={() => window.electronAPI.invoke('app:restart')}
              className="w-full"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重启应用程序
            </Button>

            <Button
              variant="secondary"
              onClick={() => window.electronAPI.invoke('app:openLogsFolder')}
              className="w-full"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              打开日志文件夹
            </Button>
          </div>
        </div>
      </div>

      {/* 确认模态框 */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="确认危险操作"
      >
        {selectedAction && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-2xl">
                  {selectedAction.icon}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {selectedAction.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedAction.description}
                </p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                    警告：此操作不可撤销
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    执行此操作将永久删除相关数据，无法恢复。请确认您了解此操作的后果。
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button
                variant="danger"
                onClick={() => selectedAction && performAction(selectedAction)}
                loading={isLoading}
              >
                确认执行
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EmergencyPage;
