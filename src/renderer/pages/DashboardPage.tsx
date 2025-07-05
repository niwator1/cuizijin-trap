import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import StatsCards from '../components/features/StatsCards';
import AddSiteForm from '../components/features/AddSiteForm';
import SiteList from '../components/features/SiteList';
import ProxyControl from '../components/features/ProxyControl';
import SecurityControl from '../components/features/SecurityControl';
import Button from '../components/common/Button';

const DashboardPage: React.FC = () => {
  const {
    blockedSites,
    loadBlockedSites,
    loadStats,
    refreshProxyStatus,
    resetAllSites,
    isLoading
  } = useAppStore();

  // 页面加载时刷新数据
  useEffect(() => {
    const refreshData = async () => {
      await Promise.all([
        loadBlockedSites(),
        loadStats(),
        refreshProxyStatus()
      ]);
    };

    refreshData();
  }, [loadBlockedSites, loadStats, refreshProxyStatus]);

  const handleResetAll = async () => {
    if (window.confirm('确定要重置所有网站的拦截状态吗？这将禁用所有网站的拦截功能。')) {
      try {
        await resetAllSites();
      } catch (error) {
        console.error('Reset all sites error:', error);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            控制台
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理网站访问控制和查看拦截统计
          </p>
        </div>

        {blockedSites.length > 0 && (
          <Button
            variant="danger"
            onClick={handleResetAll}
            disabled={isLoading}
            className="ml-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重置所有
          </Button>
        )}
      </div>

      {/* 统计卡片 */}
      <StatsCards />

      {/* 代理控制 */}
      <ProxyControl />

      {/* 安全控制 */}
      <SecurityControl />

      {/* 添加网站表单 */}
      <AddSiteForm />

      {/* 网站列表 */}
      <SiteList />
    </div>
  );
};

export default DashboardPage;
