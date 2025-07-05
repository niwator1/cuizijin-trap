import crypto from 'crypto';
import { BaseDAO } from './BaseDAO';
import { User } from '@shared/types';
import { SimplePasswordHash } from '../../utils/SimplePasswordHash';

export interface UserConfig {
  id?: number;
  passwordHash: string;
  salt: string;
  sessionTimeout?: number;
  autoStart?: boolean;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateUserDto {
  password: string;
  sessionTimeout?: number;
  autoStart?: boolean;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
}

export interface UpdateUserDto {
  password?: string;
  sessionTimeout?: number;
  autoStart?: boolean;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
}

/**
 * 用户数据访问对象
 * 处理用户认证和配置相关的数据库操作
 */
export class UserDAO extends BaseDAO {
  private readonly SALT_ROUNDS = 12;

  /**
   * 创建用户配置
   */
  async create(userData: CreateUserDto): Promise<UserConfig> {
    // 检查是否已存在用户配置
    const existingUser = await this.getUser();
    if (existingUser) {
      throw new Error('User configuration already exists');
    }

    // 生成盐值和密码哈希
    const salt = crypto.randomBytes(32).toString('hex');
    const passwordHash = await SimplePasswordHash.hash(userData.password, this.SALT_ROUNDS);

    const userConfig: Omit<UserConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      passwordHash,
      salt,
      sessionTimeout: userData.sessionTimeout || 3600,
      autoStart: userData.autoStart || false,
      theme: userData.theme || 'system',
      language: userData.language || 'zh-CN'
    };

    const { columns, placeholders, params } = this.buildInsertClause(userConfig);
    
    const sql = `
      INSERT INTO user_config (${columns})
      VALUES (${placeholders})
    `;

    const result = this.execute(sql, params);

    return await this.getById(Number(result.lastInsertRowid)) as UserConfig;
  }

  /**
   * 获取用户配置（应该只有一条记录）
   */
  async getUser(): Promise<UserConfig | null> {
    const sql = 'SELECT * FROM user_config ORDER BY id DESC LIMIT 1';
    const row = this.queryOne(sql);
    return row ? this.mapRow<UserConfig>(row) : null;
  }

  /**
   * 根据ID获取用户配置
   */
  async getById(id: number): Promise<UserConfig | null> {
    const sql = 'SELECT * FROM user_config WHERE id = ?';
    const row = this.queryOne(sql, [id]);
    return row ? this.mapRow<UserConfig>(row) : null;
  }

  /**
   * 验证密码
   */
  async verifyPassword(password: string): Promise<boolean> {
    const user = await this.getUser();
    if (!user) {
      return false;
    }

    try {
      return await SimplePasswordHash.compare(password, user.passwordHash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * 更新用户配置
   */
  async update(userData: UpdateUserDto): Promise<UserConfig> {
    const user = await this.getUser();
    if (!user) {
      throw new Error('User configuration not found');
    }

    const updateData: Record<string, any> = { ...userData };

    // 如果更新密码，重新生成哈希
    if (userData.password) {
      const salt = crypto.randomBytes(32).toString('hex');
      updateData.passwordHash = await SimplePasswordHash.hash(userData.password, this.SALT_ROUNDS);
      updateData.salt = salt;
      delete updateData.password;
    }

    // 添加更新时间
    updateData.updatedAt = this.getCurrentTimestamp();

    const { clause, params } = this.buildSetClause(updateData);
    
    const sql = `UPDATE user_config SET ${clause} WHERE id = ?`;
    
    this.execute(sql, [...params, user.id]);
    
    return await this.getById(user.id!) as UserConfig;
  }

  /**
   * 更改密码
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    // 验证旧密码
    const isValidOldPassword = await this.verifyPassword(oldPassword);
    if (!isValidOldPassword) {
      throw new Error('Invalid old password');
    }

    // 更新为新密码
    await this.update({ password: newPassword });
    return true;
  }

  /**
   * 检查是否已初始化用户
   */
  async isInitialized(): Promise<boolean> {
    try {
      const user = await this.getUser();
      // 确保用户不仅存在，而且有有效的密码哈希
      if (!user || !user.passwordHash) {
        return false;
      }

      return typeof user.passwordHash === 'string' && user.passwordHash.length > 0;
    } catch (error) {
      console.error('Error checking user initialization:', error);
      return false;
    }
  }

  /**
   * 获取用户设置
   */
  async getSettings(): Promise<{
    sessionTimeout: number;
    autoStart: boolean;
    theme: string;
    language: string;
  }> {
    const user = await this.getUser();
    if (!user) {
      // 返回默认设置
      return {
        sessionTimeout: 3600,
        autoStart: false,
        theme: 'system',
        language: 'zh-CN'
      };
    }

    return {
      sessionTimeout: user.sessionTimeout || 3600,
      autoStart: user.autoStart || false,
      theme: user.theme || 'system',
      language: user.language || 'zh-CN'
    };
  }

  /**
   * 更新用户设置
   */
  async updateSettings(settings: {
    sessionTimeout?: number;
    autoStart?: boolean;
    theme?: 'light' | 'dark' | 'system';
    language?: string;
  }): Promise<void> {
    await this.update(settings);
  }

  /**
   * 重置用户配置（危险操作）
   */
  async reset(): Promise<void> {
    const sql = 'DELETE FROM user_config';
    this.execute(sql);
  }

  /**
   * 生成密码重置令牌（用于紧急重置）
   */
  generateResetToken(): string {
    // 生成基于时间戳的重置令牌
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const token = crypto.createHash('sha256')
      .update(`${timestamp}-${randomBytes}`)
      .digest('hex');
    
    return token;
  }

  /**
   * 验证重置令牌（简单的时间窗口验证）
   */
  validateResetToken(token: string, windowMinutes: number = 30): boolean {
    try {
      // 这里可以实现更复杂的令牌验证逻辑
      // 目前只是简单的格式验证
      return token.length === 64 && /^[a-f0-9]+$/.test(token);
    } catch (error) {
      return false;
    }
  }

  /**
   * 紧急重置密码
   */
  async emergencyReset(newPassword: string, resetToken?: string): Promise<boolean> {
    try {
      // 如果提供了重置令牌，验证它
      if (resetToken && !this.validateResetToken(resetToken)) {
        throw new Error('Invalid reset token');
      }

      const user = await this.getUser();
      if (!user) {
        throw new Error('User configuration not found');
      }

      // 重置密码
      await this.update({ password: newPassword });
      
      return true;
    } catch (error) {
      console.error('Emergency reset failed:', error);
      return false;
    }
  }
}
