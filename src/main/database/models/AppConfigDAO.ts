import { BaseDAO } from './BaseDAO';

export interface AppConfigRecord {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppConfigDto {
  key: string;
  value: any;
  type?: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
}

/**
 * 应用配置数据访问对象
 * 处理应用配置相关的数据库操作
 */
export class AppConfigDAO extends BaseDAO {

  /**
   * 创建配置项
   */
  async create(configData: CreateAppConfigDto): Promise<AppConfigRecord> {
    // 检查key是否已存在
    if (await this.exists('app_config', { key: configData.key })) {
      throw new Error(`Configuration key '${configData.key}' already exists`);
    }

    const { serializedValue, type } = this.serializeValue(configData.value, configData.type);

    const configRecord = {
      key: configData.key,
      value: serializedValue,
      type,
      description: configData.description || null
    };

    const { columns, placeholders, params } = this.buildInsertClause(configRecord);
    
    const sql = `
      INSERT INTO app_config (${columns})
      VALUES (${placeholders})
    `;

    const result = this.execute(sql, params);

    return await this.getById(Number(result.lastInsertRowid)) as AppConfigRecord;
  }

  /**
   * 根据ID获取配置
   */
  async getById(id: number): Promise<AppConfigRecord | null> {
    const sql = 'SELECT * FROM app_config WHERE id = ?';
    const row = this.queryOne(sql, [id]);
    return row ? this.mapRow<AppConfigRecord>(row) : null;
  }

  /**
   * 根据key获取配置
   */
  async getByKey(key: string): Promise<AppConfigRecord | null> {
    const sql = 'SELECT * FROM app_config WHERE key = ?';
    const row = this.queryOne(sql, [key]);
    return row ? this.mapRow<AppConfigRecord>(row) : null;
  }

  /**
   * 获取配置值（自动反序列化）
   */
  async getValue<T = any>(key: string, defaultValue?: T): Promise<T> {
    const config = await this.getByKey(key);
    if (!config) {
      return defaultValue as T;
    }

    return this.deserializeValue(config.value, config.type) as T;
  }

  /**
   * 获取字符串配置值
   */
  async getString(key: string, defaultValue: string = ''): Promise<string> {
    const value = await this.getValue(key, defaultValue);
    return String(value);
  }

  /**
   * 获取数字配置值
   */
  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const value = await this.getValue(key, defaultValue);
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * 获取布尔配置值
   */
  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.getValue(key, defaultValue);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return (value as string).toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
  }

  /**
   * 获取JSON配置值
   */
  async getJson<T = any>(key: string, defaultValue?: T): Promise<T> {
    const config = await this.getByKey(key);
    if (!config) {
      return defaultValue as T;
    }

    if (config.type === 'json') {
      try {
        return JSON.parse(config.value) as T;
      } catch (error) {
        console.error(`Failed to parse JSON config '${key}':`, error);
        return defaultValue as T;
      }
    }

    return this.deserializeValue(config.value, config.type) as T;
  }

  /**
   * 设置配置值
   */
  async setValue(key: string, value: any, type?: 'string' | 'number' | 'boolean' | 'json'): Promise<void> {
    const existingConfig = await this.getByKey(key);
    
    if (existingConfig) {
      await this.update(existingConfig.id, { value, type });
    } else {
      await this.create({ key, value, type });
    }
  }

  /**
   * 设置字符串配置值
   */
  async setString(key: string, value: string): Promise<void> {
    await this.setValue(key, value, 'string');
  }

  /**
   * 设置数字配置值
   */
  async setNumber(key: string, value: number): Promise<void> {
    await this.setValue(key, value, 'number');
  }

  /**
   * 设置布尔配置值
   */
  async setBoolean(key: string, value: boolean): Promise<void> {
    await this.setValue(key, value, 'boolean');
  }

  /**
   * 设置JSON配置值
   */
  async setJson(key: string, value: any): Promise<void> {
    await this.setValue(key, value, 'json');
  }

  /**
   * 更新配置
   */
  async update(id: number, updateData: {
    value?: any;
    type?: 'string' | 'number' | 'boolean' | 'json';
    description?: string;
  }): Promise<AppConfigRecord> {
    const config = await this.getById(id);
    if (!config) {
      throw new Error(`Configuration with id ${id} not found`);
    }

    const updateRecord: Record<string, any> = {};

    if (updateData.value !== undefined) {
      const { serializedValue, type } = this.serializeValue(
        updateData.value, 
        updateData.type || config.type
      );
      updateRecord.value = serializedValue;
      updateRecord.type = type;
    }

    if (updateData.description !== undefined) {
      updateRecord.description = updateData.description;
    }

    if (Object.keys(updateRecord).length === 0) {
      return config;
    }

    const { clause, params } = this.buildSetClause(updateRecord);
    
    const sql = `UPDATE app_config SET ${clause} WHERE id = ?`;
    
    this.execute(sql, [...params, id]);
    
    return await this.getById(id) as AppConfigRecord;
  }

  /**
   * 删除配置
   */
  async deleteByKey(key: string): Promise<boolean> {
    const changes = this.delete('app_config', { key });
    return changes > 0;
  }

  /**
   * 删除配置
   */
  async deleteById(id: number): Promise<boolean> {
    const changes = this.delete('app_config', { id });
    return changes > 0;
  }

  /**
   * 获取所有配置
   */
  async getAll(): Promise<AppConfigRecord[]> {
    const sql = 'SELECT * FROM app_config ORDER BY key ASC';
    const rows = this.query(sql);
    return this.mapRows<AppConfigRecord>(rows);
  }

  /**
   * 获取配置键列表
   */
  async getKeys(): Promise<string[]> {
    const sql = 'SELECT key FROM app_config ORDER BY key ASC';
    const rows = this.query<{ key: string }>(sql);
    return rows.map(row => row.key);
  }

  /**
   * 批量获取配置
   */
  async getMultiple(keys: string[]): Promise<Record<string, any>> {
    if (keys.length === 0) return {};

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `SELECT key, value, type FROM app_config WHERE key IN (${placeholders})`;
    
    const rows = this.query<{ key: string; value: string; type: string }>(sql, keys);
    
    const result: Record<string, any> = {};
    for (const row of rows) {
      result[row.key] = this.deserializeValue(row.value, row.type as any);
    }

    return result;
  }

  /**
   * 批量设置配置
   */
  async setMultiple(configs: Record<string, any>): Promise<void> {
    this.transaction(() => {
      for (const [key, value] of Object.entries(configs)) {
        this.setValue(key, value);
      }
    });
  }

  /**
   * 检查配置是否存在
   */
  async hasKey(key: string): Promise<boolean> {
    return this.exists('app_config', { key });
  }

  /**
   * 获取配置数量
   */
  async getCount(): Promise<number> {
    return this.count('app_config');
  }

  /**
   * 获取完整配置对象
   */
  async getConfig(): Promise<Record<string, any>> {
    const configs = await this.getAll();
    const result: Record<string, any> = {};

    for (const config of configs) {
      result[config.key] = this.deserializeValue(config.value, config.type);
    }

    return result;
  }

  /**
   * 更新配置对象
   */
  async updateConfig(configData: Record<string, any>): Promise<void> {
    this.transaction(() => {
      for (const [key, value] of Object.entries(configData)) {
        this.setValue(key, value);
      }
    });
  }

  /**
   * 重置配置
   */
  async resetConfig(): Promise<void> {
    await this.resetToDefaults();
  }

  /**
   * 重置为默认配置
   */
  async resetToDefaults(): Promise<void> {
    // 清空现有配置
    this.execute('DELETE FROM app_config');

    // 重新插入默认配置
    const defaultConfigs = [
      { key: 'proxy_port', value: '8888', type: 'number', description: '代理服务器端口' },
      { key: 'proxy_auth_token_length', value: '32', type: 'number', description: '代理认证令牌长度' },
      { key: 'max_log_entries', value: '10000', type: 'number', description: '最大日志条目数' },
      { key: 'log_retention_days', value: '30', type: 'number', description: '日志保留天数' },
      { key: 'auto_backup', value: 'true', type: 'boolean', description: '是否自动备份' },
      { key: 'backup_interval_hours', value: '24', type: 'number', description: '备份间隔（小时）' },
      { key: 'enable_statistics', value: 'true', type: 'boolean', description: '是否启用统计功能' },
      { key: 'block_page_template', value: 'default', type: 'string', description: '拦截页面模板' },
      { key: 'notification_enabled', value: 'true', type: 'boolean', description: '是否启用通知' },
      { key: 'debug_mode', value: 'false', type: 'boolean', description: '调试模式' }
    ];

    this.transaction(() => {
      for (const config of defaultConfigs) {
        const { columns, placeholders, params } = this.buildInsertClause(config);
        const sql = `INSERT INTO app_config (${columns}) VALUES (${placeholders})`;
        this.execute(sql, params);
      }
    });
  }

  /**
   * 序列化值
   */
  private serializeValue(value: any, type?: 'string' | 'number' | 'boolean' | 'json'): {
    serializedValue: string;
    type: 'string' | 'number' | 'boolean' | 'json';
  } {
    if (type) {
      switch (type) {
        case 'string':
          return { serializedValue: String(value), type: 'string' };
        case 'number':
          return { serializedValue: String(Number(value)), type: 'number' };
        case 'boolean':
          return { serializedValue: String(Boolean(value)), type: 'boolean' };
        case 'json':
          return { serializedValue: JSON.stringify(value), type: 'json' };
      }
    }

    // 自动推断类型
    if (typeof value === 'string') {
      return { serializedValue: value, type: 'string' };
    } else if (typeof value === 'number') {
      return { serializedValue: String(value), type: 'number' };
    } else if (typeof value === 'boolean') {
      return { serializedValue: String(value), type: 'boolean' };
    } else {
      return { serializedValue: JSON.stringify(value), type: 'json' };
    }
  }

  /**
   * 反序列化值
   */
  private deserializeValue(value: string, type: 'string' | 'number' | 'boolean' | 'json'): any {
    switch (type) {
      case 'string':
        return value;
      case 'number':
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      case 'boolean':
        return value.toLowerCase() === 'true' || value === '1';
      case 'json':
        try {
          return JSON.parse(value);
        } catch (error) {
          console.error('Failed to parse JSON value:', value, error);
          return null;
        }
      default:
        return value;
    }
  }
}
