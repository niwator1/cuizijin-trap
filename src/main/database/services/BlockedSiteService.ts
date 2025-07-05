import { URL } from 'url';
import { BlockedSiteDAO, BlockedSiteRecord, BlockedSiteFilter, BlockedSiteListOptions } from '../models/BlockedSiteDAO';
import { OperationLogDAO } from '../models/OperationLogDAO';
import { InterceptStatsDAO } from '../models/InterceptStatsDAO';
import { CreateBlockedSiteDto } from '@shared/types';

export interface AddSiteResult {
  success: boolean;
  site?: BlockedSiteRecord;
  error?: string;
}

export interface BatchOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

export interface SiteValidationResult {
  isValid: boolean;
  url?: string;
  domain?: string;
  error?: string;
}

/**
 * 被阻止网站服务
 * 处理网站黑名单相关的业务逻辑
 */
export class BlockedSiteService {
  private blockedSiteDAO: BlockedSiteDAO;
  private operationLogDAO: OperationLogDAO;
  private interceptStatsDAO: InterceptStatsDAO;

  constructor(
    blockedSiteDAO: BlockedSiteDAO,
    operationLogDAO: OperationLogDAO,
    interceptStatsDAO: InterceptStatsDAO
  ) {
    this.blockedSiteDAO = blockedSiteDAO;
    this.operationLogDAO = operationLogDAO;
    this.interceptStatsDAO = interceptStatsDAO;
  }

  /**
   * 添加网站到黑名单
   */
  async addSite(siteData: CreateBlockedSiteDto & {
    title?: string;
    description?: string;
    category?: string;
    priority?: number;
  }): Promise<AddSiteResult> {
    try {
      // 验证和标准化URL
      const validation = this.validateAndNormalizeUrl(siteData.url);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 检查是否已存在
      const existingSite = await this.blockedSiteDAO.getByUrl(validation.url!);
      if (existingSite) {
        return {
          success: false,
          error: `Site ${validation.url} already exists`
        };
      }

      // 创建网站记录
      const normalizedSiteData = {
        ...siteData,
        url: validation.url!,
        domain: validation.domain!,
        category: siteData.category || 'general',
        priority: siteData.priority || 0
      };

      const site = await this.blockedSiteDAO.create(normalizedSiteData);

      // 记录操作日志
      await this.operationLogDAO.logSiteOperation('add_site', site.url, site.id, {
        domain: site.domain,
        category: site.category,
        enabled: site.enabled
      });

      return {
        success: true,
        site
      };
    } catch (error) {
      console.error('Failed to add site:', error);
      await this.operationLogDAO.logSiteOperation('add_site', siteData.url, undefined, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add site'
      };
    }
  }

  /**
   * 批量添加网站
   */
  async addMultipleSites(sites: (CreateBlockedSiteDto & {
    title?: string;
    description?: string;
    category?: string;
    priority?: number;
  })[]): Promise<BatchOperationResult> {
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const siteData of sites) {
      const result = await this.addSite(siteData);
      if (result.success) {
        processed++;
      } else {
        failed++;
        errors.push(`${siteData.url}: ${result.error}`);
      }
    }

    // 记录批量操作日志
    await this.operationLogDAO.logSystemOperation('batch_add_sites', {
      total: sites.length,
      processed,
      failed,
      errors: errors.slice(0, 10) // 只记录前10个错误
    });

    return {
      success: failed === 0,
      processed,
      failed,
      errors
    };
  }

  /**
   * 更新网站信息
   */
  async updateSite(id: number, updateData: {
    url?: string;
    domain?: string;
    title?: string;
    description?: string;
    enabled?: boolean;
    category?: string;
    priority?: number;
  }): Promise<BlockedSiteRecord | null> {
    try {
      const existingSite = await this.blockedSiteDAO.getById(id);
      if (!existingSite) {
        throw new Error(`Site with id ${id} not found`);
      }

      // 如果更新URL，验证新URL
      if (updateData.url && updateData.url !== existingSite.url) {
        const validation = this.validateAndNormalizeUrl(updateData.url);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
        updateData.url = validation.url;
        updateData.domain = validation.domain;
      }

      const updatedSite = await this.blockedSiteDAO.update(id, updateData);

      // 记录操作日志
      await this.operationLogDAO.logSiteOperation('update_site', updatedSite.url, id, {
        changes: updateData,
        previousUrl: existingSite.url
      });

      return updatedSite;
    } catch (error) {
      console.error('Failed to update site:', error);
      await this.operationLogDAO.logSiteOperation('update_site', '', id, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * 切换网站启用状态
   */
  async toggleSite(id: number): Promise<BlockedSiteRecord | null> {
    try {
      const site = await this.blockedSiteDAO.toggleEnabled(id);

      // 记录操作日志
      await this.operationLogDAO.logSiteOperation('toggle_site', site.url, id, {
        enabled: site.enabled,
        domain: site.domain
      });

      return site;
    } catch (error) {
      console.error('Failed to toggle site:', error);
      await this.operationLogDAO.logSiteOperation('toggle_site', '', id, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * 删除网站
   */
  async deleteSite(id: number): Promise<boolean> {
    try {
      const site = await this.blockedSiteDAO.getById(id);
      if (!site) {
        return false;
      }

      const success = await this.blockedSiteDAO.deleteById(id);

      if (success) {
        // 记录操作日志
        await this.operationLogDAO.logSiteOperation('remove_site', site.url, id, {
          domain: site.domain,
          category: site.category
        });
      }

      return success;
    } catch (error) {
      console.error('Failed to delete site:', error);
      await this.operationLogDAO.logSiteOperation('remove_site', '', id, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * 批量删除网站
   */
  async deleteMultipleSites(ids: number[]): Promise<BatchOperationResult> {
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of ids) {
      const success = await this.deleteSite(id);
      if (success) {
        processed++;
      } else {
        failed++;
        errors.push(`Failed to delete site with id ${id}`);
      }
    }

    // 记录批量操作日志
    await this.operationLogDAO.logSystemOperation('batch_delete_sites', {
      total: ids.length,
      processed,
      failed
    });

    return {
      success: failed === 0,
      processed,
      failed,
      errors
    };
  }

  /**
   * 获取网站列表
   */
  async getSites(options: BlockedSiteListOptions = {}): Promise<{
    sites: BlockedSiteRecord[];
    total: number;
    page?: number;
    limit?: number;
  }> {
    return await this.blockedSiteDAO.getAll(options);
  }

  /**
   * 获取启用的网站列表
   */
  async getEnabledSites(): Promise<BlockedSiteRecord[]> {
    return await this.blockedSiteDAO.getEnabled();
  }

  /**
   * 获取被阻止的域名列表
   */
  async getBlockedDomains(): Promise<string[]> {
    return await this.blockedSiteDAO.getBlockedDomains();
  }

  /**
   * 检查域名是否被阻止
   */
  async isDomainBlocked(domain: string): Promise<boolean> {
    return await this.blockedSiteDAO.isDomainBlocked(domain);
  }

  /**
   * 检查URL是否被阻止
   */
  async isUrlBlocked(url: string): Promise<{
    isBlocked: boolean;
    site?: BlockedSiteRecord;
    reason?: string;
  }> {
    try {
      const validation = this.validateAndNormalizeUrl(url);
      if (!validation.isValid) {
        return { isBlocked: false, reason: 'Invalid URL' };
      }

      // 首先检查完整URL
      const siteByUrl = await this.blockedSiteDAO.getByUrl(validation.url!);
      if (siteByUrl && siteByUrl.enabled) {
        return { isBlocked: true, site: siteByUrl, reason: 'URL match' };
      }

      // 然后检查域名
      const isDomainBlocked = await this.blockedSiteDAO.isDomainBlocked(validation.domain!);
      if (isDomainBlocked) {
        const sitesByDomain = await this.blockedSiteDAO.getByDomain(validation.domain!);
        const enabledSite = sitesByDomain.find(site => site.enabled);
        return { 
          isBlocked: true, 
          site: enabledSite, 
          reason: 'Domain match' 
        };
      }

      return { isBlocked: false };
    } catch (error) {
      console.error('Error checking if URL is blocked:', error);
      return { isBlocked: false, reason: 'Check failed' };
    }
  }

  /**
   * 记录网站拦截
   */
  async recordIntercept(url: string): Promise<void> {
    try {
      const blockResult = await this.isUrlBlocked(url);
      if (blockResult.isBlocked && blockResult.site) {
        await this.interceptStatsDAO.recordIntercept(blockResult.site.id, blockResult.site.domain);
      }
    } catch (error) {
      console.error('Failed to record intercept:', error);
    }
  }

  /**
   * 重置所有网站状态
   */
  async resetAllSites(enabled: boolean = false): Promise<number> {
    try {
      const count = await this.blockedSiteDAO.resetAllSites(enabled);

      // 记录操作日志
      await this.operationLogDAO.logSystemOperation('reset_all_sites', {
        enabled,
        affectedCount: count
      });

      return count;
    } catch (error) {
      console.error('Failed to reset all sites:', error);
      await this.operationLogDAO.logSystemOperation('reset_all_sites_failed', {
        enabled,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, false);
      return 0;
    }
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
    topCategories: { category: string; count: number }[];
  }> {
    const stats = await this.blockedSiteDAO.getStats();
    const categories = await this.blockedSiteDAO.getCategories();

    return {
      ...stats,
      topCategories: categories.slice(0, 5)
    };
  }

  /**
   * 导入网站列表
   */
  async importSites(sites: string[], options?: {
    category?: string;
    enabled?: boolean;
    skipExisting?: boolean;
  }): Promise<BatchOperationResult> {
    const siteData = sites.map(url => ({
      url,
      domain: '', // 将在addSite中自动提取
      category: options?.category || 'imported',
      enabled: options?.enabled !== false
    }));

    return await this.addMultipleSites(siteData);
  }

  /**
   * 导出网站列表
   */
  async exportSites(format: 'json' | 'csv' | 'txt' = 'json'): Promise<string> {
    const sites = await this.blockedSiteDAO.getAll();

    switch (format) {
      case 'json':
        return JSON.stringify(sites.sites, null, 2);
      
      case 'csv':
        const headers = 'URL,Domain,Title,Category,Enabled,Created At';
        const rows = sites.sites.map(site => 
          `"${site.url}","${site.domain}","${site.title || ''}","${site.category}","${site.enabled}","${site.createdAt}"`
        );
        return [headers, ...rows].join('\n');
      
      case 'txt':
        return sites.sites.map(site => site.url).join('\n');
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * 清除所有网站
   */
  async clearAll(): Promise<{ success: boolean; error?: string }> {
    try {
      // 获取所有网站数量
      const totalSites = await this.blockedSiteDAO.getCount();

      // 清除所有网站
      await this.blockedSiteDAO.deleteAll();

      // 记录操作日志
      await this.operationLogDAO.create({
        action: 'clear_all_sites',
        details: { totalSites },
        success: true
      });

      return { success: true };
    } catch (error) {
      console.error('Clear all sites error:', error);

      // 记录错误日志
      await this.operationLogDAO.create({
        action: 'clear_all_sites',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        success: false
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear all sites'
      };
    }
  }

  /**
   * 验证和标准化URL
   */
  private validateAndNormalizeUrl(urlString: string): SiteValidationResult {
    try {
      // 如果没有协议，添加http://
      if (!urlString.match(/^https?:\/\//)) {
        urlString = `http://${urlString}`;
      }

      const url = new URL(urlString);
      
      // 提取域名
      const domain = url.hostname.toLowerCase();
      
      // 验证域名格式
      if (!domain || domain.includes(' ') || !domain.includes('.')) {
        return {
          isValid: false,
          error: 'Invalid domain format'
        };
      }

      // 标准化URL（移除fragment，保留path和query）
      const normalizedUrl = `${url.protocol}//${url.hostname}${url.pathname}${url.search}`;

      return {
        isValid: true,
        url: normalizedUrl,
        domain
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid URL format'
      };
    }
  }
}
