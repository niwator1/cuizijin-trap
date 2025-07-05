import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { Validator, ValidationRules, CommonValidators } from '../../shared/utils/validation';
import { ErrorHandler, DatabaseError, ValidationError } from '../../shared/utils/errorHandler';

/**
 * 基于JSON文件的数据库实现
 * 提供简单的数据持久化功能，替代SQLite
 */
export class FileDatabase {
  private dataPath: string;
  private data: {
    userConfig: any;
    blockedSites: any[];
    operationLogs: any[];
    settings: any;
  };

  constructor() {
    // 获取用户数据目录
    const userDataPath = app.getPath('userData');
    this.dataPath = path.join(userDataPath, 'cuizijin-trap-data.json');
    
    // 初始化数据结构
    this.data = {
      userConfig: null,
      blockedSites: [],
      operationLogs: [],
      settings: {
        theme: 'system',
        language: 'zh-CN',
        sessionTimeout: 3600,
        autoStart: false
      }
    };

    this.loadData();
  }

  /**
   * 从文件加载数据
   */
  private loadData(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const fileContent = fs.readFileSync(this.dataPath, 'utf8');
        const loadedData = JSON.parse(fileContent);

        // 验证加载的数据结构
        this.validateDataStructure(loadedData);

        // 合并数据，保持默认值
        this.data = {
          ...this.data,
          ...loadedData
        };

        console.log('Data loaded from file:', this.dataPath);
      } else {
        console.log('No existing data file, using defaults');
        this.saveData(); // 创建初始文件
      }
    } catch (error) {
      const dbError = new DatabaseError(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      ErrorHandler.getInstance().handleError(dbError, 'FileDatabase.loadData');

      // 如果文件损坏，备份并重新创建
      this.backupCorruptedFile();
      this.saveData();
    }
  }

  /**
   * 保存数据到文件
   */
  private saveData(): void {
    try {
      // 验证数据结构
      this.validateDataStructure(this.data);

      // 确保目录存在
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 原子写入：先写入临时文件，然后重命名
      const tempPath = this.dataPath + '.tmp';
      const dataToSave = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(tempPath, dataToSave, 'utf8');
      fs.renameSync(tempPath, this.dataPath);

      console.log('Data saved to file:', this.dataPath);
    } catch (error) {
      const dbError = new DatabaseError(`Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      ErrorHandler.getInstance().handleError(dbError, 'FileDatabase.saveData');
      throw dbError;
    }
  }

  /**
   * 验证数据结构
   */
  private validateDataStructure(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Invalid data structure: data must be an object');
    }

    // 验证必需的顶级属性
    const requiredProperties = ['userConfig', 'blockedSites', 'operationLogs', 'settings'];
    for (const prop of requiredProperties) {
      if (!(prop in data)) {
        throw new ValidationError(`Invalid data structure: missing property '${prop}'`);
      }
    }

    // 验证数组类型
    if (!Array.isArray(data.blockedSites)) {
      throw new ValidationError('Invalid data structure: blockedSites must be an array');
    }
    if (!Array.isArray(data.operationLogs)) {
      throw new ValidationError('Invalid data structure: operationLogs must be an array');
    }

    // 验证设置对象
    if (!data.settings || typeof data.settings !== 'object') {
      throw new ValidationError('Invalid data structure: settings must be an object');
    }

    // 验证网站数据
    for (const site of data.blockedSites) {
      this.validateSiteData(site);
    }
  }

  /**
   * 验证网站数据
   */
  private validateSiteData(site: any): void {
    if (!site || typeof site !== 'object') {
      throw new ValidationError('Invalid site data: site must be an object');
    }

    // 验证必需字段
    if (!site.id || typeof site.id !== 'number') {
      throw new ValidationError('Invalid site data: id must be a number');
    }
    if (!site.domain || typeof site.domain !== 'string') {
      throw new ValidationError('Invalid site data: domain must be a string');
    }
    if (typeof site.enabled !== 'boolean') {
      throw new ValidationError('Invalid site data: enabled must be a boolean');
    }

    // 验证域名格式
    if (!this.isValidDomain(site.domain)) {
      throw new ValidationError(`Invalid domain format: ${site.domain}`);
    }
  }

  /**
   * 简单的域名验证
   */
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }

  /**
   * 备份损坏的文件
   */
  private backupCorruptedFile(): void {
    try {
      const backupPath = `${this.dataPath}.backup.${Date.now()}`;
      fs.copyFileSync(this.dataPath, backupPath);
      console.log('Corrupted file backed up to:', backupPath);
    } catch (error) {
      console.error('Error backing up corrupted file:', error);
    }
  }

  /**
   * 模拟SQLite的prepare方法
   */
  prepare(sql: string) {
    return {
      run: (...params: any[]) => this.executeStatement(sql, params, 'run'),
      get: (...params: any[]) => this.executeStatement(sql, params, 'get'),
      all: (...params: any[]) => this.executeStatement(sql, params, 'all')
    };
  }

  /**
   * 执行SQL语句（模拟）
   */
  private executeStatement(sql: string, params: any[], type: 'run' | 'get' | 'all'): any {
    const sqlLower = sql.toLowerCase().trim();

    try {
      // 首先检查是否是COUNT查询
      if (sqlLower.includes('count(*)')) {
        return this.handleCountQuery(sqlLower, params, type);
      }

      // 用户配置相关操作
      if (sqlLower.includes('user_config')) {
        return this.handleUserConfigQuery(sqlLower, params, type);
      }

      // 网站黑名单相关操作
      if (sqlLower.includes('blocked_sites')) {
        return this.handleBlockedSitesQuery(sqlLower, params, type);
      }

      // 操作日志相关操作
      if (sqlLower.includes('operation_logs')) {
        return this.handleOperationLogsQuery(sqlLower, params, type);
      }

      // 设置相关操作
      if (sqlLower.includes('settings')) {
        return this.handleSettingsQuery(sqlLower, params, type);
      }

      // 拦截统计相关操作
      if (sqlLower.includes('intercept_stats')) {
        return this.handleInterceptStatsQuery(sqlLower, params, type);
      }

      // 应用配置相关操作
      if (sqlLower.includes('app_config')) {
        return this.handleAppConfigQuery(sqlLower, params, type);
      }

      console.log('Unhandled SQL:', sql);
      return type === 'all' ? [] : null;
    } catch (error) {
      console.error('Error executing statement:', error);
      throw error;
    }
  }

  /**
   * 处理COUNT查询
   */
  private handleCountQuery(sql: string, params: any[], type: string): any {
    try {
      let count = 0;

      // 根据表名确定计数
      if (sql.includes('operation_logs')) {
        count = this.data.operationLogs.length;

        // 处理WHERE条件
        if (sql.includes('where')) {
          // 简单的WHERE条件处理
          if (sql.includes('success = 1')) {
            count = this.data.operationLogs.filter(log => log.success === true).length;
          } else if (sql.includes('success = 0')) {
            count = this.data.operationLogs.filter(log => log.success === false).length;
          }
        }
      } else if (sql.includes('blocked_sites')) {
        count = this.data.blockedSites.length;

        // 处理WHERE条件
        if (sql.includes('where')) {
          if (sql.includes('enabled = 1')) {
            count = this.data.blockedSites.filter(site => site.enabled === true).length;
          } else if (sql.includes('enabled = 0')) {
            count = this.data.blockedSites.filter(site => site.enabled === false).length;
          }
        }
      } else if (sql.includes('user_config')) {
        count = this.data.userConfig && this.data.userConfig.password_hash ? 1 : 0;
      } else if (sql.includes('intercept_stats')) {
        // 拦截统计暂时返回0，因为FileDatabase中没有实际的拦截统计数据
        count = 0;

        // 处理特殊的COUNT查询
        if (sql.includes('count(distinct site_id)')) {
          count = 0;
        } else if (sql.includes('count(distinct domain)')) {
          count = 0;
        }
      } else if (sql.includes('app_config')) {
        // 应用配置暂时返回0，后续可以扩展
        count = 0;
      } else if (sql.includes('sqlite_master')) {
        // SQLite系统表查询，返回固定值
        count = 5; // 假设有5个表
      }

      return { count };
    } catch (error) {
      console.error('Error in handleCountQuery:', error);
      return { count: 0 };
    }
  }

  /**
   * 处理用户配置查询
   */
  private handleUserConfigQuery(sql: string, params: any[], type: string): any {
    try {
      if (sql.includes('select')) {
        if (type === 'get') {
          // 确保只有在真正有有效用户配置时才返回，并转换字段名
          if (this.data.userConfig && this.data.userConfig.password_hash) {
            return this.convertUserConfigToDAO(this.data.userConfig);
          }
          return null;
        } else if (type === 'all') {
          // 确保只有在真正有有效用户配置时才返回，并转换字段名
          if (this.data.userConfig && this.data.userConfig.password_hash) {
            return [this.convertUserConfigToDAO(this.data.userConfig)];
          }
          return [];
        }
      } else if (sql.includes('insert') || sql.includes('update')) {
        // 检查是否已存在用户配置（用于insert操作）
        if (sql.includes('insert') && this.data.userConfig && this.data.userConfig.password_hash) {
          throw new Error('User configuration already exists');
        }

        // 验证密码哈希
        if (params[0] && typeof params[0] !== 'string') {
          throw new ValidationError('Password hash must be a string');
        }
        if (params[0] && params[0].length > 255) {
          throw new ValidationError('Password hash too long');
        }

        const isUpdate = sql.includes('update') && this.data.userConfig;

        // 构建用户配置对象，支持更多字段
        const newConfig = {
          id: 1,
          password_hash: params[0] || (isUpdate ? this.data.userConfig.password_hash : null),
          salt: params[1] || (isUpdate ? this.data.userConfig.salt : ''),
          sessionTimeout: params[2] || (isUpdate ? this.data.userConfig.sessionTimeout : 3600),
          autoStart: params[3] !== undefined ? params[3] : (isUpdate ? this.data.userConfig.autoStart : false),
          theme: params[4] || (isUpdate ? this.data.userConfig.theme : 'system'),
          language: params[5] || (isUpdate ? this.data.userConfig.language : 'zh-CN'),
          created_at: isUpdate ? this.data.userConfig.created_at : new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        this.data.userConfig = newConfig;
        this.saveData();

        // 记录操作日志
        this.logOperation(isUpdate ? 'update_user_config' : 'create_user_config', true, {
          hasPassword: !!newConfig.password_hash
        });

        return { changes: 1, lastInsertRowid: 1 };
      } else if (sql.includes('delete')) {
        const hadConfig = !!this.data.userConfig;
        this.data.userConfig = null;
        this.saveData();

        if (hadConfig) {
          this.logOperation('delete_user_config', true);
        }

        return { changes: hadConfig ? 1 : 0 };
      }

      return type === 'all' ? [] : null;
    } catch (error) {
      const appError = ErrorHandler.getInstance().handleError(error as Error, 'FileDatabase.handleUserConfigQuery');
      this.logOperation('user_config_operation', false, { sql: sql.substring(0, 50) }, { error: appError.message });
      throw appError;
    }
  }

  /**
   * 处理网站黑名单查询
   */
  private handleBlockedSitesQuery(sql: string, params: any[], type: string): any {
    try {
      if (sql.includes('select')) {
        if (type === 'get') {
          // 根据查询条件查找
          if (sql.includes('WHERE url = ?')) {
            // 根据URL查找
            const url = params[0];
            return this.data.blockedSites.find(site => site.url === url) || null;
          } else if (sql.includes('WHERE domain = ?')) {
            // 根据域名查找
            const domain = params[0];
            return this.data.blockedSites.find(site => site.domain === domain) || null;
          } else {
            // 根据ID查找
            const id = params[0];
            return this.data.blockedSites.find(site => site.id === id) || null;
          }
        } else if (type === 'all') {
          // 支持条件查询
          if (sql.includes('WHERE')) {
            if (sql.includes('enabled = ?')) {
              const enabled = params[0];
              return this.data.blockedSites.filter(site => site.enabled === enabled);
            } else if (sql.includes('category = ?')) {
              const category = params[0];
              return this.data.blockedSites.filter(site => site.category === category);
            }
          }
          return [...this.data.blockedSites];
        }
      } else if (sql.includes('insert')) {
        // 处理完整的网站数据插入
        const newSite = {
          id: this.data.blockedSites.length + 1,
          url: params[0] || '',
          domain: params[1] || '',
          title: params[2] || null,
          description: params[3] || null,
          enabled: params[4] !== undefined ? params[4] : true,
          blockType: params[5] || 'domain',
          category: params[6] || 'general',
          priority: params[7] || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // 验证必需字段
        if (!newSite.url) {
          throw new Error('URL is required');
        }

        // 检查是否已存在
        const existingSite = this.data.blockedSites.find(site => site.url === newSite.url);
        if (existingSite) {
          throw new Error(`Site ${newSite.url} already exists`);
        }

        this.data.blockedSites.push(newSite);
        this.saveData();

        // 记录操作日志
        this.logOperation('add_site', true, {
          url: newSite.url,
          domain: newSite.domain,
          category: newSite.category
        });

        return { changes: 1, lastInsertRowid: newSite.id };
      } else if (sql.includes('update')) {
      // 更新网站信息
      const id = params[params.length - 1]; // ID是最后一个参数
      const siteIndex = this.data.blockedSites.findIndex(site => site.id === id);
      if (siteIndex !== -1) {
        const site = this.data.blockedSites[siteIndex];

        // 根据SQL更新相应字段
        if (sql.includes('enabled = ?')) {
          site.enabled = params[0];
        }
        if (sql.includes('title = ?')) {
          site.title = params[0];
        }
        if (sql.includes('description = ?')) {
          site.description = params[0];
        }
        if (sql.includes('category = ?')) {
          site.category = params[0];
        }
        if (sql.includes('priority = ?')) {
          site.priority = params[0];
        }

        site.updated_at = new Date().toISOString();
        this.saveData();

        // 记录操作日志
        this.logOperation('update_site', true, {
          id: site.id,
          url: site.url
        });

        return { changes: 1 };
      }
      return { changes: 0 };
    } else if (sql.includes('delete')) {
      const id = params[0];
      const initialLength = this.data.blockedSites.length;
      const siteToDelete = this.data.blockedSites.find(site => site.id === id);

      this.data.blockedSites = this.data.blockedSites.filter(site => site.id !== id);
      const changes = initialLength - this.data.blockedSites.length;

      if (changes > 0) {
        this.saveData();

        // 记录操作日志
        if (siteToDelete) {
          this.logOperation('delete_site', true, {
            id: siteToDelete.id,
            url: siteToDelete.url
          });
        }
      }
      return { changes };
    }

    return type === 'all' ? [] : null;
    } catch (error) {
      const appError = ErrorHandler.getInstance().handleError(error as Error, 'FileDatabase.handleBlockedSitesQuery');
      this.logOperation('blocked_sites_operation', false, { sql: sql.substring(0, 50) }, { error: appError.message });
      throw appError;
    }
  }

  /**
   * 处理操作日志查询
   */
  private handleOperationLogsQuery(sql: string, params: any[], type: string): any {
    try {
      if (sql.includes('select')) {
        let logs = [...this.data.operationLogs];

        // 处理WHERE条件
        if (sql.includes('where')) {
          // 简单的WHERE条件处理
          if (sql.includes('success = 1')) {
            logs = logs.filter(log => log.success === true);
          } else if (sql.includes('success = 0')) {
            logs = logs.filter(log => log.success === false);
          }

          // 处理ID查询
          if (sql.includes('id = ?') && params.length > 0) {
            logs = logs.filter(log => log.id === params[0]);
            return type === 'get' ? (logs[0] || null) : logs;
          }
        }

        // 处理ORDER BY
        if (sql.includes('order by')) {
          if (sql.includes('timestamp desc')) {
            logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          } else if (sql.includes('timestamp asc')) {
            logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          }
        }

        // 处理LIMIT
        if (sql.includes('limit')) {
          const limitMatch = sql.match(/limit\s+(\d+)/i);
          if (limitMatch) {
            const limit = parseInt(limitMatch[1]);
            logs = logs.slice(0, limit);
          }
        }

        return type === 'all' ? logs : (logs[0] || null);
      } else if (sql.includes('insert')) {
        const newLog = {
          id: this.data.operationLogs.length + 1,
          action: params[0] || 'unknown',
          target: params[1] || null,
          target_id: params[2] || null,
          details: params[3] || null,
          ip_address: params[4] || null,
          user_agent: params[5] || null,
          success: params[6] !== undefined ? params[6] : true,
          error_message: params[7] || null,
          timestamp: new Date().toISOString()
        };
        this.data.operationLogs.push(newLog);
        this.saveData();
        return { changes: 1, lastInsertRowid: newLog.id };
      } else if (sql.includes('delete')) {
        const originalLength = this.data.operationLogs.length;
        // 简单的删除处理，可以根据需要扩展
        this.data.operationLogs = [];
        this.saveData();
        return { changes: originalLength };
      }

      return type === 'all' ? [] : null;
    } catch (error) {
      console.error('Error in handleOperationLogsQuery:', error);
      return type === 'all' ? [] : null;
    }
  }

  /**
   * 处理设置查询
   */
  private handleSettingsQuery(sql: string, params: any[], type: string): any {
    if (sql.includes('select')) {
      if (type === 'get') {
        return this.data.settings;
      } else if (type === 'all') {
        return [this.data.settings];
      }
    } else if (sql.includes('update')) {
      // 更新设置
      Object.assign(this.data.settings, {
        theme: params[0] || this.data.settings.theme,
        language: params[1] || this.data.settings.language,
        sessionTimeout: params[2] || this.data.settings.sessionTimeout,
        autoStart: params[3] !== undefined ? params[3] : this.data.settings.autoStart
      });
      this.saveData();
      return { changes: 1 };
    }

    return type === 'all' ? [] : null;
  }

  /**
   * 处理拦截统计查询
   */
  private handleInterceptStatsQuery(sql: string, params: any[], type: string): any {
    try {
      if (sql.includes('select')) {
        // 处理聚合查询
        if (sql.includes('sum(intercept_count)')) {
          return { total: 0 };
        } else if (sql.includes('count(distinct site_id)')) {
          return { count: 0 };
        } else if (sql.includes('count(distinct domain)')) {
          return { count: 0 };
        } else if (sql.includes('avg(daily_total)')) {
          return { avg: 0 };
        } else if (sql.includes('group by date')) {
          return type === 'all' ? [] : null;
        } else if (sql.includes('group by domain')) {
          return type === 'all' ? [] : null;
        }

        return type === 'all' ? [] : null;
      } else if (sql.includes('insert')) {
        // 记录拦截统计（简化处理）
        return { changes: 1, lastInsertRowid: 1 };
      }

      return type === 'all' ? [] : null;
    } catch (error) {
      console.error('Error in handleInterceptStatsQuery:', error);
      // 返回安全的默认值
      if (sql.includes('sum(') || sql.includes('count(') || sql.includes('avg(')) {
        return { total: 0, count: 0, avg: 0 };
      }
      return type === 'all' ? [] : null;
    }
  }

  /**
   * 处理应用配置查询
   */
  private handleAppConfigQuery(sql: string, params: any[], type: string): any {
    // 应用配置功能暂时简化处理
    if (sql.includes('select')) {
      return type === 'all' ? [] : null;
    } else if (sql.includes('insert') || sql.includes('update')) {
      return { changes: 1, lastInsertRowid: 1 };
    }

    return type === 'all' ? [] : null;
  }

  /**
   * 模拟SQLite的exec方法
   */
  exec(sql: string): void {
    console.log('Executing SQL:', sql.substring(0, 100) + '...');
    // 对于文件数据库，大多数DDL语句可以忽略
    // 因为我们的数据结构是预定义的
  }

  /**
   * 模拟SQLite的pragma方法
   */
  pragma(pragma: string): void {
    console.log('Pragma:', pragma);
    // 文件数据库不需要处理pragma
  }

  /**
   * 模拟SQLite的transaction方法
   */
  transaction(fn: () => void) {
    return () => {
      try {
        console.log('Transaction starting...');
        fn();
        console.log('Transaction completed');
      } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
      }
    };
  }

  /**
   * 获取数据库统计信息
   */
  getStats() {
    return {
      userConfigExists: !!this.data.userConfig,
      blockedSitesCount: this.data.blockedSites.length,
      operationLogsCount: this.data.operationLogs.length,
      dataPath: this.dataPath
    };
  }

  /**
   * 清空所有数据（用于重置应用）
   */
  clearAllData(): void {
    this.data = {
      userConfig: null,
      blockedSites: [],
      operationLogs: [],
      settings: {
        theme: 'system',
        language: 'zh-CN',
        sessionTimeout: 3600,
        autoStart: false
      }
    };
    this.saveData();
    console.log('All data cleared successfully');
  }

  /**
   * 重置用户配置
   */
  resetUserConfig(): void {
    this.data.userConfig = null;
    this.saveData();
    console.log('User config reset successfully');
  }

  /**
   * 转换用户配置字段名以匹配DAO期望的格式
   */
  private convertUserConfigToDAO(config: any): any {
    if (!config) return null;

    return {
      id: config.id,
      passwordHash: config.password_hash,
      salt: config.salt || '',
      sessionTimeout: config.sessionTimeout || 3600,
      autoStart: config.autoStart || false,
      theme: config.theme || 'system',
      language: config.language || 'zh-CN',
      createdAt: config.created_at,
      updatedAt: config.updated_at
    };
  }

  /**
   * 转换DAO格式的用户配置为文件存储格式
   */
  private convertUserConfigFromDAO(config: any): any {
    if (!config) return null;

    return {
      id: config.id || 1,
      password_hash: config.passwordHash,
      salt: config.salt,
      sessionTimeout: config.sessionTimeout,
      autoStart: config.autoStart,
      theme: config.theme,
      language: config.language,
      created_at: config.createdAt || new Date().toISOString(),
      updated_at: config.updatedAt || new Date().toISOString()
    };
  }

  // ==================== 网站黑名单管理 ====================

  /**
   * 生成唯一ID
   */
  generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 验证URL格式
   */
  private isValidUrl(url: string): boolean {
    try {
      // 更严格的URL验证
      if (!url || typeof url !== 'string') {
        return false;
      }

      // 检查是否包含基本的URL结构
      if (!url.includes('.') && !url.startsWith('http')) {
        return false;
      }

      const urlToTest = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(urlToTest);

      // 确保有有效的主机名
      return urlObj.hostname.length > 0 && urlObj.hostname.includes('.');
    } catch {
      return false;
    }
  }

  /**
   * 标准化URL
   */
  private normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  /**
   * 从URL提取域名
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * 添加网站到黑名单
   */
  addBlockedSite(siteData: {
    url: string;
    domain?: string;
    title?: string;
    description?: string;
    category?: string;
    enabled?: boolean;
    priority?: number;
  }): { success: boolean; data?: any; error?: string } {
    try {
      // 验证输入数据
      if (!siteData || !siteData.url) {
        throw new ValidationError('URL is required');
      }

      // 验证字段长度
      if (siteData.title && siteData.title.length > 255) {
        throw new ValidationError('Title too long (max 255 characters)');
      }
      if (siteData.description && siteData.description.length > 1000) {
        throw new ValidationError('Description too long (max 1000 characters)');
      }
      if (siteData.category && siteData.category.length > 50) {
        throw new ValidationError('Category name too long (max 50 characters)');
      }

      // 验证URL格式
      if (!this.isValidUrl(siteData.url)) {
        throw new ValidationError('Invalid URL format');
      }

      // 标准化URL和提取域名
      const normalizedUrl = this.normalizeUrl(siteData.url);
      const domain = siteData.domain || this.extractDomain(normalizedUrl);

      // 验证域名
      if (!this.isValidDomain(domain)) {
        throw new ValidationError(`Invalid domain: ${domain}`);
      }

      // 检查是否已存在
      const existingSite = this.data.blockedSites.find(site => site.url === normalizedUrl);
      if (existingSite) {
        throw new ValidationError(`Site ${normalizedUrl} already exists`);
      }

      // 创建网站记录
      const newSite = {
        id: this.generateId(),
        url: normalizedUrl,
        domain,
        title: siteData.title || '',
        description: siteData.description || '',
        category: siteData.category || 'general',
        enabled: siteData.enabled !== false,
        priority: siteData.priority || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.data.blockedSites.push(newSite);
      this.saveData();

      // 记录操作日志
      this.logOperation('add_blocked_site', true, { domain, url: normalizedUrl });

      return { success: true, data: newSite };
    } catch (error) {
      const appError = ErrorHandler.getInstance().handleError(error as Error, 'FileDatabase.addBlockedSite');
      this.logOperation('add_blocked_site', false, { url: siteData?.url }, { error: appError.message });
      return { success: false, error: appError.getUserMessage() };
    }
  }

  /**
   * 获取所有网站列表
   */
  getAllBlockedSites(options?: {
    enabled?: boolean;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): { success: boolean; data?: any[]; total?: number; error?: string } {
    try {
      let sites = [...this.data.blockedSites];

      // 应用过滤器
      if (options?.enabled !== undefined) {
        sites = sites.filter(site => site.enabled === options.enabled);
      }

      if (options?.category) {
        sites = sites.filter(site => site.category === options.category);
      }

      if (options?.search) {
        const searchTerm = options.search.toLowerCase();
        sites = sites.filter(site =>
          site.url.toLowerCase().includes(searchTerm) ||
          site.domain.toLowerCase().includes(searchTerm) ||
          site.title.toLowerCase().includes(searchTerm)
        );
      }

      // 排序：优先级高的在前，然后按创建时间
      sites.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // 分页
      const total = sites.length;
      if (options?.page && options?.limit) {
        const start = (options.page - 1) * options.limit;
        sites = sites.slice(start, start + options.limit);
      }

      return { success: true, data: sites, total };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 切换网站启用状态
   */
  toggleBlockedSite(siteId: string): { success: boolean; data?: any; error?: string } {
    try {
      // 验证输入
      if (!siteId) {
        throw new ValidationError('Site ID is required');
      }

      const siteIndex = this.data.blockedSites.findIndex(site => site.id === siteId);
      if (siteIndex === -1) {
        throw new ValidationError('Site not found');
      }

      const site = this.data.blockedSites[siteIndex];
      const previousState = site.enabled;
      site.enabled = !site.enabled;
      site.updatedAt = new Date().toISOString();

      this.saveData();

      // 记录操作日志
      this.logOperation('toggle_blocked_site', true, {
        siteId,
        domain: site.domain,
        previousState,
        newState: site.enabled
      });

      return { success: true, data: site };
    } catch (error) {
      const appError = ErrorHandler.getInstance().handleError(error as Error, 'FileDatabase.toggleBlockedSite');
      this.logOperation('toggle_blocked_site', false, { siteId }, { error: appError.message });
      return { success: false, error: appError.getUserMessage() };
    }
  }

  /**
   * 更新网站信息
   */
  updateBlockedSite(siteId: string, updates: {
    url?: string;
    title?: string;
    description?: string;
    category?: string;
    enabled?: boolean;
    priority?: number;
  }): { success: boolean; data?: any; error?: string } {
    try {
      // 验证输入
      if (!siteId) {
        throw new ValidationError('Site ID is required');
      }
      if (!updates || Object.keys(updates).length === 0) {
        throw new ValidationError('No updates provided');
      }

      // 验证字段长度
      if (updates.title && updates.title.length > 255) {
        throw new ValidationError('Title too long (max 255 characters)');
      }
      if (updates.description && updates.description.length > 1000) {
        throw new ValidationError('Description too long (max 1000 characters)');
      }
      if (updates.category && updates.category.length > 50) {
        throw new ValidationError('Category name too long (max 50 characters)');
      }

      const siteIndex = this.data.blockedSites.findIndex(site => site.id === siteId);
      if (siteIndex === -1) {
        throw new ValidationError('Site not found');
      }

      const site = this.data.blockedSites[siteIndex];
      const originalData = { ...site };

      // 如果更新URL，需要验证和标准化
      if (updates.url && updates.url !== site.url) {
        if (!this.isValidUrl(updates.url)) {
          throw new ValidationError('Invalid URL format');
        }

        const normalizedUrl = this.normalizeUrl(updates.url);
        const domain = this.extractDomain(normalizedUrl);

        if (!this.isValidDomain(domain)) {
          throw new ValidationError(`Invalid domain: ${domain}`);
        }

        const existingSite = this.data.blockedSites.find(s => s.url === normalizedUrl && s.id !== siteId);
        if (existingSite) {
          throw new ValidationError(`Site ${normalizedUrl} already exists`);
        }

        site.url = normalizedUrl;
        site.domain = domain;
      }

      // 更新其他字段
      if (updates.title !== undefined) site.title = updates.title;
      if (updates.description !== undefined) site.description = updates.description;
      if (updates.category !== undefined) site.category = updates.category;
      if (updates.enabled !== undefined) site.enabled = updates.enabled;
      if (updates.priority !== undefined) site.priority = updates.priority;

      site.updatedAt = new Date().toISOString();

      this.saveData();

      // 记录操作日志
      this.logOperation('update_blocked_site', true, {
        siteId,
        updates,
        originalData: { url: originalData.url, enabled: originalData.enabled }
      });

      return { success: true, data: site };
    } catch (error) {
      const appError = ErrorHandler.getInstance().handleError(error as Error, 'FileDatabase.updateBlockedSite');
      this.logOperation('update_blocked_site', false, { siteId, updates }, { error: appError.message });
      return { success: false, error: appError.getUserMessage() };
    }
  }

  /**
   * 删除网站
   */
  deleteBlockedSite(siteId: string): { success: boolean; error?: string } {
    try {
      const siteIndex = this.data.blockedSites.findIndex(site => site.id === siteId);
      if (siteIndex === -1) {
        return { success: false, error: 'Site not found' };
      }

      this.data.blockedSites.splice(siteIndex, 1);
      this.saveData();

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 检查URL是否被阻止
   */
  isUrlBlocked(url: string): { isBlocked: boolean; site?: any; reason?: string } {
    try {
      if (!this.isValidUrl(url)) {
        return { isBlocked: false, reason: 'Invalid URL' };
      }

      const normalizedUrl = this.normalizeUrl(url);
      const domain = this.extractDomain(normalizedUrl);

      // 首先检查完整URL匹配（包括路径）
      const exactMatch = this.data.blockedSites.find(site =>
        site.enabled && normalizedUrl.startsWith(site.url)
      );
      if (exactMatch) {
        return { isBlocked: true, site: exactMatch, reason: 'URL match' };
      }

      // 然后检查域名匹配
      const domainMatch = this.data.blockedSites.find(site =>
        site.enabled && (site.domain === domain || domain.endsWith('.' + site.domain))
      );
      if (domainMatch) {
        return { isBlocked: true, site: domainMatch, reason: 'Domain match' };
      }

      return { isBlocked: false };
    } catch (error) {
      return { isBlocked: false, reason: 'Check failed' };
    }
  }

  /**
   * 获取启用的网站列表
   */
  getEnabledBlockedSites(): { success: boolean; data?: any[]; error?: string } {
    return this.getAllBlockedSites({ enabled: true });
  }

  /**
   * 获取被阻止的域名列表
   */
  getBlockedDomains(): string[] {
    return this.data.blockedSites
      .filter(site => site.enabled)
      .map(site => site.domain);
  }

  // ==================== 操作日志管理 ====================

  /**
   * 记录操作日志
   */
  logOperation(action: string, success: boolean, details?: any, metadata?: any): void {
    const logEntry = {
      id: this.generateId(),
      action,
      success,
      details: details || {},
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    this.data.operationLogs.push(logEntry);
    this.saveData();
  }

  /**
   * 获取操作日志
   */
  getOperationLogs(options?: {
    action?: string;
    success?: boolean;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): { success: boolean; data?: any[]; total?: number; error?: string } {
    try {
      let logs = [...this.data.operationLogs];

      // 应用过滤器
      if (options?.action) {
        logs = logs.filter(log => log.action === options.action);
      }

      if (options?.success !== undefined) {
        logs = logs.filter(log => log.success === options.success);
      }

      if (options?.dateFrom) {
        const fromDate = new Date(options.dateFrom);
        logs = logs.filter(log => new Date(log.timestamp) >= fromDate);
      }

      if (options?.dateTo) {
        const toDate = new Date(options.dateTo);
        logs = logs.filter(log => new Date(log.timestamp) <= toDate);
      }

      if (options?.search) {
        const searchTerm = options.search.toLowerCase();
        logs = logs.filter(log =>
          log.action.toLowerCase().includes(searchTerm) ||
          JSON.stringify(log.details).toLowerCase().includes(searchTerm) ||
          JSON.stringify(log.metadata).toLowerCase().includes(searchTerm)
        );
      }

      // 排序：最新的在前
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // 分页
      const total = logs.length;
      if (options?.page && options?.limit) {
        const start = (options.page - 1) * options.limit;
        logs = logs.slice(start, start + options.limit);
      }

      return { success: true, data: logs, total };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 清除所有操作日志
   */
  clearOperationLogs(): { success: boolean; error?: string } {
    try {
      this.data.operationLogs = [];
      this.saveData();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 清理旧日志
   */
  cleanupOldLogs(retentionDays: number): { success: boolean; data?: { deletedCount: number }; error?: string } {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const originalCount = this.data.operationLogs.length;
      this.data.operationLogs = this.data.operationLogs.filter(log =>
        new Date(log.timestamp) >= cutoffDate
      );

      const deletedCount = originalCount - this.data.operationLogs.length;

      if (deletedCount > 0) {
        this.saveData();
      }

      return { success: true, data: { deletedCount } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 获取日志统计信息
   */
  getLogStatistics(options?: {
    dateFrom?: string;
    dateTo?: string;
  }): { success: boolean; data?: any; error?: string } {
    try {
      let logs = [...this.data.operationLogs];

      // 应用日期过滤器
      if (options?.dateFrom) {
        const fromDate = new Date(options.dateFrom);
        logs = logs.filter(log => new Date(log.timestamp) >= fromDate);
      }

      if (options?.dateTo) {
        const toDate = new Date(options.dateTo);
        logs = logs.filter(log => new Date(log.timestamp) <= toDate);
      }

      const total = logs.length;
      const successful = logs.filter(log => log.success).length;
      const failed = total - successful;

      // 按操作类型统计
      const actionCounts: { [key: string]: number } = {};
      logs.forEach(log => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      });

      return {
        success: true,
        data: {
          total,
          successful,
          failed,
          actionCounts
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
}
