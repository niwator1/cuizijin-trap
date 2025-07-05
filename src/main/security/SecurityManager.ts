import { ProcessProtection, ProcessProtectionStatus } from './ProcessProtection';
import { ConfigEncryption } from './ConfigEncryption';
import { AntiBypass, BypassDetectionResult } from './AntiBypass';

/**
 * 安全事件类型
 */
export type SecurityEventType = 
  | 'bypass_detected'
  | 'process_protection_triggered'
  | 'unauthorized_access_attempt'
  | 'configuration_tampered'
  | 'security_violation';

/**
 * 安全事件
 */
export interface SecurityEvent {
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  data?: any;
}

/**
 * 安全配置
 */
export interface SecurityConfig {
  enableProcessProtection: boolean;
  enableConfigEncryption: boolean;
  enableAntiBypass: boolean;
  enableSecurityLogging: boolean;
  alertThreshold: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 安全状态
 */
export interface SecurityStatus {
  overall: 'secure' | 'warning' | 'critical';
  processProtection: ProcessProtectionStatus;
  configEncryption: { initialized: boolean; keyPath: string; algorithm: string };
  antiBypass: { monitoring: boolean };
  recentEvents: SecurityEvent[];
  lastCheck: Date;
}

/**
 * 安全管理器
 * 统一管理所有安全功能模块
 */
export class SecurityManager {
  private processProtection: ProcessProtection;
  private configEncryption: ConfigEncryption;
  private antiBypass: AntiBypass;
  private config: SecurityConfig;
  private securityEvents: SecurityEvent[] = [];
  private isInitialized = false;
  private onSecurityEvent?: (event: SecurityEvent) => void;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      enableProcessProtection: true,
      enableConfigEncryption: true,
      enableAntiBypass: true,
      enableSecurityLogging: true,
      alertThreshold: 'medium',
      ...config
    };

    // 初始化安全模块
    this.processProtection = new ProcessProtection({
      enableWatchdog: this.config.enableProcessProtection,
      restartOnCrash: true,
      preventTermination: process.env.NODE_ENV === 'production', // 生产环境启用防终止
      hideFromTaskManager: process.env.NODE_ENV === 'production', // 生产环境隐藏进程
      heartbeatInterval: 15000 // 15秒心跳检查
    });

    this.configEncryption = new ConfigEncryption();

    this.antiBypass = new AntiBypass({
      enableHostsFileMonitoring: this.config.enableAntiBypass,
      enableProxyDetection: this.config.enableAntiBypass,
      enableVPNDetection: this.config.enableAntiBypass
    });

    // 设置事件回调
    this.setupEventHandlers();
  }

  /**
   * 初始化安全管理器
   */
  async initialize(): Promise<void> {
    console.log('Initializing security manager...');

    try {
      // 初始化配置加密
      if (this.config.enableConfigEncryption) {
        await this.configEncryption.initialize();
        console.log('Configuration encryption initialized');
      }

      // 初始化进程保护
      if (this.config.enableProcessProtection) {
        await this.processProtection.initialize();
        console.log('Process protection initialized');
      }

      // 初始化防绕过系统
      if (this.config.enableAntiBypass) {
        await this.antiBypass.initialize();
        console.log('Anti-bypass system initialized');
      }

      this.isInitialized = true;
      
      // 记录初始化事件
      this.recordSecurityEvent({
        type: 'process_protection_triggered',
        severity: 'low',
        description: 'Security manager initialized successfully',
        timestamp: new Date()
      });

      console.log('Security manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize security manager:', error);
      
      this.recordSecurityEvent({
        type: 'security_violation',
        severity: 'critical',
        description: `Security manager initialization failed: ${error}`,
        timestamp: new Date(),
        data: { error }
      });
      
      throw error;
    }
  }

  /**
   * 停止安全管理器
   */
  async stop(): Promise<void> {
    console.log('Stopping security manager...');

    try {
      // 停止防绕过监控
      if (this.config.enableAntiBypass) {
        await this.antiBypass.stop();
      }

      // 停止进程保护
      if (this.config.enableProcessProtection) {
        await this.processProtection.stop();
      }

      // 清理配置加密
      if (this.config.enableConfigEncryption) {
        this.configEncryption.destroy();
      }

      this.isInitialized = false;
      console.log('Security manager stopped');
    } catch (error) {
      console.error('Failed to stop security manager:', error);
      throw error;
    }
  }

  /**
   * 获取安全状态
   */
  async getSecurityStatus(): Promise<SecurityStatus> {
    const processStatus = this.processProtection.getStatus();
    const encryptionStatus = this.configEncryption.getStatus();
    const antiBypassStatus = this.antiBypass.getStatus();

    // 评估整体安全状态
    let overall: 'secure' | 'warning' | 'critical' = 'secure';
    
    const criticalEvents = this.securityEvents.filter(e => e.severity === 'critical').length;
    const highEvents = this.securityEvents.filter(e => e.severity === 'high').length;
    
    if (criticalEvents > 0) {
      overall = 'critical';
    } else if (highEvents > 0 || !processStatus.enabled) {
      overall = 'warning';
    }

    return {
      overall,
      processProtection: processStatus,
      configEncryption: encryptionStatus,
      antiBypass: { monitoring: antiBypassStatus.monitoring },
      recentEvents: this.securityEvents.slice(-10), // 最近10个事件
      lastCheck: new Date()
    };
  }

  /**
   * 执行安全扫描
   */
  async performSecurityScan(): Promise<BypassDetectionResult[]> {
    if (!this.isInitialized) {
      throw new Error('Security manager not initialized');
    }

    console.log('Performing security scan...');

    try {
      const results = await this.antiBypass.performFullScan();
      
      // 记录扫描结果
      for (const result of results) {
        if (result.detected) {
          this.recordSecurityEvent({
            type: 'bypass_detected',
            severity: result.severity,
            description: result.description,
            timestamp: result.timestamp,
            data: result
          });
        }
      }

      console.log(`Security scan completed. Found ${results.length} issues.`);
      return results;
    } catch (error) {
      console.error('Security scan failed:', error);
      
      this.recordSecurityEvent({
        type: 'security_violation',
        severity: 'high',
        description: `Security scan failed: ${error}`,
        timestamp: new Date(),
        data: { error }
      });
      
      throw error;
    }
  }

  /**
   * 加密敏感配置
   */
  async encryptSensitiveConfig(data: any): Promise<string> {
    if (!this.config.enableConfigEncryption) {
      throw new Error('Configuration encryption is disabled');
    }

    return await this.configEncryption.encryptConfig(data);
  }

  /**
   * 解密敏感配置
   */
  async decryptSensitiveConfig(encryptedData: string): Promise<any> {
    if (!this.config.enableConfigEncryption) {
      throw new Error('Configuration encryption is disabled');
    }

    return await this.configEncryption.decryptConfig(encryptedData);
  }

  /**
   * 生成安全密码
   */
  generateSecurePassword(length: number = 32): string {
    return this.configEncryption.generateSecurePassword(length);
  }

  /**
   * 验证数据完整性
   */
  verifyDataIntegrity(data: string, hash: string): boolean {
    return this.configEncryption.verifyHash(data, hash);
  }

  /**
   * 设置安全事件回调
   */
  setSecurityEventCallback(callback: (event: SecurityEvent) => void): void {
    this.onSecurityEvent = callback;
  }

  /**
   * 获取安全事件历史
   */
  getSecurityEvents(limit: number = 50): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }

  /**
   * 清理安全事件历史
   */
  clearSecurityEvents(): void {
    this.securityEvents = [];
    console.log('Security events history cleared');
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 设置防绕过检测回调
    this.antiBypass.setBypassDetectionCallback((result: BypassDetectionResult) => {
      this.recordSecurityEvent({
        type: 'bypass_detected',
        severity: result.severity,
        description: result.description,
        timestamp: result.timestamp,
        data: result
      });
    });
  }

  /**
   * 记录安全事件
   */
  private recordSecurityEvent(event: SecurityEvent): void {
    // 添加到事件历史
    this.securityEvents.push(event);

    // 限制事件历史大小
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-500);
    }

    // 记录日志
    if (this.config.enableSecurityLogging) {
      console.log(`Security Event [${event.severity.toUpperCase()}]: ${event.description}`);
    }

    // 触发回调
    if (this.onSecurityEvent && this.shouldTriggerAlert(event.severity)) {
      this.onSecurityEvent(event);
    }
  }

  /**
   * 判断是否应该触发警报
   */
  private shouldTriggerAlert(severity: SecurityEvent['severity']): boolean {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const thresholdLevel = severityLevels[this.config.alertThreshold];
    const eventLevel = severityLevels[severity];
    
    return eventLevel >= thresholdLevel;
  }

  /**
   * 更新安全配置
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Security configuration updated');
  }

  /**
   * 获取安全配置
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * 检查是否已初始化
   */
  isSecurityInitialized(): boolean {
    return this.isInitialized;
  }
}
