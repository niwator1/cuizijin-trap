import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { MigrationManager } from './MigrationManager';
import { FileDatabase } from './FileDatabase';
import { UserDAO } from './models/UserDAO';
import { BlockedSiteDAO } from './models/BlockedSiteDAO';
import { OperationLogDAO } from './models/OperationLogDAO';
import { InterceptStatsDAO } from './models/InterceptStatsDAO';
import { AppConfigDAO } from './models/AppConfigDAO';
import { DATABASE_NAME, CONFIG_DIR } from '@shared/constants';

/**
 * 数据库管理器
 * 负责数据库连接、初始化、迁移和提供数据访问对象
 */
export class DatabaseManager {
  private db: Database.Database | null = null;
  private migrationManager: MigrationManager | null = null;
  private isInitialized = false;

  // 数据访问对象
  public userDAO: UserDAO | null = null;
  public blockedSiteDAO: BlockedSiteDAO | null = null;
  public operationLogDAO: OperationLogDAO | null = null;
  public interceptStatsDAO: InterceptStatsDAO | null = null;
  public appConfigDAO: AppConfigDAO | null = null;

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Database already initialized');
      return;
    }

    try {
      console.log('Initializing database...');

      // 尝试使用better-sqlite3，如果失败则使用备选方案
      const dbPath = this.getDatabasePath();
      const dbDir = path.dirname(dbPath);

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`Created database directory: ${dbDir}`);
      }

      try {
        // 尝试使用better-sqlite3
        this.db = new Database(dbPath, {
          verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
        });

        // 配置数据库
        this.configureDatabase();

        // 初始化迁移管理器
        this.migrationManager = new MigrationManager(this.db);

        // 执行数据库迁移
        await this.migrationManager.migrate();

        console.log('Database initialized with better-sqlite3');
      } catch (sqliteError) {
        console.error('Failed to initialize with better-sqlite3:', sqliteError);
        console.log('Falling back to FileDatabase...');

        // 备选方案：使用FileDatabase
        this.db = new FileDatabase() as any;
        console.log('Database initialized with FileDatabase');

        // 确保FileDatabase也正确初始化
        if (this.db && typeof (this.db as any).clearAllData === 'function') {
          console.log('FileDatabase fallback ready');
        }
      }

      // 初始化数据访问对象
      this.initializeDAOs();

      // 执行数据库维护
      await this.performMaintenance();

      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }



  /**
   * 配置数据库
   */
  private configureDatabase(): void {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    // 启用外键约束
    this.db.pragma('foreign_keys = ON');

    // 设置WAL模式以提高并发性能
    this.db.pragma('journal_mode = WAL');

    // 设置同步模式
    this.db.pragma('synchronous = NORMAL');

    // 设置缓存大小（10MB）
    this.db.pragma('cache_size = -10000');

    // 设置临时存储为内存
    this.db.pragma('temp_store = MEMORY');

    // 设置mmap大小（256MB）
    this.db.pragma('mmap_size = 268435456');

    console.log('Database configured with optimized settings');
  }

  /**
   * 初始化数据访问对象
   */
  private initializeDAOs(): void {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    this.userDAO = new UserDAO(this.db);
    this.blockedSiteDAO = new BlockedSiteDAO(this.db);
    this.operationLogDAO = new OperationLogDAO(this.db);
    this.interceptStatsDAO = new InterceptStatsDAO(this.db);
    this.appConfigDAO = new AppConfigDAO(this.db);

    console.log('Data access objects initialized');
  }

  /**
   * 执行数据库维护
   */
  private async performMaintenance(): Promise<void> {
    if (!this.db || !this.operationLogDAO || !this.appConfigDAO) {
      return;
    }

    try {
      // 清理过期日志
      const logRetentionDays = await this.appConfigDAO.getNumber('log_retention_days', 30);
      const maxLogEntries = await this.appConfigDAO.getNumber('max_log_entries', 10000);
      
      await this.operationLogDAO.cleanupOldLogs(logRetentionDays, maxLogEntries);

      // 优化数据库
      this.db.pragma('optimize');

      console.log('Database maintenance completed');
    } catch (error) {
      console.error('Database maintenance failed:', error);
    }
  }

  /**
   * 获取数据库文件路径
   */
  private getDatabasePath(): string {
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, CONFIG_DIR);
    return path.join(configPath, DATABASE_NAME);
  }

  /**
   * 获取数据库连接
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * 检查数据库是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * 获取数据库状态信息
   */
  async getStatus(): Promise<{
    isConnected: boolean;
    isInitialized: boolean;
    databasePath: string;
    databaseSize: number;
    migrationStatus: any;
    tableCount: number;
    recordCounts: Record<string, number>;
  }> {
    const databasePath = this.getDatabasePath();
    let databaseSize = 0;
    let tableCount = 0;
    let recordCounts: Record<string, number> = {};

    try {
      if (fs.existsSync(databasePath)) {
        databaseSize = fs.statSync(databasePath).size;
      }

      if (this.db) {
        // 获取表数量
        const tables = this.db.prepare(`
          SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'
        `).get() as { count: number };
        tableCount = tables.count;

        // 获取各表记录数量
        const tableNames = ['user_config', 'blocked_sites', 'operation_logs', 'intercept_stats', 'app_config'];
        for (const tableName of tableNames) {
          try {
            const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
            recordCounts[tableName] = result.count;
          } catch (error) {
            recordCounts[tableName] = 0;
          }
        }
      }
    } catch (error) {
      console.error('Error getting database status:', error);
    }

    return {
      isConnected: this.db !== null,
      isInitialized: this.isInitialized,
      databasePath,
      databaseSize,
      migrationStatus: this.migrationManager?.getMigrationStatus() || null,
      tableCount,
      recordCounts
    };
  }

  /**
   * 备份数据库
   */
  async backup(backupPath?: string): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultBackupPath = backupPath || path.join(
      path.dirname(this.getDatabasePath()),
      'backups',
      `backup-${timestamp}.db`
    );

    // 创建备份目录
    const backupDir = path.dirname(defaultBackupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 执行备份
    await this.db.backup(defaultBackupPath);

    console.log(`Database backed up to: ${defaultBackupPath}`);
    return defaultBackupPath;
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db) {
      try {
        // 执行最后的维护操作
        this.db.pragma('optimize');
        
        // 关闭连接
        this.db.close();
        this.db = null;
        this.isInitialized = false;
        
        // 清理DAO引用
        this.userDAO = null;
        this.blockedSiteDAO = null;
        this.operationLogDAO = null;
        this.interceptStatsDAO = null;
        this.appConfigDAO = null;
        this.migrationManager = null;

        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing database:', error);
        throw error;
      }
    }
  }

  /**
   * 重置数据库（危险操作）
   */
  async reset(): Promise<void> {
    console.warn('Resetting database - all data will be lost!');

    // 关闭当前连接
    await this.close();

    // 删除数据库文件
    const dbPath = this.getDatabasePath();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('Database file deleted');
    }

    // 重新初始化
    await this.initialize();
    console.log('Database reset completed');
  }
}
