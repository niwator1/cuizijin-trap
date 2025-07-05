import { notificationService } from './NotificationService';

export class RealtimeNotificationService {
  private static instance: RealtimeNotificationService;
  private isInitialized = false;
  private interceptCount = 0;
  private lastInterceptDomain = '';

  static getInstance(): RealtimeNotificationService {
    if (!RealtimeNotificationService.instance) {
      RealtimeNotificationService.instance = new RealtimeNotificationService();
    }
    return RealtimeNotificationService.instance;
  }

  private constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // 监听主进程发送的拦截事件
    window.electronAPI?.on('proxy:intercept', (data: any) => {
      this.handleInterceptEvent(data);
    });

    // 监听主进程发送的安全事件
    window.electronAPI?.on('security:event', (data: any) => {
      this.handleSecurityEvent(data);
    });

    // 监听系统状态变化
    window.electronAPI?.on('system:status-change', (data: any) => {
      this.handleSystemStatusChange(data);
    });

    // 监听代理状态变化
    window.electronAPI?.on('proxy:status-change', (data: any) => {
      this.handleProxyStatusChange(data);
    });

    this.isInitialized = true;
    console.log('Realtime notification service initialized');
  }

  /**
   * 处理拦截事件
   */
  private handleInterceptEvent(data: { domain: string; url: string; timestamp: string }): void {
    this.interceptCount++;
    this.lastInterceptDomain = data.domain;

    // 显示拦截通知
    notificationService.showInterceptNotification(data.domain, this.interceptCount);

    // 如果是同一个域名的连续拦截，更新计数
    if (this.lastInterceptDomain === data.domain) {
      // 可以在这里实现批量通知逻辑
    }

    console.log(`Intercept notification shown for: ${data.domain}`);
  }

  /**
   * 处理安全事件
   */
  private handleSecurityEvent(data: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    timestamp: string;
    details?: any;
  }): void {
    // 显示安全警报通知
    notificationService.showSecurityAlert({
      type: data.type,
      description: data.description,
      severity: data.severity
    });

    console.log(`Security notification shown: ${data.type} (${data.severity})`);
  }

  /**
   * 处理系统状态变化
   */
  private handleSystemStatusChange(data: {
    component: string;
    status: string;
    message?: string;
    critical?: boolean;
  }): void {
    const message = data.message || `${data.component} 状态变更为: ${data.status}`;
    
    notificationService.showSystemNotification(message, data.critical);

    console.log(`System status notification: ${data.component} -> ${data.status}`);
  }

  /**
   * 处理代理状态变化
   */
  private handleProxyStatusChange(data: {
    isActive: boolean;
    port?: number;
    message?: string;
  }): void {
    const message = data.message || (data.isActive 
      ? `代理服务器已启动 (端口: ${data.port})` 
      : '代理服务器已停止');

    notificationService.showNotification({
      type: data.isActive ? 'success' : 'info',
      title: '代理状态变更',
      message,
      duration: 3000,
      group: 'proxy',
      sound: true,
      priority: 'normal'
    });

    console.log(`Proxy status notification: ${data.isActive ? 'started' : 'stopped'}`);
  }

  /**
   * 重置拦截计数
   */
  resetInterceptCount(): void {
    this.interceptCount = 0;
    this.lastInterceptDomain = '';
  }

  /**
   * 获取拦截统计
   */
  getInterceptStats(): { count: number; lastDomain: string } {
    return {
      count: this.interceptCount,
      lastDomain: this.lastInterceptDomain
    };
  }

  /**
   * 启用实时通知
   */
  enable(): void {
    notificationService.enableRealtime();
    console.log('Realtime notifications enabled');
  }

  /**
   * 禁用实时通知
   */
  disable(): void {
    notificationService.disableRealtime();
    console.log('Realtime notifications disabled');
  }

  /**
   * 检查是否启用实时通知
   */
  isEnabled(): boolean {
    return notificationService.isRealtimeEnabled();
  }

  /**
   * 手动触发测试通知
   */
  showTestNotification(): void {
    notificationService.showNotification({
      type: 'info',
      title: '测试通知',
      message: '这是一个测试通知，用于验证通知系统是否正常工作。',
      duration: 5000,
      group: 'test',
      sound: true,
      priority: 'normal',
      actions: [
        {
          label: '确定',
          action: () => {
            console.log('Test notification acknowledged');
          },
          style: 'primary'
        }
      ]
    });
  }

  /**
   * 显示欢迎通知
   */
  showWelcomeNotification(): void {
    notificationService.showNotification({
      type: 'success',
      title: '欢迎使用崔子瑾诱捕器',
      message: '应用已成功启动，所有系统组件运行正常。',
      duration: 5000,
      group: 'system',
      sound: true,
      priority: 'normal',
      actions: [
        {
          label: '查看设置',
          action: () => {
            window.location.hash = '/settings';
          },
          style: 'secondary'
        }
      ]
    });
  }

  /**
   * 显示连接状态通知
   */
  showConnectionStatus(connected: boolean): void {
    notificationService.showNotification({
      type: connected ? 'success' : 'warning',
      title: connected ? '连接已建立' : '连接已断开',
      message: connected 
        ? '与主进程的连接已建立，所有功能正常可用。'
        : '与主进程的连接已断开，某些功能可能不可用。',
      duration: connected ? 3000 : 0,
      persistent: !connected,
      group: 'connection',
      sound: true,
      priority: connected ? 'normal' : 'high'
    });
  }

  /**
   * 显示更新通知
   */
  showUpdateNotification(version: string): void {
    notificationService.showNotification({
      type: 'info',
      title: '发现新版本',
      message: `新版本 ${version} 可用，建议及时更新以获得最新功能和安全修复。`,
      duration: 0,
      persistent: true,
      group: 'update',
      sound: true,
      priority: 'normal',
      actions: [
        {
          label: '立即更新',
          action: () => {
            window.electronAPI?.invoke('app:update');
          },
          style: 'primary'
        },
        {
          label: '稍后提醒',
          action: () => {
            // 延迟提醒逻辑
          },
          style: 'secondary'
        }
      ]
    });
  }

  /**
   * 显示错误恢复通知
   */
  showErrorRecoveryNotification(error: string, recovered: boolean): void {
    notificationService.showNotification({
      type: recovered ? 'success' : 'error',
      title: recovered ? '错误已恢复' : '系统错误',
      message: recovered 
        ? `系统已从错误中恢复: ${error}`
        : `系统遇到错误: ${error}`,
      duration: recovered ? 5000 : 0,
      persistent: !recovered,
      group: 'error',
      sound: true,
      priority: recovered ? 'normal' : 'high',
      actions: !recovered ? [
        {
          label: '重试',
          action: () => {
            window.location.reload();
          },
          style: 'primary'
        },
        {
          label: '查看日志',
          action: () => {
            window.location.hash = '/logs?filter=error';
          },
          style: 'secondary'
        }
      ] : undefined
    });
  }
}

// Export singleton instance
export const realtimeNotificationService = RealtimeNotificationService.getInstance();
