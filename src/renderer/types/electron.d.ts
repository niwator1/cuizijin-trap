import { ApiResponse } from '@shared/types';

export interface ElectronAPI {
  // IPC通信
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  
  // 应用控制
  quit: () => void;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  
  // 认证相关
  'auth:login': (password: string, metadata?: any) => Promise<ApiResponse<any>>;
  'auth:logout': (sessionId: string) => Promise<ApiResponse<void>>;
  'auth:check': (sessionId?: string) => Promise<ApiResponse<any>>;
  'auth:check-initialized': () => Promise<ApiResponse<boolean>>;
  'auth:initialize': (password: string, settings?: any) => Promise<ApiResponse<void>>;
  'auth:refresh-session': (sessionId: string) => Promise<ApiResponse<any>>;
  'auth:change-password': (sessionId: string, oldPassword: string, newPassword: string) => Promise<ApiResponse<void>>;
  'auth:emergency-reset': (newPassword: string, resetToken?: string) => Promise<ApiResponse<void>>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
