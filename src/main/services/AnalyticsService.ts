import { EventEmitter } from 'events';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from '../database';

/**
 * 用户行为分析和统计服务
 * 负责收集、分析和展示用户使用数据
 */
export class AnalyticsService extends EventEmitter {
  private databaseService: DatabaseService;
  private analyticsDir: string;
  private isEnabled: boolean = true;
  private sessionId: string;
  private sessionStartTime: Date;
  private eventQueue: any[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(databaseService: DatabaseService) {
    super();
    this.databaseService = databaseService;
    this.analyticsDir = path.join(app.getPath('userData'), 'analytics');
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = new Date();

    this.initializeAnalytics();

    // 延迟启动会话，等待数据库准备就绪
    this.startSessionSafely();
  }

  /**
   * 初始化分析服务
   */
  private initializeAnalytics(): void {
    // 确保目录存在
    if (!fs.existsSync(this.analyticsDir)) {
      fs.mkdirSync(this.analyticsDir, { recursive: true });
    }

    // 设置定期刷新事件队列
    this.flushInterval = setInterval(() => {
      this.flushEventQueue();
    }, 30000); // 每30秒刷新一次
  }

  /**
   * 安全地启动会话（等待数据库准备就绪）
   */
  private async startSessionSafely(): Promise<void> {
    // 等待数据库准备就绪
    const maxRetries = 10;
    let retries = 0;

    const tryStartSession = async () => {
      try {
        await this.startSession();
      } catch (error: any) {
        if (error?.message?.includes('Database is not ready') && retries < maxRetries) {
          retries++;
          console.log(`数据库未准备就绪，等待重试 (${retries}/${maxRetries})...`);
          setTimeout(tryStartSession, 1000); // 1秒后重试
        } else {
          console.error('启动分析会话失败:', error);
        }
      }
    };

    tryStartSession();
  }

  /**
   * 开始新会话
   */
  private async startSession(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const sessionData = {
        sessionId: this.sessionId,
        startTime: this.sessionStartTime.toISOString(),
        appVersion: app.getVersion(),
        platform: process.platform,
        locale: app.getLocale()
      };

      await this.saveSessionToDatabase(sessionData);
      this.trackEvent('session_start', sessionData);
      
      console.log(`分析会话已开始: ${this.sessionId}`);
    } catch (error) {
      console.error('开始分析会话失败:', error);
    }
  }

  /**
   * 结束当前会话
   */
  async endSession(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const endTime = new Date();
      const duration = endTime.getTime() - this.sessionStartTime.getTime();
      
      const sessionEndData = {
        sessionId: this.sessionId,
        endTime: endTime.toISOString(),
        duration: Math.round(duration / 1000) // 秒
      };

      await this.updateSessionInDatabase(sessionEndData);
      this.trackEvent('session_end', sessionEndData);
      
      // 刷新剩余事件
      await this.flushEventQueue();
      
      console.log(`分析会话已结束: ${this.sessionId}, 持续时间: ${sessionEndData.duration}秒`);
    } catch (error) {
      console.error('结束分析会话失败:', error);
    }
  }

  /**
   * 跟踪事件
   */
  trackEvent(eventName: string, properties: any = {}): void {
    if (!this.isEnabled) return;

    const event = {
      eventId: this.generateEventId(),
      sessionId: this.sessionId,
      eventName,
      properties: JSON.stringify(properties),
      timestamp: new Date().toISOString()
    };

    this.eventQueue.push(event);
    this.emit('event-tracked', event);

    // 如果队列太大，立即刷新
    if (this.eventQueue.length >= 50) {
      this.flushEventQueue();
    }
  }

  /**
   * 跟踪页面访问
   */
  trackPageView(pageName: string, properties: any = {}): void {
    this.trackEvent('page_view', {
      pageName,
      ...properties
    });
  }

  /**
   * 跟踪功能使用
   */
  trackFeatureUsage(featureName: string, action: string, properties: any = {}): void {
    this.trackEvent('feature_usage', {
      featureName,
      action,
      ...properties
    });
  }

  /**
   * 跟踪网站拦截
   */
  trackWebsiteBlocked(websiteUrl: string, reason: string): void {
    this.trackEvent('website_blocked', {
      websiteUrl,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 跟踪用户设置变更
   */
  trackSettingChanged(settingName: string, oldValue: any, newValue: any): void {
    this.trackEvent('setting_changed', {
      settingName,
      oldValue: JSON.stringify(oldValue),
      newValue: JSON.stringify(newValue)
    });
  }

  /**
   * 跟踪错误事件
   */
  trackError(errorType: string, errorMessage: string, context: any = {}): void {
    this.trackEvent('error_occurred', {
      errorType,
      errorMessage,
      context: JSON.stringify(context)
    });
  }

  /**
   * 获取使用统计
   */
  async getUsageStats(dateRange?: { start: string; end: string }): Promise<{
    totalSessions: number;
    totalEvents: number;
    averageSessionDuration: number;
    topEvents: Array<{ eventName: string; count: number }>;
    topPages: Array<{ pageName: string; count: number }>;
    topFeatures: Array<{ featureName: string; count: number }>;
    dailyStats: Array<{ date: string; sessions: number; events: number }>;
  }> {
    try {
      const db = await this.databaseService.getDatabase();
      
      let dateFilter = '';
      const params: any[] = [];
      
      if (dateRange) {
        dateFilter = ' WHERE timestamp BETWEEN ? AND ?';
        params.push(dateRange.start, dateRange.end);
      }

      // 总会话数
      const sessionStmt = db.prepare(`SELECT COUNT(*) as count FROM analytics_sessions${dateFilter}`);
      const totalSessions = sessionStmt.get(...params)?.count || 0;

      // 总事件数
      const eventStmt = db.prepare(`SELECT COUNT(*) as count FROM analytics_events${dateFilter}`);
      const totalEvents = eventStmt.get(...params)?.count || 0;

      // 平均会话时长
      const durationStmt = db.prepare(`
        SELECT AVG(duration) as avgDuration FROM analytics_sessions 
        WHERE duration IS NOT NULL${dateFilter ? ' AND' + dateFilter.substring(6) : ''}
      `);
      const averageSessionDuration = Math.round(durationStmt.get(...params)?.avgDuration || 0);

      // 热门事件
      const topEventsStmt = db.prepare(`
        SELECT event_name, COUNT(*) as count FROM analytics_events${dateFilter}
        GROUP BY event_name ORDER BY count DESC LIMIT 10
      `);
      const topEvents = topEventsStmt.all(...params);

      // 热门页面
      const topPagesStmt = db.prepare(`
        SELECT JSON_EXTRACT(properties, '$.pageName') as pageName, COUNT(*) as count 
        FROM analytics_events 
        WHERE event_name = 'page_view'${dateFilter ? ' AND' + dateFilter.substring(6) : ''}
        GROUP BY pageName ORDER BY count DESC LIMIT 10
      `);
      const topPages = topPagesStmt.all(...params).filter((p: any) => p.pageName);

      // 热门功能
      const topFeaturesStmt = db.prepare(`
        SELECT JSON_EXTRACT(properties, '$.featureName') as featureName, COUNT(*) as count 
        FROM analytics_events 
        WHERE event_name = 'feature_usage'${dateFilter ? ' AND' + dateFilter.substring(6) : ''}
        GROUP BY featureName ORDER BY count DESC LIMIT 10
      `);
      const topFeatures = topFeaturesStmt.all(...params).filter((f: any) => f.featureName);

      // 每日统计
      const dailyStatsStmt = db.prepare(`
        SELECT 
          DATE(timestamp) as date,
          COUNT(DISTINCT session_id) as sessions,
          COUNT(*) as events
        FROM analytics_events${dateFilter}
        GROUP BY DATE(timestamp) ORDER BY date DESC LIMIT 30
      `);
      const dailyStats = dailyStatsStmt.all(...params);

      return {
        totalSessions,
        totalEvents,
        averageSessionDuration,
        topEvents,
        topPages,
        topFeatures,
        dailyStats
      };
    } catch (error) {
      console.error('获取使用统计失败:', error);
      return {
        totalSessions: 0,
        totalEvents: 0,
        averageSessionDuration: 0,
        topEvents: [],
        topPages: [],
        topFeatures: [],
        dailyStats: []
      };
    }
  }

  /**
   * 获取拦截统计
   */
  async getBlockingStats(dateRange?: { start: string; end: string }): Promise<{
    totalBlocked: number;
    topBlockedSites: Array<{ websiteUrl: string; count: number }>;
    blockingReasons: Array<{ reason: string; count: number }>;
    hourlyDistribution: Array<{ hour: number; count: number }>;
  }> {
    try {
      const db = await this.databaseService.getDatabase();
      
      let dateFilter = '';
      const params: any[] = [];
      
      if (dateRange) {
        dateFilter = ' AND timestamp BETWEEN ? AND ?';
        params.push(dateRange.start, dateRange.end);
      }

      // 总拦截数
      const totalStmt = db.prepare(`
        SELECT COUNT(*) as count FROM analytics_events 
        WHERE event_name = 'website_blocked'${dateFilter}
      `);
      const totalBlocked = totalStmt.get(...params)?.count || 0;

      // 热门被拦截网站
      const topSitesStmt = db.prepare(`
        SELECT JSON_EXTRACT(properties, '$.websiteUrl') as websiteUrl, COUNT(*) as count 
        FROM analytics_events 
        WHERE event_name = 'website_blocked'${dateFilter}
        GROUP BY websiteUrl ORDER BY count DESC LIMIT 10
      `);
      const topBlockedSites = topSitesStmt.all(...params).filter((s: any) => s.websiteUrl);

      // 拦截原因分布
      const reasonsStmt = db.prepare(`
        SELECT JSON_EXTRACT(properties, '$.reason') as reason, COUNT(*) as count 
        FROM analytics_events 
        WHERE event_name = 'website_blocked'${dateFilter}
        GROUP BY reason ORDER BY count DESC
      `);
      const blockingReasons = reasonsStmt.all(...params).filter((r: any) => r.reason);

      // 小时分布
      const hourlyStmt = db.prepare(`
        SELECT 
          CAST(strftime('%H', timestamp) AS INTEGER) as hour,
          COUNT(*) as count 
        FROM analytics_events 
        WHERE event_name = 'website_blocked'${dateFilter}
        GROUP BY hour ORDER BY hour
      `);
      const hourlyDistribution = hourlyStmt.all(...params);

      return {
        totalBlocked,
        topBlockedSites,
        blockingReasons,
        hourlyDistribution
      };
    } catch (error) {
      console.error('获取拦截统计失败:', error);
      return {
        totalBlocked: 0,
        topBlockedSites: [],
        blockingReasons: [],
        hourlyDistribution: []
      };
    }
  }

  /**
   * 导出分析数据
   */
  async exportAnalyticsData(
    format: 'json' | 'csv',
    dataType: 'events' | 'sessions' | 'all',
    dateRange?: { start: string; end: string }
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `analytics-${dataType}-${timestamp}.${format}`;
      const filePath = path.join(this.analyticsDir, fileName);
      
      let data: any = [];

      if (dataType === 'events' || dataType === 'all') {
        const events = await this.getEventsList(dateRange);
        data = dataType === 'events' ? events : { events };
      }
      
      if (dataType === 'sessions' || dataType === 'all') {
        const sessions = await this.getSessionsList(dateRange);
        if (dataType === 'sessions') {
          data = sessions;
        } else {
          (data as any).sessions = sessions;
        }
      }
      
      if (format === 'json') {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      } else {
        const csv = this.convertToCSV(data);
        fs.writeFileSync(filePath, csv);
      }
      
      return { success: true, filePath };
    } catch (error) {
      console.error('导出分析数据失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      };
    }
  }

  /**
   * 清理旧数据
   */
  async cleanupOldData(retentionDays: number = 90): Promise<void> {
    try {
      const db = await this.databaseService.getDatabase();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      // 清理旧事件
      const cleanupEventsStmt = db.prepare(`
        DELETE FROM analytics_events 
        WHERE timestamp < ?
      `);
      cleanupEventsStmt.run(cutoffDate.toISOString());
      
      // 清理旧会话
      const cleanupSessionsStmt = db.prepare(`
        DELETE FROM analytics_sessions 
        WHERE start_time < ?
      `);
      cleanupSessionsStmt.run(cutoffDate.toISOString());
      
      console.log(`已清理${retentionDays}天前的分析数据`);
    } catch (error) {
      console.error('清理旧数据失败:', error);
    }
  }

  /**
   * 刷新事件队列
   */
  private async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];
      
      await this.saveEventsToDatabase(events);
      console.log(`已保存${events.length}个分析事件`);
    } catch (error) {
      console.error('刷新事件队列失败:', error);
      // 如果保存失败，将事件重新加入队列
      this.eventQueue.unshift(...this.eventQueue);
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    return `sess_${timestamp}_${random}`;
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `evt_${timestamp}_${random}`;
  }

  /**
   * 保存会话到数据库
   */
  private async saveSessionToDatabase(sessionData: any): Promise<void> {
    const db = await this.databaseService.getDatabase();
    
    // 确保表存在
    db.exec(`
      CREATE TABLE IF NOT EXISTS analytics_sessions (
        session_id TEXT PRIMARY KEY,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER,
        app_version TEXT,
        platform TEXT,
        locale TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const stmt = db.prepare(`
      INSERT INTO analytics_sessions (
        session_id, start_time, app_version, platform, locale
      ) VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      sessionData.sessionId,
      sessionData.startTime,
      sessionData.appVersion,
      sessionData.platform,
      sessionData.locale
    );
  }

  /**
   * 更新会话信息
   */
  private async updateSessionInDatabase(sessionEndData: any): Promise<void> {
    const db = await this.databaseService.getDatabase();
    const stmt = db.prepare(`
      UPDATE analytics_sessions 
      SET end_time = ?, duration = ?
      WHERE session_id = ?
    `);
    
    stmt.run(
      sessionEndData.endTime,
      sessionEndData.duration,
      sessionEndData.sessionId
    );
  }

  /**
   * 保存事件到数据库
   */
  private async saveEventsToDatabase(events: any[]): Promise<void> {
    const db = await this.databaseService.getDatabase();
    
    // 确保表存在
    db.exec(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        event_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        event_name TEXT NOT NULL,
        properties TEXT,
        timestamp TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const stmt = db.prepare(`
      INSERT INTO analytics_events (
        event_id, session_id, event_name, properties, timestamp
      ) VALUES (?, ?, ?, ?, ?)
    `);
    
    const transaction = db.transaction((events: any[]) => {
      for (const event of events) {
        stmt.run(
          event.eventId,
          event.sessionId,
          event.eventName,
          event.properties,
          event.timestamp
        );
      }
    });
    
    transaction(events);
  }

  /**
   * 获取事件列表
   */
  private async getEventsList(dateRange?: { start: string; end: string }): Promise<any[]> {
    const db = await this.databaseService.getDatabase();
    
    let query = 'SELECT * FROM analytics_events WHERE 1=1';
    const params: any[] = [];
    
    if (dateRange) {
      query += ' AND timestamp BETWEEN ? AND ?';
      params.push(dateRange.start, dateRange.end);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * 获取会话列表
   */
  private async getSessionsList(dateRange?: { start: string; end: string }): Promise<any[]> {
    const db = await this.databaseService.getDatabase();
    
    let query = 'SELECT * FROM analytics_sessions WHERE 1=1';
    const params: any[] = [];
    
    if (dateRange) {
      query += ' AND start_time BETWEEN ? AND ?';
      params.push(dateRange.start, dateRange.end);
    }
    
    query += ' ORDER BY start_time DESC';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(item => 
      headers.map(header => {
        const value = item[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      })
    );
    
    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }

  /**
   * 启用/禁用分析
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`用户分析已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 清理资源
   */
  async destroy(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    await this.endSession();
    this.removeAllListeners();
  }
}
