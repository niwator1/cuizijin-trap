import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, Notification } from 'electron';
import path from 'path';
import { AppController } from './app/AppController';
import { WindowManager } from './app/WindowManager';
import { DatabaseService } from './database';
import { ProxyServer } from './proxy/ProxyServer';
import { SystemIntegration } from './system/SystemIntegration';
import { UpdateService } from './services/UpdateService';
import { FeedbackService } from './services/FeedbackService';
import { ErrorReportingService } from './services/ErrorReportingService';
import { AnalyticsService } from './services/AnalyticsService';
import { WatchdogService } from './security/WatchdogService';
import { APP_NAME, WINDOW_CONFIG } from '@shared/constants';

class MainApplication {
  private appController: AppController;
  private windowManager: WindowManager;
  private databaseService: DatabaseService;
  private proxyServer: ProxyServer;
  private systemIntegration: SystemIntegration;
  private updateService: UpdateService;
  private feedbackService: FeedbackService;
  private errorReportingService: ErrorReportingService;
  private analyticsService: AnalyticsService;
  private watchdogService: WatchdogService;
  private tray: Tray | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor() {
    this.appController = new AppController();
    this.windowManager = new WindowManager();
    this.databaseService = new DatabaseService();
    this.proxyServer = new ProxyServer();
    this.systemIntegration = new SystemIntegration();
    this.updateService = new UpdateService();
    this.feedbackService = new FeedbackService(this.databaseService);
    this.errorReportingService = new ErrorReportingService(this.databaseService);
    this.analyticsService = new AnalyticsService(this.databaseService);
    this.watchdogService = new WatchdogService();
  }

  async initialize(): Promise<void> {
    // 设置应用事件监听器
    this.setupAppEventListeners();

    // 初始化AppController（包含数据库服务）
    await this.appController.initialize();

    // 设置IPC处理器
    this.setupIpcHandlers();

    // 创建主窗口
    await this.createMainWindow();

    // 创建系统托盘
    this.createTray();

    // 初始化系统集成
    await this.systemIntegration.initialize();

    // 初始化更新服务
    this.updateService.setMainWindow(this.windowManager.getMainWindow()!);
    this.updateService.startAutoCheck();

    // 初始化监控服务
    this.setupMonitoringServices();

    // 启动看门狗服务（仅在生产环境）
    if (process.env.NODE_ENV === 'production') {
      await this.startWatchdogService();
    }
  }

  private setupAppEventListeners(): void {
    // 当所有窗口关闭时
    app.on('window-all-closed', () => {
      // 在macOS上，除非用户明确退出，否则应用和菜单栏保持活跃
      if (process.platform !== 'darwin') {
        this.cleanup();
        app.quit();
      }
    });

    // 当应用激活时
    app.on('activate', async () => {
      // 在macOS上，当点击dock图标且没有其他窗口打开时，重新创建窗口
      if (BrowserWindow.getAllWindows().length === 0) {
        await this.createMainWindow();
      }
    });

    // 应用准备退出时
    app.on('before-quit', async (event) => {
      if (!this.isShuttingDown) {
        event.preventDefault();
        await this.handleExitRequest();
      }
    });

    // 处理第二个实例
    app.on('second-instance', () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }

  private async createMainWindow(): Promise<void> {
    const mainWindow = new BrowserWindow({
      width: WINDOW_CONFIG.DEFAULT_WIDTH,
      height: WINDOW_CONFIG.DEFAULT_HEIGHT,
      minWidth: WINDOW_CONFIG.MIN_WIDTH,
      minHeight: WINDOW_CONFIG.MIN_HEIGHT,
      title: APP_NAME,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // enableRemoteModule: false, // 已弃用
        preload: path.join(__dirname, 'preload.js'),
      },
      show: false, // 先不显示，等加载完成后再显示
    });

    // 设置窗口图标
    if (process.platform !== 'darwin') {
      mainWindow.setIcon(path.join(__dirname, '../../assets/icon.png'));
    }

    // 加载应用
    const isDevelopment = process.env.NODE_ENV === 'development' ||
                         process.env.ELECTRON_IS_DEV === 'true' ||
                         !app.isPackaged;

    if (isDevelopment) {
      try {
        await mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
      } catch (error) {
        console.error('Failed to load development server, falling back to production build:', error);
        // 如果开发服务器连接失败，回退到生产构建
        await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
      }
    } else {
      // 生产环境：加载打包后的文件
      const rendererPath = path.join(__dirname, '../renderer/index.html');
      console.log('Loading renderer from:', rendererPath);
      await mainWindow.loadFile(rendererPath);
    }

    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    // 窗口关闭时隐藏到托盘
    mainWindow.on('close', (event) => {
      if (!(app as any).isQuiting) {
        event.preventDefault();
        mainWindow.hide();
      }
    });

    this.windowManager.setMainWindow(mainWindow);
  }

  private createTray(): void {
    // 创建托盘图标
    const trayIcon = nativeImage.createFromPath(
      path.join(__dirname, '../../assets/tray-icon.png')
    );
    
    this.tray = new Tray(trayIcon);
    
    // 设置托盘菜单
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          const mainWindow = this.windowManager.getMainWindow();
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: '启动代理',
        click: async () => {
          await this.proxyServer.start();
        },
      },
      {
        label: '停止代理',
        click: async () => {
          await this.proxyServer.stop();
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          (app as any).isQuiting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip(APP_NAME);

    // 双击托盘图标显示主窗口
    this.tray.on('double-click', () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }

  private setupIpcHandlers(): void {
    // 认证相关
    ipcMain.handle('auth:login', async (_, password: string, metadata?: any) => {
      return await this.appController.login(password, metadata);
    });

    ipcMain.handle('auth:logout', async (_, sessionId: string) => {
      return await this.appController.logout(sessionId);
    });

    ipcMain.handle('auth:check', async (_, sessionId?: string) => {
      return await this.appController.checkAuth(sessionId);
    });

    ipcMain.handle('auth:check-initialized', async () => {
      return await this.appController.isUserInitialized();
    });

    ipcMain.handle('auth:initialize', async (_, password: string, settings?: any) => {
      return await this.appController.initializeUser(password, settings);
    });

    ipcMain.handle('auth:refresh-session', async (_, sessionId: string) => {
      return await this.appController.refreshSession(sessionId);
    });

    ipcMain.handle('auth:change-password', async (_, sessionId: string, oldPassword: string, newPassword: string) => {
      return await this.appController.changePassword(sessionId, oldPassword, newPassword);
    });

    ipcMain.handle('auth:emergency-reset', async (_, newPassword: string, resetToken?: string) => {
      return await this.appController.emergencyResetPassword(newPassword, resetToken);
    });

    ipcMain.handle('auth:reset-app', async () => {
      return await this.appController.resetApp();
    });

    // 通知相关
    ipcMain.handle('notification:show', async (_, options: { title: string; body: string; type?: string }) => {
      return this.showNotification(options);
    });

    // 网站管理相关
    ipcMain.handle('sites:get-all', async () => {
      return await this.appController.getAllSites();
    });

    ipcMain.handle('sites:add', async (_, siteData: any) => {
      return await this.appController.addSite(siteData);
    });

    ipcMain.handle('sites:toggle', async (_, siteId: string) => {
      return await this.appController.toggleSite(siteId);
    });

    ipcMain.handle('sites:delete', async (_, siteId: string) => {
      return await this.appController.deleteSite(siteId);
    });

    ipcMain.handle('sites:reset-all', async () => {
      return await this.appController.resetAllSites();
    });

    ipcMain.handle('sites:init-defaults', async () => {
      return await this.appController.initializeDefaultSites();
    });

    // 代理控制相关
    ipcMain.handle('proxy:start', async () => {
      return await this.appController.startProxy();
    });

    ipcMain.handle('proxy:stop', async () => {
      return await this.appController.stopProxy();
    });

    ipcMain.handle('proxy:restart', async () => {
      return await this.appController.restartProxy();
    });

    ipcMain.handle('proxy:status', async () => {
      return await this.appController.getProxyStatus();
    });

    // 系统集成相关
    ipcMain.handle('system:get-info', async () => {
      return await this.appController.getSystemInfo();
    });

    ipcMain.handle('system:set-proxy', async (_, enabled: boolean) => {
      return await this.appController.setSystemProxy(enabled);
    });

    ipcMain.handle('system:install-certificate', async () => {
      return await this.appController.installCertificate();
    });

    ipcMain.handle('system:uninstall-certificate', async () => {
      return await this.appController.uninstallCertificate();
    });

    ipcMain.handle('system:certificate-status', async () => {
      return await this.appController.getCertificateStatus();
    });

    // 安全相关
    ipcMain.handle('security:get-status', async () => {
      return await this.appController.getSecurityStatus();
    });

    ipcMain.handle('security:scan', async () => {
      return await this.appController.performSecurityScan();
    });

    ipcMain.handle('security:get-events', async (_, limit?: number) => {
      return await this.appController.getSecurityEvents(limit);
    });

    ipcMain.handle('security:clear-events', async () => {
      return await this.appController.clearSecurityEvents();
    });

    // 统计信息相关
    ipcMain.handle('stats:get', async () => {
      return await this.appController.getStats();
    });

    ipcMain.handle('stats:get-dashboard', async () => {
      return await this.appController.getDashboardStats();
    });

    ipcMain.handle('stats:get-history', async (_, days?: number) => {
      return await this.appController.getStatsHistory(days);
    });

    // 配置管理相关
    ipcMain.handle('config:get', async () => {
      return await this.appController.getConfig();
    });

    ipcMain.handle('config:update', async (_, config: any) => {
      return await this.appController.updateConfig(config);
    });

    ipcMain.handle('config:reset', async () => {
      return await this.appController.resetConfig();
    });

    ipcMain.handle('config:export', async () => {
      return await this.appController.exportConfig();
    });

    ipcMain.handle('config:import', async () => {
      return await this.appController.importConfig();
    });

    // 日志管理相关
    ipcMain.handle('logs:get', async (_, options?: any) => {
      return await this.appController.getLogs(options);
    });

    ipcMain.handle('logs:clear', async () => {
      return await this.appController.clearLogs();
    });

    ipcMain.handle('logs:export', async (_, filter?: any) => {
      return await this.appController.exportLogs(filter);
    });

    // 应用管理相关
    ipcMain.handle('app:restart', async () => {
      return this.restartApp();
    });

    ipcMain.handle('app:fullReset', async () => {
      return await this.appController.fullReset();
    });

    ipcMain.handle('app:openLogsFolder', async () => {
      return await this.appController.openLogsFolder();
    });

    // 数据管理相关
    ipcMain.handle('data:clearAll', async () => {
      return await this.appController.clearAllData();
    });

    // 服务管理相关
    ipcMain.handle('services:stopAll', async () => {
      return await this.appController.stopAllServices();
    });

    ipcMain.handle('sites:reset', async () => {
      return await this.appController.resetAllSites();
    });

    ipcMain.handle('sites:export', async () => {
      return await this.appController.exportSites();
    });

    ipcMain.handle('sites:import', async () => {
      return await this.appController.importSites();
    });

    ipcMain.handle('proxy:reset', async () => {
      return await this.appController.resetProxy();
    });

    // 更新相关
    ipcMain.handle('update:check', async () => {
      try {
        await this.updateService.checkForUpdates();
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('update:download', async () => {
      try {
        await this.updateService.downloadUpdate();
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('update:install', async () => {
      try {
        this.updateService.installUpdate();
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('update:status', async () => {
      return this.updateService.getUpdateStatus();
    });

    // 反馈相关
    ipcMain.handle('feedback:submit', async (_, feedback) => {
      return await this.feedbackService.submitFeedback(feedback);
    });

    ipcMain.handle('feedback:list', async (_, options) => {
      return await this.feedbackService.getFeedbackList(options);
    });

    ipcMain.handle('feedback:stats', async () => {
      return await this.feedbackService.getFeedbackStats();
    });

    ipcMain.handle('feedback:export', async (_, options) => {
      return await this.feedbackService.exportFeedback(options);
    });

    // 错误报告相关
    ipcMain.handle('error:list', async (_, options) => {
      return await this.errorReportingService.getErrorList(options);
    });

    ipcMain.handle('error:stats', async () => {
      return await this.errorReportingService.getErrorStats();
    });

    ipcMain.handle('error:report', async (_, errorRecord) => {
      return await this.errorReportingService.reportError(errorRecord);
    });

    ipcMain.handle('error:export', async (_, format) => {
      return await this.errorReportingService.exportErrorLogs(format);
    });

    ipcMain.handle('error:cleanup', async () => {
      await this.errorReportingService.cleanupOldLogs();
      return { success: true };
    });

    // 分析统计相关
    ipcMain.handle('analytics:usage-stats', async (_, dateRange) => {
      return await this.analyticsService.getUsageStats(dateRange);
    });

    ipcMain.handle('analytics:blocking-stats', async (_, dateRange) => {
      return await this.analyticsService.getBlockingStats(dateRange);
    });

    ipcMain.handle('analytics:export', async (_, format, dataType, dateRange) => {
      return await this.analyticsService.exportAnalyticsData(format, dataType, dateRange);
    });

    ipcMain.handle('analytics:cleanup', async (_, retentionDays) => {
      await this.analyticsService.cleanupOldData(retentionDays);
      return { success: true };
    });

    ipcMain.handle('analytics:track-event', async (_, eventName, properties) => {
      this.analyticsService.trackEvent(eventName, properties);
      return { success: true };
    });
  }

  /**
   * 设置监控服务
   */
  private setupMonitoringServices(): void {
    // 设置分析事件监听
    this.analyticsService.on('event-tracked', (event) => {
      // 可以在这里添加实时事件处理逻辑
    });

    // 设置错误报告事件监听
    this.errorReportingService.on('error-logged', (error) => {
      // 严重错误时可以触发通知
      if (error.severity === 'critical') {
        this.showNotification({
          title: '严重错误',
          body: '应用遇到严重错误，已自动记录',
          type: 'error'
        });
      }
    });

    // 设置反馈事件监听
    this.feedbackService.on('feedback-submitted', (feedback) => {
      console.log('用户反馈已提交:', feedback.id);
    });

    // 跟踪应用启动事件
    this.analyticsService.trackEvent('app_started', {
      version: app.getVersion(),
      platform: process.platform
    });
  }

  /**
   * 重启应用程序
   */
  private restartApp(): { success: boolean; error?: string } {
    try {
      app.relaunch();
      app.exit(0);
      return { success: true };
    } catch (error) {
      console.error('Failed to restart app:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 显示系统通知
   */
  private showNotification(options: { title: string; body: string; type?: string }): { success: boolean; error?: string } {
    try {
      if (!Notification.isSupported()) {
        return {
          success: false,
          error: 'System notifications are not supported'
        };
      }

      const notification = new Notification({
        title: options.title,
        body: options.body,
        icon: path.join(__dirname, '../assets/icon.png'), // 应用图标路径
        silent: false,
        urgency: options.type === 'warning' ? 'critical' : 'normal'
      });

      notification.show();

      return { success: true };
    } catch (error) {
      console.error('Failed to show notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async cleanup(): Promise<void> {
    try {
      // 销毁AppController（包含数据库服务）
      await this.appController.destroy();

      // TODO: 停止代理服务器 - 待实现
      // await this.proxyServer.stop();

      // TODO: 恢复系统代理设置 - 待实现
      // await this.systemIntegration.restoreSystemProxy();

      // 销毁托盘
      if (this.tray) {
        this.tray.destroy();
      }

      // 清理更新服务
      this.updateService.destroy();

      // 清理监控服务
      await this.analyticsService.destroy();
      this.errorReportingService.destroy();
      this.feedbackService.destroy();

      // 停止看门狗服务
      if (this.watchdogService) {
        await this.watchdogService.stop();
      }

      // 停止心跳
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * 启动看门狗服务
   */
  private async startWatchdogService(): Promise<void> {
    try {
      await this.watchdogService.start();

      // 启动心跳定时器
      this.heartbeatTimer = setInterval(() => {
        this.watchdogService.updateHeartbeat();
      }, 10000); // 每10秒更新一次心跳

      console.log('Watchdog service started successfully');
    } catch (error) {
      console.error('Failed to start watchdog service:', error);
    }
  }

  /**
   * 处理退出请求（需要密码验证）
   */
  private async handleExitRequest(): Promise<void> {
    const mainWindow = this.windowManager.getMainWindow();
    if (!mainWindow) {
      await this.performExit();
      return;
    }

    try {
      // 发送退出请求到渲染进程，要求密码验证
      const result = await new Promise<boolean>((resolve) => {
        ipcMain.once('exit-password-result', (_, success: boolean) => {
          resolve(success);
        });

        mainWindow.webContents.send('request-exit-password');

        // 30秒超时
        setTimeout(() => resolve(false), 30000);
      });

      if (result) {
        await this.performExit();
      } else {
        console.log('Exit cancelled - incorrect password or timeout');
      }
    } catch (error) {
      console.error('Error handling exit request:', error);
    }
  }

  /**
   * 执行实际的退出操作
   */
  private async performExit(): Promise<void> {
    this.isShuttingDown = true;

    try {
      await this.cleanup();
      app.exit(0);
    } catch (error) {
      console.error('Error during exit:', error);
      app.exit(1);
    }
  }
}

// 确保只有一个应用实例
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // 当应用准备就绪时初始化
  app.whenReady().then(async () => {
    const mainApp = new MainApplication();
    await mainApp.initialize();
  });
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
