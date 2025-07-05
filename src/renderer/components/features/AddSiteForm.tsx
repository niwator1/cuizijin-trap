import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import Button from '../common/Button';
import Input from '../common/Input';

interface AddSiteFormProps {
  className?: string;
}

const AddSiteForm: React.FC<AddSiteFormProps> = ({ className = '' }) => {
  const { addSite, isLoading, initializeDefaultSites, blockedSites } = useAppStore();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitializingDefaults, setIsInitializingDefaults] = useState(false);

  const categories = [
    { value: 'general', label: '通用' },
    { value: 'social', label: '社交媒体' },
    { value: 'entertainment', label: '娱乐' },
    { value: 'gaming', label: '游戏' },
    { value: 'news', label: '新闻' },
    { value: 'shopping', label: '购物' },
    { value: 'work', label: '工作' },
    { value: 'education', label: '教育' }
  ];

  const validateUrl = (url: string): boolean => {
    try {
      // 如果没有协议，自动添加 https://
      const urlToValidate = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`;
      
      new URL(urlToValidate);
      return true;
    } catch {
      return false;
    }
  };

  const normalizeUrl = (url: string): string => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('请输入网站URL');
      return;
    }

    if (!validateUrl(url)) {
      setError('请输入有效的网站URL');
      return;
    }

    try {
      const normalizedUrl = normalizeUrl(url.trim());
      await addSite(normalizedUrl, {
        title: title.trim() || undefined,
        category: category,
        description: description.trim() || undefined
      });

      // 重置表单
      setUrl('');
      setTitle('');
      setCategory('general');
      setDescription('');
      setIsExpanded(false);
    } catch (error) {
      console.error('Add site error:', error);
      setError('添加网站失败，请重试');
    }
  };

  const handleInitializeDefaults = async () => {
    setIsInitializingDefaults(true);
    setError('');

    try {
      await initializeDefaultSites();
    } catch (error) {
      console.error('Initialize defaults error:', error);
      setError('初始化默认网站失败，请重试');
    } finally {
      setIsInitializingDefaults(false);
    }
  };

  const handleQuickAdd = async (quickUrl: string) => {
    setUrl(quickUrl);
    try {
      await addSite(normalizeUrl(quickUrl));
      setUrl('');
    } catch (error) {
      console.error('Quick add error:', error);
      setError('添加网站失败，请重试');
    }
  };

  const quickAddSites = [
    { url: 'tieba.baidu.com', name: '百度贴吧', icon: '💬' }
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          添加新网站
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* 快速添加 */}
        <div className="space-y-4">
          {/* 默认网站初始化 */}
          {blockedSites.length === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    快速开始
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    添加常用网站到管理列表，包括百度贴吧等热门网站
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleInitializeDefaults}
                  loading={isInitializingDefaults}
                  disabled={isLoading}
                >
                  添加默认网站
                </Button>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              快速添加常用网站
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickAddSites.map((site) => (
                <button
                  key={site.url}
                  onClick={() => handleQuickAdd(site.url)}
                  disabled={isLoading || isInitializingDefaults}
                  className="flex items-center space-x-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-lg">{site.icon}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {site.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              或手动添加
            </span>
          </div>
        </div>

        {/* 手动添加表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="输入网站URL，如：example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className="flex-1"
              error={error}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3"
            >
              <svg 
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
            <Button
              type="submit"
              loading={isLoading}
              disabled={!url.trim()}
            >
              添加
            </Button>
          </div>

          {/* 展开的详细选项 */}
          {isExpanded && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <Input
                type="text"
                label="网站标题（可选）"
                placeholder="为网站设置一个易识别的名称"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  分类
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                type="text"
                label="描述（可选）"
                placeholder="添加网站的简短描述"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddSiteForm;
