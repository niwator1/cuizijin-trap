// 用户相关类型
export interface User {
  id: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

// 被阻止网站类型
export interface BlockedSite {
  id: string;
  url: string;
  domain: string;
  enabled: boolean;
  title?: string;
  category?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 创建被阻止网站的DTO
export interface CreateBlockedSiteDto {
  url: string;
  domain: string;
  enabled?: boolean;
  title?: string;
  category?: string;
  description?: string;
}

// 更新被阻止网站的DTO
export interface UpdateBlockedSiteDto {
  url?: string;
  domain?: string;
  enabled?: boolean;
}

// 操作日志类型
export interface OperationLog {
  id: string;
  action: string;
  target?: string;
  timestamp: Date;
  details?: string;
}

// 代理配置类型
export interface ProxyConfig {
  port: number;
  authToken: string;
  blockedDomains: string[];
  httpsEnabled: boolean;
}

// 代理状态类型
export type ProxyStatus = 'running' | 'stopped' | 'error' | 'starting' | 'stopping';

// 应用配置类型
export interface AppConfig {
  theme: 'light' | 'dark' | 'system';
  autoStart: boolean;
  minimizeToTray: boolean;
  showNotifications: boolean;
  proxyPort: number;
}

// 系统信息类型
export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  appVersion?: string;
  electronVersion?: string;
  nodeVersion?: string;
  chromeVersion?: string;
  hostname?: string;
  proxySupported: boolean;
  certificateInstalled: boolean;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 拦截统计类型
export interface InterceptionStats {
  totalBlocked: number;
  todayBlocked: number;
  mostBlockedSite: string;
  lastBlockedAt?: Date;
}

// 绕过检测结果类型
export interface BypassAttempt {
  type: 'proxy_change' | 'dns_change' | 'vpn_detected' | 'process_kill';
  timestamp: Date;
  details: string;
  severity: 'low' | 'medium' | 'high';
}

// 应用状态类型
export interface AppState {
  // 认证状态
  isAuthenticated: boolean;
  user: User | null;
  
  // 网站管理
  blockedSites: BlockedSite[];
  isLoading: boolean;
  
  // 代理状态
  proxyStatus: ProxyStatus;
  proxyConfig: ProxyConfig | null;
  
  // 统计信息
  stats: InterceptionStats;
  
  // 系统信息
  systemInfo: SystemInfo | null;
  
  // UI状态
  theme: 'light' | 'dark' | 'system';
  currentPage: string;
  showSettings: boolean;
}

// IPC通信事件类型
export interface IpcEvents {
  // 认证相关
  'auth:login': (password: string) => Promise<ApiResponse<User>>;
  'auth:logout': () => Promise<ApiResponse>;
  'auth:check': () => Promise<ApiResponse<boolean>>;
  
  // 网站管理
  'sites:get-all': () => Promise<ApiResponse<BlockedSite[]>>;
  'sites:add': (site: CreateBlockedSiteDto) => Promise<ApiResponse<BlockedSite>>;
  'sites:update': (id: string, updates: UpdateBlockedSiteDto) => Promise<ApiResponse<BlockedSite>>;
  'sites:delete': (id: string) => Promise<ApiResponse>;
  'sites:reset-all': () => Promise<ApiResponse>;
  
  // 代理控制
  'proxy:start': () => Promise<ApiResponse>;
  'proxy:stop': () => Promise<ApiResponse>;
  'proxy:status': () => Promise<ApiResponse<ProxyStatus>>;
  'proxy:get-config': () => Promise<ApiResponse<ProxyConfig>>;
  
  // 系统信息
  'system:get-info': () => Promise<ApiResponse<SystemInfo>>;
  'system:install-certificate': () => Promise<ApiResponse>;
  
  // 统计信息
  'stats:get': () => Promise<ApiResponse<InterceptionStats>>;
  
  // 配置管理
  'config:get': () => Promise<ApiResponse<AppConfig>>;
  'config:update': (config: Partial<AppConfig>) => Promise<ApiResponse<AppConfig>>;
}

// 事件监听器类型
export interface IpcEventListeners {
  'proxy:status-changed': (status: ProxyStatus) => void;
  'site:blocked': (domain: string) => void;
  'bypass:detected': (attempt: BypassAttempt) => void;
  'stats:updated': (stats: InterceptionStats) => void;
}

// 错误类型
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 常用错误代码
export const ErrorCodes = {
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  SITE_ALREADY_EXISTS: 'SITE_ALREADY_EXISTS',
  SITE_NOT_FOUND: 'SITE_NOT_FOUND',
  PROXY_START_FAILED: 'PROXY_START_FAILED',
  PROXY_STOP_FAILED: 'PROXY_STOP_FAILED',
  CERTIFICATE_INSTALL_FAILED: 'CERTIFICATE_INSTALL_FAILED',
  SYSTEM_PROXY_FAILED: 'SYSTEM_PROXY_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
