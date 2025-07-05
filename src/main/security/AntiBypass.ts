import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 绕过检测结果
 */
export interface BypassDetectionResult {
  detected: boolean;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

/**
 * 防绕过配置
 */
export interface AntiBypassConfig {
  enableHostsFileMonitoring: boolean;
  enableProxyDetection: boolean;
  enableVPNDetection: boolean;
  enableDNSMonitoring: boolean;
  enableProcessMonitoring: boolean;
  checkInterval: number; // 检查间隔（毫秒）
}

/**
 * 防绕过机制类
 * 实现各种绕过检测和防护措施
 */
export class AntiBypass {
  private config: AntiBypassConfig;
  private monitoringTimer: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private platform: string;
  private onBypassDetected?: (result: BypassDetectionResult) => void;
  private hostsFileWatcher: fs.FSWatcher | null = null;
  private originalHostsContent: string = '';

  constructor(config?: Partial<AntiBypassConfig>) {
    this.platform = os.platform();
    this.config = {
      enableHostsFileMonitoring: true,
      enableProxyDetection: true,
      enableVPNDetection: true,
      enableDNSMonitoring: true,
      enableProcessMonitoring: true,
      checkInterval: 30000, // 30秒
      ...config
    };
  }

  /**
   * 初始化防绕过系统
   */
  async initialize(): Promise<void> {
    console.log('Initializing anti-bypass system...');
    
    try {
      // 记录初始状态
      await this.recordInitialState();
      
      // 启动监控
      if (this.config.enableHostsFileMonitoring) {
        await this.startHostsFileMonitoring();
      }
      
      this.startPeriodicChecks();
      this.isMonitoring = true;
      
      console.log('Anti-bypass system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize anti-bypass system:', error);
      throw error;
    }
  }

  /**
   * 停止防绕过监控
   */
  async stop(): Promise<void> {
    console.log('Stopping anti-bypass monitoring...');
    
    this.isMonitoring = false;
    
    // 停止定时检查
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    // 停止hosts文件监控
    if (this.hostsFileWatcher) {
      this.hostsFileWatcher.close();
      this.hostsFileWatcher = null;
    }
    
    console.log('Anti-bypass monitoring stopped');
  }

  /**
   * 设置绕过检测回调
   */
  setBypassDetectionCallback(callback: (result: BypassDetectionResult) => void): void {
    this.onBypassDetected = callback;
  }

  /**
   * 执行完整的绕过检测
   */
  async performFullScan(): Promise<BypassDetectionResult[]> {
    const results: BypassDetectionResult[] = [];
    
    try {
      // 检查hosts文件修改
      if (this.config.enableHostsFileMonitoring) {
        const hostsResult = await this.checkHostsFileModification();
        if (hostsResult.detected) {
          results.push(hostsResult);
        }
      }
      
      // 检测代理设置
      if (this.config.enableProxyDetection) {
        const proxyResult = await this.detectProxyBypass();
        if (proxyResult.detected) {
          results.push(proxyResult);
        }
      }
      
      // 检测VPN连接
      if (this.config.enableVPNDetection) {
        const vpnResult = await this.detectVPNUsage();
        if (vpnResult.detected) {
          results.push(vpnResult);
        }
      }
      
      // 检测DNS修改
      if (this.config.enableDNSMonitoring) {
        const dnsResult = await this.detectDNSModification();
        if (dnsResult.detected) {
          results.push(dnsResult);
        }
      }
      
      // 检测可疑进程
      if (this.config.enableProcessMonitoring) {
        const processResult = await this.detectSuspiciousProcesses();
        if (processResult.detected) {
          results.push(processResult);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Full scan failed:', error);
      return [];
    }
  }

  /**
   * 记录初始状态
   */
  private async recordInitialState(): Promise<void> {
    try {
      // 记录hosts文件初始内容
      const hostsPath = this.getHostsFilePath();
      if (await this.fileExists(hostsPath)) {
        this.originalHostsContent = await fs.promises.readFile(hostsPath, 'utf8');
      }
      
      console.log('Initial system state recorded');
    } catch (error) {
      console.error('Failed to record initial state:', error);
    }
  }

  /**
   * 启动hosts文件监控
   */
  private async startHostsFileMonitoring(): Promise<void> {
    const hostsPath = this.getHostsFilePath();
    
    try {
      if (await this.fileExists(hostsPath)) {
        this.hostsFileWatcher = fs.watch(hostsPath, (eventType) => {
          if (eventType === 'change') {
            this.handleHostsFileChange();
          }
        });
        
        console.log(`Started monitoring hosts file: ${hostsPath}`);
      }
    } catch (error) {
      console.error('Failed to start hosts file monitoring:', error);
    }
  }

  /**
   * 处理hosts文件变化
   */
  private async handleHostsFileChange(): Promise<void> {
    try {
      const result = await this.checkHostsFileModification();
      if (result.detected && this.onBypassDetected) {
        this.onBypassDetected(result);
      }
    } catch (error) {
      console.error('Failed to handle hosts file change:', error);
    }
  }

  /**
   * 启动定期检查
   */
  private startPeriodicChecks(): void {
    this.monitoringTimer = setInterval(async () => {
      if (!this.isMonitoring) return;
      
      try {
        const results = await this.performFullScan();
        
        for (const result of results) {
          if (this.onBypassDetected) {
            this.onBypassDetected(result);
          }
        }
      } catch (error) {
        console.error('Periodic check failed:', error);
      }
    }, this.config.checkInterval);
  }

  /**
   * 检查hosts文件修改
   */
  private async checkHostsFileModification(): Promise<BypassDetectionResult> {
    try {
      const hostsPath = this.getHostsFilePath();
      
      if (await this.fileExists(hostsPath)) {
        const currentContent = await fs.promises.readFile(hostsPath, 'utf8');
        
        // 检查是否有可疑的域名重定向
        const suspiciousPatterns = [
          /127\.0\.0\.1\s+.*\.com/i,
          /0\.0\.0\.0\s+.*\.com/i,
          /localhost\s+.*\.com/i
        ];
        
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(currentContent)) {
            return {
              detected: true,
              type: 'hosts_file_modification',
              description: 'Suspicious domain redirection detected in hosts file',
              severity: 'high',
              timestamp: new Date()
            };
          }
        }
        
        // 检查文件大小变化
        if (this.originalHostsContent && currentContent.length > this.originalHostsContent.length + 1000) {
          return {
            detected: true,
            type: 'hosts_file_size_change',
            description: 'Significant increase in hosts file size detected',
            severity: 'medium',
            timestamp: new Date()
          };
        }
      }
      
      return {
        detected: false,
        type: 'hosts_file_check',
        description: 'No hosts file modification detected',
        severity: 'low',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Hosts file check failed:', error);
      return {
        detected: false,
        type: 'hosts_file_check_error',
        description: 'Failed to check hosts file',
        severity: 'low',
        timestamp: new Date()
      };
    }
  }

  /**
   * 检测代理绕过
   */
  private async detectProxyBypass(): Promise<BypassDetectionResult> {
    try {
      // 检查系统代理设置是否被修改
      // 这里可以实现更复杂的代理检测逻辑
      
      return {
        detected: false,
        type: 'proxy_bypass_check',
        description: 'No proxy bypass detected',
        severity: 'low',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Proxy bypass detection failed:', error);
      return {
        detected: false,
        type: 'proxy_bypass_check_error',
        description: 'Failed to check proxy bypass',
        severity: 'low',
        timestamp: new Date()
      };
    }
  }

  /**
   * 检测VPN使用
   */
  private async detectVPNUsage(): Promise<BypassDetectionResult> {
    try {
      // 检查常见的VPN进程和网络接口
      const vpnProcesses = ['openvpn', 'wireguard', 'nordvpn', 'expressvpn', 'surfshark'];
      
      for (const vpnProcess of vpnProcesses) {
        if (await this.isProcessRunning(vpnProcess)) {
          return {
            detected: true,
            type: 'vpn_usage',
            description: `VPN process detected: ${vpnProcess}`,
            severity: 'high',
            timestamp: new Date()
          };
        }
      }
      
      return {
        detected: false,
        type: 'vpn_usage_check',
        description: 'No VPN usage detected',
        severity: 'low',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('VPN detection failed:', error);
      return {
        detected: false,
        type: 'vpn_usage_check_error',
        description: 'Failed to check VPN usage',
        severity: 'low',
        timestamp: new Date()
      };
    }
  }

  /**
   * 检测DNS修改
   */
  private async detectDNSModification(): Promise<BypassDetectionResult> {
    try {
      // 检查DNS设置是否被修改为公共DNS服务器
      const publicDNSServers = ['8.8.8.8', '1.1.1.1', '208.67.222.222'];
      
      // 这里可以实现DNS检测逻辑
      
      return {
        detected: false,
        type: 'dns_modification_check',
        description: 'No DNS modification detected',
        severity: 'low',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('DNS modification detection failed:', error);
      return {
        detected: false,
        type: 'dns_modification_check_error',
        description: 'Failed to check DNS modification',
        severity: 'low',
        timestamp: new Date()
      };
    }
  }

  /**
   * 检测可疑进程
   */
  private async detectSuspiciousProcesses(): Promise<BypassDetectionResult> {
    try {
      // 检查可能用于绕过的工具
      const suspiciousProcesses = [
        'tor', 'proxifier', 'proxycap', 'freegate', 'ultrasurf',
        'psiphon', 'lantern', 'shadowsocks', 'v2ray'
      ];
      
      for (const process of suspiciousProcesses) {
        if (await this.isProcessRunning(process)) {
          return {
            detected: true,
            type: 'suspicious_process',
            description: `Suspicious bypass tool detected: ${process}`,
            severity: 'critical',
            timestamp: new Date()
          };
        }
      }
      
      return {
        detected: false,
        type: 'suspicious_process_check',
        description: 'No suspicious processes detected',
        severity: 'low',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Suspicious process detection failed:', error);
      return {
        detected: false,
        type: 'suspicious_process_check_error',
        description: 'Failed to check suspicious processes',
        severity: 'low',
        timestamp: new Date()
      };
    }
  }

  /**
   * 获取hosts文件路径
   */
  private getHostsFilePath(): string {
    switch (this.platform) {
      case 'win32':
        return 'C:\\Windows\\System32\\drivers\\etc\\hosts';
      case 'darwin':
      case 'linux':
        return '/etc/hosts';
      default:
        return '/etc/hosts';
    }
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查进程是否运行
   */
  private async isProcessRunning(processName: string): Promise<boolean> {
    try {
      let command: string;
      
      switch (this.platform) {
        case 'win32':
          command = `tasklist /FI "IMAGENAME eq ${processName}.exe"`;
          break;
        case 'darwin':
        case 'linux':
          command = `pgrep -f ${processName}`;
          break;
        default:
          return false;
      }
      
      const { stdout } = await execAsync(command);
      return stdout.includes(processName);
    } catch {
      return false;
    }
  }

  /**
   * 获取监控状态
   */
  getStatus(): { monitoring: boolean; config: AntiBypassConfig } {
    return {
      monitoring: this.isMonitoring,
      config: this.config
    };
  }
}
