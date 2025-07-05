import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { BlockedSite } from '@shared/types';
import Button from '../common/Button';
import Switch from '../common/Switch';
import Modal from '../common/Modal';

interface SiteListProps {
  className?: string;
}

const SiteList: React.FC<SiteListProps> = ({ className = '' }) => {
  const { blockedSites, toggleSite, deleteSite, isLoading } = useAppStore();
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; site: BlockedSite | null }>({
    show: false,
    site: null
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleToggleSite = async (siteId: string) => {
    try {
      await toggleSite(siteId);
    } catch (error) {
      console.error('Toggle site error:', error);
    }
  };

  const handleDeleteClick = (site: BlockedSite) => {
    setDeleteConfirm({ show: true, site });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.site) {
      try {
        await deleteSite(deleteConfirm.site.id);
        setDeleteConfirm({ show: false, site: null });
      } catch (error) {
        console.error('Delete site error:', error);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, site: null });
  };

  // 导出网站列表
  const handleExportSites = async () => {
    setIsExporting(true);
    try {
      const response = await window.electronAPI.invoke('sites:export');
      if (response.success) {
        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '导出成功',
            message: '网站列表已导出到文件'
          });
        }
      } else {
        throw new Error(response.error || '导出失败');
      }
    } catch (error) {
      console.error('Export sites error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '导出失败',
          message: '网站列表导出失败，请重试'
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  // 导入网站列表
  const handleImportSites = async () => {
    setIsImporting(true);
    try {
      const response = await window.electronAPI.invoke('sites:import');
      if (response.success) {
        // 重新加载网站列表
        window.location.reload();

        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '导入成功',
            message: `成功导入 ${response.data?.imported || 0} 个网站`
          });
        }
      } else {
        throw new Error(response.error || '导入失败');
      }
    } catch (error) {
      console.error('Import sites error:', error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: '导入失败',
          message: '网站列表导入失败，请重试'
        });
      }
    } finally {
      setIsImporting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      social: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      entertainment: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      gaming: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      news: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      shopping: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[category] || colors.general;
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  if (blockedSites.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center ${className}`}>
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          暂无管理的网站
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          添加第一个网站开始管理访问控制
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              已管理网站 ({blockedSites.length})
            </h3>

            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleImportSites}
                loading={isImporting}
                disabled={isExporting}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                导入
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportSites}
                loading={isExporting}
                disabled={isImporting || blockedSites.length === 0}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                导出
              </Button>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {blockedSites.map((site) => (
            <div key={site.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${site.enabled ? 'bg-red-500' : 'bg-gray-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {site.title || formatUrl(site.url)}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(site.category || 'general')}`}>
                          {site.category || 'general'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {formatUrl(site.url)}
                      </p>
                      {site.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                          {site.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 ml-4">
                  <Switch
                    checked={site.enabled}
                    onChange={() => handleToggleSite(site.id)}
                    disabled={isLoading}
                    size="sm"
                  />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(site)}
                    disabled={isLoading}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 删除确认对话框 */}
      <Modal
        isOpen={deleteConfirm.show}
        onClose={handleDeleteCancel}
        title="确认删除"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            确定要删除网站 <span className="font-medium text-gray-900 dark:text-white">
              {deleteConfirm.site?.title || formatUrl(deleteConfirm.site?.url || '')}
            </span> 吗？
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            此操作无法撤销。
          </p>
          
          <div className="flex space-x-3 justify-end">
            <Button
              variant="secondary"
              onClick={handleDeleteCancel}
            >
              取消
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={isLoading}
            >
              删除
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SiteList;
