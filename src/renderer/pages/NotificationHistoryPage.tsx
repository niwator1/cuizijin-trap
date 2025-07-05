import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { notificationHistoryService, NotificationHistoryItem, NotificationFilter } from '../services/NotificationHistoryService';
import { notificationService } from '../services/NotificationService';

const NotificationHistoryPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    loadStatistics();
  }, [filter]);

  const loadNotifications = () => {
    setLoading(true);
    const history = notificationHistoryService.getHistory(filter, 100);
    setNotifications(history);
    setLoading(false);
  };

  const loadStatistics = () => {
    const stats = notificationHistoryService.getStatistics();
    setStatistics(stats);
  };

  const handleMarkAsRead = (id: string) => {
    notificationHistoryService.markAsRead(id);
    loadNotifications();
    loadStatistics();
  };

  const handleMarkSelectedAsRead = () => {
    if (selectedIds.size > 0) {
      notificationHistoryService.markMultipleAsRead(Array.from(selectedIds));
      setSelectedIds(new Set());
      loadNotifications();
      loadStatistics();
    }
  };

  const handleMarkAllAsRead = () => {
    notificationHistoryService.markAllAsRead();
    setSelectedIds(new Set());
    loadNotifications();
    loadStatistics();
  };

  const handleDelete = (id: string) => {
    notificationHistoryService.deleteFromHistory(id);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    loadNotifications();
    loadStatistics();
  };

  const handleClearHistory = () => {
    if (window.confirm('确定要清除所有通知历史记录吗？此操作不可撤销。')) {
      notificationHistoryService.clearHistory();
      setSelectedIds(new Set());
      loadNotifications();
      loadStatistics();
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const handleExport = () => {
    const data = notificationHistoryService.exportHistory();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <span className="text-green-500">✓</span>;
      case 'error':
        return <span className="text-red-500">✗</span>;
      case 'warning':
        return <span className="text-yellow-500">⚠</span>;
      case 'info':
        return <span className="text-blue-500">ℹ</span>;
      case 'loading':
        return <span className="text-blue-500">⟳</span>;
      default:
        return <span className="text-gray-500">•</span>;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority || priority === 'normal') return null;
    
    const colors = {
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[priority as keyof typeof colors]}`}>
        {priority === 'high' ? '高' : '低'}
      </span>
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            通知历史
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            查看和管理所有通知记录
          </p>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {statistics.total}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">总通知数</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {statistics.unread}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">未读通知</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {statistics.today}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">今日通知</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {statistics.thisWeek}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">本周通知</div>
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Type Filter */}
              <select
                value={filter.type || ''}
                onChange={(e) => setFilter({ ...filter, type: e.target.value as any || undefined })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">所有类型</option>
                <option value="success">成功</option>
                <option value="error">错误</option>
                <option value="warning">警告</option>
                <option value="info">信息</option>
                <option value="loading">加载中</option>
              </select>

              {/* Priority Filter */}
              <select
                value={filter.priority || ''}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value as any || undefined })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">所有优先级</option>
                <option value="high">高</option>
                <option value="normal">普通</option>
                <option value="low">低</option>
              </select>

              {/* Read Status Filter */}
              <select
                value={filter.read === undefined ? '' : filter.read.toString()}
                onChange={(e) => setFilter({ 
                  ...filter, 
                  read: e.target.value === '' ? undefined : e.target.value === 'true' 
                })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">全部</option>
                <option value="false">未读</option>
                <option value="true">已读</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleMarkSelectedAsRead}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  标记选中为已读
                </button>
              )}
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                全部标记已读
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                导出
              </button>
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                清除历史
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                通知记录 ({notifications.length})
              </h2>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedIds.size === notifications.length && notifications.length > 0}
                  onChange={handleSelectAll}
                  className="mr-2"
                />
                全选
              </label>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">加载中...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">暂无通知记录</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(notification.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedIds);
                        if (e.target.checked) {
                          newSet.add(notification.id);
                        } else {
                          newSet.delete(notification.id);
                        }
                        setSelectedIds(newSet);
                      }}
                      className="mt-1"
                    />
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-medium ${
                          notification.read 
                            ? 'text-gray-900 dark:text-gray-100' 
                            : 'text-gray-900 dark:text-white font-semibold'
                        }`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {getPriorityBadge(notification.priority)}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                      {notification.message && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {notification.message}
                        </p>
                      )}
                      {notification.group && (
                        <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          {notification.group}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                          标记已读
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationHistoryPage;
