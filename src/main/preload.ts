import { contextBridge, ipcRenderer } from 'electron';
import { ApiResponse } from '@shared/types';

// 定义暴露给渲染进程的API
const electronAPI = {
  // 通用IPC调用方法
  invoke: (channel: string, ...args: any[]): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(channel, ...args);
  },

  // 认证相关API
  auth: {
    login: (password: string, metadata?: any): Promise<ApiResponse<any>> => 
      ipcRenderer.invoke('auth:login', password, metadata),
    
    logout: (sessionId: string): Promise<ApiResponse<void>> => 
      ipcRenderer.invoke('auth:logout', sessionId),
    
    checkAuth: (sessionId?: string): Promise<ApiResponse<any>> => 
      ipcRenderer.invoke('auth:check', sessionId),
    
    checkInitialized: (): Promise<ApiResponse<boolean>> => 
      ipcRenderer.invoke('auth:check-initialized'),
    
    initialize: (password: string, settings?: any): Promise<ApiResponse<any>> => 
      ipcRenderer.invoke('auth:initialize', password, settings),
    
    refreshSession: (sessionId: string): Promise<ApiResponse<any>> => 
      ipcRenderer.invoke('auth:refresh-session', sessionId),
    
    changePassword: (sessionId: string, oldPassword: string, newPassword: string): Promise<ApiResponse<any>> => 
      ipcRenderer.invoke('auth:change-password', sessionId, oldPassword, newPassword),
    
    emergencyReset: (newPassword: string, resetToken?: string): Promise<ApiResponse<any>> => 
      ipcRenderer.invoke('auth:emergency-reset', newPassword, resetToken),
  },

  // 网站管理API
  sites: {
    getAll: (): Promise<ApiResponse<any[]>> =>
      ipcRenderer.invoke('sites:get-all'),

    add: (siteData: any): Promise<ApiResponse<any>> =>
      ipcRenderer.invoke('sites:add', siteData),

    update: (id: string, updates: any): Promise<ApiResponse<any>> =>
      ipcRenderer.invoke('sites:update', id, updates),

    delete: (id: string): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('sites:delete', id),

    toggle: (id: string): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('sites:toggle', id),

    reset: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('sites:reset'),

    resetAll: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('sites:reset-all'),
  },

  // 代理控制API
  proxy: {
    start: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('proxy:start'),

    stop: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('proxy:stop'),

    getStatus: (): Promise<ApiResponse<any>> =>
      ipcRenderer.invoke('proxy:status'),

    restart: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('proxy:restart'),

    reset: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('proxy:reset'),
  },

  // 系统信息API
  system: {
    getInfo: (): Promise<ApiResponse<any>> => 
      ipcRenderer.invoke('system:get-info'),
    
    installCertificate: (): Promise<ApiResponse<void>> => 
      ipcRenderer.invoke('system:install-certificate'),
    
    uninstallCertificate: (): Promise<ApiResponse<void>> => 
      ipcRenderer.invoke('system:uninstall-certificate'),
    
    setSystemProxy: (enabled: boolean): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('system:set-proxy', enabled),
  },

  // 安全API
  security: {
    getStatus: (): Promise<ApiResponse<any>> =>
      ipcRenderer.invoke('security:get-status'),

    performScan: (): Promise<ApiResponse<any>> =>
      ipcRenderer.invoke('security:scan'),

    getEvents: (limit?: number): Promise<ApiResponse<any[]>> =>
      ipcRenderer.invoke('security:get-events', limit),

    clearEvents: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('security:clear-events'),
  },

  // 统计信息API
  stats: {
    get: (): Promise<ApiResponse<any>> =>
      ipcRenderer.invoke('stats:get'),

    getDashboard: (): Promise<ApiResponse<any>> =>
      ipcRenderer.invoke('stats:get-dashboard'),

    getHistory: (days?: number): Promise<ApiResponse<any>> =>
      ipcRenderer.invoke('stats:get-history', days),

    reset: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('stats:reset'),
  },

  // 配置管理API
  config: {
    get: (): Promise<ApiResponse<any>> =>
      ipcRenderer.invoke('config:get'),

    update: (config: any): Promise<ApiResponse<any>> =>
      ipcRenderer.invoke('config:update', config),

    reset: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('config:reset'),

    export: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('config:export'),

    import: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('config:import'),
  },

  // 数据管理API
  data: {
    clearAll: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('data:clearAll'),
  },

  // 服务管理API
  services: {
    stopAll: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('services:stopAll'),
  },

  // 通知API
  notification: {
    show: (options: { title: string; body: string; type?: string }): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('notification:show', options),
  },

  // 应用控制API
  app: {
    getVersion: (): Promise<string> =>
      ipcRenderer.invoke('app:get-version'),

    quit: (): Promise<void> =>
      ipcRenderer.invoke('app:quit'),

    minimize: (): Promise<void> =>
      ipcRenderer.invoke('app:minimize'),

    hide: (): Promise<void> =>
      ipcRenderer.invoke('app:hide'),

    show: (): Promise<void> =>
      ipcRenderer.invoke('app:show'),

    restart: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('app:restart'),

    fullReset: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('app:fullReset'),

    openLogsFolder: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke('app:openLogsFolder'),
  },

  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, callback);
  },

  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.off(channel, callback);
  },

  // 一次性事件监听
  once: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.once(channel, callback);
  },
};

// 暴露API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 类型声明（用于TypeScript支持）
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}

export type ElectronAPI = typeof electronAPI;
