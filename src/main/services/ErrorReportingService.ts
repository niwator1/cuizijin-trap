import { EventEmitter } from 'events';
import { app, crashReporter } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DatabaseService } from '../database';

/**
 * 错误报告和日志收集服务
 * 负责收集、存储和上报应用错误
 */
export class ErrorReportingService extends EventEmitter {
  private databaseService: DatabaseService;
  private logsDir: string;
  private crashesDir: string;
  private isEnabled: boolean = true;
  private maxLogFiles: number = 50;
  private maxLogSize: number = 10 * 1024 * 1024; // 10MB

  constructor(databaseService: DatabaseService) {
    super();
    this.databaseService = databaseService;
    this.logsDir = path.join(app.getPath('userData'), 'logs');
    this.crashesDir = path.join(app.getPath('userData'), 'crashes');
    
    this.initializeDirectories();
    this.setupCrashReporter();
    this.setupErrorHandlers();
  }

  /**
   * 初始化目录
   */
  private initializeDirectories(): void {
    [this.logsDir, this.crashesDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 设置崩溃报告器
   */
  private setupCrashReporter(): void {
    crashReporter.start({
      productName: '崔子瑾诱捕器',
      companyName: '开发团队',
      submitURL: '', // 可配置的崩溃报告服务器
      uploadToServer: false, // 默认不上传，用户可选择
      ignoreSystemCrashHandler: false,
      rateLimit: true,
      compress: true
    });
  }

  /**
   * 设置错误处理器
   */
  private setupErrorHandlers(): void {
    // 主进程未捕获异常
    process.on('uncaughtException', (error) => {
      this.logError('uncaughtException', error, { fatal: true });
    });

    // 主进程未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      this.logError('unhandledRejection', reason as Error, { 
        fatal: false,
        promise: promise.toString()
      });
    });

    // Electron渲染进程崩溃
    app.on('render-process-gone', (event, webContents, details) => {
      this.logError('render-process-gone', new Error('渲染进程崩溃'), {
        reason: details.reason,
        exitCode: details.exitCode
      });
    });

    // 子进程崩溃
    app.on('child-process-gone', (event, details) => {
      this.logError('child-process-gone', new Error('子进程崩溃'), {
        type: details.type,
        reason: details.reason,
        exitCode: details.exitCode
      });
    });
  }

  /**
   * 记录错误
   */
  async logError(
    type: string, 
    error: Error | any, 
    context: any = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const errorId = this.generateErrorId();
      const timestamp = new Date().toISOString();
      
      const errorRecord = {
        id: errorId,
        type,
        message: error?.message || String(error),
        stack: error?.stack || '',
        severity,
        context: JSON.stringify(context),
        systemInfo: await this.collectSystemInfo(),
        timestamp,
        reported: false
      };

      // 保存到数据库
      await this.saveErrorToDatabase(errorRecord);
      
      // 保存到日志文件
      await this.saveErrorToLogFile(errorRecord);
      
      // 触发事件
      this.emit('error-logged', errorRecord);
      
      console.error(`错误已记录: ${errorId}`, error);
      
      // 如果是严重错误，立即尝试上报
      if (severity === 'critical' || severity === 'high') {
        this.reportError(errorRecord);
      }
    } catch (logError) {
      console.error('记录错误失败:', logError);
    }
  }

  /**
   * 记录一般日志
   */
  async logInfo(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: any
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data: data ? JSON.stringify(data) : undefined,
        pid: process.pid
      };

      await this.saveLogEntry(logEntry);
    } catch (error) {
      console.error('记录日志失败:', error);
    }
  }

  /**
   * 获取错误列表
   */
  async getErrorList(options: {
    limit?: number;
    offset?: number;
    severity?: string;
    type?: string;
    dateRange?: { start: string; end: string };
  } = {}): Promise<any[]> {
    try {
      const db = await this.databaseService.getDatabase();
      
      let query = 'SELECT * FROM error_logs WHERE 1=1';
      const params: any[] = [];
      
      if (options.severity) {
        query += ' AND severity = ?';
        params.push(options.severity);
      }
      
      if (options.type) {
        query += ' AND type = ?';
        params.push(options.type);
      }
      
      if (options.dateRange) {
        query += ' AND timestamp BETWEEN ? AND ?';
        params.push(options.dateRange.start, options.dateRange.end);
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
      console.error('获取错误列表失败:', error);
      return [];
    }
  }

  /**
   * 获取错误统计
   */
  async getErrorStats(): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    recentCount: number;
    unreportedCount: number;
  }> {
    try {
      const db = await this.databaseService.getDatabase();
      
      // 总数
      const totalStmt = db.prepare('SELECT COUNT(*) as count FROM error_logs');
      const total = totalStmt.get()?.count || 0;
      
      // 按严重程度统计
      const severityStmt = db.prepare('SELECT severity, COUNT(*) as count FROM error_logs GROUP BY severity');
      const severityResults = severityStmt.all();
      const bySeverity: Record<string, number> = {};
      severityResults.forEach((row: any) => {
        bySeverity[row.severity] = row.count;
      });
      
      // 按类型统计
      const typeStmt = db.prepare('SELECT type, COUNT(*) as count FROM error_logs GROUP BY type');
      const typeResults = typeStmt.all();
      const byType: Record<string, number> = {};
      typeResults.forEach((row: any) => {
        byType[row.type] = row.count;
      });
      
      // 最近24小时的错误数量
      const recentStmt = db.prepare(`
        SELECT COUNT(*) as count FROM error_logs 
        WHERE timestamp > datetime('now', '-1 day')
      `);
      const recentCount = recentStmt.get()?.count || 0;
      
      // 未上报的错误数量
      const unreportedStmt = db.prepare('SELECT COUNT(*) as count FROM error_logs WHERE reported = 0');
      const unreportedCount = unreportedStmt.get()?.count || 0;
      
      return { total, bySeverity, byType, recentCount, unreportedCount };
    } catch (error) {
      console.error('获取错误统计失败:', error);
      return { total: 0, bySeverity: {}, byType: {}, recentCount: 0, unreportedCount: 0 };
    }
  }

  /**
   * 上报错误（可选功能）
   */
  async reportError(errorRecord: any): Promise<{ success: boolean; error?: string }> {
    try {
      // 这里可以实现向远程服务器上报错误的逻辑
      // 例如发送到Sentry、Bugsnag或自定义服务器
      
      // 示例：发送到自定义服务器
      const reportData = {
        errorId: errorRecord.id,
        appVersion: app.getVersion(),
        platform: process.platform,
        error: {
          type: errorRecord.type,
          message: errorRecord.message,
          stack: errorRecord.stack,
          severity: errorRecord.severity
        },
        systemInfo: errorRecord.systemInfo,
        timestamp: errorRecord.timestamp
      };

      // 这里应该实现实际的网络请求
      // const response = await fetch('https://your-error-reporting-server.com/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(reportData)
      // });

      // 模拟上报成功
      await this.markErrorAsReported(errorRecord.id);
      
      console.log(`错误已上报: ${errorRecord.id}`);
      return { success: true };
    } catch (error) {
      console.error('上报错误失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      };
    }
  }

  /**
   * 批量上报未报告的错误
   */
  async reportPendingErrors(): Promise<{ success: boolean; reportedCount: number; error?: string }> {
    try {
      const unreportedErrors = await this.getErrorList({ limit: 100 });
      const pendingErrors = unreportedErrors.filter(error => !error.reported);
      
      let reportedCount = 0;
      for (const error of pendingErrors) {
        const result = await this.reportError(error);
        if (result.success) {
          reportedCount++;
        }
      }
      
      return { success: true, reportedCount };
    } catch (error) {
      console.error('批量上报错误失败:', error);
      return { 
        success: false, 
        reportedCount: 0,
        error: error instanceof Error ? error.message : '未知错误' 
      };
    }
  }

  /**
   * 清理旧日志
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      // 清理数据库中的旧记录（保留最近30天）
      const db = await this.databaseService.getDatabase();
      const cleanupStmt = db.prepare(`
        DELETE FROM error_logs 
        WHERE timestamp < datetime('now', '-30 days')
      `);
      cleanupStmt.run();

      // 清理日志文件
      await this.cleanupLogFiles();
      
      console.log('旧日志清理完成');
    } catch (error) {
      console.error('清理旧日志失败:', error);
    }
  }

  /**
   * 导出错误日志
   */
  async exportErrorLogs(format: 'json' | 'csv'): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const errors = await this.getErrorList();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `error-logs-${timestamp}.${format}`;
      const filePath = path.join(this.logsDir, fileName);
      
      if (format === 'json') {
        fs.writeFileSync(filePath, JSON.stringify(errors, null, 2));
      } else {
        const csv = this.convertErrorsToCSV(errors);
        fs.writeFileSync(filePath, csv);
      }
      
      return { success: true, filePath };
    } catch (error) {
      console.error('导出错误日志失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      };
    }
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `err_${timestamp}_${random}`;
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
      osVersion: os.release(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      uptime: os.uptime(),
      locale: app.getLocale()
    };
  }

  /**
   * 保存错误到数据库
   */
  private async saveErrorToDatabase(errorRecord: any): Promise<void> {
    const db = await this.databaseService.getDatabase();
    
    // 确保表存在
    db.exec(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        stack TEXT,
        severity TEXT DEFAULT 'medium',
        context TEXT,
        system_info TEXT,
        timestamp TEXT NOT NULL,
        reported INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const stmt = db.prepare(`
      INSERT INTO error_logs (
        id, type, message, stack, severity, context, system_info, timestamp, reported
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      errorRecord.id,
      errorRecord.type,
      errorRecord.message,
      errorRecord.stack,
      errorRecord.severity,
      errorRecord.context,
      JSON.stringify(errorRecord.systemInfo),
      errorRecord.timestamp,
      errorRecord.reported ? 1 : 0
    );
  }

  /**
   * 保存错误到日志文件
   */
  private async saveErrorToLogFile(errorRecord: any): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const logFileName = `error-${date}.log`;
    const logFilePath = path.join(this.logsDir, logFileName);
    
    const logLine = `[${errorRecord.timestamp}] [${errorRecord.severity.toUpperCase()}] [${errorRecord.type}] ${errorRecord.message}\n${errorRecord.stack}\n---\n`;
    
    fs.appendFileSync(logFilePath, logLine);
  }

  /**
   * 保存日志条目
   */
  private async saveLogEntry(logEntry: any): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const logFileName = `app-${date}.log`;
    const logFilePath = path.join(this.logsDir, logFileName);
    
    const logLine = `[${logEntry.timestamp}] [${logEntry.level.toUpperCase()}] ${logEntry.message}${logEntry.data ? ` | ${logEntry.data}` : ''}\n`;
    
    fs.appendFileSync(logFilePath, logLine);
    
    // 检查文件大小，如果超过限制则轮转
    await this.rotateLogFileIfNeeded(logFilePath);
  }

  /**
   * 标记错误为已上报
   */
  private async markErrorAsReported(errorId: string): Promise<void> {
    const db = await this.databaseService.getDatabase();
    const stmt = db.prepare('UPDATE error_logs SET reported = 1 WHERE id = ?');
    stmt.run(errorId);
  }

  /**
   * 轮转日志文件
   */
  private async rotateLogFileIfNeeded(filePath: string): Promise<void> {
    try {
      const stats = fs.statSync(filePath);
      if (stats.size > this.maxLogSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = filePath.replace('.log', `-${timestamp}.log`);
        fs.renameSync(filePath, rotatedPath);
      }
    } catch (error) {
      console.error('轮转日志文件失败:', error);
    }
  }

  /**
   * 清理日志文件
   */
  private async cleanupLogFiles(): Promise<void> {
    try {
      const files = fs.readdirSync(this.logsDir);
      const logFiles = files.filter(file => file.endsWith('.log')).sort();
      
      if (logFiles.length > this.maxLogFiles) {
        const filesToDelete = logFiles.slice(0, logFiles.length - this.maxLogFiles);
        filesToDelete.forEach(file => {
          fs.unlinkSync(path.join(this.logsDir, file));
        });
      }
    } catch (error) {
      console.error('清理日志文件失败:', error);
    }
  }

  /**
   * 转换错误为CSV格式
   */
  private convertErrorsToCSV(errors: any[]): string {
    if (errors.length === 0) return '';
    
    const headers = ['ID', '类型', '消息', '严重程度', '时间戳', '已上报'];
    const rows = errors.map(error => [
      error.id,
      error.type,
      error.message.replace(/"/g, '""'),
      error.severity,
      error.timestamp,
      error.reported ? '是' : '否'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }

  /**
   * 启用/禁用错误报告
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`错误报告已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.removeAllListeners();
  }
}
