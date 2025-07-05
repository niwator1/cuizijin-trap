import crypto from 'crypto';
import { UserDAO, CreateUserDto, UpdateUserDto } from '../models/UserDAO';
import { OperationLogDAO } from '../models/OperationLogDAO';

export interface AuthSession {
  id: string;
  userId: number;
  createdAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  success: boolean;
  sessionId?: string;
  expiresAt?: Date;
  error?: string;
}

export interface AuthStatus {
  isAuthenticated: boolean;
  sessionId?: string;
  expiresAt?: Date;
  timeRemaining?: number;
}

/**
 * 用户认证服务
 * 处理用户登录、会话管理和认证相关的业务逻辑
 */
export class AuthService {
  private userDAO: UserDAO;
  private operationLogDAO: OperationLogDAO;
  private activeSessions: Map<string, AuthSession> = new Map();
  private sessionCleanupInterval: NodeJS.Timeout | null = null;

  constructor(userDAO: UserDAO, operationLogDAO: OperationLogDAO) {
    this.userDAO = userDAO;
    this.operationLogDAO = operationLogDAO;
    this.startSessionCleanup();
  }

  /**
   * 初始化用户（首次设置密码）
   */
  async initializeUser(password: string, settings?: {
    sessionTimeout?: number;
    autoStart?: boolean;
    theme?: 'light' | 'dark' | 'system';
    language?: string;
  }): Promise<boolean> {
    try {
      // 检查是否已经初始化
      if (await this.userDAO.isInitialized()) {
        throw new Error('User already initialized');
      }

      // 验证密码强度
      this.validatePassword(password);

      // 创建用户配置
      const userData: CreateUserDto = {
        password,
        sessionTimeout: settings?.sessionTimeout || 3600,
        autoStart: settings?.autoStart || false,
        theme: settings?.theme || 'system',
        language: settings?.language || 'zh-CN'
      };

      await this.userDAO.create(userData);

      // 记录操作日志
      await this.operationLogDAO.logSystemOperation('user_initialized', {
        settings: { ...settings, password: '[REDACTED]' }
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize user:', error);
      await this.operationLogDAO.logSystemOperation('user_initialization_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, false);
      return false;
    }
  }

  /**
   * 用户登录
   */
  async login(password: string, options?: {
    ipAddress?: string;
    userAgent?: string;
    rememberSession?: boolean;
  }): Promise<LoginResult> {
    try {
      // 验证密码
      const isValidPassword = await this.userDAO.verifyPassword(password);
      
      if (!isValidPassword) {
        await this.operationLogDAO.logLogin(false, options?.ipAddress, options?.userAgent, 'Invalid password');
        return {
          success: false,
          error: 'Invalid password'
        };
      }

      // 获取用户配置
      const user = await this.userDAO.getUser();
      if (!user) {
        await this.operationLogDAO.logLogin(false, options?.ipAddress, options?.userAgent, 'User not found');
        return {
          success: false,
          error: 'User not found'
        };
      }

      // 创建会话
      const sessionId = this.generateSessionId();
      const sessionTimeout = user.sessionTimeout || 3600;
      const expiresAt = new Date(Date.now() + sessionTimeout * 1000);

      const session: AuthSession = {
        id: sessionId,
        userId: user.id!,
        createdAt: new Date(),
        expiresAt,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent
      };

      this.activeSessions.set(sessionId, session);

      // 记录登录日志
      await this.operationLogDAO.logLogin(true, options?.ipAddress, options?.userAgent);

      return {
        success: true,
        sessionId,
        expiresAt
      };
    } catch (error) {
      console.error('Login failed:', error);
      await this.operationLogDAO.logLogin(false, options?.ipAddress, options?.userAgent, 
        error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        error: 'Login failed'
      };
    }
  }

  /**
   * 验证会话
   */
  async validateSession(sessionId: string): Promise<AuthStatus> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return { isAuthenticated: false };
    }

    // 检查会话是否过期
    if (session.expiresAt < new Date()) {
      this.activeSessions.delete(sessionId);
      return { isAuthenticated: false };
    }

    const timeRemaining = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);

    return {
      isAuthenticated: true,
      sessionId,
      expiresAt: session.expiresAt,
      timeRemaining
    };
  }

  /**
   * 刷新会话
   */
  async refreshSession(sessionId: string): Promise<AuthStatus> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return { isAuthenticated: false };
    }

    // 获取用户配置以获取会话超时时间
    const user = await this.userDAO.getUser();
    if (!user) {
      this.activeSessions.delete(sessionId);
      return { isAuthenticated: false };
    }

    // 延长会话时间
    const sessionTimeout = user.sessionTimeout || 3600;
    session.expiresAt = new Date(Date.now() + sessionTimeout * 1000);

    const timeRemaining = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);

    return {
      isAuthenticated: true,
      sessionId,
      expiresAt: session.expiresAt,
      timeRemaining
    };
  }

  /**
   * 用户登出
   */
  async logout(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      this.activeSessions.delete(sessionId);
      
      // 记录登出日志
      await this.operationLogDAO.logSystemOperation('logout', {
        sessionId,
        sessionDuration: Date.now() - session.createdAt.getTime()
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * 登出所有会话
   */
  async logoutAll(): Promise<number> {
    const sessionCount = this.activeSessions.size;
    this.activeSessions.clear();
    
    // 记录登出日志
    await this.operationLogDAO.logSystemOperation('logout_all', {
      sessionCount
    });
    
    return sessionCount;
  }

  /**
   * 更改密码
   */
  async changePassword(sessionId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      // 验证会话
      const authStatus = await this.validateSession(sessionId);
      if (!authStatus.isAuthenticated) {
        throw new Error('Session not authenticated');
      }

      // 验证新密码强度
      this.validatePassword(newPassword);

      // 更改密码
      const success = await this.userDAO.changePassword(oldPassword, newPassword);
      
      if (success) {
        // 记录操作日志
        await this.operationLogDAO.logSystemOperation('password_changed');
        
        // 可选：登出所有其他会话
        const currentSession = this.activeSessions.get(sessionId);
        this.activeSessions.clear();
        if (currentSession) {
          this.activeSessions.set(sessionId, currentSession);
        }
      }

      return success;
    } catch (error) {
      console.error('Failed to change password:', error);
      await this.operationLogDAO.logSystemOperation('password_change_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, false);
      return false;
    }
  }

  /**
   * 紧急重置密码
   */
  async emergencyResetPassword(newPassword: string, resetToken?: string): Promise<boolean> {
    try {
      // 验证新密码强度
      this.validatePassword(newPassword);

      // 执行紧急重置
      const success = await this.userDAO.emergencyReset(newPassword, resetToken);
      
      if (success) {
        // 清除所有会话
        this.activeSessions.clear();
        
        // 记录操作日志
        await this.operationLogDAO.logSystemOperation('emergency_password_reset', {
          resetToken: resetToken ? '[PROVIDED]' : '[NOT_PROVIDED]'
        });
      }

      return success;
    } catch (error) {
      console.error('Emergency password reset failed:', error);
      await this.operationLogDAO.logSystemOperation('emergency_password_reset_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, false);
      return false;
    }
  }

  /**
   * 获取活跃会话列表
   */
  getActiveSessions(): AuthSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * 清理所有活跃会话
   */
  clearAllSessions(): void {
    const sessionCount = this.activeSessions.size;
    this.activeSessions.clear();
    console.log(`Cleared ${sessionCount} active sessions`);
  }

  /**
   * 获取会话统计
   */
  getSessionStats(): {
    activeCount: number;
    totalCreated: number;
    averageSessionDuration: number;
  } {
    // 这里可以扩展为从数据库获取更详细的统计信息
    return {
      activeCount: this.activeSessions.size,
      totalCreated: 0, // 可以从日志中统计
      averageSessionDuration: 0 // 可以从日志中计算
    };
  }

  /**
   * 检查用户是否已初始化
   */
  async isUserInitialized(): Promise<boolean> {
    return await this.userDAO.isInitialized();
  }

  /**
   * 重置用户配置（清除所有用户数据）
   */
  async resetUser(): Promise<void> {
    try {
      // 清除所有活动会话
      this.activeSessions.clear();

      // 重置用户配置
      await this.userDAO.reset();

      // 记录操作日志
      await this.operationLogDAO.logSystemOperation('user_reset', {
        timestamp: new Date().toISOString()
      });

      console.log('User configuration reset successfully');
    } catch (error) {
      console.error('Failed to reset user:', error);
      throw error;
    }
  }

  /**
   * 生成重置令牌
   */
  generateResetToken(): string {
    return this.userDAO.generateResetToken();
  }

  /**
   * 验证重置令牌
   */
  validateResetToken(token: string): boolean {
    return this.userDAO.validateResetToken(token);
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.activeSessions.delete(sessionId);
    }

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * 启动会话清理定时器
   */
  private startSessionCleanup(): void {
    // 每5分钟清理一次过期会话
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * 停止会话清理定时器
   */
  stopSessionCleanup(): void {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
      this.sessionCleanupInterval = null;
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 验证密码强度
   */
  private validatePassword(password: string): void {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // 可以添加更多密码强度验证规则
    // 例如：必须包含数字、大小写字母、特殊字符等
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopSessionCleanup();
    this.activeSessions.clear();
  }
}
