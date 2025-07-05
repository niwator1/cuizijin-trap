import { AdvancedNotification } from '../components/common/AdvancedNotificationContainer';
import { notificationHistoryService } from './NotificationHistoryService';

export class NotificationService {
  private static instance: NotificationService;
  private interceptCount = 0;
  private lastInterceptTime = 0;
  private interceptNotificationId: string | null = null;
  private realtimeEnabled = true;
  private eventListeners: Map<string, Function[]> = new Map();

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for intercept events from main process
    if (window.electronAPI) {
      window.electronAPI.on('proxy:intercept', (event: any) => {
        this.handleInterceptEvent(event);
      });

      window.electronAPI.on('proxy:status-changed', (status: any) => {
        this.handleProxyStatusChange(status);
      });

      window.electronAPI.on('security:threat-detected', (threat: any) => {
        this.handleSecurityThreat(threat);
      });

      window.electronAPI.on('system:error', (error: any) => {
        this.handleSystemError(error);
      });
    }
  }

  private handleInterceptEvent(event: { domain: string; url: string; timestamp: Date }) {
    this.interceptCount++;
    const now = Date.now();

    // Batch intercept notifications to avoid spam
    if (now - this.lastInterceptTime < 2000) {
      // Update existing notification
      if (this.interceptNotificationId) {
        this.updateNotification(this.interceptNotificationId, {
          title: `已拦截 ${this.interceptCount} 个请求`,
          message: `最新拦截: ${event.domain}`,
          progress: Math.min(100, this.interceptCount * 2)
        });
      }
    } else {
      // Create new notification
      this.interceptCount = 1;
      this.interceptNotificationId = this.showNotification({
        type: 'success',
        title: '网站拦截',
        message: `已拦截访问: ${event.domain}`,
        duration: 3000,
        group: 'intercepts',
        sound: true,
        priority: 'normal',
        actions: [
          {
            label: '查看详情',
            action: () => {
              // Navigate to logs page
              window.location.hash = '/logs';
            },
            style: 'secondary'
          }
        ]
      });
    }

    this.lastInterceptTime = now;
  }

  private handleProxyStatusChange(status: { isActive: boolean; port?: number }) {
    if (status.isActive) {
      this.showNotification({
        type: 'success',
        title: '代理服务已启动',
        message: `代理端口: ${status.port || '未知'}`,
        duration: 3000,
        sound: true,
        priority: 'normal'
      });
    } else {
      this.showNotification({
        type: 'info',
        title: '代理服务已停止',
        message: '网站拦截功能已关闭',
        duration: 3000,
        sound: true,
        priority: 'normal'
      });
    }
  }

  private handleSecurityThreat(threat: { type: string; description: string; severity: 'low' | 'medium' | 'high' }) {
    this.showNotification({
      type: 'warning',
      title: '安全威胁检测',
      message: threat.description,
      duration: threat.severity === 'high' ? 0 : 8000, // Persistent for high severity
      persistent: threat.severity === 'high',
      sound: true,
      priority: threat.severity === 'medium' ? 'normal' : (threat.severity === 'low' ? 'low' : 'high'),
      actions: [
        {
          label: '查看详情',
          action: () => {
            // Navigate to security logs
            window.location.hash = '/logs?filter=security';
          },
          style: 'primary'
        },
        {
          label: '忽略',
          action: () => {
            // Dismiss notification
          },
          style: 'secondary'
        }
      ]
    });
  }

  private handleSystemError(error: { message: string; code?: string; critical?: boolean }) {
    this.showNotification({
      type: 'error',
      title: error.critical ? '系统严重错误' : '系统错误',
      message: error.message,
      duration: error.critical ? 0 : 8000,
      persistent: error.critical,
      sound: true,
      priority: error.critical ? 'high' : 'normal',
      actions: error.critical ? [
        {
          label: '重启应用',
          action: () => {
            window.electronAPI?.invoke('app:restart');
          },
          style: 'danger'
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

  // Public methods for manual notifications
  showNotification(notification: Omit<AdvancedNotification, 'id'>): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const fullNotification = { ...notification, id };

    // Add to history
    notificationHistoryService.addToHistory(fullNotification);

    // Emit event for listeners
    this.emit('notification:created', fullNotification);

    // Show notification if realtime is enabled
    if (this.realtimeEnabled) {
      if ((window as any).showAdvancedNotification) {
        (window as any).showAdvancedNotification(notification);
      } else if ((window as any).showNotification) {
        // Fallback to basic notification
        (window as any).showNotification({
          type: notification.type === 'loading' ? 'info' : notification.type,
          title: notification.title,
          message: notification.message,
          duration: notification.duration
        });
      }
    }

    return id;
  }

  updateNotification(id: string, updates: Partial<AdvancedNotification>) {
    if ((window as any).updateAdvancedNotification) {
      (window as any).updateAdvancedNotification(id, updates);
    }
  }

  hideNotification(id: string) {
    if ((window as any).hideAdvancedNotification) {
      (window as any).hideAdvancedNotification(id);
    }
  }

  clearAllNotifications() {
    if ((window as any).clearAllNotifications) {
      (window as any).clearAllNotifications();
    }
  }

  clearGroup(group: string) {
    if ((window as any).clearNotificationGroup) {
      (window as any).clearNotificationGroup(group);
    }
  }

  // Convenience methods for common notification types
  showSuccess(title: string, message?: string, options?: Partial<AdvancedNotification>) {
    return this.showNotification({
      type: 'success',
      title,
      message,
      duration: 3000,
      sound: true,
      ...options
    });
  }

  showError(title: string, message?: string, options?: Partial<AdvancedNotification>) {
    return this.showNotification({
      type: 'error',
      title,
      message,
      duration: 8000,
      sound: true,
      priority: 'high',
      ...options
    });
  }

  showWarning(title: string, message?: string, options?: Partial<AdvancedNotification>) {
    return this.showNotification({
      type: 'warning',
      title,
      message,
      duration: 5000,
      sound: true,
      ...options
    });
  }

  showInfo(title: string, message?: string, options?: Partial<AdvancedNotification>) {
    return this.showNotification({
      type: 'info',
      title,
      message,
      duration: 4000,
      sound: false,
      ...options
    });
  }

  showLoading(title: string, message?: string, options?: Partial<AdvancedNotification>) {
    return this.showNotification({
      type: 'loading',
      title,
      message,
      persistent: true,
      sound: false,
      ...options
    });
  }

  // Progress notification helper
  showProgress(title: string, initialProgress = 0, options?: Partial<AdvancedNotification>) {
    const id = this.showNotification({
      type: 'loading',
      title,
      progress: initialProgress,
      persistent: true,
      sound: false,
      ...options
    });

    return {
      id,
      updateProgress: (progress: number, message?: string) => {
        this.updateNotification(id, {
          progress,
          message,
          type: progress >= 100 ? 'success' : 'loading',
          persistent: progress < 100
        });
      },
      complete: (message?: string) => {
        this.updateNotification(id, {
          type: 'success',
          message: message || '操作完成',
          progress: 100,
          persistent: false,
          duration: 3000
        });
      },
      error: (message?: string) => {
        this.updateNotification(id, {
          type: 'error',
          message: message || '操作失败',
          persistent: false,
          duration: 5000
        });
      }
    };
  }

  // Event system for real-time notifications
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in notification event listener:', error);
        }
      });
    }
  }

  // Real-time notification control
  enableRealtime(): void {
    this.realtimeEnabled = true;
  }

  disableRealtime(): void {
    this.realtimeEnabled = false;
  }

  isRealtimeEnabled(): boolean {
    return this.realtimeEnabled;
  }

  // Notification history integration
  getHistory(filter?: any, limit?: number) {
    return notificationHistoryService.getHistory(filter, limit);
  }

  getUnreadCount(): number {
    return notificationHistoryService.getUnreadCount();
  }

  markAsRead(id: string): void {
    notificationHistoryService.markAsRead(id);
    this.emit('notification:read', { id });
  }

  markAllAsRead(): void {
    notificationHistoryService.markAllAsRead();
    this.emit('notification:all-read', {});
  }

  getStatistics() {
    return notificationHistoryService.getStatistics();
  }

  // Batch operations
  showBatch(notifications: Omit<AdvancedNotification, 'id'>[]): string[] {
    return notifications.map(notification => this.showNotification(notification));
  }

  // Template-based notifications
  showInterceptNotification(domain: string, count: number = 1): string {
    return this.showNotification({
      type: 'success',
      title: count === 1 ? '网站拦截' : `已拦截 ${count} 个请求`,
      message: count === 1 ? `已拦截访问: ${domain}` : `最新拦截: ${domain}`,
      duration: 3000,
      group: 'intercepts',
      sound: true,
      priority: 'normal',
      actions: [
        {
          label: '查看详情',
          action: () => {
            window.location.hash = '/logs';
          },
          style: 'secondary'
        }
      ]
    });
  }

  showSecurityAlert(threat: { type: string; description: string; severity: 'low' | 'medium' | 'high' }): string {
    return this.showNotification({
      type: 'warning',
      title: '安全威胁检测',
      message: threat.description,
      duration: threat.severity === 'high' ? 0 : 8000,
      persistent: threat.severity === 'high',
      sound: true,
      priority: threat.severity === 'medium' ? 'normal' : (threat.severity === 'low' ? 'low' : 'high'),
      group: 'security',
      actions: [
        {
          label: '查看详情',
          action: () => {
            window.location.hash = '/logs?filter=security';
          },
          style: 'primary'
        },
        {
          label: '忽略',
          action: () => {
            // Dismiss notification
          },
          style: 'secondary'
        }
      ]
    });
  }

  showSystemNotification(message: string, critical: boolean = false): string {
    return this.showNotification({
      type: critical ? 'error' : 'info',
      title: critical ? '系统严重错误' : '系统通知',
      message,
      duration: critical ? 0 : 5000,
      persistent: critical,
      sound: true,
      priority: critical ? 'high' : 'normal',
      group: 'system',
      actions: critical ? [
        {
          label: '重启应用',
          action: () => {
            window.electronAPI?.invoke('app:restart');
          },
          style: 'danger'
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
export const notificationService = NotificationService.getInstance();
