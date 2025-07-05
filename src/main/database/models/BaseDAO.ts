import Database, { Database as DatabaseType } from 'better-sqlite3';

/**
 * 基础数据访问对象
 * 提供通用的数据库操作方法
 */
export abstract class BaseDAO {
  protected db: DatabaseType;

  constructor(db: DatabaseType) {
    this.db = db;
  }

  /**
   * 执行事务
   */
  protected transaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  /**
   * 获取当前时间戳
   */
  protected getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * 转换数据库行为对象
   */
  protected mapRow<T>(row: any): T {
    if (!row) return row;

    // 转换日期字段
    const result = { ...row };
    for (const [key, value] of Object.entries(result)) {
      if (key.endsWith('_at') && typeof value === 'string') {
        result[key] = new Date(value);
      }
    }

    return result as T;
  }

  /**
   * 转换多行数据
   */
  protected mapRows<T>(rows: any[]): T[] {
    return rows.map(row => this.mapRow<T>(row));
  }

  /**
   * 构建WHERE子句
   */
  protected buildWhereClause(conditions: Record<string, any>): { clause: string; params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(conditions)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          clauses.push(`${key} IN (${value.map(() => '?').join(', ')})`);
          params.push(...value);
        } else {
          clauses.push(`${key} = ?`);
          params.push(value);
        }
      }
    }

    return {
      clause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
      params
    };
  }

  /**
   * 构建UPDATE SET子句
   */
  protected buildSetClause(data: Record<string, any>): { clause: string; params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        clauses.push(`${key} = ?`);
        params.push(value);
      }
    }

    return {
      clause: clauses.join(', '),
      params
    };
  }

  /**
   * 构建INSERT子句
   */
  protected buildInsertClause(data: Record<string, any>): { 
    columns: string; 
    placeholders: string; 
    params: any[] 
  } {
    const columns: string[] = [];
    const placeholders: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        columns.push(key);
        placeholders.push('?');
        params.push(value);
      }
    }

    return {
      columns: columns.join(', '),
      placeholders: placeholders.join(', '),
      params
    };
  }

  /**
   * 分页查询
   */
  protected buildPaginationClause(page?: number, limit?: number): { clause: string; params: any[] } {
    if (!page || !limit) {
      return { clause: '', params: [] };
    }

    const offset = (page - 1) * limit;
    return {
      clause: 'LIMIT ? OFFSET ?',
      params: [limit, offset]
    };
  }

  /**
   * 排序子句
   */
  protected buildOrderClause(orderBy?: string, order?: 'ASC' | 'DESC'): string {
    if (!orderBy) return '';
    
    const direction = order || 'ASC';
    return `ORDER BY ${orderBy} ${direction}`;
  }

  /**
   * 检查记录是否存在
   */
  protected exists(tableName: string, conditions: Record<string, any>): boolean {
    const { clause, params } = this.buildWhereClause(conditions);
    const sql = `SELECT 1 FROM ${tableName} ${clause} LIMIT 1`;
    
    const result = this.db.prepare(sql).get(...params);
    return !!result;
  }

  /**
   * 获取记录数量
   */
  protected count(tableName: string, conditions: Record<string, any> = {}): number {
    const { clause, params } = this.buildWhereClause(conditions);
    const sql = `SELECT COUNT(*) as count FROM ${tableName} ${clause}`;
    
    const result = this.db.prepare(sql).get(...params) as { count: number };
    return result.count;
  }

  /**
   * 通用删除方法
   */
  protected delete(tableName: string, conditions: Record<string, any>): number {
    const { clause, params } = this.buildWhereClause(conditions);
    
    if (!clause) {
      throw new Error('Delete operation requires WHERE conditions');
    }

    const sql = `DELETE FROM ${tableName} ${clause}`;
    const result = this.db.prepare(sql).run(...params);
    return result.changes;
  }

  /**
   * 获取表的最后插入ID
   */
  protected getLastInsertId(): number {
    const result = this.db.prepare('SELECT last_insert_rowid() as id').get() as { id: number };
    return result.id;
  }

  /**
   * 执行原始SQL查询
   */
  protected query<T = any>(sql: string, params: any[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  /**
   * 执行原始SQL查询（单行）
   */
  protected queryOne<T = any>(sql: string, params: any[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  /**
   * 执行原始SQL命令
   */
  protected execute(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number | bigint } {
    const result = this.db.prepare(sql).run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: typeof result.lastInsertRowid === 'bigint' ? Number(result.lastInsertRowid) : result.lastInsertRowid
    };
  }
}
