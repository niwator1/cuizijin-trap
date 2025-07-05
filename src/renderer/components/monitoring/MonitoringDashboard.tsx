import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  MessageSquare, 
  Download,
  RefreshCw,
  Calendar,
  Shield
} from 'lucide-react';

interface MonitoringStats {
  usage: {
    totalSessions: number;
    totalEvents: number;
    averageSessionDuration: number;
    recentCount: number;
  };
  blocking: {
    totalBlocked: number;
    topBlockedSites: Array<{ websiteUrl: string; count: number }>;
    recentBlocked: number;
  };
  errors: {
    total: number;
    bySeverity: Record<string, number>;
    recentCount: number;
    unreportedCount: number;
  };
  feedback: {
    total: number;
    byType: Record<string, number>;
    recentCount: number;
  };
}

export const MonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '1d':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }

      const range = {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      };

      const [usageStats, blockingStats, errorStats, feedbackStats] = await Promise.all([
        window.electronAPI.invoke('analytics:usage-stats', range),
        window.electronAPI.invoke('analytics:blocking-stats', range),
        window.electronAPI.invoke('error:stats'),
        window.electronAPI.invoke('feedback:stats')
      ]);

      setStats({
        usage: usageStats,
        blocking: blockingStats,
        errors: errorStats,
        feedback: feedbackStats
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (type: 'analytics' | 'errors' | 'feedback') => {
    try {
      let result;
      switch (type) {
        case 'analytics':
          result = await window.electronAPI.invoke('analytics:export', 'json', 'all');
          break;
        case 'errors':
          result = await window.electronAPI.invoke('error:export', 'json');
          break;
        case 'feedback':
          result = await window.electronAPI.invoke('feedback:export', { format: 'json' });
          break;
      }
      
      if (result.success) {
        // 显示成功消息
        console.log('数据导出成功:', result.filePath);
      }
    } catch (error) {
      console.error('导出数据失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">无法加载统计数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部控制 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          监控仪表板
        </h2>
        <div className="flex items-center space-x-4">
          {/* 时间范围选择 */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="1d">最近1天</option>
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
          </select>
          
          {/* 刷新按钮 */}
          <button
            onClick={loadStats}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 使用统计 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                总会话数
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.usage.totalSessions}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              平均时长: {Math.round(stats.usage.averageSessionDuration / 60)}分钟
            </p>
          </div>
        </motion.div>

        {/* 拦截统计 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                拦截次数
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.blocking.totalBlocked}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              最近拦截: {stats.blocking.recentBlocked}次
            </p>
          </div>
        </motion.div>

        {/* 错误统计 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                错误记录
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.errors.total}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              未上报: {stats.errors.unreportedCount}个
            </p>
          </div>
        </motion.div>

        {/* 反馈统计 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MessageSquare className="h-8 w-8 text-purple-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                用户反馈
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.feedback.total}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              最近: {stats.feedback.recentCount}条
            </p>
          </div>
        </motion.div>
      </div>

      {/* 详细图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 热门被拦截网站 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              热门被拦截网站
            </h3>
            <button
              onClick={() => exportData('analytics')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Download size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {stats.blocking.topBlockedSites.slice(0, 5).map((site, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {site.websiteUrl}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {site.count}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 错误类型分布 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              错误严重程度分布
            </h3>
            <button
              onClick={() => exportData('errors')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Download size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.errors.bySeverity).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    severity === 'critical' ? 'bg-red-500' :
                    severity === 'high' ? 'bg-orange-500' :
                    severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                    {severity}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* 反馈类型分布 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            反馈类型分布
          </h3>
          <button
            onClick={() => exportData('feedback')}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Download size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.feedback.byType).map(([type, count]) => (
            <div key={type} className="text-center">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {count}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {type === 'bug' ? '错误报告' :
                 type === 'feature' ? '功能建议' :
                 type === 'improvement' ? '改进建议' : '其他'}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
