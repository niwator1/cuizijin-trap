import { BaseDAO } from './BaseDAO';
import { BlockedSite, CreateBlockedSiteDto, UpdateBlockedSiteDto } from '@shared/types';

export interface BlockedSiteRecord {
  id: number;
  url: string;
  domain: string;
  title?: string;
  description?: string;
  enabled: boolean;
  blockType: 'domain' | 'url' | 'keyword';
  category: string;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlockedSiteFilter {
  enabled?: boolean;
  category?: string;
  blockType?: 'domain' | 'url' | 'keyword';
  domain?: string;
  search?: string;
}

export interface BlockedSiteListOptions {
  filter?: BlockedSiteFilter;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

/**
 * 被阻止网站数据访问对象
 * 处理网站黑名单相关的数据库操作
 */
export class BlockedSiteDAO extends BaseDAO {

  /**
   * 添加被阻止的网站
   */
  async create(siteData: CreateBlockedSiteDto & {
    title?: string;
    description?: string;
    blockType?: 'domain' | 'url' | 'keyword';
    category?: string;
    priority?: number;
  }): Promise<BlockedSiteRecord> {
    // 检查URL是否已存在
    if (await this.existsByUrl(siteData.url)) {
      throw new Error(`Site ${siteData.url} already exists`);
    }

    const siteRecord = {
      url: siteData.url,
      domain: siteData.domain,
      title: siteData.title || null,
      description: siteData.description || null,
      enabled: siteData.enabled !== undefined ? siteData.enabled : true,
      blockType: siteData.blockType || 'domain',
      category: siteData.category || 'general',
      priority: siteData.priority || 0
    };

    const { columns, placeholders, params } = this.buildInsertClause(siteRecord);
    
    const sql = `
      INSERT INTO blocked_sites (${columns})
      VALUES (${placeholders})
    `;

    const result = this.execute(sql, params);

    return await this.getById(Number(result.lastInsertRowid)) as BlockedSiteRecord;
  }

  /**
   * 根据ID获取网站
   */
  async getById(id: number): Promise<BlockedSiteRecord | null> {
    const sql = 'SELECT * FROM blocked_sites WHERE id = ?';
    const row = this.queryOne(sql, [id]);
    return row ? this.mapRow<BlockedSiteRecord>(row) : null;
  }

  /**
   * 根据URL获取网站
   */
  async getByUrl(url: string): Promise<BlockedSiteRecord | null> {
    const sql = 'SELECT * FROM blocked_sites WHERE url = ?';
    const row = this.queryOne(sql, [url]);
    return row ? this.mapRow<BlockedSiteRecord>(row) : null;
  }

  /**
   * 根据域名获取网站列表
   */
  async getByDomain(domain: string): Promise<BlockedSiteRecord[]> {
    const sql = 'SELECT * FROM blocked_sites WHERE domain = ? ORDER BY priority DESC, created_at ASC';
    const rows = this.query(sql, [domain]);
    return this.mapRows<BlockedSiteRecord>(rows);
  }

  /**
   * 根据域名查找单个网站记录
   */
  async findByDomain(domain: string): Promise<BlockedSiteRecord | null> {
    const sql = 'SELECT * FROM blocked_sites WHERE domain = ? ORDER BY priority DESC, created_at ASC LIMIT 1';
    const row = this.queryOne(sql, [domain]);
    return row ? this.mapRow<BlockedSiteRecord>(row) : null;
  }

  /**
   * 检查URL是否已存在
   */
  async existsByUrl(url: string): Promise<boolean> {
    return this.exists('blocked_sites', { url });
  }

  /**
   * 检查域名是否被阻止
   */
  async isDomainBlocked(domain: string): Promise<boolean> {
    const sql = `
      SELECT 1 FROM blocked_sites 
      WHERE domain = ? AND enabled = 1 
      LIMIT 1
    `;
    const result = this.queryOne(sql, [domain]);
    return !!result;
  }

  /**
   * 获取所有被阻止的网站列表
   */
  async getAll(options: BlockedSiteListOptions = {}): Promise<{
    sites: BlockedSiteRecord[];
    total: number;
    page?: number;
    limit?: number;
  }> {
    let sql = 'SELECT * FROM blocked_sites';
    let countSql = 'SELECT COUNT(*) as count FROM blocked_sites';
    const params: any[] = [];

    // 构建WHERE条件
    if (options.filter) {
      const conditions: string[] = [];
      
      if (options.filter.enabled !== undefined) {
        conditions.push('enabled = ?');
        params.push(options.filter.enabled);
      }
      
      if (options.filter.category) {
        conditions.push('category = ?');
        params.push(options.filter.category);
      }
      
      if (options.filter.blockType) {
        conditions.push('block_type = ?');
        params.push(options.filter.blockType);
      }
      
      if (options.filter.domain) {
        conditions.push('domain LIKE ?');
        params.push(`%${options.filter.domain}%`);
      }
      
      if (options.filter.search) {
        conditions.push('(url LIKE ? OR domain LIKE ? OR title LIKE ?)');
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
    const orderBy = options.orderBy || 'priority';
    const order = options.order || 'DESC';
    sql += ` ORDER BY ${orderBy} ${order}, created_at DESC`;

    // 添加分页
    if (options.page && options.limit) {
      const offset = (options.page - 1) * options.limit;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(options.limit, offset);
    }

    const rows = this.query(sql, params);
    const sites = this.mapRows<BlockedSiteRecord>(rows);

    return {
      sites,
      total,
      page: options.page,
      limit: options.limit
    };
  }

  /**
   * 获取启用的网站列表
   */
  async getEnabled(): Promise<BlockedSiteRecord[]> {
    const result = await this.getAll({
      filter: { enabled: true },
      orderBy: 'priority',
      order: 'DESC'
    });
    return result.sites;
  }

  /**
   * 获取被阻止的域名列表
   */
  async getBlockedDomains(): Promise<string[]> {
    const sql = `
      SELECT DISTINCT domain FROM blocked_sites 
      WHERE enabled = 1 
      ORDER BY domain
    `;
    const rows = this.query<{ domain: string }>(sql);
    return rows.map(row => row.domain);
  }

  /**
   * 更新网站信息
   */
  async update(id: number, updateData: UpdateBlockedSiteDto & {
    title?: string;
    description?: string;
    blockType?: 'domain' | 'url' | 'keyword';
    category?: string;
    priority?: number;
  }): Promise<BlockedSiteRecord> {
    const site = await this.getById(id);
    if (!site) {
      throw new Error(`Site with id ${id} not found`);
    }

    // 如果更新URL，检查新URL是否已存在
    if (updateData.url && updateData.url !== site.url) {
      if (await this.existsByUrl(updateData.url)) {
        throw new Error(`Site ${updateData.url} already exists`);
      }
    }

    const { clause, params } = this.buildSetClause(updateData);
    
    const sql = `UPDATE blocked_sites SET ${clause} WHERE id = ?`;
    
    this.execute(sql, [...params, id]);
    
    return await this.getById(id) as BlockedSiteRecord;
  }

  /**
   * 切换网站启用状态
   */
  async toggleEnabled(id: number): Promise<BlockedSiteRecord> {
    const site = await this.getById(id);
    if (!site) {
      throw new Error(`Site with id ${id} not found`);
    }

    return await this.update(id, { enabled: !site.enabled });
  }

  /**
   * 批量更新网站状态
   */
  async batchUpdateEnabled(ids: number[], enabled: boolean): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => '?').join(', ');
    const sql = `UPDATE blocked_sites SET enabled = ? WHERE id IN (${placeholders})`;
    
    const result = this.execute(sql, [enabled, ...ids]);
    return result.changes;
  }

  /**
   * 删除网站
   */
  async deleteById(id: number): Promise<boolean> {
    const changes = this.delete('blocked_sites', { id });
    return changes > 0;
  }

  /**
   * 批量删除网站
   */
  async batchDelete(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => '?').join(', ');
    const sql = `DELETE FROM blocked_sites WHERE id IN (${placeholders})`;
    
    const result = this.execute(sql, ids);
    return result.changes;
  }

  /**
   * 重置所有网站状态
   */
  async resetAllSites(enabled: boolean = false): Promise<number> {
    const sql = 'UPDATE blocked_sites SET enabled = ?';
    const result = this.execute(sql, [enabled]);
    return result.changes;
  }

  /**
   * 获取网站分类列表
   */
  async getCategories(): Promise<{ category: string; count: number }[]> {
    const sql = `
      SELECT category, COUNT(*) as count 
      FROM blocked_sites 
      GROUP BY category 
      ORDER BY count DESC, category ASC
    `;
    return this.query<{ category: string; count: number }>(sql);
  }

  /**
   * 获取网站总数
   */
  async getCount(): Promise<number> {
    return this.count('blocked_sites');
  }

  /**
   * 获取网站统计信息
   */
  async getStats(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    categories: number;
    domains: number;
  }> {
    const total = this.count('blocked_sites');
    const enabled = this.count('blocked_sites', { enabled: true });
    const disabled = total - enabled;

    const categoriesResult = this.queryOne(`
      SELECT COUNT(DISTINCT category) as count FROM blocked_sites
    `) as { count: number };

    const domainsResult = this.queryOne(`
      SELECT COUNT(DISTINCT domain) as count FROM blocked_sites
    `) as { count: number };

    return {
      total,
      enabled,
      disabled,
      categories: categoriesResult.count,
      domains: domainsResult.count
    };
  }

  /**
   * 清空所有网站
   */
  async clear(): Promise<number> {
    const sql = 'DELETE FROM blocked_sites';
    const result = this.execute(sql);
    return result.changes;
  }

  /**
   * 删除所有网站（别名方法）
   */
  async deleteAll(): Promise<number> {
    return await this.clear();
  }
}
