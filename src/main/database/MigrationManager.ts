import { Database } from 'better-sqlite3';
import { Migration001InitialSchema } from './migrations/001_initial_schema';

/**
 * 数据库迁移管理器
 * 负责管理数据库版本和执行迁移
 */
export class MigrationManager {
  private db: Database;
  private migrations: Map<string, any> = new Map();

  constructor(db: Database) {
    this.db = db;
    this.registerMigrations();
  }

  /**
   * 注册所有迁移
   */
  private registerMigrations(): void {
    this.migrations.set('001', Migration001InitialSchema);
  }

  /**
   * 初始化迁移表
   */
  private initializeMigrationTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER,
        checksum TEXT
      )
    `);
  }

  /**
   * 获取当前数据库版本
   */
  getCurrentVersion(): string | null {
    try {
      const result = this.db.prepare(`
        SELECT version FROM schema_migrations 
        ORDER BY version DESC 
        LIMIT 1
      `).get() as { version: string } | undefined;

      return result?.version || null;
    } catch (error) {
      // 如果表不存在，返回null
      return null;
    }
  }

  /**
   * 获取所有已执行的迁移
   */
  getExecutedMigrations(): string[] {
    try {
      const results = this.db.prepare(`
        SELECT version FROM schema_migrations 
        ORDER BY version ASC
      `).all() as { version: string }[];

      return results.map(r => r.version);
    } catch (error) {
      return [];
    }
  }

  /**
   * 检查是否需要迁移
   */
  needsMigration(): boolean {
    const currentVersion = this.getCurrentVersion();
    const availableVersions = Array.from(this.migrations.keys()).sort();
    const latestVersion = availableVersions[availableVersions.length - 1];

    return currentVersion !== latestVersion;
  }

  /**
   * 执行所有待执行的迁移
   */
  async migrate(): Promise<void> {
    console.log('Starting database migration...');

    // 初始化迁移表
    this.initializeMigrationTable();

    const executedMigrations = this.getExecutedMigrations();
    const availableVersions = Array.from(this.migrations.keys()).sort();

    console.log('Migration status:');
    console.log('- Available versions:', availableVersions);
    console.log('- Executed migrations:', executedMigrations);

    // 找出需要执行的迁移
    const pendingMigrations = availableVersions.filter(
      version => !executedMigrations.includes(version)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations found');

      // 验证数据库结构是否正确
      await this.validateDatabaseStructure();
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migrations:`, pendingMigrations);

    // 执行每个待执行的迁移
    for (const version of pendingMigrations) {
      await this.executeMigration(version);
    }

    console.log('Database migration completed successfully');
  }

  /**
   * 执行单个迁移
   */
  private async executeMigration(version: string): Promise<void> {
    const MigrationClass = this.migrations.get(version);
    if (!MigrationClass) {
      throw new Error(`Migration ${version} not found`);
    }

    const migration = new MigrationClass(this.db);
    const startTime = Date.now();

    try {
      console.log(`Executing migration ${version}: ${migration.getDescription()}`);

      // 执行迁移
      await migration.up();

      const executionTime = Date.now() - startTime;

      // 记录迁移执行
      this.db.prepare(`
        INSERT INTO schema_migrations (version, description, execution_time_ms)
        VALUES (?, ?, ?)
      `).run(version, migration.getDescription(), executionTime);

      console.log(`Migration ${version} completed in ${executionTime}ms`);
    } catch (error) {
      console.error(`Migration ${version} failed:`, error);
      throw error;
    }
  }

  /**
   * 回滚到指定版本
   */
  async rollbackTo(targetVersion: string): Promise<void> {
    console.log(`Rolling back to version ${targetVersion}...`);

    const executedMigrations = this.getExecutedMigrations();
    const migrationsToRollback = executedMigrations
      .filter(version => version > targetVersion)
      .sort()
      .reverse(); // 按版本号倒序回滚

    if (migrationsToRollback.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    console.log(`Rolling back ${migrationsToRollback.length} migrations:`, migrationsToRollback);

    // 执行回滚
    for (const version of migrationsToRollback) {
      await this.rollbackMigration(version);
    }

    console.log(`Rollback to version ${targetVersion} completed`);
  }

  /**
   * 回滚单个迁移
   */
  private async rollbackMigration(version: string): Promise<void> {
    const MigrationClass = this.migrations.get(version);
    if (!MigrationClass) {
      throw new Error(`Migration ${version} not found`);
    }

    const migration = new MigrationClass(this.db);

    try {
      console.log(`Rolling back migration ${version}: ${migration.getDescription()}`);

      // 执行回滚
      await migration.down();

      // 从迁移记录中删除
      this.db.prepare(`
        DELETE FROM schema_migrations WHERE version = ?
      `).run(version);

      console.log(`Migration ${version} rolled back successfully`);
    } catch (error) {
      console.error(`Rollback of migration ${version} failed:`, error);
      throw error;
    }
  }

  /**
   * 验证数据库结构是否正确
   */
  private async validateDatabaseStructure(): Promise<void> {
    console.log('Validating database structure...');

    try {
      // 检查operation_logs表是否有action列
      const actionColumnExists = this.db.prepare(`
        SELECT COUNT(*) as count FROM pragma_table_info('operation_logs')
        WHERE name = 'action'
      `).get() as { count: number };

      if (actionColumnExists.count === 0) {
        console.log('Database structure is invalid: operation_logs table missing action column');
        console.log('Forcing migration re-execution...');

        // 删除迁移记录，强制重新执行迁移
        this.db.exec('DELETE FROM schema_migrations');

        // 重新执行迁移
        await this.migrate();
        return;
      }

      // 检查operation_logs表是否有timestamp列
      const timestampColumnExists = this.db.prepare(`
        SELECT COUNT(*) as count FROM pragma_table_info('operation_logs')
        WHERE name = 'timestamp'
      `).get() as { count: number };

      if (timestampColumnExists.count === 0) {
        console.log('Database structure is invalid: operation_logs table missing timestamp column');
        console.log('Forcing migration re-execution...');

        // 删除迁移记录，强制重新执行迁移
        this.db.exec('DELETE FROM schema_migrations');

        // 重新执行迁移
        await this.migrate();
        return;
      }

      console.log('Database structure validation passed');
    } catch (error) {
      console.error('Database structure validation failed:', error);
      throw error;
    }
  }

  /**
   * 获取迁移状态信息
   */
  getMigrationStatus(): {
    currentVersion: string | null;
    latestVersion: string;
    needsMigration: boolean;
    executedMigrations: string[];
    pendingMigrations: string[];
  } {
    const currentVersion = this.getCurrentVersion();
    const executedMigrations = this.getExecutedMigrations();
    const availableVersions = Array.from(this.migrations.keys()).sort();
    const latestVersion = availableVersions[availableVersions.length - 1];
    const pendingMigrations = availableVersions.filter(
      version => !executedMigrations.includes(version)
    );

    return {
      currentVersion,
      latestVersion,
      needsMigration: this.needsMigration(),
      executedMigrations,
      pendingMigrations
    };
  }
}
