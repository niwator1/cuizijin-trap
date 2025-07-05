import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import Button from '../components/common/Button';
import Switch from '../components/common/Switch';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import ThemeSettings from '../components/settings/ThemeSettings';

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  sessionTimeout: number;
  autoStart: boolean;
  minimizeToTray: boolean;
  showNotifications: boolean;
  proxySettings: {
    httpPort: number;
    httpsPort: number;
    bindAddress: string;
    enableLogging: boolean;
  };
  securitySettings: {
    enableProcessProtection: boolean;
    enableAntiBypass: boolean;
    enableConfigEncryption: boolean;
  };
}

const SettingsPage: React.FC = () => {
  const { theme, setTheme, updateConfig, systemInfo, loadSystemInfo } = useAppStore();
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'system',
    language: 'zh-CN',
    sessionTimeout: 3600,
    autoStart: false,
    minimizeToTray: true,
    showNotifications: true,
    proxySettings: {
      httpPort: 8080,
      httpsPort: 8443,
      bindAddress: '127.0.0.1',
      enableLogging: false,
    },
    securitySettings: {
      enableProcessProtection: true,
      enableAntiBypass: true,
      enableConfigEncryption: true,
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // 页面加载时获取设置
  useEffect(() => {
    loadSettings();
    if (!systemInfo) {
      loadSystemInfo();
    }
  }, [systemInfo, loadSystemInfo]);

  // 加载设置
  const loadSettings = async () => {
    try {
      const response = await window.electronAPI.invoke('config:get');
      if (response.success && response.data) {
        setSettings(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.error('Load settings error:', error);
    }
  };

  // 保存设置
  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const response = await window.electronAPI.invoke('config:update', settings);
      if (response.success) {
        // 更新本地状态
        setTheme(settings.theme);

        // 显示成功通知
        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '设置已保存',
            message: '您的设置已成功保存'
          });
        }
      } else {
        throw new Error(response.error || '保存设置失败');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '保存失败',
          message: '设置保存失败，请重试'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 重置设置
  const handleResetSettings = async () => {
    setIsLoading(true);
    try {
      const response = await window.electronAPI.invoke('config:reset');
      if (response.success) {
        await loadSettings();
        setShowResetModal(false);

        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '设置已重置',
            message: '所有设置已恢复为默认值'
          });
        }
      } else {
        throw new Error(response.error || '重置设置失败');
      }
    } catch (error) {
      console.error('Reset settings error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '重置失败',
          message: '设置重置失败，请重试'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 导出设置
  const handleExportSettings = async () => {
    try {
      const response = await window.electronAPI.invoke('config:export');
      if (response.success) {
        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '导出成功',
            message: '设置已导出到文件'
          });
        }
      } else {
        throw new Error(response.error || '导出设置失败');
      }
    } catch (error) {
      console.error('Export settings error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '导出失败',
          message: '设置导出失败，请重试'
        });
      }
    }
  };

  // 导入设置
  const handleImportSettings = async () => {
    try {
      const response = await window.electronAPI.invoke('config:import');
      if (response.success) {
        await loadSettings();

        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '导入成功',
            message: '设置已从文件导入'
          });
        }
      } else {
        throw new Error(response.error || '导入设置失败');
      }
    } catch (error) {
      console.error('Import settings error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '导入失败',
          message: '设置导入失败，请重试'
        });
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            设置
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理应用程序配置和偏好设置
          </p>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowAboutModal(true)}
          >
            关于
          </Button>
          <Button
            onClick={saveSettings}
            loading={isLoading}
          >
            保存设置
          </Button>
        </div>
      </div>

      {/* 外观设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            外观设置
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {/* 主题设置组件 */}
          <ThemeSettings />

          {/* 语言设置 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              语言
            </label>
            <select
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="zh-CN">简体中文</option>
              <option value="zh-TW">繁體中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* 会话设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            会话设置
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              会话超时时间（秒）
            </label>
            <Input
              type="number"
              value={settings.sessionTimeout.toString()}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                sessionTimeout: parseInt(e.target.value) || 3600
              }))}
              min="300"
              max="86400"
              className="w-full"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              范围：300秒（5分钟）到 86400秒（24小时）
            </p>
          </div>
        </div>
      </div>

      {/* 系统设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            系统设置
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                开机自启动
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                系统启动时自动运行应用程序
              </p>
            </div>
            <Switch
              checked={settings.autoStart}
              onChange={(checked) => setSettings(prev => ({ ...prev, autoStart: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                最小化到系统托盘
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                关闭窗口时最小化到系统托盘而不是退出
              </p>
            </div>
            <Switch
              checked={settings.minimizeToTray}
              onChange={(checked) => setSettings(prev => ({ ...prev, minimizeToTray: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                显示通知
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                显示系统通知和提醒
              </p>
            </div>
            <Switch
              checked={settings.showNotifications}
              onChange={(checked) => setSettings(prev => ({ ...prev, showNotifications: checked }))}
            />
          </div>
        </div>
      </div>

      {/* 代理设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            代理设置
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                HTTP端口
              </label>
              <Input
                type="number"
                value={settings.proxySettings.httpPort.toString()}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  proxySettings: {
                    ...prev.proxySettings,
                    httpPort: parseInt(e.target.value) || 8080
                  }
                }))}
                min="1024"
                max="65535"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                HTTPS端口
              </label>
              <Input
                type="number"
                value={settings.proxySettings.httpsPort.toString()}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  proxySettings: {
                    ...prev.proxySettings,
                    httpsPort: parseInt(e.target.value) || 8443
                  }
                }))}
                min="1024"
                max="65535"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              绑定地址
            </label>
            <Input
              type="text"
              value={settings.proxySettings.bindAddress}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                proxySettings: {
                  ...prev.proxySettings,
                  bindAddress: e.target.value
                }
              }))}
              placeholder="127.0.0.1"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              使用 0.0.0.0 允许外部连接，127.0.0.1 仅本地连接
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                启用代理日志
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                记录代理服务器的详细日志
              </p>
            </div>
            <Switch
              checked={settings.proxySettings.enableLogging}
              onChange={(checked) => setSettings(prev => ({
                ...prev,
                proxySettings: {
                  ...prev.proxySettings,
                  enableLogging: checked
                }
              }))}
            />
          </div>
        </div>
      </div>

      {/* 安全设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            安全设置
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                启用进程保护
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                保护应用程序进程不被恶意终止
              </p>
            </div>
            <Switch
              checked={settings.securitySettings.enableProcessProtection}
              onChange={(checked) => setSettings(prev => ({
                ...prev,
                securitySettings: {
                  ...prev.securitySettings,
                  enableProcessProtection: checked
                }
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                启用防绕过检测
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                检测和阻止绕过拦截的尝试
              </p>
            </div>
            <Switch
              checked={settings.securitySettings.enableAntiBypass}
              onChange={(checked) => setSettings(prev => ({
                ...prev,
                securitySettings: {
                  ...prev.securitySettings,
                  enableAntiBypass: checked
                }
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                启用配置加密
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                加密存储敏感配置信息
              </p>
            </div>
            <Switch
              checked={settings.securitySettings.enableConfigEncryption}
              onChange={(checked) => setSettings(prev => ({
                ...prev,
                securitySettings: {
                  ...prev.securitySettings,
                  enableConfigEncryption: checked
                }
              }))}
            />
          </div>
        </div>
      </div>

      {/* 数据管理 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            数据管理
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="secondary"
              onClick={handleExportSettings}
              className="w-full"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导出设置
            </Button>

            <Button
              variant="secondary"
              onClick={handleImportSettings}
              className="w-full"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              导入设置
            </Button>

            <Button
              variant="danger"
              onClick={() => setShowResetModal(true)}
              className="w-full"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重置设置
            </Button>
          </div>
        </div>
      </div>

      {/* 重置确认模态框 */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="重置设置"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                确认重置所有设置
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                此操作将恢复所有设置为默认值，包括主题、代理配置、安全设置等。此操作不可撤销。
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowResetModal(false)}
            >
              取消
            </Button>
            <Button
              variant="danger"
              onClick={handleResetSettings}
              loading={isLoading}
            >
              确认重置
            </Button>
          </div>
        </div>
      </Modal>

      {/* 关于模态框 */}
      <Modal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        title="关于应用"
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              崔子瑾诱捕器
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              网站访问控制应用程序
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">版本</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {systemInfo?.appVersion || '1.0.0'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Electron版本</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {systemInfo?.electronVersion || 'N/A'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Node.js版本</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {systemInfo?.nodeVersion || 'N/A'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Chrome版本</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {systemInfo?.chromeVersion || 'N/A'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">操作系统</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {systemInfo?.platform || 'N/A'} {systemInfo?.arch || ''}
                </dd>
              </div>
            </dl>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              © 2024 崔子瑾诱捕器. 保留所有权利。
            </p>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowAboutModal(false)}
            >
              关闭
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
