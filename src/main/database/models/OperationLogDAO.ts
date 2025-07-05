import { BaseDAO } from './BaseDAO';
import { OperationLog } from '@shared/types';

export interface OperationLogRecord {
  id: number;
  action: string;
  target?: string;
  targetId?: number;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

export interface CreateOperationLogDto {
  action: string;
  target?: string;
  targetId?: number;
  details?: any; // 将被序列化为JSON
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

export interface OperationLogFilter {
  action?: string;
  target?: string;
  success?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface OperationLogListOptions {
  filter?: OperationLogFilter;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

/**
 * 操作日志数据访问对象
 * 处理用户操作日志相关的数据库操作
 */
export class OperationLogDAO extends BaseDAO {

  /**
   * 记录操作日志
   */
  async create(logData: CreateOperationLogDto): Promise<OperationLogRecord> {
    const logRecord = {
      action: logData.action,
      target: logData.target || null,
      targetId: logData.targetId || null,
      details: logData.details ? JSON.stringify(logData.details) : null,
      ipAddress: logData.ipAddress || null,
      userAgent: logData.userAgent || null,
      success: logData.success !== undefined ? logData.success : true,
      errorMessage: logData.errorMessage || null
    };

    const { columns, placeholders, params } = this.buildInsertClause(logRecord);
    
    const sql = `
      INSERT INTO operation_logs (${columns})
      VALUES (${placeholders})
    `;

    const result = this.execute(sql, params);

    return await this.getById(Number(result.lastInsertRowid)) as OperationLogRecord;
  }

  /**
   * 根据ID获取日志
   */
  async getById(id: number): Promise<OperationLogRecord | null> {
    const sql = 'SELECT * FROM operation_logs WHERE id = ?';
    const row = this.queryOne(sql, [id]);
    return row ? this.mapLogRow(row) : null;
  }

  /**
   * 获取操作日志列表
   */
  async getAll(options: OperationLogListOptions = {}): Promise<{
    logs: OperationLogRecord[];
    total: number;
    page?: number;
    limit?: number;
  }> {
    let sql = 'SELECT * FROM operation_logs';
    let countSql = 'SELECT COUNT(*) as count FROM operation_logs';
    const params: any[] = [];

    // 构建WHERE条件
    if (options.filter) {
      const conditions: string[] = [];
      
      if (options.filter.action) {
        conditions.push('action = ?');
        params.push(options.filter.action);
      }
      
      if (options.filter.target) {
        conditions.push('target LIKE ?');
        params.push(`%${options.filter.target}%`);
      }
      
      if (options.filter.success !== undefined) {
        conditions.push('success = ?');
        params.push(options.filter.success);
      }
      
      if (options.filter.dateFrom) {
        conditions.push('timestamp >= ?');
        params.push(options.filter.dateFrom.toISOString());
      }
      
      if (options.filter.dateTo) {
        conditions.push('timestamp <= ?');
        params.push(options.filter.dateTo.toISOString());
      }
      
      if (options.filter.search) {
        conditions.push('(action LIKE ? OR target LIKE ? OR details LIKE ?)');
        const searchTerm = `%${options.filter.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        const whereClause = ` WHERE ${conditions.join(' AND ')}`;
        sql += whereClause;
        countSql += whereClause;
      }
    }

    // 获取总数
    const totalResult = this.queryOne(countSql, params) as { count: number };
    const total = totalResult.count;

    // 添加排序
    const orderBy = options.orderBy || 'timestamp';
    const order = options.order || 'DESC';
    sql += ` ORDER BY ${orderBy} ${order}`;

    // 添加分页
    if (options.page && options.limit) {
      const offset = (options.page - 1) * options.limit;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(options.limit, offset);
    }

    const rows = this.query(sql, params);
    const logs = rows.map(row => this.mapLogRow(row));

    return {
      logs,
      total,
      page: options.page,
      limit: options.limit
    };
  }

  /**
   * 获取最近的操作日志
   */
  async getRecent(limit: number = 50): Promise<OperationLogRecord[]> {
    const result = await this.getAll({
      orderBy: 'timestamp',
      order: 'DESC',
      limit
    });
    return result.logs;
  }

  /**
   * 根据操作类型获取日志
   */
  async getByAction(action: string, limit?: number): Promise<OperationLogRecord[]> {
    const result = await this.getAll({
      filter: { action },
      orderBy: 'timestamp',
      order: 'DESC',
      limit
    });
    return result.logs;
  }

  /**
   * 获取失败的操作日志
   */
  async getFailedOperations(limit?: number): Promise<OperationLogRecord[]> {
    const result = await this.getAll({
      filter: { success: false },
      orderBy: 'timestamp',
      order: 'DESC',
      limit
    });
    return result.logs;
  }

  /**
   * 获取指定时间范围内的日志
   */
  async getByDateRange(dateFrom: Date, dateTo: Date): Promise<OperationLogRecord[]> {
    const result = await this.getAll({
      filter: { dateFrom, dateTo },
      orderBy: 'timestamp',
      order: 'DESC'
    });
    return result.logs;
  }

  /**
   * 获取今天的操作日志
   */
  async getTodayLogs(): Promise<OperationLogRecord[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.getByDateRange(today, tomorrow);
  }

  /**
   * 获取日志总数
   */
  async getCount(): Promise<number> {
    const result = this.queryOne('SELECT COUNT(*) as count FROM operation_logs') as { count: number };
    return result.count;
  }

  /**
   * 获取操作统计信息
   */
  async getStats(dateFrom?: Date, dateTo?: Date): Promise<{
    total: number;
    successful: number;
    failed: number;
    actionCounts: { action: string; count: number }[];
    dailyCounts: { date: string; count: number }[];
  }> {
    let whereClause = '';
    const params: any[] = [];

    if (dateFrom || dateTo) {
      const conditions: string[] = [];
      if (dateFrom) {
        conditions.push('timestamp >= ?');
        params.push(dateFrom.toISOString());
      }
      if (dateTo) {
        conditions.push('timestamp <= ?');
        params.push(dateTo.toISOString());
      }
      whereClause = ` WHERE ${conditions.join(' AND ')}`;
    }

    // 总数统计
    const totalResult = this.queryOne(`
      SELECT COUNT(*) as total FROM operation_logs${whereClause}
    `, params) as { total: number };

    const successfulResult = this.queryOne(`
      SELECT COUNT(*) as count FROM operation_logs${whereClause}${whereClause ? ' AND' : ' WHERE'} success = 1
    `, [...params, ...(whereClause ? [] : [])]) as { count: number };

    const failedResult = this.queryOne(`
      SELECT COUNT(*) as count FROM operation_logs${whereClause}${whereClause ? ' AND' : ' WHERE'} success = 0
    `, [...params, ...(whereClause ? [] : [])]) as { count: number };

    // 按操作类型统计
    const actionCounts = this.query<{ action: string; count: number }>(`
      SELECT action, COUNT(*) as count 
      FROM operation_logs${whereClause}
      GROUP BY action 
      ORDER BY count DESC
    `, params);

    // 按日期统计
    const dailyCounts = this.query<{ date: string; count: number }>(`
      SELECT DATE(timestamp) as date, COUNT(*) as count 
      FROM operation_logs${whereClause}
      GROUP BY DATE(timestamp) 
      ORDER BY date DESC
      LIMIT 30
    `, params);

    return {
      total: totalResult.total,
      successful: successfulResult.count,
      failed: failedResult.count,
      actionCounts,
      dailyCounts
    };
  }

  /**
   * 清理过期日志
   */
  async cleanupOldLogs(retentionDays: number, maxEntries?: number): Promise<number> {
    let deletedCount = 0;

    // 按时间清理
    if (retentionDays > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const sql = 'DELETE FROM operation_logs WHERE timestamp < ?';
      const result = this.execute(sql, [cutoffDate.toISOString()]);
      deletedCount += result.changes;
    }

    // 按数量清理（保留最新的记录）
    if (maxEntries && maxEntries > 0) {
      const countResult = this.queryOne(`
        SELECT COUNT(*) as count FROM operation_logs
      `) as { count: number };

      if (countResult.count > maxEntries) {
        const excessCount = countResult.count - maxEntries;
        const sql = `
          DELETE FROM operation_logs 
          WHERE id IN (
            SELECT id FROM operation_logs 
            ORDER BY timestamp ASC 
            LIMIT ?
          )
        `;
        const result = this.execute(sql, [excessCount]);
        deletedCount += result.changes;
      }
    }

    return deletedCount;
  }

  /**
   * 删除指定日期之前的日志
   */
  async deleteBeforeDate(date: Date): Promise<number> {
    const sql = 'DELETE FROM operation_logs WHERE timestamp < ?';
    const result = this.execute(sql, [date.toISOString()]);
    return result.changes;
  }

  /**
   * 清空所有日志
   */
  async clear(): Promise<number> {
    const sql = 'DELETE FROM operation_logs';
    const result = this.execute(sql);
    return result.changes;
  }

  /**
   * 删除所有日志（别名方法）
   */
  async deleteAll(): Promise<number> {
    return await this.clear();
  }

  /**
   * 映射日志行数据
   */
  private mapLogRow(row: any): OperationLogRecord {
    const mapped = this.mapRow<OperationLogRecord>(row);
    
    // 解析JSON详情
    if (mapped.details) {
      try {
        mapped.details = JSON.parse(mapped.details);
      } catch (error) {
        // 如果解析失败，保持原始字符串
      }
    }

    return mapped;
  }

  /**
   * 便捷方法：记录登录日志
   */
  async logLogin(success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string): Promise<OperationLogRecord> {
    return await this.create({
      action: 'login',
      success,
      ipAddress,
      userAgent,
      errorMessage
    });
  }

  /**
   * 便捷方法：记录网站操作日志
   */
  async logSiteOperation(action: 'add_site' | 'remove_site' | 'toggle_site' | 'update_site', 
                        siteUrl: string, siteId?: number, details?: any): Promise<OperationLogRecord> {
    return await this.create({
      action,
      target: siteUrl,
      targetId: siteId,
      details
    });
  }

  /**
   * 便捷方法：记录系统操作日志
   */
  async logSystemOperation(action: string, details?: any, success: boolean = true): Promise<OperationLogRecord> {
    return await this.create({
      action,
      details,
      success
    });
  }
}
