import { BaseDAO } from './BaseDAO';

export interface InterceptStatsRecord {
  id: number;
  siteId: number;
  domain: string;
  interceptCount: number;
  lastInterceptAt: Date;
  date: string; // YYYY-MM-DD格式
}

export interface DailyStats {
  date: string;
  uniqueSitesBlocked: number;
  totalIntercepts: number;
  lastInterceptTime?: Date;
}

export interface SiteStats {
  domain: string;
  title?: string;
  category?: string;
  totalIntercepts: number;
  lastInterceptAt?: Date;
  dailyAverage: number;
}

/**
 * 拦截统计数据访问对象
 * 处理网站拦截统计相关的数据库操作
 */
export class InterceptStatsDAO extends BaseDAO {

  /**
   * 记录网站拦截
   */
  async recordIntercept(siteId: number, domain: string): Promise<void> {
    const today = this.getTodayDateString();
    
    // 使用UPSERT操作
    const sql = `
      INSERT INTO intercept_stats (site_id, domain, intercept_count, date)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(site_id, date) DO UPDATE SET
        intercept_count = intercept_count + 1,
        last_intercept_at = CURRENT_TIMESTAMP
    `;

    this.execute(sql, [siteId, domain, today]);
  }

  /**
   * 批量记录拦截
   */
  async recordMultipleIntercepts(intercepts: { siteId: number; domain: string; count?: number }[]): Promise<void> {
    if (intercepts.length === 0) return;

    const today = this.getTodayDateString();
    
    this.transaction(() => {
      for (const intercept of intercepts) {
        const count = intercept.count || 1;
        const sql = `
          INSERT INTO intercept_stats (site_id, domain, intercept_count, date)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(site_id, date) DO UPDATE SET
            intercept_count = intercept_count + ?,
            last_intercept_at = CURRENT_TIMESTAMP
        `;
        this.execute(sql, [intercept.siteId, intercept.domain, count, today, count]);
      }
    });
  }

  /**
   * 获取指定日期的统计
   */
  async getStatsByDate(date: string): Promise<InterceptStatsRecord[]> {
    const sql = `
      SELECT * FROM intercept_stats 
      WHERE date = ? 
      ORDER BY intercept_count DESC
    `;
    const rows = this.query(sql, [date]);
    return this.mapRows<InterceptStatsRecord>(rows);
  }

  /**
   * 获取今天的统计
   */
  async getTodayStats(): Promise<InterceptStatsRecord[]> {
    const today = this.getTodayDateString();
    return await this.getStatsByDate(today);
  }

  /**
   * 获取指定网站的统计
   */
  async getStatsBySite(siteId: number, days?: number): Promise<InterceptStatsRecord[]> {
    let sql = `
      SELECT * FROM intercept_stats 
      WHERE site_id = ?
    `;
    const params: any[] = [siteId];

    if (days) {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      sql += ` AND date >= ?`;
      params.push(this.formatDateString(fromDate));
    }

    sql += ` ORDER BY date DESC`;

    const rows = this.query(sql, params);
    return this.mapRows<InterceptStatsRecord>(rows);
  }

  /**
   * 获取指定域名的统计
   */
  async getStatsByDomain(domain: string, days?: number): Promise<InterceptStatsRecord[]> {
    let sql = `
      SELECT * FROM intercept_stats 
      WHERE domain = ?
    `;
    const params: any[] = [domain];

    if (days) {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      sql += ` AND date >= ?`;
      params.push(this.formatDateString(fromDate));
    }

    sql += ` ORDER BY date DESC`;

    const rows = this.query(sql, params);
    return this.mapRows<InterceptStatsRecord>(rows);
  }

  /**
   * 获取日统计汇总
   */
  async getDailyStats(days: number = 30): Promise<DailyStats[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const sql = `
      SELECT 
        date,
        COUNT(DISTINCT site_id) as unique_sites_blocked,
        SUM(intercept_count) as total_intercepts,
        MAX(last_intercept_at) as last_intercept_time
      FROM intercept_stats 
      WHERE date >= ?
      GROUP BY date
      ORDER BY date DESC
    `;

    const rows = this.query(sql, [this.formatDateString(fromDate)]);
    return rows.map(row => ({
      date: row.date,
      uniqueSitesBlocked: row.unique_sites_blocked,
      totalIntercepts: row.total_intercepts,
      lastInterceptTime: row.last_intercept_time ? new Date(row.last_intercept_time) : undefined
    }));
  }

  /**
   * 获取网站排行榜
   */
  async getTopSites(limit: number = 10, days?: number): Promise<SiteStats[]> {
    let sql = `
      SELECT 
        bs.domain,
        bs.title,
        bs.category,
        SUM(ist.intercept_count) as total_intercepts,
        MAX(ist.last_intercept_at) as last_intercept_at,
        AVG(ist.intercept_count) as daily_average
      FROM blocked_sites bs
      LEFT JOIN intercept_stats ist ON bs.id = ist.site_id
      WHERE bs.enabled = 1
    `;
    const params: any[] = [];

    if (days) {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      sql += ` AND ist.date >= ?`;
      params.push(this.formatDateString(fromDate));
    }

    sql += `
      GROUP BY bs.id, bs.domain, bs.title, bs.category
      HAVING total_intercepts > 0
      ORDER BY total_intercepts DESC, last_intercept_at DESC
      LIMIT ?
    `;
    params.push(limit);

    const rows = this.query(sql, params);
    return rows.map(row => ({
      domain: row.domain,
      title: row.title,
      category: row.category,
      totalIntercepts: row.total_intercepts || 0,
      lastInterceptAt: row.last_intercept_at ? new Date(row.last_intercept_at) : undefined,
      dailyAverage: Math.round((row.daily_average || 0) * 100) / 100
    }));
  }

  /**
   * 获取总体统计信息
   */
  async getOverallStats(days?: number): Promise<{
    totalIntercepts: number;
    uniqueSites: number;
    uniqueDomains: number;
    averageDaily: number;
    peakDay: { date: string; count: number } | null;
    mostBlockedSite: { domain: string; count: number } | null;
  }> {
    let whereClause = '';
    const params: any[] = [];

    if (days) {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      whereClause = ' WHERE date >= ?';
      params.push(this.formatDateString(fromDate));
    }

    // 总拦截次数
    const totalResult = this.queryOne(`
      SELECT SUM(intercept_count) as total FROM intercept_stats${whereClause}
    `, params) as { total: number };

    // 唯一网站数
    const uniqueSitesResult = this.queryOne(`
      SELECT COUNT(DISTINCT site_id) as count FROM intercept_stats${whereClause}
    `, params) as { count: number };

    // 唯一域名数
    const uniqueDomainsResult = this.queryOne(`
      SELECT COUNT(DISTINCT domain) as count FROM intercept_stats${whereClause}
    `, params) as { count: number };

    // 日均拦截次数
    const dailyAvgResult = this.queryOne(`
      SELECT AVG(daily_total) as avg FROM (
        SELECT SUM(intercept_count) as daily_total 
        FROM intercept_stats${whereClause}
        GROUP BY date
      )
    `, params) as { avg: number };

    // 峰值日期
    const peakDayResult = this.queryOne(`
      SELECT date, SUM(intercept_count) as count 
      FROM intercept_stats${whereClause}
      GROUP BY date 
      ORDER BY count DESC 
      LIMIT 1
    `, params) as { date: string; count: number } | undefined;

    // 最常被阻止的网站
    const mostBlockedResult = this.queryOne(`
      SELECT domain, SUM(intercept_count) as count 
      FROM intercept_stats${whereClause}
      GROUP BY domain 
      ORDER BY count DESC 
      LIMIT 1
    `, params) as { domain: string; count: number } | undefined;

    return {
      totalIntercepts: totalResult.total || 0,
      uniqueSites: uniqueSitesResult.count || 0,
      uniqueDomains: uniqueDomainsResult.count || 0,
      averageDaily: Math.round((dailyAvgResult.avg || 0) * 100) / 100,
      peakDay: peakDayResult ? { date: peakDayResult.date, count: peakDayResult.count } : null,
      mostBlockedSite: mostBlockedResult ? { domain: mostBlockedResult.domain, count: mostBlockedResult.count } : null
    };
  }

  /**
   * 获取时间段内的趋势数据
   */
  async getTrendData(days: number = 7): Promise<{ date: string; count: number }[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const sql = `
      SELECT 
        date,
        SUM(intercept_count) as count
      FROM intercept_stats 
      WHERE date >= ?
      GROUP BY date
      ORDER BY date ASC
    `;

    const rows = this.query(sql, [this.formatDateString(fromDate)]);
    return rows.map(row => ({
      date: row.date,
      count: row.count || 0
    }));
  }

  /**
   * 清理过期统计数据
   */
  async cleanupOldStats(retentionDays: number): Promise<number> {
    if (retentionDays <= 0) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const sql = 'DELETE FROM intercept_stats WHERE date < ?';
    const result = this.execute(sql, [this.formatDateString(cutoffDate)]);
    return result.changes;
  }

  /**
   * 重置统计数据
   */
  async resetStats(): Promise<number> {
    const sql = 'DELETE FROM intercept_stats';
    const result = this.execute(sql);
    return result.changes;
  }

  /**
   * 获取今天的日期字符串
   */
  private getTodayDateString(): string {
    return this.formatDateString(new Date());
  }

  /**
   * 格式化日期为YYYY-MM-DD字符串
   */
  private formatDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * 获取指定网站今天的拦截次数
   */
  async getTodayInterceptCount(siteId: number): Promise<number> {
    const today = this.getTodayDateString();
    const sql = `
      SELECT intercept_count FROM intercept_stats 
      WHERE site_id = ? AND date = ?
    `;
    const result = this.queryOne(sql, [siteId, today]) as { intercept_count: number } | undefined;
    return result?.intercept_count || 0;
  }

  /**
   * 获取指定域名今天的拦截次数
   */
  async getTodayDomainInterceptCount(domain: string): Promise<number> {
    const today = this.getTodayDateString();
    const sql = `
      SELECT SUM(intercept_count) as total FROM intercept_stats 
      WHERE domain = ? AND date = ?
    `;
    const result = this.queryOne(sql, [domain, today]) as { total: number } | undefined;
    return result?.total || 0;
  }
}
