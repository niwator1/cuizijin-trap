import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { CertificateManager } from './CertificateManager';

const execAsync = promisify(exec);

/**
 * 系统平台类型
 */
export type SystemPlatform = 'windows' | 'macos' | 'linux' | 'unknown';

/**
 * 系统代理配置
 */
export interface SystemProxyConfig {
  enabled: boolean;
  httpProxy?: string;
  httpsProxy?: string;
  bypassList?: string[];
}

/**
 * 证书安装状态
 */
export interface CertificateStatus {
  installed: boolean;
  path?: string;
  error?: string;
}

/**
 * 系统集成
 * 实现系统代理设置、证书安装、系统级集成功能
 */
export class SystemIntegration {
  private platform: SystemPlatform;
  private originalProxyConfig: SystemProxyConfig | null = null;
  private certificateManager: CertificateManager;

  constructor() {
    this.platform = this.detectPlatform();
    this.certificateManager = new CertificateManager();
  }

  /**
   * 初始化系统集成
   */
  async initialize(): Promise<void> {
    console.log(`Initializing system integration for platform: ${this.platform}`);

    try {
      // 检测当前系统代理设置
      this.originalProxyConfig = await this.getCurrentProxyConfig();
      console.log('Current proxy config detected:', this.originalProxyConfig);

      // 创建证书目录
      await this.ensureCertificateDirectory();

      console.log('System integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize system integration:', error);
      throw error;
    }
  }

  /**
   * 检测系统平台
   */
  private detectPlatform(): SystemPlatform {
    const platform = os.platform();
    switch (platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        return 'unknown';
    }
  }

  /**
   * 获取系统信息
   */
  async getSystemInfo(): Promise<any> {
    const currentProxyConfig = await this.getCurrentProxyConfig();

    return {
      platform: this.platform,
      arch: os.arch(),
      version: os.release(),
      appVersion: process.env.npm_package_version || '1.0.0',
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      hostname: os.hostname(),
      proxySupported: this.platform !== 'unknown',
      certificateInstalled: await this.isCertificateInstalled(),
      currentProxyConfig: currentProxyConfig
    };
  }

  /**
   * 设置系统代理
   */
  async setSystemProxy(enabled: boolean, proxyHost: string = '127.0.0.1', proxyPort: number = 8080): Promise<boolean> {
    console.log(`Setting system proxy: enabled=${enabled}, host=${proxyHost}, port=${proxyPort}, platform=${this.platform}`);

    // 检查平台支持
    if (this.platform === 'unknown') {
      console.warn('System proxy configuration not supported on this platform');
      return false;
    }

    try {
      if (enabled) {
        // 保存当前代理配置（如果还没有保存）
        if (!this.originalProxyConfig) {
          console.log('Saving original proxy configuration...');
          this.originalProxyConfig = await this.getCurrentProxyConfig();
          console.log('Original proxy config:', this.originalProxyConfig);
        }

        // 设置新的代理配置
        console.log('Applying new proxy configuration...');
        await this.applyProxyConfig({
          enabled: true,
          httpProxy: `${proxyHost}:${proxyPort}`,
          httpsProxy: `${proxyHost}:${proxyPort}`,
          bypassList: ['localhost', '127.0.0.1', '::1']
        });
        console.log('System proxy enabled successfully');
      } else {
        // 恢复原始代理配置
        console.log('Restoring original proxy configuration...');
        if (this.originalProxyConfig) {
          await this.applyProxyConfig(this.originalProxyConfig);
          console.log('Original proxy config restored');
        } else {
          await this.applyProxyConfig({ enabled: false });
          console.log('System proxy disabled');
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to set system proxy:', error);
      return false;
    }
  }

  /**
   * 恢复系统代理设置
   */
  async restoreSystemProxy(): Promise<void> {
    console.log('Restoring original system proxy settings');

    try {
      if (this.originalProxyConfig) {
        await this.applyProxyConfig(this.originalProxyConfig);
        console.log('System proxy settings restored');
      } else {
        // 如果没有原始配置，则禁用代理
        await this.applyProxyConfig({ enabled: false });
        console.log('System proxy disabled');
      }
    } catch (error) {
      console.error('Failed to restore system proxy:', error);
      throw error;
    }
  }

  /**
   * 获取当前系统代理配置
   */
  private async getCurrentProxyConfig(): Promise<SystemProxyConfig> {
    switch (this.platform) {
      case 'windows':
        return await this.getWindowsProxyConfig();
      case 'macos':
        return await this.getMacOSProxyConfig();
      case 'linux':
        return await this.getLinuxProxyConfig();
      default:
        return { enabled: false };
    }
  }

  /**
   * 应用代理配置
   */
  private async applyProxyConfig(config: SystemProxyConfig): Promise<void> {
    switch (this.platform) {
      case 'windows':
        await this.setWindowsProxy(config);
        break;
      case 'macos':
        await this.setMacOSProxy(config);
        break;
      case 'linux':
        await this.setLinuxProxy(config);
        break;
      default:
        throw new Error(`Proxy configuration not supported on platform: ${this.platform}`);
    }
  }

  /**
   * Windows代理配置获取
   */
  private async getWindowsProxyConfig(): Promise<SystemProxyConfig> {
    try {
      const { stdout } = await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable');
      const proxyEnabled = stdout.includes('0x1');

      if (!proxyEnabled) {
        return { enabled: false };
      }

      const { stdout: proxyServer } = await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer');
      const serverMatch = proxyServer.match(/ProxyServer\s+REG_SZ\s+(.+)/);

      if (serverMatch) {
        const server = serverMatch[1].trim();
        return {
          enabled: true,
          httpProxy: server,
          httpsProxy: server
        };
      }

      return { enabled: false };
    } catch (error) {
      console.error('Failed to get Windows proxy config:', error);
      return { enabled: false };
    }
  }

  /**
   * Windows代理配置设置
   */
  private async setWindowsProxy(config: SystemProxyConfig): Promise<void> {
    try {
      if (config.enabled && config.httpProxy) {
        // 启用代理
        await execAsync('reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f');
        await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "${config.httpProxy}" /f`);

        // 设置绕过列表
        if (config.bypassList && config.bypassList.length > 0) {
          const bypassString = config.bypassList.join(';');
          await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyOverride /t REG_SZ /d "${bypassString}" /f`);
        }
      } else {
        // 禁用代理
        await execAsync('reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f');
      }

      console.log('Windows proxy configuration applied');
    } catch (error) {
      console.error('Failed to set Windows proxy:', error);
      throw error;
    }
  }

  /**
   * 获取有效的macOS网络服务列表
   */
  private async getValidMacOSNetworkServices(): Promise<string[]> {
    try {
      const { stdout: services } = await execAsync('networksetup -listallnetworkservices');
      const lines = services.split('\n');

      // 过滤掉说明文字和禁用的服务
      const validServices = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed &&
               !trimmed.startsWith('An asterisk') &&
               !trimmed.startsWith('*') &&
               !trimmed.includes('denotes that a network service is disabled') &&
               trimmed !== 'An asterisk (*) denotes that a network service is disabled.';
      });

      console.log('Valid macOS network services:', validServices);
      return validServices;
    } catch (error) {
      console.error('Failed to get macOS network services:', error);
      // 返回常见的网络服务名称作为备用
      return ['Wi-Fi', 'Ethernet', 'USB 10/100/1000 LAN'];
    }
  }

  /**
   * macOS代理配置获取
   */
  private async getMacOSProxyConfig(): Promise<SystemProxyConfig> {
    try {
      // 获取有效的网络服务
      const serviceLines = await this.getValidMacOSNetworkServices();

      if (serviceLines.length === 0) {
        return { enabled: false };
      }

      // 检查第一个网络服务的代理设置
      const serviceName = serviceLines[0];
      console.log(`Checking proxy config for service: ${serviceName}`);

      const { stdout: webProxy } = await execAsync(`networksetup -getwebproxy "${serviceName}"`);

      const enabledMatch = webProxy.match(/Enabled: (Yes|No)/);
      const serverMatch = webProxy.match(/Server: (.+)/);
      const portMatch = webProxy.match(/Port: (\d+)/);

      if (enabledMatch && enabledMatch[1] === 'Yes' && serverMatch && portMatch) {
        const server = serverMatch[1].trim();
        const port = portMatch[1].trim();
        const proxy = `${server}:${port}`;

        return {
          enabled: true,
          httpProxy: proxy,
          httpsProxy: proxy
        };
      }

      return { enabled: false };
    } catch (error) {
      console.error('Failed to get macOS proxy config:', error);
      return { enabled: false };
    }
  }

  /**
   * macOS代理配置设置
   */
  private async setMacOSProxy(config: SystemProxyConfig): Promise<void> {
    try {
      // 获取有效的网络服务
      console.log('Getting macOS network services...');
      const serviceLines = await this.getValidMacOSNetworkServices();

      console.log(`Found ${serviceLines.length} valid network services:`, serviceLines);

      if (serviceLines.length === 0) {
        throw new Error('No valid network services found');
      }

      for (const serviceName of serviceLines) {
        try {
          console.log(`Processing network service: "${serviceName}"`);

          if (config.enabled && config.httpProxy) {
            const [server, port] = config.httpProxy.split(':');
            console.log(`Setting proxy for service "${serviceName}": ${server}:${port}`);

            // 设置HTTP代理
            await execAsync(`networksetup -setwebproxy "${serviceName}" ${server} ${port || '8080'}`);
            await execAsync(`networksetup -setwebproxystate "${serviceName}" on`);
            console.log(`HTTP proxy enabled for "${serviceName}"`);

            // 设置HTTPS代理
            if (config.httpsProxy) {
              const [httpsServer, httpsPort] = config.httpsProxy.split(':');
              await execAsync(`networksetup -setsecurewebproxy "${serviceName}" ${httpsServer} ${httpsPort || '8080'}`);
              await execAsync(`networksetup -setsecurewebproxystate "${serviceName}" on`);
              console.log(`HTTPS proxy enabled for "${serviceName}"`);
            }

            // 设置绕过列表
            if (config.bypassList && config.bypassList.length > 0) {
              const bypassString = config.bypassList.join(' ');
              await execAsync(`networksetup -setproxybypassdomains "${serviceName}" ${bypassString}`);
              console.log(`Proxy bypass list set for "${serviceName}": ${bypassString}`);
            }
          } else {
            console.log(`Disabling proxy for service "${serviceName}"`);
            // 禁用代理
            await execAsync(`networksetup -setwebproxystate "${serviceName}" off`);
            await execAsync(`networksetup -setsecurewebproxystate "${serviceName}" off`);
            console.log(`Proxy disabled for "${serviceName}"`);
          }
        } catch (serviceError) {
          console.warn(`Failed to configure proxy for service "${serviceName}":`, serviceError);
          // 继续处理其他服务，不要因为一个服务失败就停止
        }
      }

      console.log('macOS proxy configuration applied');
    } catch (error) {
      console.error('Failed to set macOS proxy:', error);
      throw error;
    }
  }

  /**
   * Linux代理配置获取
   */
  private async getLinuxProxyConfig(): Promise<SystemProxyConfig> {
    try {
      // 检查环境变量
      const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY;
      const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;

      if (httpProxy || httpsProxy) {
        return {
          enabled: true,
          httpProxy: httpProxy?.replace(/^https?:\/\//, ''),
          httpsProxy: httpsProxy?.replace(/^https?:\/\//, '')
        };
      }

      return { enabled: false };
    } catch (error) {
      console.error('Failed to get Linux proxy config:', error);
      return { enabled: false };
    }
  }

  /**
   * Linux代理配置设置
   */
  private async setLinuxProxy(config: SystemProxyConfig): Promise<void> {
    try {
      // Linux代理设置通常通过环境变量
      // 这里我们只能设置当前进程的环境变量
      // 对于系统级设置，需要修改shell配置文件

      if (config.enabled && config.httpProxy) {
        process.env.http_proxy = `http://${config.httpProxy}`;
        process.env.HTTP_PROXY = `http://${config.httpProxy}`;

        if (config.httpsProxy) {
          process.env.https_proxy = `http://${config.httpsProxy}`;
          process.env.HTTPS_PROXY = `http://${config.httpsProxy}`;
        }

        if (config.bypassList && config.bypassList.length > 0) {
          const noProxy = config.bypassList.join(',');
          process.env.no_proxy = noProxy;
          process.env.NO_PROXY = noProxy;
        }
      } else {
        // 清除代理环境变量
        delete process.env.http_proxy;
        delete process.env.HTTP_PROXY;
        delete process.env.https_proxy;
        delete process.env.HTTPS_PROXY;
        delete process.env.no_proxy;
        delete process.env.NO_PROXY;
      }

      console.log('Linux proxy environment variables set');
    } catch (error) {
      console.error('Failed to set Linux proxy:', error);
      throw error;
    }
  }

  /**
   * 确保证书目录存在
   */
  private async ensureCertificateDirectory(): Promise<void> {
    const certDir = path.join(os.homedir(), '.cuizijin-trap', 'certificates');

    try {
      await fs.promises.mkdir(certDir, { recursive: true });
      console.log(`Certificate directory ensured: ${certDir}`);
    } catch (error) {
      console.error('Failed to create certificate directory:', error);
      throw error;
    }
  }

  /**
   * 检查证书是否已安装
   */
  async isCertificateInstalled(): Promise<boolean> {
    const certPath = this.getCertificatePath();

    try {
      // 检查证书文件是否存在
      await fs.promises.access(certPath);

      // 根据平台检查证书是否在系统信任存储中
      switch (this.platform) {
        case 'windows':
          return await this.certificateManager.isWindowsCertificateInstalled();
        case 'macos':
          return await this.certificateManager.isMacOSCertificateInstalled();
        case 'linux':
          return await this.certificateManager.isLinuxCertificateInstalled();
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * 安装证书到系统信任存储
   */
  async installCertificate(): Promise<CertificateStatus> {
    try {
      // 首先生成证书（如果不存在）
      await this.generateCertificateIfNeeded();

      const certPath = this.getCertificatePath();

      // 根据平台安装证书
      switch (this.platform) {
        case 'windows':
          await this.certificateManager.installWindowsCertificate(certPath);
          break;
        case 'macos':
          await this.certificateManager.installMacOSCertificate(certPath);
          break;
        case 'linux':
          await this.certificateManager.installLinuxCertificate(certPath);
          break;
        default:
          throw new Error(`Certificate installation not supported on platform: ${this.platform}`);
      }

      return {
        installed: true,
        path: certPath
      };
    } catch (error) {
      console.error('Failed to install certificate:', error);
      return {
        installed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 卸载证书
   */
  async uninstallCertificate(): Promise<CertificateStatus> {
    try {
      const certPath = this.getCertificatePath();

      // 根据平台卸载证书
      switch (this.platform) {
        case 'windows':
          await this.certificateManager.uninstallWindowsCertificate();
          break;
        case 'macos':
          await this.certificateManager.uninstallMacOSCertificate();
          break;
        case 'linux':
          await this.certificateManager.uninstallLinuxCertificate();
          break;
        default:
          throw new Error(`Certificate uninstallation not supported on platform: ${this.platform}`);
      }

      return {
        installed: false,
        path: certPath
      };
    } catch (error) {
      console.error('Failed to uninstall certificate:', error);
      return {
        installed: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 获取证书路径
   */
  private getCertificatePath(): string {
    return path.join(os.homedir(), '.cuizijin-trap', 'certificates', 'ca.crt');
  }

  /**
   * 生成证书（如果需要）
   */
  private async generateCertificateIfNeeded(): Promise<void> {
    const certPath = this.getCertificatePath();
    const keyPath = path.join(os.homedir(), '.cuizijin-trap', 'certificates', 'ca.key');

    try {
      // 检查证书是否已存在
      await fs.promises.access(certPath);
      await fs.promises.access(keyPath);
      console.log('Certificate already exists');
      return;
    } catch {
      // 证书不存在，需要生成
      console.log('Generating new certificate...');
      await this.generateSelfSignedCertificate(certPath, keyPath);
    }
  }

  /**
   * 生成自签名证书
   */
  private async generateSelfSignedCertificate(certPath: string, keyPath: string): Promise<void> {
    try {
      // 使用OpenSSL生成自签名证书
      const subject = '/C=CN/ST=Beijing/L=Beijing/O=CuiZiJin Trap/OU=IT Department/CN=CuiZiJin Trap Root CA';

      // 生成私钥
      await execAsync(`openssl genrsa -out "${keyPath}" 2048`);

      // 生成证书
      await execAsync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "${subject}"`);

      console.log('Self-signed certificate generated successfully');
    } catch (error) {
      console.error('Failed to generate certificate:', error);
      throw new Error('Certificate generation failed. Please ensure OpenSSL is installed.');
    }
  }
}
