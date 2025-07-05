import { EventEmitter } from 'events';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from '../database';

/**
 * 用户反馈收集服务
 * 负责收集、存储和管理用户反馈
 */
export class FeedbackService extends EventEmitter {
  private databaseService: DatabaseService;
  private feedbackDir: string;

  constructor(databaseService: DatabaseService) {
    super();
    this.databaseService = databaseService;
    this.feedbackDir = path.join(app.getPath('userData'), 'feedback');
    this.ensureFeedbackDirectory();
  }

  /**
   * 确保反馈目录存在
   */
  private ensureFeedbackDirectory(): void {
    if (!fs.existsSync(this.feedbackDir)) {
      fs.mkdirSync(this.feedbackDir, { recursive: true });
    }
  }

  /**
   * 提交用户反馈
   */
  async submitFeedback(feedback: {
    type: 'bug' | 'feature' | 'improvement' | 'other';
    title: string;
    description: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    userEmail?: string;
    attachments?: string[];
    systemInfo?: any;
  }): Promise<{ success: boolean; feedbackId?: string; error?: string }> {
    try {
      const feedbackId = this.generateFeedbackId();
      const timestamp = new Date().toISOString();
      
      // 收集系统信息
      const systemInfo = feedback.systemInfo || await this.collectSystemInfo();
      
      // 创建反馈记录
      const feedbackRecord = {
        id: feedbackId,
        type: feedback.type,
        title: feedback.title,
        description: feedback.description,
        severity: feedback.severity || 'medium',
        userEmail: feedback.userEmail,
        systemInfo,
        timestamp,
        status: 'submitted',
        attachments: feedback.attachments || []
      };

      // 保存到数据库
      await this.saveFeedbackToDatabase(feedbackRecord);
      
      // 保存到本地文件
      await this.saveFeedbackToFile(feedbackRecord);
      
      // 触发事件
      this.emit('feedback-submitted', feedbackRecord);
      
      console.log(`用户反馈已提交: ${feedbackId}`);
      
      return { success: true, feedbackId };
    } catch (error) {
      console.error('提交反馈失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      };
    }
  }

  /**
   * 获取反馈列表
   */
  async getFeedbackList(options: {
    limit?: number;
    offset?: number;
    type?: string;
    status?: string;
  } = {}): Promise<any[]> {
    try {
      const db = await this.databaseService.getDatabase();
      
      let query = 'SELECT * FROM feedback WHERE 1=1';
      const params: any[] = [];
      
      if (options.type) {
        query += ' AND type = ?';
        params.push(options.type);
      }
      
      if (options.status) {
        query += ' AND status = ?';
        params.push(options.status);
      }
      
      query += ' ORDER BY timestamp DESC';
      
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
        
        if (options.offset) {
          query += ' OFFSET ?';
          params.push(options.offset);
        }
      }
      
      const stmt = db.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      console.error('获取反馈列表失败:', error);
      return [];
    }
  }

  /**
   * 获取反馈详情
   */
  async getFeedbackById(feedbackId: string): Promise<any | null> {
    try {
      const db = await this.databaseService.getDatabase();
      const stmt = db.prepare('SELECT * FROM feedback WHERE id = ?');
      return stmt.get(feedbackId) || null;
    } catch (error) {
      console.error('获取反馈详情失败:', error);
      return null;
    }
  }

  /**
   * 更新反馈状态
   */
  async updateFeedbackStatus(
    feedbackId: string, 
    status: 'submitted' | 'in-progress' | 'resolved' | 'closed',
    note?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await this.databaseService.getDatabase();
      const stmt = db.prepare(`
        UPDATE feedback 
        SET status = ?, updated_at = ?, admin_note = ?
        WHERE id = ?
      `);
      
      const result = stmt.run(status, new Date().toISOString(), note || null, feedbackId);
      
      if (result.changes > 0) {
        this.emit('feedback-updated', { feedbackId, status, note });
        return { success: true };
      } else {
        return { success: false, error: '反馈不存在' };
      }
    } catch (error) {
      console.error('更新反馈状态失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      };
    }
  }

  /**
   * 导出反馈数据
   */
  async exportFeedback(options: {
    format: 'json' | 'csv';
    dateRange?: { start: string; end: string };
    type?: string;
  }): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const feedbackList = await this.getFeedbackList();
      let filteredFeedback = feedbackList;
      
      // 应用过滤条件
      if (options.dateRange) {
        filteredFeedback = filteredFeedback.filter(feedback => {
          const feedbackDate = new Date(feedback.timestamp);
          const startDate = new Date(options.dateRange!.start);
          const endDate = new Date(options.dateRange!.end);
          return feedbackDate >= startDate && feedbackDate <= endDate;
        });
      }
      
      if (options.type) {
        filteredFeedback = filteredFeedback.filter(feedback => feedback.type === options.type);
      }
      
      // 生成文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `feedback-export-${timestamp}.${options.format}`;
      const filePath = path.join(this.feedbackDir, fileName);
      
      if (options.format === 'json') {
        fs.writeFileSync(filePath, JSON.stringify(filteredFeedback, null, 2));
      } else if (options.format === 'csv') {
        const csv = this.convertToCSV(filteredFeedback);
        fs.writeFileSync(filePath, csv);
      }
      
      return { success: true, filePath };
    } catch (error) {
      console.error('导出反馈失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      };
    }
  }

  /**
   * 获取反馈统计
   */
  async getFeedbackStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    recentCount: number;
  }> {
    try {
      const db = await this.databaseService.getDatabase();
      
      // 总数
      const totalStmt = db.prepare('SELECT COUNT(*) as count FROM feedback');
      const total = totalStmt.get()?.count || 0;
      
      // 按类型统计
      const typeStmt = db.prepare('SELECT type, COUNT(*) as count FROM feedback GROUP BY type');
      const typeResults = typeStmt.all();
      const byType: Record<string, number> = {};
      typeResults.forEach((row: any) => {
        byType[row.type] = row.count;
      });
      
      // 按状态统计
      const statusStmt = db.prepare('SELECT status, COUNT(*) as count FROM feedback GROUP BY status');
      const statusResults = statusStmt.all();
      const byStatus: Record<string, number> = {};
      statusResults.forEach((row: any) => {
        byStatus[row.status] = row.count;
      });
      
      // 最近7天的反馈数量
      const recentStmt = db.prepare(`
        SELECT COUNT(*) as count FROM feedback 
        WHERE timestamp > datetime('now', '-7 days')
      `);
      const recentCount = recentStmt.get()?.count || 0;
      
      return { total, byType, byStatus, recentCount };
    } catch (error) {
      console.error('获取反馈统计失败:', error);
      return { total: 0, byType: {}, byStatus: {}, recentCount: 0 };
    }
  }

  /**
   * 生成反馈ID
   */
  private generateFeedbackId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `fb_${timestamp}_${random}`;
  }

  /**
   * 收集系统信息
   */
  private async collectSystemInfo(): Promise<any> {
    return {
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      osVersion: require('os').release(),
      locale: app.getLocale(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 保存反馈到数据库
   */
  private async saveFeedbackToDatabase(feedback: any): Promise<void> {
    const db = await this.databaseService.getDatabase();
    
    // 确保表存在
    db.exec(`
      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        user_email TEXT,
        system_info TEXT,
        timestamp TEXT NOT NULL,
        status TEXT DEFAULT 'submitted',
        admin_note TEXT,
        attachments TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const stmt = db.prepare(`
      INSERT INTO feedback (
        id, type, title, description, severity, user_email, 
        system_info, timestamp, status, attachments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      feedback.id,
      feedback.type,
      feedback.title,
      feedback.description,
      feedback.severity,
      feedback.userEmail,
      JSON.stringify(feedback.systemInfo),
      feedback.timestamp,
      feedback.status,
      JSON.stringify(feedback.attachments)
    );
  }

  /**
   * 保存反馈到文件
   */
  private async saveFeedbackToFile(feedback: any): Promise<void> {
    const fileName = `${feedback.id}.json`;
    const filePath = path.join(this.feedbackDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(feedback, null, 2));
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = ['ID', '类型', '标题', '描述', '严重程度', '状态', '提交时间'];
    const rows = data.map(item => [
      item.id,
      item.type,
      item.title,
      item.description.replace(/"/g, '""'),
      item.severity,
      item.status,
      item.timestamp
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.removeAllListeners();
  }
}
