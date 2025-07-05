import { Database } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

/**
 * 初始数据库Schema迁移
 * 版本: 001
 * 描述: 创建初始数据库表结构和索引
 */
export class Migration001InitialSchema {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * 执行迁移
   */
  async up(): Promise<void> {
    console.log('=== Running migration 001: Initial Schema ===');
    console.log('Current working directory:', process.cwd());
    console.log('__dirname:', __dirname);
    console.log('Node.js version:', process.version);
    console.log('Platform:', process.platform);

    // 读取schema.sql文件
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    console.log('Looking for schema file at:', schemaPath);

    // 检查目录结构
    try {
      console.log('Contents of __dirname:', fs.readdirSync(__dirname));
      if (fs.existsSync(path.join(__dirname, 'database'))) {
        console.log('Contents of database directory:', fs.readdirSync(path.join(__dirname, 'database')));
      } else {
        console.log('Database directory does not exist');
      }
    } catch (error) {
      console.error('Error reading directory:', error);
    }

    if (!fs.existsSync(schemaPath)) {
      console.error('Schema file not found at:', schemaPath);
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Schema file read successfully');
    console.log('Schema file size:', schemaSql.length, 'characters');
    console.log('First 200 characters of schema:', schemaSql.substring(0, 200));

    // 检查数据库连接状态
    console.log('Database connection info:');
    console.log('- Database open:', this.db.open);
    console.log('- Database readonly:', this.db.readonly);
    console.log('- Database name:', this.db.name);

    // 直接执行整个schema文件，SQLite可以处理多个语句
    try {
      console.log('Executing schema SQL...');
      this.db.exec(schemaSql);
      console.log('Schema SQL executed successfully');
    } catch (error) {
      console.error('Error executing schema SQL:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      throw error;
    }

    // 验证表是否创建成功
    await this.validateTables();

    console.log('Migration 001 completed successfully');
  }

  /**
   * 回滚迁移
   */
  async down(): Promise<void> {
    console.log('Rolling back migration 001: Initial Schema');

    const transaction = this.db.transaction(() => {
      // 删除视图
      this.db.exec('DROP VIEW IF EXISTS top_blocked_sites');
      this.db.exec('DROP VIEW IF EXISTS daily_stats');
      this.db.exec('DROP VIEW IF EXISTS active_blocked_sites');

      // 删除触发器
      this.db.exec('DROP TRIGGER IF EXISTS update_app_config_timestamp');
      this.db.exec('DROP TRIGGER IF EXISTS update_blocked_sites_timestamp');
      this.db.exec('DROP TRIGGER IF EXISTS update_user_config_timestamp');

      // 删除索引
      this.db.exec('DROP INDEX IF EXISTS idx_app_config_key');
      this.db.exec('DROP INDEX IF EXISTS idx_intercept_stats_date');
      this.db.exec('DROP INDEX IF EXISTS idx_intercept_stats_domain');
      this.db.exec('DROP INDEX IF EXISTS idx_operation_logs_target');
      this.db.exec('DROP INDEX IF EXISTS idx_operation_logs_timestamp');
      this.db.exec('DROP INDEX IF EXISTS idx_operation_logs_action');
      this.db.exec('DROP INDEX IF EXISTS idx_blocked_sites_category');
      this.db.exec('DROP INDEX IF EXISTS idx_blocked_sites_enabled');
      this.db.exec('DROP INDEX IF EXISTS idx_blocked_sites_domain');

      // 删除表
      this.db.exec('DROP TABLE IF EXISTS app_config');
      this.db.exec('DROP TABLE IF EXISTS intercept_stats');
      this.db.exec('DROP TABLE IF EXISTS operation_logs');
      this.db.exec('DROP TABLE IF EXISTS blocked_sites');
      this.db.exec('DROP TABLE IF EXISTS user_config');
    });

    transaction();

    console.log('Migration 001 rollback completed');
  }

  /**
   * 分割SQL语句
   */
  private splitSqlStatements(sql: string): string[] {
    // 移除注释
    const cleanSql = sql
      .replace(/--.*$/gm, '') // 移除单行注释
      .replace(/\/\*[\s\S]*?\*\//g, ''); // 移除多行注释

    // 按分号分割语句
    const statements = cleanSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    return statements;
  }

  /**
   * 验证表是否创建成功
   */
  private async validateTables(): Promise<void> {
    const expectedTables = [
      'user_config',
      'blocked_sites',
      'operation_logs',
      'intercept_stats',
      'app_config'
    ];

    const expectedViews = [
      'active_blocked_sites',
      'daily_stats',
      'top_blocked_sites'
    ];

    // 检查表
    for (const tableName of expectedTables) {
      const result = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `).get(tableName);

      if (!result) {
        throw new Error(`Table ${tableName} was not created`);
      }
    }

    // 检查视图
    for (const viewName of expectedViews) {
      const result = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='view' AND name=?
      `).get(viewName);

      if (!result) {
        throw new Error(`View ${viewName} was not created`);
      }
    }

    // 检查默认配置是否插入
    const configCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM app_config
    `).get() as { count: number };

    if (configCount.count === 0) {
      throw new Error('Default app configuration was not inserted');
    }

    console.log('All tables, views, and default data validated successfully');
  }

  /**
   * 获取迁移版本
   */
  getVersion(): string {
    return '001';
  }

  /**
   * 获取迁移描述
   */
  getDescription(): string {
    return 'Initial database schema with user config, blocked sites, operation logs, and statistics';
  }
}
