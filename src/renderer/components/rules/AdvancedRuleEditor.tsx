import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Clock, 
  Users, 
  TestTube,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface AdvancedRuleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: BlockingRule) => Promise<void>;
  editingRule?: BlockingRule | null;
}

interface BlockingRule {
  id?: string;
  name: string;
  description?: string;
  pattern: string;
  matchType: 'exact' | 'domain' | 'contains' | 'regex' | 'wildcard';
  caseSensitive: boolean;
  enabled: boolean;
  priority: number;
  action: 'block' | 'allow' | 'redirect';
  redirectUrl?: string;
  userGroups?: string[];
  scheduleId?: string;
  tags?: string[];
}

const matchTypeOptions = [
  { value: 'domain', label: '域名匹配', description: '匹配整个域名及其子域名' },
  { value: 'contains', label: '包含匹配', description: 'URL包含指定文本' },
  { value: 'exact', label: '精确匹配', description: '完全匹配URL' },
  { value: 'regex', label: '正则表达式', description: '使用正则表达式匹配' },
  { value: 'wildcard', label: '通配符', description: '使用*和?通配符匹配' }
];

const actionOptions = [
  { value: 'block', label: '拦截', color: 'text-red-600' },
  { value: 'allow', label: '允许', color: 'text-green-600' },
  { value: 'redirect', label: '重定向', color: 'text-blue-600' }
];

export const AdvancedRuleEditor: React.FC<AdvancedRuleEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRule
}) => {
  const [formData, setFormData] = useState<BlockingRule>({
    name: '',
    description: '',
    pattern: '',
    matchType: 'domain',
    caseSensitive: false,
    enabled: true,
    priority: 0,
    action: 'block',
    redirectUrl: '',
    userGroups: [],
    scheduleId: '',
    tags: []
  });

  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<{ matches: boolean; error?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingRule) {
      setFormData(editingRule);
    } else {
      resetForm();
    }
  }, [editingRule, isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      pattern: '',
      matchType: 'domain',
      caseSensitive: false,
      enabled: true,
      priority: 0,
      action: 'block',
      redirectUrl: '',
      userGroups: [],
      scheduleId: '',
      tags: []
    });
    setTestUrl('');
    setTestResult(null);
    setValidationErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '规则名称不能为空';
    }

    if (!formData.pattern.trim()) {
      errors.pattern = '匹配模式不能为空';
    }

    if (formData.matchType === 'regex') {
      try {
        new RegExp(formData.pattern);
      } catch (error) {
        errors.pattern = '正则表达式格式无效';
      }
    }

    if (formData.action === 'redirect' && !formData.redirectUrl?.trim()) {
      errors.redirectUrl = '重定向URL不能为空';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const testPattern = () => {
    if (!testUrl.trim() || !formData.pattern.trim()) {
      setTestResult(null);
      return;
    }

    try {
      let matches = false;
      
      switch (formData.matchType) {
        case 'exact':
          matches = testUrl === formData.pattern;
          break;
        case 'domain':
          const urlObj = new URL(testUrl);
          matches = urlObj.hostname === formData.pattern || 
                   urlObj.hostname.endsWith('.' + formData.pattern);
          break;
        case 'contains':
          matches = testUrl.includes(formData.pattern);
          break;
        case 'regex':
          const regex = new RegExp(formData.pattern, formData.caseSensitive ? '' : 'i');
          matches = regex.test(testUrl);
          break;
        case 'wildcard':
          const wildcardRegex = new RegExp(
            formData.pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
            formData.caseSensitive ? '' : 'i'
          );
          matches = wildcardRegex.test(testUrl);
          break;
      }

      setTestResult({ matches });
    } catch (error) {
      setTestResult({ 
        matches: false, 
        error: error instanceof Error ? error.message : '测试失败' 
      });
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
      resetForm();
    } catch (error) {
      console.error('保存规则失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
      resetForm();
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags?.includes(tag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tag.trim()]
      });
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(tag => tag !== tagToRemove) || []
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingRule ? '编辑规则' : '创建新规则'}
              </h2>
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* 表单内容 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左侧：基本信息 */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      基本信息
                    </h3>
                    
                    {/* 规则名称 */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        规则名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                          validationErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="输入规则名称"
                      />
                      {validationErrors.name && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                      )}
                    </div>

                    {/* 描述 */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        描述
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                        placeholder="输入规则描述（可选）"
                      />
                    </div>

                    {/* 优先级 */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        优先级
                      </label>
                      <input
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0"
                        min="0"
                        max="100"
                      />
                      <p className="mt-1 text-xs text-gray-500">数值越大优先级越高</p>
                    </div>

                    {/* 启用状态 */}
                    <div className="mb-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.enabled}
                          onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">启用此规则</span>
                      </label>
                    </div>
                  </div>

                  {/* 匹配设置 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      匹配设置
                    </h3>

                    {/* 匹配类型 */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        匹配类型
                      </label>
                      <select
                        value={formData.matchType}
                        onChange={(e) => setFormData({ ...formData, matchType: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        {matchTypeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        {matchTypeOptions.find(opt => opt.value === formData.matchType)?.description}
                      </p>
                    </div>

                    {/* 匹配模式 */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        匹配模式 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.pattern}
                        onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                          validationErrors.pattern ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder={
                          formData.matchType === 'domain' ? 'example.com' :
                          formData.matchType === 'regex' ? '.*\\.example\\.com' :
                          formData.matchType === 'wildcard' ? '*.example.com' :
                          'https://example.com'
                        }
                      />
                      {validationErrors.pattern && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.pattern}</p>
                      )}
                    </div>

                    {/* 区分大小写 */}
                    {(formData.matchType === 'contains' || formData.matchType === 'regex' || formData.matchType === 'wildcard') && (
                      <div className="mb-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.caseSensitive}
                            onChange={(e) => setFormData({ ...formData, caseSensitive: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">区分大小写</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* 右侧：高级设置和测试 */}
                <div className="space-y-6">
                  {/* 动作设置 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      动作设置
                    </h3>

                    {/* 动作类型 */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        执行动作
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {actionOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, action: option.value as any })}
                            className={`p-2 rounded-md border-2 transition-all ${
                              formData.action === option.value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                          >
                            <span className={`text-sm font-medium ${option.color}`}>
                              {option.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 重定向URL */}
                    {formData.action === 'redirect' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          重定向URL <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="url"
                          value={formData.redirectUrl}
                          onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                            validationErrors.redirectUrl ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                          placeholder="https://example.com"
                        />
                        {validationErrors.redirectUrl && (
                          <p className="mt-1 text-sm text-red-600">{validationErrors.redirectUrl}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 规则测试 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                      <TestTube size={20} className="mr-2" />
                      规则测试
                    </h3>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        测试URL
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="url"
                          value={testUrl}
                          onChange={(e) => setTestUrl(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="https://example.com/test"
                        />
                        <button
                          type="button"
                          onClick={testPattern}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          测试
                        </button>
                      </div>
                    </div>

                    {/* 测试结果 */}
                    {testResult && (
                      <div className={`p-3 rounded-md ${
                        testResult.error 
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                          : testResult.matches
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : 'bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700'
                      }`}>
                        <div className="flex items-center">
                          {testResult.error ? (
                            <AlertCircle size={16} className="text-red-500 mr-2" />
                          ) : testResult.matches ? (
                            <CheckCircle size={16} className="text-green-500 mr-2" />
                          ) : (
                            <X size={16} className="text-gray-500 mr-2" />
                          )}
                          <span className={`text-sm ${
                            testResult.error 
                              ? 'text-red-700 dark:text-red-300'
                              : testResult.matches
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {testResult.error 
                              ? `测试错误: ${testResult.error}`
                              : testResult.matches
                              ? '匹配成功'
                              : '不匹配'
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>保存规则</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
