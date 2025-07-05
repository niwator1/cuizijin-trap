import { DatabaseManager } from './DatabaseManager';
import { AuthService } from './services/AuthService';
import { BlockedSiteService } from './services/BlockedSiteService';
import { LoggingService } from './services/LoggingService';

/**
 * 数据库服务统一入口
 * 提供所有数据库相关功能的统一访问接口
 */
export class DatabaseService {
  private databaseManager: DatabaseManager;
  private authService: AuthService | null = null;
  private blockedSiteService: BlockedSiteService | null = null;
  private loggingService: LoggingService | null = null;

  constructor() {
    this.databaseManager = new DatabaseManager();
  }

  /**
   * 初始化数据库服务
   */
  async initialize(): Promise<void> {
    // 初始化数据库管理器
    await this.databaseManager.initialize();

    // 确保数据库已准备就绪
    if (!this.databaseManager.isReady()) {
      throw new Error('Database is not ready');
    }

    // 初始化各个服务
    this.initializeServices();
  }

  /**
   * 初始化各个服务
   */
  private initializeServices(): void {
    const { userDAO, blockedSiteDAO, operationLogDAO, interceptStatsDAO, appConfigDAO } = this.databaseManager;

    if (!userDAO || !blockedSiteDAO || !operationLogDAO || !interceptStatsDAO || !appConfigDAO) {
      throw new Error('Database DAOs are not initialized');
    }

    // 初始化认证服务
    this.authService = new AuthService(userDAO, operationLogDAO);

    // 初始化网站管理服务
    this.blockedSiteService = new BlockedSiteService(blockedSiteDAO, operationLogDAO, interceptStatsDAO);

    // 初始化日志服务
    this.loggingService = new LoggingService(operationLogDAO, appConfigDAO);
  }

  /**
   * 获取认证服务
   */
  getAuthService(): AuthService {
    if (!this.authService) {
      throw new Error('Auth service is not initialized');
    }
    return this.authService;
  }

  /**
   * 获取网站管理服务
   */
  getBlockedSiteService(): BlockedSiteService {
    if (!this.blockedSiteService) {
      throw new Error('Blocked site service is not initialized');
    }
    return this.blockedSiteService;
  }

  /**
   * 获取日志服务
   */
  getLoggingService(): LoggingService {
    if (!this.loggingService) {
      throw new Error('Logging service is not initialized');
    }
    return this.loggingService;
  }

  /**
   * 获取数据库管理器
   */
  getDatabaseManager(): DatabaseManager {
    return this.databaseManager;
  }

  /**
   * 获取数据库实例
   * 为了兼容性，提供直接访问数据库的方法
   */
  async getDatabase(): Promise<any> {
    if (!this.databaseManager.isReady()) {
      throw new Error('Database is not ready');
    }

    const db = this.databaseManager.getDatabase();

    // 如果是FileDatabase，返回一个兼容的包装器
    if (db && typeof (db as any).clearAllData === 'function') {
      const fileDb = db as any;
      return {
        ...db,
        // 添加一些SQLite兼容的方法
        pragma: () => {},
        prepare: (sql: string) => ({
          all: (...params: any[]) => fileDb.queryAll(sql, params),
          get: (...params: any[]) => fileDb.queryOne(sql, params),
          run: (...params: any[]) => fileDb.execute(sql, params)
        })
      };
    }

    return db;
  }

  /**
   * 获取数据访问对象
   */
  getDAOs() {
    return {
      userDAO: this.databaseManager.userDAO,
      blockedSiteDAO: this.databaseManager.blockedSiteDAO,
      operationLogDAO: this.databaseManager.operationLogDAO,
      interceptStatsDAO: this.databaseManager.interceptStatsDAO,
      appConfigDAO: this.databaseManager.appConfigDAO
    };
  }

  /**
   * 检查数据库是否已初始化
   */
  isInitialized(): boolean {
    return this.databaseManager.isReady() && 
           this.authService !== null && 
           this.blockedSiteService !== null && 
           this.loggingService !== null;
  }

  /**
   * 获取数据库状态
   */
  async getStatus(): Promise<{
    isInitialized: boolean;
    databaseStatus: any;
    serviceStatus: {
      auth: boolean;
      blockedSite: boolean;
      logging: boolean;
    };
  }> {
    const databaseStatus = await this.databaseManager.getStatus();
    
    return {
      isInitialized: this.isInitialized(),
      databaseStatus,
      serviceStatus: {
        auth: this.authService !== null,
        blockedSite: this.blockedSiteService !== null,
        logging: this.loggingService !== null
      }
    };
  }

  /**
   * 备份数据库
   */
  async backup(backupPath?: string): Promise<string> {
    return await this.databaseManager.backup(backupPath);
  }

  /**
   * 重置数据库
   */
  async reset(): Promise<void> {
    // 先销毁服务
    await this.destroy();
    
    // 重置数据库
    await this.databaseManager.reset();
    
    // 重新初始化服务
    this.initializeServices();
  }

  /**
   * 执行数据库维护
   */
  async performMaintenance(): Promise<{
    logsCleanedUp: number;
    statsCleanedUp: number;
    databaseOptimized: boolean;
  }> {
    let logsCleanedUp = 0;
    let statsCleanedUp = 0;
    let databaseOptimized = false;

    try {
      // 清理日志
      if (this.loggingService) {
        logsCleanedUp = await this.loggingService.cleanupLogs();
      }

      // 清理统计数据
      if (this.databaseManager.interceptStatsDAO) {
        const retentionDays = await this.databaseManager.appConfigDAO!.getNumber('stats_retention_days', 90);
        statsCleanedUp = await this.databaseManager.interceptStatsDAO.cleanupOldStats(retentionDays);
      }

      // 优化数据库
      const db = this.databaseManager.getDatabase();
      db.pragma('optimize');
      databaseOptimized = true;

      // 记录维护日志
      if (this.loggingService) {
        await this.loggingService.logSystemAction('database_maintenance', true, {
          logsCleanedUp,
          statsCleanedUp,
          databaseOptimized
        });
      }

    } catch (error) {
      console.error('Database maintenance failed:', error);
      
      if (this.loggingService) {
        await this.loggingService.logSystemAction('database_maintenance', false, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      logsCleanedUp,
      statsCleanedUp,
      databaseOptimized
    };
  }

  /**
   * 获取统计信息（别名方法）
   */
  async getStats(): Promise<{
    database: any;
    sites: any;
    logs: any;
    auth: any;
  }> {
    return await this.getStatistics();
  }

  /**
   * 获取数据库统计信息
   */
  async getStatistics(): Promise<{
    database: any;
    sites: any;
    logs: any;
    auth: any;
  }> {
    const databaseStatus = await this.databaseManager.getStatus();
    
    let siteStats = null;
    let logStats = null;
    let authStats = null;

    try {
      if (this.blockedSiteService) {
        siteStats = await this.blockedSiteService.getStats();
      }

      if (this.loggingService) {
        logStats = await this.loggingService.getLogStats();
      }

      if (this.authService) {
        authStats = this.authService.getSessionStats();
      }
    } catch (error) {
      console.error('Failed to get statistics:', error);
    }

    return {
      database: databaseStatus,
      sites: siteStats,
      logs: logStats,
      auth: authStats
    };
  }

  /**
   * 导出数据
   */
  async exportData(options: {
    includeSites?: boolean;
    includeLogs?: boolean;
    includeStats?: boolean;
    format?: 'json' | 'csv';
    dateFrom?: Date;
    dateTo?: Date;
  } = {}): Promise<{
    sites?: string;
    logs?: string;
    metadata: any;
  }> {
    const result: any = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        options
      }
    };

    try {
      if (options.includeSites && this.blockedSiteService) {
        result.sites = await this.blockedSiteService.exportSites(options.format || 'json');
      }

      if (options.includeLogs && this.loggingService) {
        result.logs = await this.loggingService.exportLogs({
          format: options.format || 'json',
          dateFrom: options.dateFrom,
          dateTo: options.dateTo
        });
      }

      // 记录导出操作
      if (this.loggingService) {
        await this.loggingService.logSystemAction('data_export', true, options);
      }

    } catch (error) {
      console.error('Data export failed:', error);
      
      if (this.loggingService) {
        await this.loggingService.logSystemAction('data_export', false, {
          error: error instanceof Error ? error.message : 'Unknown error',
          options
        });
      }
      
      throw error;
    }

    return result;
  }

  /**
   * 获取应用配置
   */
  async getConfig(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!this.databaseManager.isReady()) {
        throw new Error('Database is not ready');
      }

      const appConfigDAO = this.databaseManager.appConfigDAO;
      if (!appConfigDAO) {
        throw new Error('AppConfig DAO is not available');
      }

      const config = await appConfigDAO.getConfig();

      return {
        success: true,
        data: config
      };
    } catch (error) {
      console.error('Get config error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get config'
      };
    }
  }

  /**
   * 更新应用配置
   */
  async updateConfig(config: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.databaseManager.isReady()) {
        throw new Error('Database is not ready');
      }

      const appConfigDAO = this.databaseManager.appConfigDAO;
      if (!appConfigDAO) {
        throw new Error('AppConfig DAO is not available');
      }

      await appConfigDAO.updateConfig(config);

      // 记录操作日志
      if (this.loggingService) {
        await this.loggingService.logSystemAction('config_update', true, { config });
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Update config error:', error);

      // 记录错误日志
      if (this.loggingService) {
        await this.loggingService.logSystemAction('config_update', false, {
          error: error instanceof Error ? error.message : 'Unknown error',
          config
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update config'
      };
    }
  }

  /**
   * 重置应用配置
   */
  async resetConfig(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.databaseManager.isReady()) {
        throw new Error('Database is not ready');
      }

      const appConfigDAO = this.databaseManager.appConfigDAO;
      if (!appConfigDAO) {
        throw new Error('AppConfig DAO is not available');
      }

      await appConfigDAO.resetConfig();

      // 记录操作日志
      if (this.loggingService) {
        await this.loggingService.logSystemAction('config_reset', true);
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Reset config error:', error);

      // 记录错误日志
      if (this.loggingService) {
        await this.loggingService.logSystemAction('config_reset', false, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset config'
      };
    }
  }

  /**
   * 清除所有数据
   */
  async clearAllData(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.databaseManager.isReady()) {
        throw new Error('Database is not ready');
      }

      // 清除网站数据
      if (this.blockedSiteService) {
        await this.blockedSiteService.clearAll();
      }

      // 清除日志数据
      if (this.loggingService) {
        await this.loggingService.clearAllLogs();
      }

      // 记录操作日志（在清除之前）
      if (this.loggingService) {
        await this.loggingService.logSystemAction('data_clear_all', true);
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Clear all data error:', error);

      // 记录错误日志
      if (this.loggingService) {
        await this.loggingService.logSystemAction('data_clear_all', false, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear all data'
      };
    }
  }

  /**
   * 关闭数据库服务
   */
  async close(): Promise<void> {
    await this.destroy();
    await this.databaseManager.close();
  }

  /**
   * 销毁服务
   */
  private async destroy(): Promise<void> {
    try {
      // 销毁日志服务
      if (this.loggingService) {
        await this.loggingService.destroy();
        this.loggingService = null;
      }

      // 销毁认证服务
      if (this.authService) {
        this.authService.destroy();
        this.authService = null;
      }

      // 网站服务不需要特殊销毁
      this.blockedSiteService = null;

    } catch (error) {
      console.error('Error destroying database services:', error);
    }
  }
}
