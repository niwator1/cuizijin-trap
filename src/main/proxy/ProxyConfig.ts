import * as path from 'path';
import * as os from 'os';

/**
 * 代理服务器配置
 */
export interface ProxyConfig {
  // 基础配置
  httpPort: number;
  httpsPort: number;
  bindAddress: string;
  
  // 证书配置
  certificatesPath: string;
  caCertPath: string;
  caKeyPath: string;
  
  // 拦截配置
  blockPageTemplate: string;
  enableHttps: boolean;
  enableLogging: boolean;
  
  // 性能配置
  maxConnections: number;
  connectionTimeout: number;
  certificateCache: boolean;
  certificateCacheSize: number;
}

/**
 * 代理状态枚举
 */
export type ProxyStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

/**
 * 拦截事件信息
 */
export interface InterceptionEvent {
  domain: string;
  url: string;
  timestamp: Date;
  userAgent?: string;
  clientIp?: string;
  protocol: 'http' | 'https';
}

/**
 * 代理统计信息
 */
export interface ProxyStats {
  totalRequests: number;
  blockedRequests: number;
  allowedRequests: number;
  uptime: number;
  startTime: Date;
  lastActivity: Date;
}

/**
 * 默认代理配置
 */
export const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  // 基础配置
  httpPort: 8080,
  httpsPort: 8443,
  bindAddress: '127.0.0.1',
  
  // 证书配置
  certificatesPath: path.join(os.homedir(), '.cuizijin-trap', 'certificates'),
  caCertPath: path.join(os.homedir(), '.cuizijin-trap', 'certificates', 'ca.crt'),
  caKeyPath: path.join(os.homedir(), '.cuizijin-trap', 'certificates', 'ca.key'),
  
  // 拦截配置
  blockPageTemplate: 'default',
  enableHttps: true,
  enableLogging: true,
  
  // 性能配置
  maxConnections: 1000,
  connectionTimeout: 30000, // 30秒
  certificateCache: true,
  certificateCacheSize: 100
};

/**
 * 代理配置管理器
 */
export class ProxyConfigManager {
  private config: ProxyConfig;

  constructor(customConfig?: Partial<ProxyConfig>) {
    this.config = {
      ...DEFAULT_PROXY_CONFIG,
      ...customConfig
    };
  }

  /**
   * 获取配置
   */
  getConfig(): ProxyConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<ProxyConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
  }

  /**
   * 获取HTTP代理端口
   */
  getHttpPort(): number {
    return this.config.httpPort;
  }

  /**
   * 获取HTTPS代理端口
   */
  getHttpsPort(): number {
    return this.config.httpsPort;
  }

  /**
   * 获取绑定地址
   */
  getBindAddress(): string {
    return this.config.bindAddress;
  }

  /**
   * 获取证书路径
   */
  getCertificatesPath(): string {
    return this.config.certificatesPath;
  }

  /**
   * 获取CA证书路径
   */
  getCaCertPath(): string {
    return this.config.caCertPath;
  }

  /**
   * 获取CA私钥路径
   */
  getCaKeyPath(): string {
    return this.config.caKeyPath;
  }

  /**
   * 是否启用HTTPS代理
   */
  isHttpsEnabled(): boolean {
    return this.config.enableHttps;
  }

  /**
   * 是否启用日志记录
   */
  isLoggingEnabled(): boolean {
    return this.config.enableLogging;
  }

  /**
   * 获取最大连接数
   */
  getMaxConnections(): number {
    return this.config.maxConnections;
  }

  /**
   * 获取连接超时时间
   */
  getConnectionTimeout(): number {
    return this.config.connectionTimeout;
  }

  /**
   * 验证配置有效性
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查端口范围
    if (this.config.httpPort < 1 || this.config.httpPort > 65535) {
      errors.push('HTTP端口必须在1-65535范围内');
    }

    if (this.config.httpsPort < 1 || this.config.httpsPort > 65535) {
      errors.push('HTTPS端口必须在1-65535范围内');
    }

    // 检查端口冲突
    if (this.config.httpPort === this.config.httpsPort) {
      errors.push('HTTP和HTTPS端口不能相同');
    }

    // 检查绑定地址
    if (!this.config.bindAddress) {
      errors.push('绑定地址不能为空');
    }

    // 检查路径
    if (!this.config.certificatesPath) {
      errors.push('证书路径不能为空');
    }

    // 检查性能参数
    if (this.config.maxConnections < 1) {
      errors.push('最大连接数必须大于0');
    }

    if (this.config.connectionTimeout < 1000) {
      errors.push('连接超时时间不能少于1秒');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
