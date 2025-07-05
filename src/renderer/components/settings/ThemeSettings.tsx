import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { themeService, ThemeMode, ThemeConfig } from '../../services/ThemeService';
import Switch from '../common/Switch';
import Button from '../common/Button';

const ThemeSettings: React.FC = () => {
  const [config, setConfig] = useState<ThemeConfig>(themeService.getConfig());
  const [isDark, setIsDark] = useState(themeService.isDarkMode());

  useEffect(() => {
    const handleThemeChange = (theme: ThemeMode, dark: boolean) => {
      setConfig(themeService.getConfig());
      setIsDark(dark);
    };

    themeService.addListener(handleThemeChange);
    return () => themeService.removeListener(handleThemeChange);
  }, []);

  const handleThemeModeChange = (mode: ThemeMode) => {
    themeService.setTheme(mode);
  };

  const handleConfigUpdate = (updates: Partial<ThemeConfig>) => {
    themeService.updateConfig(updates);
  };

  const handlePresetApply = (presetName: string) => {
    themeService.applyPresetTheme(presetName);
  };

  const handleReset = () => {
    if (window.confirm('确定要重置为默认主题设置吗？')) {
      themeService.resetToDefault();
    }
  };

  const handleExport = () => {
    const configJson = themeService.exportConfig();
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (themeService.importConfig(content)) {
          alert('主题配置导入成功！');
        } else {
          alert('主题配置导入失败，请检查文件格式。');
        }
      };
      reader.readAsText(file);
    }
  };

  const presets = themeService.getPresetThemes();

  return (
    <div className="space-y-6">
      {/* 主题模式选择 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          主题模式
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
            <motion.button
              key={mode}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleThemeModeChange(mode)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                config.mode === mode
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center">
                  {mode === 'light' && (
                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                    </svg>
                  )}
                  {mode === 'dark' && (
                    <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                    </svg>
                  )}
                  {mode === 'system' && (
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3.844l.097.97a.75.75 0 01-.734.845H8.731a.75.75 0 01-.734-.845L8.094 18H5.25a3 3 0 01-3-3V5.25zm3-1.5a1.5 1.5 0 00-1.5 1.5V15a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H5.25z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">
                  {mode === 'light' && '亮色'}
                  {mode === 'dark' && '暗色'}
                  {mode === 'system' && '跟随系统'}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 预设主题 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          预设主题
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {presets.map((preset) => (
            <motion.button
              key={preset.name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePresetApply(preset.name)}
              className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: preset.config.primaryColor }}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {preset.name}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 自定义设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          自定义设置
        </h3>
        <div className="space-y-4">
          {/* 主色调 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              主色调
            </label>
            <input
              type="color"
              value={config.primaryColor}
              onChange={(e) => handleConfigUpdate({ primaryColor: e.target.value })}
              className="w-12 h-8 rounded border border-gray-300 dark:border-gray-600"
            />
          </div>

          {/* 强调色 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              强调色
            </label>
            <input
              type="color"
              value={config.accentColor}
              onChange={(e) => handleConfigUpdate({ accentColor: e.target.value })}
              className="w-12 h-8 rounded border border-gray-300 dark:border-gray-600"
            />
          </div>

          {/* 圆角大小 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              圆角大小
            </label>
            <select
              value={config.borderRadius}
              onChange={(e) => handleConfigUpdate({ borderRadius: e.target.value as any })}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="none">无圆角</option>
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
            </select>
          </div>

          {/* 字体大小 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              字体大小
            </label>
            <select
              value={config.fontSize}
              onChange={(e) => handleConfigUpdate({ fontSize: e.target.value as any })}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
            </select>
          </div>

          {/* 动画效果 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              动画效果
            </label>
            <Switch
              checked={config.animations}
              onChange={(checked) => handleConfigUpdate({ animations: checked })}
              size="sm"
            />
          </div>

          {/* 减少动画 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              减少动画
            </label>
            <Switch
              checked={config.reducedMotion}
              onChange={(checked) => handleConfigUpdate({ reducedMotion: checked })}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          主题管理
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleExport}>
            导出配置
          </Button>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <span className="inline-flex items-center justify-center font-medium rounded-xl px-4 py-2 text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition-all duration-200 transform active:scale-95">
              导入配置
            </span>
          </label>
          <Button variant="ghost" onClick={handleReset}>
            重置默认
          </Button>
        </div>
      </div>

      {/* 主题预览 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          主题预览
        </h3>
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">示例卡片</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              这是一个示例卡片，展示当前主题的效果。
            </p>
            <div className="flex space-x-2">
              <button 
                className="px-3 py-1 text-sm rounded"
                style={{ backgroundColor: config.primaryColor, color: 'white' }}
              >
                主要按钮
              </button>
              <button 
                className="px-3 py-1 text-sm rounded"
                style={{ backgroundColor: config.accentColor, color: 'white' }}
              >
                强调按钮
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;
