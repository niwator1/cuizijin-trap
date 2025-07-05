import React, { useState, useEffect } from 'react';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

interface LogEntry {
  id: number;
  action: string;
  target?: string;
  details?: any;
  success: boolean;
  timestamp: Date;
  errorMessage?: string;
}

interface LogFilter {
  action?: string;
  success?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<LogFilter>({});
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const pageSize = 50;

  // 页面加载时获取日志
  useEffect(() => {
    loadLogs();
  }, [currentPage, filter]);

  // 加载日志
  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const response = await window.electronAPI.invoke('logs:get', {
        filter,
        page: currentPage,
        limit: pageSize
      });

      if (response.success && response.data) {
        setLogs(response.data.logs || []);
        setTotalLogs(response.data.total || 0);
        setTotalPages(Math.ceil((response.data.total || 0) / pageSize));
      }
    } catch (error) {
      console.error('Load logs error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 清除日志
  const handleClearLogs = async () => {
    if (!window.confirm('确定要清除所有日志吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await window.electronAPI.invoke('logs:clear');
      if (response.success) {
        await loadLogs();
        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '清除成功',
            message: '所有日志已清除'
          });
        }
      } else {
        throw new Error(response.error || '清除日志失败');
      }
    } catch (error) {
      console.error('Clear logs error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '清除失败',
          message: '日志清除失败，请重试'
        });
      }
    }
  };

  // 导出日志
  const handleExportLogs = async () => {
    try {
      const response = await window.electronAPI.invoke('logs:export', filter);
      if (response.success) {
        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '导出成功',
            message: '日志已导出到文件'
          });
        }
      } else {
        throw new Error(response.error || '导出日志失败');
      }
    } catch (error) {
      console.error('Export logs error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '导出失败',
          message: '日志导出失败，请重试'
        });
      }
    }
  };

  // 显示日志详情
  const showLogDetails = (log: LogEntry) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  // 获取操作类型的显示名称
  const getActionName = (action: string) => {
    const actionNames: { [key: string]: string } = {
      'login': '用户登录',
      'logout': '用户登出',
      'add_site': '添加网站',
      'remove_site': '删除网站',
      'toggle_site': '切换网站状态',
      'proxy_start': '启动代理',
      'proxy_stop': '停止代理',
      'proxy_intercept': '拦截请求',
      'config_update': '更新配置',
      'security_scan': '安全扫描',
      'system_proxy_set': '设置系统代理',
      'certificate_install': '安装证书'
    };
    return actionNames[action] || action;
  };

  // 获取状态颜色
  const getStatusColor = (success: boolean) => {
    return success 
      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            系统日志
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            查看系统操作记录和拦截日志
          </p>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={handleExportLogs}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出日志
          </Button>
          <Button
            variant="danger"
            onClick={handleClearLogs}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            清除日志
          </Button>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          筛选条件
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              操作类型
            </label>
            <select
              value={filter.action || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, action: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="login">用户登录</option>
              <option value="logout">用户登出</option>
              <option value="add_site">添加网站</option>
              <option value="remove_site">删除网站</option>
              <option value="toggle_site">切换网站状态</option>
              <option value="proxy_start">启动代理</option>
              <option value="proxy_stop">停止代理</option>
              <option value="proxy_intercept">拦截请求</option>
              <option value="config_update">更新配置</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              状态
            </label>
            <select
              value={filter.success === undefined ? '' : filter.success.toString()}
              onChange={(e) => setFilter(prev => ({ 
                ...prev, 
                success: e.target.value === '' ? undefined : e.target.value === 'true'
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="true">成功</option>
              <option value="false">失败</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              开始日期
            </label>
            <input
              type="date"
              value={filter.dateFrom || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              结束日期
            </label>
            <input
              type="date"
              value={filter.dateTo || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            搜索关键词
          </label>
          <input
            type="text"
            value={filter.search || ''}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value || undefined }))}
            placeholder="搜索目标、详情等..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="mt-4 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => {
              setFilter({});
              setCurrentPage(1);
            }}
          >
            重置
          </Button>
          <Button
            onClick={() => {
              setCurrentPage(1);
              loadLogs();
            }}
          >
            应用筛选
          </Button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              日志统计
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              共 {totalLogs} 条记录，第 {currentPage} 页，共 {totalPages} 页
            </p>
          </div>

          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm">加载中...</span>
            </div>
          )}
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            日志记录
          </h3>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              {isLoading ? '正在加载日志...' : '暂无日志记录'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (
              <div key={log.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.success)}`}>
                        {log.success ? '成功' : '失败'}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            {getActionName(log.action)}
                          </h4>
                          {log.target && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              → {log.target}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                          {log.errorMessage && (
                            <p className="text-xs text-red-600 dark:text-red-400 truncate">
                              {log.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => showLogDetails(log)}
                  >
                    详情
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            显示第 {(currentPage - 1) * pageSize + 1} 到 {Math.min(currentPage * pageSize, totalLogs)} 条，共 {totalLogs} 条记录
          </div>

          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              上一页
            </Button>

            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 日志详情模态框 */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="日志详情"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  操作类型
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {getActionName(selectedLog.action)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  状态
                </label>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedLog.success)}`}>
                  {selectedLog.success ? '成功' : '失败'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  时间
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </p>
              </div>

              {selectedLog.target && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    目标
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedLog.target}
                  </p>
                </div>
              )}
            </div>

            {selectedLog.errorMessage && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  错误信息
                </label>
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  {selectedLog.errorMessage}
                </p>
              </div>
            )}

            {selectedLog.details && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  详细信息
                </label>
                <pre className="text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                关闭
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LogsPage;
