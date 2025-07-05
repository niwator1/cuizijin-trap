import { BrowserWindow } from 'electron';

/**
 * 窗口管理器
 * 负责管理应用的所有窗口
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;

  /**
   * 设置主窗口
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * 获取主窗口
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * 设置设置窗口
   */
  setSettingsWindow(window: BrowserWindow): void {
    this.settingsWindow = window;
  }

  /**
   * 获取设置窗口
   */
  getSettingsWindow(): BrowserWindow | null {
    return this.settingsWindow;
  }

  /**
   * 显示主窗口
   */
  showMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  /**
   * 隐藏主窗口
   */
  hideMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.hide();
    }
  }

  /**
   * 关闭所有窗口
   */
  closeAllWindows(): void {
    if (this.settingsWindow) {
      this.settingsWindow.close();
      this.settingsWindow = null;
    }
    
    if (this.mainWindow) {
      this.mainWindow.close();
      this.mainWindow = null;
    }
  }

  /**
   * 检查是否有窗口打开
   */
  hasOpenWindows(): boolean {
    return !!(this.mainWindow || this.settingsWindow);
  }

  /**
   * 向渲染进程发送消息
   */
  sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * 向所有窗口发送消息
   */
  sendToAllWindows(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.webContents.send(channel, data);
    }
  }
}
