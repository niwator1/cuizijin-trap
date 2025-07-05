import { OperationLogDAO, OperationLogRecord, OperationLogFilter, OperationLogListOptions } from '../models/OperationLogDAO';
import { AppConfigDAO } from '../models/AppConfigDAO';

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  action: string;
  target?: string;
  targetId?: number;
  details?: any;
  timestamp?: Date;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

export interface LogSearchOptions {
  query?: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  action?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byAction: Record<string, number>;
  recentErrors: OperationLogRecord[];
  dailyActivity: { date: string; count: number }[];
}

/**
 * 日志记录服务
 * 提供统一的日志记录和查询接口
 */
export class LoggingService {
  private operationLogDAO: OperationLogDAO;
  private appConfigDAO: AppConfigDAO;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private maxBufferSize = 100;
  private flushIntervalMs = 5000; // 5秒

  constructor(operationLogDAO: OperationLogDAO, appConfigDAO: AppConfigDAO) {
    this.operationLogDAO = operationLogDAO;
    this.appConfigDAO = appConfigDAO;
    this.startBufferFlush();
  }

  /**
   * 记录信息日志
   */
  async info(action: string, details?: any, options?: {
    target?: string;
    targetId?: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      level: 'info',
      action,
      details,
      success: true,
      ...options
    });
  }

  /**
   * 记录警告日志
   */
  async warn(action: string, details?: any, options?: {
    target?: string;
    targetId?: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      level: 'warn',
      action,
      details,
      success: true,
      ...options
    });
  }

  /**
   * 记录错误日志
   */
  async error(action: string, error: Error | string, details?: any, options?: {
    target?: string;
    targetId?: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorDetails = error instanceof Error ? {
      ...details,
      stack: error.stack,
      name: error.name
    } : details;

    await this.log({
      level: 'error',
      action,
      details: errorDetails,
      success: false,
      errorMessage,
      ...options
    });
  }

  /**
   * 记录调试日志
   */
  async debug(action: string, details?: any, options?: {
    target?: string;
    targetId?: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    // 只在调试模式下记录
    const debugMode = await this.appConfigDAO.getBoolean('debug_mode', false);
    if (!debugMode) return;

    await this.log({
      level: 'debug',
      action,
      details,
      success: true,
      ...options
    });
  }

  /**
   * 记录用户操作日志
   */
  async logUserAction(action: string, success: boolean = true, details?: any, options?: {
    target?: string;
    targetId?: number;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
  }): Promise<void> {
    await this.log({
      level: success ? 'info' : 'error',
      action: `user_${action}`,
      details,
      success,
      ...options
    });
  }

  /**
   * 记录系统操作日志
   */
  async logSystemAction(action: string, success: boolean = true, details?: any, options?: {
    target?: string;
    targetId?: number;
    errorMessage?: string;
  }): Promise<void> {
    await this.log({
      level: success ? 'info' : 'error',
      action: `system_${action}`,
      details,
      success,
      ...options
    });
  }

  /**
   * 记录网站拦截日志
   */
  async logIntercept(domain: string, url: string, details?: any): Promise<void> {
    await this.log({
      level: 'info',
      action: 'site_intercepted',
      target: url,
      details: {
        domain,
        url,
        timestamp: new Date().toISOString(),
        ...details
      },
      success: true
    });
  }

  /**
   * 记录性能指标
   */
  async logPerformance(action: string, duration: number, details?: any): Promise<void> {
    await this.log({
      level: 'info',
      action: `perf_${action}`,
      details: {
        duration,
        ...details
      },
      success: true
    });
  }

  /**
   * 通用日志记录方法
   */
  private async log(entry: LogEntry): Promise<void> {
    // 添加时间戳
    entry.timestamp = entry.timestamp || new Date();

    // 如果启用了缓冲，添加到缓冲区
    const bufferEnabled = await this.appConfigDAO.getBoolean('log_buffer_enabled', true);
    if (bufferEnabled) {
      this.logBuffer.push(entry);
      
      // 如果缓冲区满了，立即刷新
      if (this.logBuffer.length >= this.maxBufferSize) {
        await this.flushBuffer();
      }
    } else {
      // 直接写入数据库
      await this.writeLogEntry(entry);
    }
  }

  /**
   * 写入单个日志条目
   */
  private async writeLogEntry(entry: LogEntry): Promise<void> {
    try {
      await this.operationLogDAO.create({
        action: entry.action,
        target: entry.target,
        targetId: entry.targetId,
        details: entry.details,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        success: entry.success,
        errorMessage: entry.errorMessage
      });
    } catch (error) {
      console.error('Failed to write log entry:', error);
    }
  }

  /**
   * 刷新日志缓冲区
   */
  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // 批量写入日志
      for (const entry of entries) {
        await this.writeLogEntry(entry);
      }
    } catch (error) {
      console.error('Failed to flush log buffer:', error);
      // 如果写入失败，将条目重新添加到缓冲区
      this.logBuffer.unshift(...entries);
    }
  }

  /**
   * 启动缓冲区刷新定时器
   */
  private startBufferFlush(): void {
    this.flushInterval = setInterval(async () => {
      await this.flushBuffer();
    }, this.flushIntervalMs);
  }

  /**
   * 停止缓冲区刷新定时器
   */
  private stopBufferFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * 搜索日志
   */
  async searchLogs(options: LogSearchOptions): Promise<{
    logs: OperationLogRecord[];
    total: number;
  }> {
    const filter: OperationLogFilter = {};
    
    if (options.action) {
      filter.action = options.action;
    }
    
    if (options.dateFrom) {
      filter.dateFrom = options.dateFrom;
    }
    
    if (options.dateTo) {
      filter.dateTo = options.dateTo;
    }
    
    if (options.query) {
      filter.search = options.query;
    }

    const listOptions: OperationLogListOptions = {
      filter,
      orderBy: 'timestamp',
      order: 'DESC'
    };

    if (options.limit) {
      listOptions.limit = options.limit;
      if (options.offset) {
        listOptions.page = Math.floor(options.offset / options.limit) + 1;
      }
    }

    return await this.operationLogDAO.getAll(listOptions);
  }

  /**
   * 获取日志统计信息
   */
  async getLogStats(days: number = 7): Promise<LogStats> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const stats = await this.operationLogDAO.getStats(dateFrom);
    const recentErrors = await this.operationLogDAO.getFailedOperations(10);

    // 按级别统计（基于action前缀推断）
    const byLevel: Record<string, number> = {
      info: 0,
      warn: 0,
      error: 0,
      debug: 0
    };

    for (const actionCount of stats.actionCounts) {
      if (actionCount.action.includes('error') || actionCount.action.includes('failed')) {
        byLevel.error += actionCount.count;
      } else if (actionCount.action.includes('warn')) {
        byLevel.warn += actionCount.count;
      } else if (actionCount.action.includes('debug')) {
        byLevel.debug += actionCount.count;
      } else {
        byLevel.info += actionCount.count;
      }
    }

    const byAction: Record<string, number> = {};
    for (const actionCount of stats.actionCounts) {
      byAction[actionCount.action] = actionCount.count;
    }

    return {
      total: stats.total,
      byLevel,
      byAction,
      recentErrors,
      dailyActivity: stats.dailyCounts
    };
  }

  /**
   * 清理过期日志
   */
  async cleanupLogs(): Promise<number> {
    const retentionDays = await this.appConfigDAO.getNumber('log_retention_days', 30);
    const maxEntries = await this.appConfigDAO.getNumber('max_log_entries', 10000);
    
    return await this.operationLogDAO.cleanupOldLogs(retentionDays, maxEntries);
  }

  /**
   * 导出日志
   */
  async exportLogs(options: {
    format: 'json' | 'csv' | 'txt';
    dateFrom?: Date;
    dateTo?: Date;
    actions?: string[];
  }): Promise<string> {
    const filter: OperationLogFilter = {};
    
    if (options.dateFrom) filter.dateFrom = options.dateFrom;
    if (options.dateTo) filter.dateTo = options.dateTo;

    const result = await this.operationLogDAO.getAll({
      filter,
      orderBy: 'timestamp',
      order: 'DESC'
    });

    let filteredLogs = result.logs;
    if (options.actions && options.actions.length > 0) {
      filteredLogs = result.logs.filter(log => options.actions!.includes(log.action));
    }

    switch (options.format) {
      case 'json':
        return JSON.stringify(filteredLogs, null, 2);
      
      case 'csv':
        const headers = 'Timestamp,Action,Target,Success,Error Message,Details';
        const rows = filteredLogs.map(log => 
          `"${log.timestamp}","${log.action}","${log.target || ''}","${log.success}","${log.errorMessage || ''}","${JSON.stringify(log.details || {})}"`
        );
        return [headers, ...rows].join('\n');
      
      case 'txt':
        return filteredLogs.map(log => 
          `[${log.timestamp}] ${log.action}: ${log.target || ''} ${log.success ? 'SUCCESS' : 'FAILED'} ${log.errorMessage || ''}`
        ).join('\n');
      
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * 获取最近的日志
   */
  async getRecentLogs(limit: number = 50): Promise<OperationLogRecord[]> {
    return await this.operationLogDAO.getRecent(limit);
  }

  /**
   * 获取今天的日志
   */
  async getTodayLogs(): Promise<OperationLogRecord[]> {
    return await this.operationLogDAO.getTodayLogs();
  }

  /**
   * 清除所有日志
   */
  async clearAllLogs(): Promise<{ success: boolean; error?: string }> {
    try {
      // 先刷新缓冲区
      await this.flushBuffer();

      // 获取日志数量
      const totalLogs = await this.operationLogDAO.getCount();

      // 清除所有日志
      await this.operationLogDAO.deleteAll();

      // 记录清除操作（这会创建一个新的日志条目）
      await this.logSystemAction('clear_all_logs', true, { totalLogs });

      return { success: true };
    } catch (error) {
      console.error('Clear all logs error:', error);

      // 记录错误
      await this.logSystemAction('clear_all_logs', false, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear all logs'
      };
    }
  }

  /**
   * 销毁服务
   */
  async destroy(): Promise<void> {
    this.stopBufferFlush();
    await this.flushBuffer(); // 确保所有日志都被写入
  }
}
