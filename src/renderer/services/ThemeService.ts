import { THEMES, STORAGE_KEYS } from '@shared/constants';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  accentColor: string;
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  fontSize: 'small' | 'medium' | 'large';
  animations: boolean;
  reducedMotion: boolean;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export class ThemeService {
  private static instance: ThemeService;
  private currentTheme: ThemeMode = 'system';
  private config: ThemeConfig;
  private mediaQuery: MediaQueryList;
  private listeners: Set<(theme: ThemeMode, isDark: boolean) => void> = new Set();

  static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  private constructor() {
    this.config = this.getDefaultConfig();
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.initialize();
  }

  private getDefaultConfig(): ThemeConfig {
    return {
      mode: 'system',
      primaryColor: '#3b82f6', // blue-500
      accentColor: '#8b5cf6', // violet-500
      borderRadius: 'medium',
      fontSize: 'medium',
      animations: true,
      reducedMotion: false
    };
  }

  private initialize(): void {
    // 加载保存的主题配置
    this.loadThemeConfig();
    
    // 监听系统主题变化
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
    
    // 监听用户偏好变化
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', this.handleMotionPreferenceChange.bind(this));
    
    // 应用初始主题
    this.applyTheme();
    
    console.log('Theme service initialized');
  }

  /**
   * 设置主题模式
   */
  setTheme(mode: ThemeMode): void {
    this.currentTheme = mode;
    this.config.mode = mode;
    this.saveThemeConfig();
    this.applyTheme();
    this.notifyListeners();
  }

  /**
   * 获取当前主题模式
   */
  getTheme(): ThemeMode {
    return this.currentTheme;
  }

  /**
   * 获取当前是否为暗色主题
   */
  isDarkMode(): boolean {
    if (this.currentTheme === 'dark') return true;
    if (this.currentTheme === 'light') return false;
    return this.mediaQuery.matches;
  }

  /**
   * 切换主题（在light和dark之间切换）
   */
  toggleTheme(): void {
    const newTheme = this.isDarkMode() ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  /**
   * 更新主题配置
   */
  updateConfig(config: Partial<ThemeConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveThemeConfig();
    this.applyTheme();
    this.notifyListeners();
  }

  /**
   * 获取主题配置
   */
  getConfig(): ThemeConfig {
    return { ...this.config };
  }

  /**
   * 获取当前主题颜色
   */
  getColors(): ThemeColors {
    const isDark = this.isDarkMode();
    
    return {
      primary: this.config.primaryColor,
      secondary: isDark ? '#6b7280' : '#9ca3af',
      accent: this.config.accentColor,
      background: isDark ? '#111827' : '#ffffff',
      surface: isDark ? '#1f2937' : '#f9fafb',
      text: isDark ? '#f9fafb' : '#111827',
      textSecondary: isDark ? '#d1d5db' : '#6b7280',
      border: isDark ? '#374151' : '#e5e7eb',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    };
  }

  /**
   * 应用主题到DOM
   */
  private applyTheme(): void {
    const root = document.documentElement;
    const isDark = this.isDarkMode();
    
    // 应用暗色/亮色主题类
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 应用CSS自定义属性
    const colors = this.getColors();
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // 应用其他配置
    root.style.setProperty('--border-radius', this.getBorderRadiusValue());
    root.style.setProperty('--font-size-base', this.getFontSizeValue());
    
    // 动画设置
    if (!this.config.animations || this.config.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // 添加主题过渡效果
    this.addThemeTransition();
  }

  /**
   * 添加主题切换过渡效果
   */
  private addThemeTransition(): void {
    const root = document.documentElement;
    
    // 添加过渡类
    root.classList.add('theme-transition');
    
    // 移除过渡类（避免影响其他动画）
    setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
  }

  /**
   * 获取边框圆角值
   */
  private getBorderRadiusValue(): string {
    const values = {
      none: '0px',
      small: '4px',
      medium: '8px',
      large: '12px'
    };
    return values[this.config.borderRadius];
  }

  /**
   * 获取字体大小值
   */
  private getFontSizeValue(): string {
    const values = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    return values[this.config.fontSize];
  }

  /**
   * 处理系统主题变化
   */
  private handleSystemThemeChange(): void {
    if (this.currentTheme === 'system') {
      this.applyTheme();
      this.notifyListeners();
    }
  }

  /**
   * 处理动画偏好变化
   */
  private handleMotionPreferenceChange(e: MediaQueryListEvent): void {
    this.config.reducedMotion = e.matches;
    this.applyTheme();
  }

  /**
   * 保存主题配置
   */
  private saveThemeConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save theme config:', error);
    }
  }

  /**
   * 加载主题配置
   */
  private loadThemeConfig(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved) {
        const config = JSON.parse(saved);
        this.config = { ...this.getDefaultConfig(), ...config };
        this.currentTheme = this.config.mode;
      }
    } catch (error) {
      console.error('Failed to load theme config:', error);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * 添加主题变化监听器
   */
  addListener(callback: (theme: ThemeMode, isDark: boolean) => void): void {
    this.listeners.add(callback);
  }

  /**
   * 移除主题变化监听器
   */
  removeListener(callback: (theme: ThemeMode, isDark: boolean) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const isDark = this.isDarkMode();
    this.listeners.forEach(callback => {
      try {
        callback(this.currentTheme, isDark);
      } catch (error) {
        console.error('Error in theme listener:', error);
      }
    });
  }

  /**
   * 获取预设主题
   */
  getPresetThemes(): Array<{ name: string; config: Partial<ThemeConfig> }> {
    return [
      {
        name: '默认蓝色',
        config: {
          primaryColor: '#3b82f6',
          accentColor: '#8b5cf6'
        }
      },
      {
        name: '绿色自然',
        config: {
          primaryColor: '#10b981',
          accentColor: '#059669'
        }
      },
      {
        name: '紫色优雅',
        config: {
          primaryColor: '#8b5cf6',
          accentColor: '#a855f7'
        }
      },
      {
        name: '橙色活力',
        config: {
          primaryColor: '#f59e0b',
          accentColor: '#d97706'
        }
      },
      {
        name: '红色热情',
        config: {
          primaryColor: '#ef4444',
          accentColor: '#dc2626'
        }
      }
    ];
  }

  /**
   * 应用预设主题
   */
  applyPresetTheme(presetName: string): void {
    const preset = this.getPresetThemes().find(p => p.name === presetName);
    if (preset) {
      this.updateConfig(preset.config);
    }
  }

  /**
   * 重置为默认主题
   */
  resetToDefault(): void {
    this.config = this.getDefaultConfig();
    this.currentTheme = this.config.mode;
    this.saveThemeConfig();
    this.applyTheme();
    this.notifyListeners();
  }

  /**
   * 导出主题配置
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 导入主题配置
   */
  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      this.updateConfig(config);
      return true;
    } catch (error) {
      console.error('Failed to import theme config:', error);
      return false;
    }
  }
}

// Export singleton instance
export const themeService = ThemeService.getInstance();
