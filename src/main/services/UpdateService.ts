import { autoUpdater, UpdateInfo } from 'electron-updater';
import { app, dialog, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

/**
 * 自动更新服务
 * 负责检查、下载和安装应用更新
 */
export class UpdateService extends EventEmitter {
  private mainWindow: BrowserWindow | null = null;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private isUpdateAvailable = false;
  private isUpdateDownloaded = false;

  constructor() {
    super();
    this.setupAutoUpdater();
  }

  /**
   * 设置主窗口引用
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * 初始化自动更新器
   */
  private setupAutoUpdater(): void {
    // 临时禁用自动更新功能，避免启动时的错误
    // TODO: 在GitHub releases配置正确后重新启用
    console.log('自动更新功能已禁用');
    return;

    // 配置更新服务器
    if (process.env.NODE_ENV === 'development') {
      // 开发环境下禁用自动更新
      autoUpdater.updateConfigPath = null;
      return;
    }

    // 生产环境配置
    autoUpdater.autoDownload = false; // 不自动下载，让用户选择
    autoUpdater.autoInstallOnAppQuit = true; // 应用退出时自动安装

    // 设置更新服务器（GitHub Releases）
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'niwator1',
      repo: 'cuizijin-trap',
      private: false
    });

    // 监听更新事件
    this.setupUpdateEvents();
  }

  /**
   * 设置更新事件监听器
   */
  private setupUpdateEvents(): void {
    // 检查更新时
    autoUpdater.on('checking-for-update', () => {
      console.log('正在检查更新...');
      this.emit('checking-for-update');
    });

    // 发现可用更新
    autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log('发现可用更新:', info.version);
      this.isUpdateAvailable = true;
      this.emit('update-available', info);
      this.showUpdateAvailableDialog(info);
    });

    // 没有可用更新
    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      console.log('当前已是最新版本');
      this.emit('update-not-available', info);
    });

    // 更新下载进度
    autoUpdater.on('download-progress', (progressObj) => {
      const logMessage = `下载速度: ${progressObj.bytesPerSecond} - 已下载 ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
      console.log(logMessage);
      this.emit('download-progress', progressObj);
    });

    // 更新下载完成
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      console.log('更新下载完成');
      this.isUpdateDownloaded = true;
      this.emit('update-downloaded', info);
      this.showUpdateDownloadedDialog(info);
    });

    // 更新错误
    autoUpdater.on('error', (error) => {
      console.error('更新错误:', error);
      this.emit('update-error', error);
      this.showUpdateErrorDialog(error);
    });
  }

  /**
   * 手动检查更新
   */
  async checkForUpdates(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log('开发环境下跳过更新检查');
      return;
    }

    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('检查更新失败:', error);
      this.emit('update-error', error);
    }
  }

  /**
   * 开始自动检查更新（每小时检查一次）
   */
  startAutoCheck(): void {
    if (this.updateCheckInterval) {
      return;
    }

    // 立即检查一次
    this.checkForUpdates();

    // 设置定时检查（每小时）
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, 60 * 60 * 1000); // 1小时
  }

  /**
   * 停止自动检查更新
   */
  stopAutoCheck(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  /**
   * 下载更新
   */
  async downloadUpdate(): Promise<void> {
    if (!this.isUpdateAvailable) {
      throw new Error('没有可用的更新');
    }

    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('下载更新失败:', error);
      throw error;
    }
  }

  /**
   * 安装更新并重启应用
   */
  installUpdate(): void {
    if (!this.isUpdateDownloaded) {
      throw new Error('更新尚未下载完成');
    }

    autoUpdater.quitAndInstall();
  }

  /**
   * 显示更新可用对话框
   */
  private showUpdateAvailableDialog(info: UpdateInfo): void {
    if (!this.mainWindow) return;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `崔子瑾诱捕器 v${info.version} 现已可用`,
      detail: `当前版本: v${app.getVersion()}\n新版本: v${info.version}\n\n${info.releaseNotes || '查看更新日志了解新功能和改进。'}`,
      buttons: ['立即下载', '稍后提醒', '跳过此版本'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      switch (result.response) {
        case 0: // 立即下载
          this.downloadUpdate().catch(console.error);
          break;
        case 1: // 稍后提醒
          // 30分钟后再次提醒
          setTimeout(() => {
            if (this.isUpdateAvailable && !this.isUpdateDownloaded) {
              this.showUpdateAvailableDialog(info);
            }
          }, 30 * 60 * 1000);
          break;
        case 2: // 跳过此版本
          // 记录跳过的版本，本次会话不再提醒
          break;
      }
    });
  }

  /**
   * 显示更新下载完成对话框
   */
  private showUpdateDownloadedDialog(info: UpdateInfo): void {
    if (!this.mainWindow) return;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '更新已下载',
      message: `崔子瑾诱捕器 v${info.version} 已下载完成`,
      detail: '更新将在应用重启后安装。您可以选择立即重启或稍后手动重启。',
      buttons: ['立即重启', '稍后重启'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        this.installUpdate();
      }
    });
  }

  /**
   * 显示更新错误对话框
   */
  private showUpdateErrorDialog(error: Error): void {
    if (!this.mainWindow) return;

    dialog.showMessageBox(this.mainWindow, {
      type: 'error',
      title: '更新失败',
      message: '检查更新时发生错误',
      detail: `错误信息: ${error.message}\n\n请检查网络连接或稍后重试。`,
      buttons: ['确定', '重试'],
      defaultId: 0,
      cancelId: 0
    }).then((result) => {
      if (result.response === 1) {
        this.checkForUpdates();
      }
    });
  }

  /**
   * 获取当前更新状态
   */
  getUpdateStatus(): {
    isUpdateAvailable: boolean;
    isUpdateDownloaded: boolean;
    currentVersion: string;
  } {
    return {
      isUpdateAvailable: this.isUpdateAvailable,
      isUpdateDownloaded: this.isUpdateDownloaded,
      currentVersion: app.getVersion()
    };
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopAutoCheck();
    this.removeAllListeners();
  }
}
