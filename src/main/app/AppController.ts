import { DatabaseService } from '../database';
import { AuthService, LoginResult, AuthStatus } from '../database/services/AuthService';
import { ProxyServer } from '../proxy/ProxyServer';
import { InterceptionEvent } from '../proxy/ProxyConfig';
import { SystemIntegration } from '../system/SystemIntegration';
import { SecurityManager, SecurityEvent } from '../security/SecurityManager';
import { WindowManager } from './WindowManager';
import { ApiResponse } from '@shared/types';
import { DEFAULT_SITES, getDefaultEnabledSites } from '@shared/constants/defaultSites';

export interface LoginMetadata {
  ipAddress?: string;
  userAgent?: string;
  rememberSession?: boolean;
}

export interface UserSettings {
  sessionTimeout?: number;
  autoStart?: boolean;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
}

/**
 * 应用控制器
 * 作为主进程的核心控制器，处理认证、配置和业务逻辑
 */
export class AppController {
  private databaseService: DatabaseService;
  private authService: AuthService | null = null;
  private blockedSiteService: any | null = null;
  private loggingService: any | null = null;
  private proxyServer: ProxyServer;
  private systemIntegration: SystemIntegration;
  private securityManager: SecurityManager;
  private windowManager: WindowManager;
  private isInitialized = false;

  constructor() {
    this.databaseService = new DatabaseService();
    this.proxyServer = new ProxyServer();
    this.systemIntegration = new SystemIntegration();
    this.securityManager = new SecurityManager();
    this.windowManager = new WindowManager();

    // 设置代理拦截回调
    this.proxyServer.setInterceptionCallback((event) => {
      this.handleProxyInterception(event);
    });

    // 设置安全事件回调
    this.securityManager.setSecurityEventCallback((event) => {
      this.handleSecurityEvent(event);
    });
  }

  /**
   * 初始化控制器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('AppController already initialized');
      return;
    }

    try {
      console.log('Initializing AppController...');
      
      // 初始化数据库服务
      await this.databaseService.initialize();

      // 获取各种服务
      this.authService = this.databaseService.getAuthService();
      this.blockedSiteService = this.databaseService.getBlockedSiteService();
      this.loggingService = this.databaseService.getLoggingService();

      // 初始化系统集成
      await this.systemIntegration.initialize();

      // 初始化安全管理器
      await this.securityManager.initialize();

      this.isInitialized = true;
      console.log('AppController initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AppController:', error);
      throw error;
    }
  }

  /**
   * 用户登录
   */
  async login(password: string, metadata?: LoginMetadata): Promise<ApiResponse<LoginResult>> {
    try {
      this.ensureInitialized();
      
      const loginResult = await this.authService!.login(password, {
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        rememberSession: metadata?.rememberSession
      });

      if (loginResult.success) {
        console.log('User logged in successfully');
        return {
          success: true,
          data: loginResult,
          message: '登录成功'
        };
      } else {
        console.log('Login failed:', loginResult.error);
        return {
          success: false,
          error: loginResult.error || '登录失败'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '登录过程中发生错误'
      };
    }
  }

  /**
   * 用户登出
   */
  async logout(sessionId: string): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();
      
      const success = await this.authService!.logout(sessionId);
      
      if (success) {
        console.log('User logged out successfully');
        return {
          success: true,
          message: '登出成功'
        };
      } else {
        return {
          success: false,
          error: '登出失败：会话不存在'
        };
      }
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '登出过程中发生错误'
      };
    }
  }

  /**
   * 检查认证状态
   */
  async checkAuth(sessionId?: string): Promise<ApiResponse<AuthStatus>> {
    try {
      this.ensureInitialized();
      
      if (!sessionId) {
        return {
          success: true,
          data: { isAuthenticated: false }
        };
      }

      const authStatus = await this.authService!.validateSession(sessionId);
      
      return {
        success: true,
        data: authStatus
      };
    } catch (error) {
      console.error('Check auth error:', error);
      return {
        success: false,
        data: { isAuthenticated: false },
        error: error instanceof Error ? error.message : '认证检查失败'
      };
    }
  }

  /**
   * 检查用户是否已初始化
   */
  async isUserInitialized(): Promise<ApiResponse<boolean>> {
    try {
      this.ensureInitialized();
      
      const isInitialized = await this.authService!.isUserInitialized();
      
      return {
        success: true,
        data: isInitialized
      };
    } catch (error) {
      console.error('Check user initialization error:', error);
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : '检查用户初始化状态失败'
      };
    }
  }

  /**
   * 初始化用户（首次设置）
   */
  async initializeUser(password: string, settings?: UserSettings): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      const success = await this.authService!.initializeUser(password, {
        sessionTimeout: settings?.sessionTimeout,
        autoStart: settings?.autoStart,
        theme: settings?.theme,
        language: settings?.language
      });

      if (success) {
        console.log('User initialized successfully');

        // 初始化默认网站
        try {
          await this.initializeDefaultSites();
        } catch (error) {
          console.warn('Failed to initialize default sites:', error);
          // 不影响用户初始化的成功
        }

        return {
          success: true,
          message: '用户初始化成功'
        };
      } else {
        return {
          success: false,
          error: '用户初始化失败'
        };
      }
    } catch (error) {
      console.error('Initialize user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '用户初始化过程中发生错误'
      };
    }
  }

  /**
   * 重置应用（清除所有数据）
   */
  async resetApp(): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      // 重置用户配置
      await this.authService!.resetUser();

      // 清除所有网站黑名单
      await this.blockedSiteService!.clearAll();

      // 清除操作日志
      await this.loggingService!.clearLogs();

      console.log('App reset successfully');
      return {
        success: true,
        message: '应用重置成功'
      };
    } catch (error) {
      console.error('Reset app error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '重置应用过程中发生错误'
      };
    }
  }

  /**
   * 初始化默认网站
   */
  async initializeDefaultSites(): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      const blockedSiteService = this.databaseService.getBlockedSiteService();

      // 检查是否已有网站
      const existingSites = await blockedSiteService.getSites();
      if (existingSites.sites.length > 0) {
        return {
          success: true,
          message: '已存在网站，跳过默认网站初始化'
        };
      }

      // 添加默认启用的网站
      const defaultSites = getDefaultEnabledSites();
      let addedCount = 0;

      for (const site of defaultSites) {
        try {
          await blockedSiteService.addSite({
            url: site.url,
            domain: site.domain,
            title: site.title,
            description: site.description,
            category: site.category,
            priority: site.priority,
            enabled: site.enabled
          });
          addedCount++;
        } catch (error) {
          console.warn('Failed to add default site:', site.url, error);
        }
      }

      // 更新代理服务器黑名单
      if (this.proxyServer.isActive()) {
        await this.updateProxyBlocklist();
      }

      console.log(`Initialized ${addedCount} default sites`);
      return {
        success: true,
        message: `成功初始化 ${addedCount} 个默认网站`
      };
    } catch (error) {
      console.error('Initialize default sites error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '初始化默认网站失败'
      };
    }
  }

  /**
   * 刷新会话
   */
  async refreshSession(sessionId: string): Promise<ApiResponse<AuthStatus>> {
    try {
      this.ensureInitialized();

      const authStatus = await this.authService!.refreshSession(sessionId);

      return {
        success: true,
        data: authStatus
      };
    } catch (error) {
      console.error('Refresh session error:', error);
      return {
        success: false,
        data: { isAuthenticated: false },
        error: error instanceof Error ? error.message : '会话刷新失败'
      };
    }
  }

  /**
   * 获取所有网站
   */
  async getAllSites(): Promise<ApiResponse<any[]>> {
    try {
      this.ensureInitialized();

      const blockedSiteService = this.databaseService.getBlockedSiteService();
      const result = await blockedSiteService.getSites();

      return {
        success: true,
        data: result.sites
      };
    } catch (error) {
      console.error('Get all sites error:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : '获取网站列表失败'
      };
    }
  }

  /**
   * 添加网站
   */
  async addSite(siteData: any): Promise<ApiResponse<any>> {
    try {
      this.ensureInitialized();

      const blockedSiteService = this.databaseService.getBlockedSiteService();
      const result = await blockedSiteService.addSite(siteData);

      if (result.success && result.site) {
        // 更新代理服务器黑名单
        if (this.proxyServer.isActive()) {
          await this.updateProxyBlocklist();
        }

        return {
          success: true,
          data: result.site
        };
      } else {
        return {
          success: false,
          error: result.error || '添加网站失败'
        };
      }
    } catch (error) {
      console.error('Add site error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '添加网站失败'
      };
    }
  }

  /**
   * 切换网站状态
   */
  async toggleSite(siteId: string): Promise<ApiResponse<any>> {
    try {
      this.ensureInitialized();

      const blockedSiteService = this.databaseService.getBlockedSiteService();
      const result = await blockedSiteService.toggleSite(parseInt(siteId));

      if (result) {
        // 更新代理服务器黑名单
        if (this.proxyServer.isActive()) {
          await this.updateProxyBlocklist();
        }

        return {
          success: true,
          data: result
        };
      } else {
        return {
          success: false,
          error: '网站不存在'
        };
      }
    } catch (error) {
      console.error('Toggle site error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '切换网站状态失败'
      };
    }
  }

  /**
   * 删除网站
   */
  async deleteSite(siteId: string): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      const blockedSiteService = this.databaseService.getBlockedSiteService();
      const success = await blockedSiteService.deleteSite(parseInt(siteId));

      if (success) {
        // 更新代理服务器黑名单
        if (this.proxyServer.isActive()) {
          await this.updateProxyBlocklist();
        }

        return {
          success: true,
          message: '网站删除成功'
        };
      } else {
        return {
          success: false,
          error: '网站不存在'
        };
      }
    } catch (error) {
      console.error('Delete site error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除网站失败'
      };
    }
  }

  /**
   * 重置所有网站
   */
  async resetAllSites(): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      const blockedSiteService = this.databaseService.getBlockedSiteService();
      const count = await blockedSiteService.resetAllSites(false); // 禁用所有网站

      // 更新代理服务器黑名单
      if (this.proxyServer.isActive()) {
        await this.updateProxyBlocklist();
      }

      return {
        success: true,
        message: `已重置 ${count} 个网站的状态`
      };
    } catch (error) {
      console.error('Reset all sites error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '重置网站状态失败'
      };
    }
  }

  /**
   * 导出网站列表
   */
  async exportSites(): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      const { dialog } = require('electron');
      const fs = require('fs').promises;

      // 显示保存对话框
      const result = await dialog.showSaveDialog({
        title: '导出网站列表',
        defaultPath: `cuizijin-sites-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON文件', extensions: ['json'] },
          { name: 'CSV文件', extensions: ['csv'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return {
          success: false,
          error: '用户取消了导出操作'
        };
      }

      // 获取所有网站
      const sitesResponse = await this.getAllSites();
      if (!sitesResponse.success) {
        return {
          success: false,
          error: sitesResponse.error || 'Failed to get sites'
        };
      }

      const sites = sitesResponse.data || [];
      const isCSV = result.filePath.toLowerCase().endsWith('.csv');

      if (isCSV) {
        // 导出为CSV格式
        const csvHeader = 'URL,域名,标题,分类,启用状态,优先级,创建时间\n';
        const csvRows = sites.map((site: any) => {
          return [
            site.url,
            site.domain,
            site.title || '',
            site.category || 'general',
            site.enabled ? '是' : '否',
            site.priority || 1,
            new Date(site.createdAt).toLocaleString()
          ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        }).join('\n');

        await fs.writeFile(result.filePath, csvHeader + csvRows, 'utf8');
      } else {
        // 导出为JSON格式
        const exportData = {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          sites: sites.map((site: any) => ({
            url: site.url,
            domain: site.domain,
            title: site.title,
            description: site.description,
            category: site.category,
            priority: site.priority,
            enabled: site.enabled
          }))
        };

        await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2), 'utf8');
      }

      return {
        success: true,
        message: `网站列表已导出到: ${result.filePath}`
      };
    } catch (error) {
      console.error('Export sites error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export sites'
      };
    }
  }

  /**
   * 导入网站列表
   */
  async importSites(): Promise<ApiResponse<{ imported: number }>> {
    try {
      this.ensureInitialized();

      const { dialog } = require('electron');
      const fs = require('fs').promises;

      // 显示打开对话框
      const result = await dialog.showOpenDialog({
        title: '导入网站列表',
        filters: [
          { name: 'JSON文件', extensions: ['json'] },
          { name: 'CSV文件', extensions: ['csv'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return {
          success: false,
          error: '用户取消了导入操作'
        };
      }

      const filePath = result.filePaths[0];
      const fileContent = await fs.readFile(filePath, 'utf8');
      const isCSV = filePath.toLowerCase().endsWith('.csv');

      let sites: any[] = [];

      if (isCSV) {
        // 解析CSV格式
        const lines = fileContent.split('\n').filter((line: string) => line.trim());
        if (lines.length < 2) {
          return {
            success: false,
            error: 'CSV文件格式错误，至少需要标题行和一行数据'
          };
        }

        // 跳过标题行
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // 简单的CSV解析（假设没有复杂的引号嵌套）
          const fields = line.split(',').map((field: string) => field.replace(/^"|"$/g, '').replace(/""/g, '"'));

          if (fields.length >= 2) {
            sites.push({
              url: fields[0],
              domain: fields[1],
              title: fields[2] || '',
              category: fields[3] || 'general',
              enabled: fields[4] === '是' || fields[4] === 'true',
              priority: parseInt(fields[5]) || 1
            });
          }
        }
      } else {
        // 解析JSON格式
        let importData;
        try {
          importData = JSON.parse(fileContent);
        } catch (parseError) {
          return {
            success: false,
            error: '文件格式错误，请确保是有效的JSON文件'
          };
        }

        if (Array.isArray(importData)) {
          sites = importData;
        } else if (importData.sites && Array.isArray(importData.sites)) {
          sites = importData.sites;
        } else {
          return {
            success: false,
            error: '文件格式不正确，找不到网站列表数据'
          };
        }
      }

      // 导入网站
      const blockedSiteService = this.databaseService.getBlockedSiteService();
      let importedCount = 0;

      for (const site of sites) {
        try {
          if (!site.url || !site.domain) {
            console.warn('Skipping invalid site:', site);
            continue;
          }

          await blockedSiteService.addSite({
            url: site.url,
            domain: site.domain,
            title: site.title,
            description: site.description,
            category: site.category || 'general',
            priority: site.priority || 1,
            enabled: site.enabled !== false // 默认启用
          });

          importedCount++;
        } catch (error) {
          console.warn('Failed to import site:', site.url, error);
        }
      }

      // 更新代理服务器黑名单
      if (this.proxyServer.isActive()) {
        await this.updateProxyBlocklist();
      }

      return {
        success: true,
        data: { imported: importedCount },
        message: `成功导入 ${importedCount} 个网站`
      };
    } catch (error) {
      console.error('Import sites error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import sites'
      };
    }
  }

  /**
   * 更改密码
   */
  async changePassword(sessionId: string, oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();
      
      const success = await this.authService!.changePassword(sessionId, oldPassword, newPassword);
      
      if (success) {
        console.log('Password changed successfully');
        return {
          success: true,
          message: '密码修改成功'
        };
      } else {
        return {
          success: false,
          error: '密码修改失败：原密码错误或新密码不符合要求'
        };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '密码修改过程中发生错误'
      };
    }
  }

  /**
   * 紧急重置密码
   */
  async emergencyResetPassword(newPassword: string, resetToken?: string): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();
      
      const success = await this.authService!.emergencyResetPassword(newPassword, resetToken);
      
      if (success) {
        console.log('Password reset successfully');
        return {
          success: true,
          message: '密码重置成功'
        };
      } else {
        return {
          success: false,
          error: '密码重置失败：重置令牌无效或新密码不符合要求'
        };
      }
    } catch (error) {
      console.error('Emergency reset password error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '密码重置过程中发生错误'
      };
    }
  }

  /**
   * 获取数据库服务
   */
  getDatabaseService(): DatabaseService {
    return this.databaseService;
  }

  /**
   * 获取认证服务
   */
  getAuthService(): AuthService {
    this.ensureInitialized();
    return this.authService!;
  }

  /**
   * 清理所有活跃会话
   */
  async clearAllSessions(): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      const sessionCount = this.authService!.getActiveSessions().length;
      this.authService!.clearAllSessions();

      console.log(`Cleared ${sessionCount} active sessions`);

      return {
        success: true,
        message: `已清理 ${sessionCount} 个活跃会话`
      };
    } catch (error) {
      console.error('Clear sessions error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '清理会话失败'
      };
    }
  }

  /**
   * 启动代理服务器
   */
  async startProxy(): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      // 更新代理服务器的黑名单
      await this.updateProxyBlocklist();

      await this.proxyServer.start();

      // 发送代理状态变化事件到渲染进程
      this.windowManager.sendToRenderer('proxy:status-changed', {
        isActive: true,
        port: this.proxyServer.getPort()
      });

      return {
        success: true,
        message: '代理服务器启动成功'
      };
    } catch (error) {
      console.error('Start proxy error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '启动代理服务器失败'
      };
    }
  }

  /**
   * 停止代理服务器
   */
  async stopProxy(): Promise<ApiResponse<void>> {
    try {
      await this.proxyServer.stop();

      // 发送代理状态变化事件到渲染进程
      this.windowManager.sendToRenderer('proxy:status-changed', {
        isActive: false
      });

      return {
        success: true,
        message: '代理服务器停止成功'
      };
    } catch (error) {
      console.error('Stop proxy error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '停止代理服务器失败'
      };
    }
  }

  /**
   * 重启代理服务器
   */
  async restartProxy(): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      await this.updateProxyBlocklist();
      await this.proxyServer.restart();

      return {
        success: true,
        message: '代理服务器重启成功'
      };
    } catch (error) {
      console.error('Restart proxy error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '重启代理服务器失败'
      };
    }
  }

  /**
   * 获取代理服务器状态
   */
  async getProxyStatus(): Promise<ApiResponse<any>> {
    try {
      const status = this.proxyServer.getStatus();
      const stats = this.proxyServer.getStats();
      const config = this.proxyServer.getConfig();

      return {
        success: true,
        data: {
          status,
          stats,
          config: {
            httpPort: config.httpPort,
            httpsPort: config.httpsPort,
            bindAddress: config.bindAddress,
            enableHttps: config.enableHttps
          }
        }
      };
    } catch (error) {
      console.error('Get proxy status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取代理状态失败'
      };
    }
  }

  /**
   * 更新代理服务器的黑名单
   */
  private async updateProxyBlocklist(): Promise<void> {
    try {
      const blockedSiteService = this.databaseService.getBlockedSiteService();
      const result = await blockedSiteService.getSites();

      // 提取启用的域名
      const enabledDomains = result.sites
        .filter(site => site.enabled)
        .map(site => site.domain);

      this.proxyServer.updateBlockedDomains(enabledDomains);
      console.log(`Updated proxy blocklist: ${enabledDomains.length} domains`);
    } catch (error) {
      console.error('Update proxy blocklist error:', error);
    }
  }

  /**
   * 处理代理拦截事件
   */
  private async handleProxyInterception(event: InterceptionEvent): Promise<void> {
    try {
      // 记录拦截事件到数据库
      const loggingService = this.databaseService.getLoggingService();
      await loggingService.logSystemAction(
        'proxy_intercept',
        true,
        {
          domain: event.domain,
          url: event.url,
          protocol: event.protocol,
          timestamp: event.timestamp.toISOString()
        },
        {
          target: event.domain
        }
      );

      // 更新拦截统计
      await this.recordIntercept(event.domain, event.url);

      // 发送拦截事件到渲染进程
      this.windowManager.sendToRenderer('proxy:intercept', {
        domain: event.domain,
        url: event.url,
        timestamp: event.timestamp
      });

      console.log(`Proxy interception logged: ${event.domain}`);
    } catch (error) {
      console.error('Handle proxy interception error:', error);
    }
  }

  /**
   * 获取系统信息
   */
  async getSystemInfo(): Promise<ApiResponse<any>> {
    try {
      const systemInfo = await this.systemIntegration.getSystemInfo();

      return {
        success: true,
        data: systemInfo
      };
    } catch (error) {
      console.error('Get system info error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取系统信息失败'
      };
    }
  }

  /**
   * 设置系统代理
   */
  async setSystemProxy(enabled: boolean): Promise<ApiResponse<void>> {
    try {
      const proxyConfig = this.proxyServer.getConfig();
      const success = await this.systemIntegration.setSystemProxy(
        enabled,
        proxyConfig.bindAddress,
        proxyConfig.httpPort
      );

      if (success) {
        return {
          success: true,
          message: enabled ? '系统代理已启用' : '系统代理已禁用'
        };
      } else {
        return {
          success: false,
          error: '设置系统代理失败'
        };
      }
    } catch (error) {
      console.error('Set system proxy error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '设置系统代理失败'
      };
    }
  }

  /**
   * 安装证书
   */
  async installCertificate(): Promise<ApiResponse<any>> {
    try {
      const result = await this.systemIntegration.installCertificate();

      if (result.installed) {
        return {
          success: true,
          data: result,
          message: '证书安装成功'
        };
      } else {
        return {
          success: false,
          error: result.error || '证书安装失败'
        };
      }
    } catch (error) {
      console.error('Install certificate error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '证书安装失败'
      };
    }
  }

  /**
   * 卸载证书
   */
  async uninstallCertificate(): Promise<ApiResponse<any>> {
    try {
      const result = await this.systemIntegration.uninstallCertificate();

      if (!result.installed) {
        return {
          success: true,
          data: result,
          message: '证书卸载成功'
        };
      } else {
        return {
          success: false,
          error: result.error || '证书卸载失败'
        };
      }
    } catch (error) {
      console.error('Uninstall certificate error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '证书卸载失败'
      };
    }
  }

  /**
   * 检查证书状态
   */
  async getCertificateStatus(): Promise<ApiResponse<boolean>> {
    try {
      const installed = await this.systemIntegration.isCertificateInstalled();

      return {
        success: true,
        data: installed
      };
    } catch (error) {
      console.error('Get certificate status error:', error);
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : '检查证书状态失败'
      };
    }
  }

  /**
   * 获取安全状态
   */
  async getSecurityStatus(): Promise<ApiResponse<any>> {
    try {
      const status = await this.securityManager.getSecurityStatus();

      return {
        success: true,
        data: status
      };
    } catch (error) {
      console.error('Get security status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取安全状态失败'
      };
    }
  }

  /**
   * 执行安全扫描
   */
  async performSecurityScan(): Promise<ApiResponse<any>> {
    try {
      const results = await this.securityManager.performSecurityScan();

      return {
        success: true,
        data: results,
        message: `安全扫描完成，发现 ${results.length} 个问题`
      };
    } catch (error) {
      console.error('Security scan error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '安全扫描失败'
      };
    }
  }

  /**
   * 获取安全事件
   */
  async getSecurityEvents(limit: number = 50): Promise<ApiResponse<SecurityEvent[]>> {
    try {
      const events = this.securityManager.getSecurityEvents(limit);

      return {
        success: true,
        data: events
      };
    } catch (error) {
      console.error('Get security events error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取安全事件失败'
      };
    }
  }

  /**
   * 清理安全事件历史
   */
  async clearSecurityEvents(): Promise<ApiResponse<void>> {
    try {
      this.securityManager.clearSecurityEvents();

      return {
        success: true,
        message: '安全事件历史已清理'
      };
    } catch (error) {
      console.error('Clear security events error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '清理安全事件失败'
      };
    }
  }

  /**
   * 处理安全事件
   */
  private handleSecurityEvent(event: SecurityEvent): void {
    console.log(`Security Event [${event.severity.toUpperCase()}]: ${event.description}`);

    // 根据事件严重程度采取不同的响应措施
    switch (event.severity) {
      case 'critical':
        // 关键安全事件，可能需要立即停止服务
        console.error('Critical security event detected:', event);
        break;
      case 'high':
        // 高级安全事件，记录并警告
        console.warn('High severity security event:', event);
        break;
      case 'medium':
      case 'low':
        // 中低级事件，仅记录
        console.info('Security event logged:', event);
        break;
    }

    // 发送安全事件到渲染进程
    this.windowManager.sendToRenderer('security:event', {
      type: event.type,
      severity: event.severity,
      description: event.description,
      timestamp: event.timestamp,
      data: event.data
    });

    // 这里可以添加更多的响应逻辑，比如：
    // - 自动采取防护措施
    // - 记录到数据库
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<ApiResponse<any>> {
    try {
      this.ensureInitialized();

      const stats = await this.databaseService.getStats();
      const proxyStatus = await this.getProxyStatus();
      const securityStatus = await this.getSecurityStatus();

      return {
        success: true,
        data: {
          ...stats,
          proxy: proxyStatus.data,
          security: securityStatus.data,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Get stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats'
      };
    }
  }

  /**
   * 获取仪表板统计信息
   */
  async getDashboardStats(): Promise<ApiResponse<any>> {
    try {
      this.ensureInitialized();

      const sites = await this.getAllSites();
      const proxyStatus = await this.getProxyStatus();

      const activeSites = sites.data?.filter((site: any) => site.enabled).length || 0;
      const totalSites = sites.data?.length || 0;

      // 获取拦截统计
      const interceptStats = await this.getInterceptStats();
      const todayStats = await this.getTodayInterceptStats();

      return {
        success: true,
        data: {
          totalSites,
          activeSites,
          proxyActive: proxyStatus.data?.isActive || false,
          blockedToday: todayStats.totalIntercepts || 0,
          totalBlocked: interceptStats.totalIntercepts || 0,
          mostBlockedSite: interceptStats.mostBlockedSite?.domain || null,
          lastUpdate: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get dashboard stats'
      };
    }
  }

  /**
   * 获取拦截统计信息
   */
  private async getInterceptStats(): Promise<any> {
    try {
      const { interceptStatsDAO } = this.databaseService.getDAOs();
      if (!interceptStatsDAO) {
        return { totalIntercepts: 0, uniqueSites: 0, mostBlockedSite: null };
      }

      return await interceptStatsDAO.getOverallStats();
    } catch (error) {
      console.error('Get intercept stats error:', error);
      return { totalIntercepts: 0, uniqueSites: 0, mostBlockedSite: null };
    }
  }

  /**
   * 获取今日拦截统计信息
   */
  private async getTodayInterceptStats(): Promise<any> {
    try {
      const { interceptStatsDAO } = this.databaseService.getDAOs();
      if (!interceptStatsDAO) {
        return { totalIntercepts: 0, uniqueSites: 0 };
      }

      const todayStats = await interceptStatsDAO.getTodayStats();
      const totalIntercepts = todayStats.reduce((sum, stat) => sum + stat.interceptCount, 0);

      return {
        totalIntercepts,
        uniqueSites: todayStats.length,
        stats: todayStats
      };
    } catch (error) {
      console.error('Get today intercept stats error:', error);
      return { totalIntercepts: 0, uniqueSites: 0 };
    }
  }

  /**
   * 记录拦截事件
   */
  async recordIntercept(domain: string, url: string): Promise<void> {
    try {
      const { blockedSiteDAO, interceptStatsDAO } = this.databaseService.getDAOs();
      if (!blockedSiteDAO || !interceptStatsDAO) {
        return;
      }

      // 查找对应的网站记录
      const site = await blockedSiteDAO.findByDomain(domain);
      if (site) {
        await interceptStatsDAO.recordIntercept(site.id, domain);
      }
    } catch (error) {
      console.error('Record intercept error:', error);
    }
  }

  /**
   * 获取历史统计信息
   */
  async getStatsHistory(days: number = 7): Promise<ApiResponse<any>> {
    try {
      this.ensureInitialized();

      const { interceptStatsDAO } = this.databaseService.getDAOs();
      if (!interceptStatsDAO) {
        return {
          success: true,
          data: []
        };
      }

      const history = await interceptStatsDAO.getDailyStats(days);

      return {
        success: true,
        data: history
      };
    } catch (error) {
      console.error('Get stats history error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats history'
      };
    }
  }

  /**
   * 获取日志
   */
  async getLogs(options?: {
    filter?: any;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    try {
      this.ensureInitialized();

      const loggingService = this.databaseService.getLoggingService();
      if (!loggingService) {
        return {
          success: false,
          error: 'Logging service not available'
        };
      }

      // 使用OperationLogDAO直接获取日志
      const { operationLogDAO } = this.databaseService.getDAOs();
      if (!operationLogDAO) {
        return {
          success: false,
          error: 'Operation log DAO not available'
        };
      }

      const logs = await operationLogDAO.getAll({
        filter: options?.filter,
        page: options?.page || 1,
        limit: options?.limit || 50
      });

      return {
        success: true,
        data: logs
      };
    } catch (error) {
      console.error('Get logs error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get logs'
      };
    }
  }

  /**
   * 清除日志
   */
  async clearLogs(): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      const loggingService = this.databaseService.getLoggingService();
      if (!loggingService) {
        return {
          success: false,
          error: 'Logging service not available'
        };
      }

      await loggingService.clearAllLogs();

      return {
        success: true,
        message: '日志已清除'
      };
    } catch (error) {
      console.error('Clear logs error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear logs'
      };
    }
  }

  /**
   * 导出日志
   */
  async exportLogs(filter?: any): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      const { dialog } = require('electron');
      const fs = require('fs').promises;

      // 显示保存对话框
      const result = await dialog.showSaveDialog({
        title: '导出日志',
        defaultPath: `cuizijin-logs-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON文件', extensions: ['json'] },
          { name: 'CSV文件', extensions: ['csv'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return {
          success: false,
          error: '用户取消了导出操作'
        };
      }

      const loggingService = this.databaseService.getLoggingService();
      if (!loggingService) {
        return {
          success: false,
          error: 'Logging service not available'
        };
      }

      // 获取所有日志
      const { operationLogDAO } = this.databaseService.getDAOs();
      if (!operationLogDAO) {
        return {
          success: false,
          error: 'Operation log DAO not available'
        };
      }

      const logs = await operationLogDAO.getAll({
        filter,
        page: 1,
        limit: 10000
      });

      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        filter,
        logs: logs.logs || []
      };

      // 根据文件扩展名决定格式
      const isCSV = result.filePath.toLowerCase().endsWith('.csv');

      if (isCSV) {
        // 导出为CSV格式
        const csvHeader = 'ID,操作类型,目标,状态,时间,错误信息\n';
        const csvRows = exportData.logs.map((log: any) => {
          return [
            log.id,
            log.action,
            log.target || '',
            log.success ? '成功' : '失败',
            new Date(log.timestamp).toLocaleString(),
            log.errorMessage || ''
          ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        }).join('\n');

        await fs.writeFile(result.filePath, csvHeader + csvRows, 'utf8');
      } else {
        // 导出为JSON格式
        await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2), 'utf8');
      }

      return {
        success: true,
        message: `日志已导出到: ${result.filePath}`
      };
    } catch (error) {
      console.error('Export logs error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export logs'
      };
    }
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<ApiResponse<any>> {
    try {
      this.ensureInitialized();

      const config = await this.databaseService.getConfig();
      return config;
    } catch (error) {
      console.error('Get config error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get config'
      };
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(config: any): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      const result = await this.databaseService.updateConfig(config);
      return result;
    } catch (error) {
      console.error('Update config error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update config'
      };
    }
  }

  /**
   * 重置配置
   */
  async resetConfig(): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      const result = await this.databaseService.resetConfig();
      return result;
    } catch (error) {
      console.error('Reset config error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset config'
      };
    }
  }

  /**
   * 导出配置
   */
  async exportConfig(): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      const { dialog } = require('electron');
      const fs = require('fs').promises;

      // 显示保存对话框
      const result = await dialog.showSaveDialog({
        title: '导出配置',
        defaultPath: `cuizijin-config-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return {
          success: false,
          error: '用户取消了导出操作'
        };
      }

      // 获取配置数据
      const configResponse = await this.getConfig();
      if (!configResponse.success) {
        return configResponse;
      }

      // 导出数据
      const exportData = await this.databaseService.exportData({
        includeSites: true,
        includeLogs: false,
        includeStats: true,
        format: 'json'
      });

      const fullExportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        config: configResponse.data,
        ...exportData
      };

      // 写入文件
      await fs.writeFile(result.filePath, JSON.stringify(fullExportData, null, 2), 'utf8');

      return {
        success: true,
        message: `配置已导出到: ${result.filePath}`
      };
    } catch (error) {
      console.error('Export config error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export config'
      };
    }
  }

  /**
   * 导入配置
   */
  async importConfig(): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      const { dialog } = require('electron');
      const fs = require('fs').promises;

      // 显示打开对话框
      const result = await dialog.showOpenDialog({
        title: '导入配置',
        filters: [
          { name: 'JSON文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return {
          success: false,
          error: '用户取消了导入操作'
        };
      }

      // 读取文件
      const filePath = result.filePaths[0];
      const fileContent = await fs.readFile(filePath, 'utf8');

      let importData;
      try {
        importData = JSON.parse(fileContent);
      } catch (parseError) {
        return {
          success: false,
          error: '配置文件格式错误，请确保是有效的JSON文件'
        };
      }

      // 验证导入数据格式
      if (!importData.version || !importData.config) {
        return {
          success: false,
          error: '配置文件格式不正确，缺少必要的字段'
        };
      }

      // 导入配置
      const updateResult = await this.updateConfig(importData.config);
      if (!updateResult.success) {
        return updateResult;
      }

      // 如果有网站数据，也导入网站
      if (importData.sites) {
        const blockedSiteService = this.databaseService.getBlockedSiteService();
        for (const site of importData.sites) {
          try {
            await blockedSiteService.addSite(site);
          } catch (error) {
            console.warn('Failed to import site:', site.url, error);
          }
        }
      }

      return {
        success: true,
        message: `配置已从 ${filePath} 导入成功`
      };
    } catch (error) {
      console.error('Import config error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import config'
      };
    }
  }

  /**
   * 完全重置应用
   */
  async fullReset(): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      // 停止所有服务
      await this.stopAllServices();

      // 清除所有数据
      await this.clearAllData();

      // 重置配置
      await this.resetConfig();

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      console.error('Full reset error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform full reset'
      };
    }
  }

  /**
   * 打开日志文件夹
   */
  async openLogsFolder(): Promise<ApiResponse<void>> {
    try {
      const { shell } = require('electron');
      const path = require('path');
      const os = require('os');

      const logsPath = path.join(os.homedir(), '.cuizijin-trap', 'logs');
      await shell.openPath(logsPath);

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      console.error('Open logs folder error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open logs folder'
      };
    }
  }

  /**
   * 清除所有数据
   */
  async clearAllData(): Promise<ApiResponse<void>> {
    try {
      this.ensureInitialized();

      // 清除数据库数据
      const result = await this.databaseService.clearAllData();

      // 清除安全事件
      await this.clearSecurityEvents();

      return result;
    } catch (error) {
      console.error('Clear all data error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear all data'
      };
    }
  }

  /**
   * 停止所有服务
   */
  async stopAllServices(): Promise<ApiResponse<void>> {
    try {
      // 停止代理服务器
      if (this.proxyServer.isActive()) {
        await this.proxyServer.stop();
      }

      // 停止安全管理器
      await this.securityManager.stop();

      // 恢复系统代理设置
      await this.systemIntegration.restoreSystemProxy();

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      console.error('Stop all services error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop all services'
      };
    }
  }

  /**
   * 重置代理设置
   */
  async resetProxy(): Promise<ApiResponse<void>> {
    try {
      // 停止代理服务器
      if (this.proxyServer.isActive()) {
        await this.proxyServer.stop();
      }

      // 恢复系统代理设置
      await this.systemIntegration.restoreSystemProxy();

      // TODO: 重置代理配置到默认值

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      console.error('Reset proxy error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset proxy'
      };
    }
  }

  /**
   * 销毁控制器
   */
  async destroy(): Promise<void> {
    try {
      // 停止安全管理器
      await this.securityManager.stop();

      // 恢复系统代理设置
      await this.systemIntegration.restoreSystemProxy();

      // 停止代理服务器
      if (this.proxyServer.isActive()) {
        await this.proxyServer.stop();
      }

      if (this.authService) {
        // 清理所有活跃会话
        await this.clearAllSessions();
        this.authService.destroy();
      }

      await this.databaseService.close();

      this.isInitialized = false;
      console.log('AppController destroyed');
    } catch (error) {
      console.error('Error destroying AppController:', error);
    }
  }

  /**
   * 确保控制器已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.authService) {
      throw new Error('AppController is not initialized');
    }
  }
}
