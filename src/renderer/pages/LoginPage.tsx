import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { ROUTES } from '@shared/constants';

interface LoginPageProps {}

const LoginPage: React.FC<LoginPageProps> = () => {
  const navigate = useNavigate();
  const { login, isLoading, setLoading } = useAppStore();
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [isCheckingInit, setIsCheckingInit] = useState(true);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settings, setSettings] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'zh-CN',
    sessionTimeout: 3600,
    autoStart: false
  });

  // 计算表单是否有效
  const isFormValid = () => {
    if (isInitialSetup) {
      return password.trim().length >= 6 &&
             confirmPassword.trim().length > 0 &&
             password === confirmPassword;
    } else {
      return password.trim().length > 0;
    }
  };

  // 强制重新检查初始化状态
  const forceCheckInitialization = async () => {
    try {
      setIsCheckingInit(true);
      setError('');
      const response = await window.electronAPI.invoke('auth:check-initialized');
      if (response.success) {
        setIsInitialSetup(!response.data);
        console.log('Initialization check result:', response.data);
      } else {
        setError('检查初始化状态失败: ' + (response.error || '未知错误'));
        // 如果检查失败，默认显示初始设置界面
        setIsInitialSetup(true);
      }
    } catch (error) {
      console.error('Check initialization error:', error);
      setError('检查初始化状态时发生错误');
      // 如果检查失败，默认显示初始设置界面
      setIsInitialSetup(true);
    } finally {
      setIsCheckingInit(false);
    }
  };

  // 检查用户是否已初始化
  useEffect(() => {
    forceCheckInitialization();
  }, []);

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    try {
      setLoading(true);
      const success = await login(password);
      
      if (success) {
        navigate(ROUTES.DASHBOARD);
      } else {
        setError('密码错误，请重试');
        setPassword('');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理重置应用
  const handleResetApp = async () => {
    if (!confirm('确定要重置应用吗？这将清除所有数据，包括用户配置和网站黑名单。')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await window.electronAPI.invoke('auth:reset-app');

      if (response.success) {
        // 重置成功，重新检查初始化状态
        setPassword('');
        setConfirmPassword('');
        setError('');

        // 强制重新检查初始化状态
        await forceCheckInitialization();

        alert('应用已重置，请重新设置密码');
      } else {
        setError(response.error || '重置失败');
      }
    } catch (error) {
      console.error('Reset error:', error);
      setError('重置过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  // 处理初始设置
  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    try {
      setLoading(true);
      const response = await window.electronAPI.invoke('auth:initialize', password, settings);

      if (response.success) {
        // 初始化成功后自动登录
        const loginSuccess = await login(password);
        if (loginSuccess) {
          navigate(ROUTES.DASHBOARD);
        } else {
          setError('初始化成功，但登录失败');
        }
      } else {
        setError(response.error || '初始化失败');
      }
    } catch (error) {
      console.error('Initialize error:', error);
      setError('初始化过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  // 加载中状态
  if (isCheckingInit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在检查初始化状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 应用图标和标题 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold">崔</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            崔子瑾诱捕器
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isInitialSetup ? '首次设置' : '请输入密码以继续'}
          </p>
        </div>

        {/* 登录/设置表单 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
          <form onSubmit={isInitialSetup ? handleInitialSetup : handleLogin} className="space-y-6">
            {/* 密码输入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isInitialSetup ? '设置密码' : '密码'}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && isInitialSetup && !e.shiftKey) {
                      e.preventDefault();
                      document.getElementById('confirmPassword')?.focus();
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                  placeholder={isInitialSetup ? '请设置一个安全的密码' : '请输入密码'}
                  disabled={isLoading}
                  autoFocus
                  tabIndex={1}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 确认密码（仅初始设置时显示） */}
            {isInitialSetup && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  确认密码
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isFormValid()) {
                      e.preventDefault();
                      const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                      submitButton?.click();
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                  placeholder="请再次输入密码"
                  disabled={isLoading}
                  tabIndex={2}
                />
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isInitialSetup ? '正在初始化...' : '正在登录...'}
                </div>
              ) : (
                isInitialSetup ? '完成设置' : '登录'
              )}
            </button>
          </form>

          {/* 密码提示 */}
          {isInitialSetup && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">密码要求：</h4>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                <li>• 至少6个字符</li>
                <li>• 建议包含字母和数字</li>
                <li>• 请妥善保管，忘记密码需要重置应用</li>
              </ul>
            </div>
          )}

          {/* 重置选项 */}
          {!isInitialSetup && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleResetApp}
                disabled={isLoading}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                忘记密码？重置应用
              </button>
            </div>
          )}
        </div>

        {/* 版本信息 */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            版本 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
