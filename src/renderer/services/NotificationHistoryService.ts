import { AdvancedNotification } from '../components/common/AdvancedNotificationContainer';

export interface NotificationHistoryItem extends AdvancedNotification {
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
}

export interface NotificationFilter {
  type?: AdvancedNotification['type'];
  priority?: AdvancedNotification['priority'];
  group?: string;
  read?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export class NotificationHistoryService {
  private static instance: NotificationHistoryService;
  private history: NotificationHistoryItem[] = [];
  private maxHistorySize = 1000; // 最大历史记录数量
  private storageKey = 'notification-history';

  static getInstance(): NotificationHistoryService {
    if (!NotificationHistoryService.instance) {
      NotificationHistoryService.instance = new NotificationHistoryService();
    }
    return NotificationHistoryService.instance;
  }

  private constructor() {
    this.loadHistory();
  }

  /**
   * 添加通知到历史记录
   */
  addToHistory(notification: AdvancedNotification): void {
    const historyItem: NotificationHistoryItem = {
      ...notification,
      timestamp: new Date(),
      read: false,
      dismissed: false
    };

    this.history.unshift(historyItem);

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    this.saveHistory();
  }

  /**
   * 获取通知历史记录
   */
  getHistory(filter?: NotificationFilter, limit?: number): NotificationHistoryItem[] {
    let filteredHistory = [...this.history];

    if (filter) {
      filteredHistory = filteredHistory.filter(item => {
        if (filter.type && item.type !== filter.type) return false;
        if (filter.priority && item.priority !== filter.priority) return false;
        if (filter.group && item.group !== filter.group) return false;
        if (filter.read !== undefined && item.read !== filter.read) return false;
        if (filter.dateFrom && item.timestamp < filter.dateFrom) return false;
        if (filter.dateTo && item.timestamp > filter.dateTo) return false;
        return true;
      });
    }

    if (limit) {
      filteredHistory = filteredHistory.slice(0, limit);
    }

    return filteredHistory;
  }

  /**
   * 标记通知为已读
   */
  markAsRead(id: string): void {
    const item = this.history.find(h => h.id === id);
    if (item) {
      item.read = true;
      this.saveHistory();
    }
  }

  /**
   * 标记多个通知为已读
   */
  markMultipleAsRead(ids: string[]): void {
    let changed = false;
    ids.forEach(id => {
      const item = this.history.find(h => h.id === id);
      if (item && !item.read) {
        item.read = true;
        changed = true;
      }
    });
    
    if (changed) {
      this.saveHistory();
    }
  }

  /**
   * 标记所有通知为已读
   */
  markAllAsRead(): void {
    let changed = false;
    this.history.forEach(item => {
      if (!item.read) {
        item.read = true;
        changed = true;
      }
    });
    
    if (changed) {
      this.saveHistory();
    }
  }

  /**
   * 删除通知历史记录
   */
  deleteFromHistory(id: string): void {
    const index = this.history.findIndex(h => h.id === id);
    if (index !== -1) {
      this.history.splice(index, 1);
      this.saveHistory();
    }
  }

  /**
   * 清除历史记录
   */
  clearHistory(filter?: NotificationFilter): void {
    if (!filter) {
      this.history = [];
    } else {
      this.history = this.history.filter(item => {
        if (filter.type && item.type === filter.type) return false;
        if (filter.priority && item.priority === filter.priority) return false;
        if (filter.group && item.group === filter.group) return false;
        if (filter.read !== undefined && item.read === filter.read) return false;
        if (filter.dateFrom && item.timestamp >= filter.dateFrom) return false;
        if (filter.dateTo && item.timestamp <= filter.dateTo) return false;
        return true;
      });
    }
    
    this.saveHistory();
  }

  /**
   * 获取未读通知数量
   */
  getUnreadCount(): number {
    return this.history.filter(item => !item.read).length;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    today: number;
    thisWeek: number;
  } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: this.history.length,
      unread: this.getUnreadCount(),
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      today: 0,
      thisWeek: 0
    };

    this.history.forEach(item => {
      // 按类型统计
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
      
      // 按优先级统计
      const priority = item.priority || 'normal';
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
      
      // 时间统计
      if (item.timestamp >= today) {
        stats.today++;
      }
      if (item.timestamp >= weekAgo) {
        stats.thisWeek++;
      }
    });

    return stats;
  }

  /**
   * 从本地存储加载历史记录
   */
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.history = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load notification history:', error);
      this.history = [];
    }
  }

  /**
   * 保存历史记录到本地存储
   */
  private saveHistory(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    } catch (error) {
      console.error('Failed to save notification history:', error);
    }
  }

  /**
   * 导出历史记录
   */
  exportHistory(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * 导入历史记录
   */
  importHistory(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      if (Array.isArray(imported)) {
        this.history = imported.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        this.saveHistory();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import notification history:', error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationHistoryService = NotificationHistoryService.getInstance();
