// 应用常量
export const APP_NAME = '崔子瑾诱捕器';
export const APP_VERSION = '1.0.0';
export const APP_ID = 'com.cuizijin.trap';

// 默认配置
export const DEFAULT_PROXY_PORT = 8888;
export const DEFAULT_PROXY_AUTH_TOKEN_LENGTH = 32;
export const MIN_PROXY_PORT = 8000;
export const MAX_PROXY_PORT = 9999;

// 数据库配置
export const DATABASE_NAME = 'cuizijin_trap.db';
export const DATABASE_VERSION = 1;

// 文件路径
export const CONFIG_DIR = 'cuizijin-trap';
export const LOG_DIR = 'logs';
export const CERT_DIR = 'certificates';

// 证书配置
export const ROOT_CERT_NAME = 'cuizijin-trap-root-ca';
export const CERT_VALIDITY_DAYS = 365;

// UI常量
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
} as const;

// 主题配置
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// 页面路由
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
  LOGS: '/logs',
  EMERGENCY: '/emergency',
} as const;

// 本地存储键名
export const STORAGE_KEYS = {
  THEME: 'app-theme',
  WINDOW_STATE: 'window-state',
  USER_PREFERENCES: 'user-preferences',
} as const;

// 网络相关常量
export const NETWORK = {
  LOCALHOST: '127.0.0.1',
  PROXY_TIMEOUT: 30000,
  CONNECTION_TIMEOUT: 5000,
  MAX_RETRIES: 3,
} as const;

// 正则表达式
export const REGEX = {
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  DOMAIN: /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/,
  IP: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
} as const;

// 错误消息
export const ERROR_MESSAGES = {
  INVALID_URL: '请输入有效的网站URL',
  INVALID_PASSWORD: '密码错误，请重试',
  SITE_ALREADY_EXISTS: '该网站已在黑名单中',
  PROXY_START_FAILED: '代理服务启动失败',
  PROXY_STOP_FAILED: '代理服务停止失败',
  CERTIFICATE_INSTALL_FAILED: '证书安装失败',
  PERMISSION_DENIED: '权限不足，请以管理员身份运行',
  NETWORK_ERROR: '网络连接错误',
  DATABASE_ERROR: '数据库操作失败',
  UNKNOWN_ERROR: '未知错误，请重试',
} as const;

// 成功消息
export const SUCCESS_MESSAGES = {
  SITE_ADDED: '网站已添加到黑名单',
  SITE_REMOVED: '网站已从黑名单移除',
  SITE_ENABLED: '网站拦截已启用',
  SITE_DISABLED: '网站拦截已禁用',
  ALL_SITES_RESET: '所有网站限制已重置',
  PROXY_STARTED: '代理服务已启动',
  PROXY_STOPPED: '代理服务已停止',
  CERTIFICATE_INSTALLED: '证书安装成功',
  SETTINGS_SAVED: '设置已保存',
} as const;

// 通知类型
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// 日志级别
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

// 系统平台
export const PLATFORMS = {
  WINDOWS: 'win32',
  MACOS: 'darwin',
  LINUX: 'linux',
} as const;

// 浏览器检测
export const BROWSERS = {
  CHROME: 'chrome',
  FIREFOX: 'firefox',
  SAFARI: 'safari',
  EDGE: 'edge',
  OPERA: 'opera',
} as const;

// 代理状态
export const PROXY_STATUSES = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  ERROR: 'error',
  STARTING: 'starting',
  STOPPING: 'stopping',
} as const;

// 绕过检测类型
export const BYPASS_TYPES = {
  PROXY_CHANGE: 'proxy_change',
  DNS_CHANGE: 'dns_change',
  VPN_DETECTED: 'vpn_detected',
  PROCESS_KILL: 'process_kill',
} as const;

// 安全级别
export const SECURITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

// 默认应用配置
export const DEFAULT_APP_CONFIG = {
  theme: THEMES.SYSTEM,
  autoStart: false,
  minimizeToTray: true,
  showNotifications: true,
  proxyPort: DEFAULT_PROXY_PORT,
} as const;

// 窗口配置
export const WINDOW_CONFIG = {
  MIN_WIDTH: 800,
  MIN_HEIGHT: 600,
  DEFAULT_WIDTH: 1000,
  DEFAULT_HEIGHT: 700,
} as const;
