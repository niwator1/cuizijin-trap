// 主要服务导出
export { DatabaseService } from './DatabaseService';
export { DatabaseManager } from './DatabaseManager';
export { MigrationManager } from './MigrationManager';

// 数据访问对象导出
export { BaseDAO } from './models/BaseDAO';
export { UserDAO } from './models/UserDAO';
export { BlockedSiteDAO } from './models/BlockedSiteDAO';
export { OperationLogDAO } from './models/OperationLogDAO';
export { InterceptStatsDAO } from './models/InterceptStatsDAO';
export { AppConfigDAO } from './models/AppConfigDAO';

// 业务服务导出
export { AuthService } from './services/AuthService';
export { BlockedSiteService } from './services/BlockedSiteService';
export { LoggingService } from './services/LoggingService';

// 类型定义导出
export type {
  // 用户相关类型
  UserConfig,
  CreateUserDto,
  UpdateUserDto
} from './models/UserDAO';

export type {
  // 网站相关类型
  BlockedSiteRecord,
  BlockedSiteFilter,
  BlockedSiteListOptions
} from './models/BlockedSiteDAO';

export type {
  // 日志相关类型
  OperationLogRecord,
  CreateOperationLogDto,
  OperationLogFilter,
  OperationLogListOptions
} from './models/OperationLogDAO';

export type {
  // 统计相关类型
  InterceptStatsRecord,
  DailyStats,
  SiteStats
} from './models/InterceptStatsDAO';

export type {
  // 配置相关类型
  AppConfigRecord,
  CreateAppConfigDto
} from './models/AppConfigDAO';

export type {
  // 认证服务类型
  AuthSession,
  LoginResult,
  AuthStatus
} from './services/AuthService';

export type {
  // 网站服务类型
  AddSiteResult,
  BatchOperationResult,
  SiteValidationResult
} from './services/BlockedSiteService';

export type {
  // 日志服务类型
  LogEntry,
  LogSearchOptions,
  LogStats
} from './services/LoggingService';

// 迁移相关导出
export { Migration001InitialSchema } from './migrations/001_initial_schema';

// 常用工具函数
export const DatabaseUtils = {
  /**
   * 验证URL格式
   */
  validateUrl: (url: string): boolean => {
    try {
      new URL(url.startsWith('http') ? url : `http://${url}`);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 提取域名
   */
  extractDomain: (url: string): string | null => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
      return urlObj.hostname.toLowerCase();
    } catch {
      return null;
    }
  },

  /**
   * 标准化URL
   */
  normalizeUrl: (url: string): string => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}${urlObj.search}`;
    } catch {
      return url;
    }
  },

  /**
   * 格式化日期为数据库格式
   */
  formatDate: (date: Date): string => {
    return date.toISOString();
  },

  /**
   * 解析数据库日期
   */
  parseDate: (dateString: string): Date => {
    return new Date(dateString);
  },

  /**
   * 生成安全的随机字符串
   */
  generateRandomString: (length: number = 32): string => {
    const crypto = require('crypto');
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  },

  /**
   * 验证密码强度
   */
  validatePasswordStrength: (password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length < 6) {
      feedback.push('密码长度至少需要6个字符');
    } else if (password.length >= 8) {
      score += 1;
    }

    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score < 2) {
      feedback.push('密码应包含字母和数字');
    }
    if (score < 3) {
      feedback.push('建议包含大小写字母、数字和特殊字符');
    }

    return {
      isValid: password.length >= 6 && score >= 2,
      score,
      feedback
    };
  },

  /**
   * 清理HTML标签
   */
  stripHtml: (html: string): string => {
    return html.replace(/<[^>]*>/g, '');
  },

  /**
   * 转义SQL通配符
   */
  escapeSqlWildcards: (str: string): string => {
    return str.replace(/[%_]/g, '\\$&');
  },

  /**
   * 计算文件大小的人类可读格式
   */
  formatFileSize: (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  /**
   * 深度克隆对象
   */
  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * 防抖函数
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * 节流函数
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// 数据库错误类型
export class DatabaseError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class MigrationError extends Error {
  constructor(message: string, public version?: string, public details?: any) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

// 数据库常量
export const DATABASE_CONSTANTS = {
  // 表名
  TABLES: {
    USER_CONFIG: 'user_config',
    BLOCKED_SITES: 'blocked_sites',
    OPERATION_LOGS: 'operation_logs',
    INTERCEPT_STATS: 'intercept_stats',
    APP_CONFIG: 'app_config'
  },

  // 默认值
  DEFAULTS: {
    SESSION_TIMEOUT: 3600,
    LOG_RETENTION_DAYS: 30,
    MAX_LOG_ENTRIES: 10000,
    STATS_RETENTION_DAYS: 90,
    BACKUP_INTERVAL_HOURS: 24
  },

  // 限制
  LIMITS: {
    MAX_URL_LENGTH: 2048,
    MAX_DOMAIN_LENGTH: 253,
    MAX_TITLE_LENGTH: 255,
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_CATEGORY_LENGTH: 50,
    MIN_PASSWORD_LENGTH: 6,
    MAX_PASSWORD_LENGTH: 128
  }
} as const;
