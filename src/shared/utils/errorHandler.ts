import { ERROR_MESSAGES } from '../constants';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  PROXY = 'PROXY',
  CERTIFICATE = 'CERTIFICATE',
  PERMISSION = 'PERMISSION',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN'
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * 应用程序错误基类
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly details?: any;
  public readonly timestamp: Date;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.code = code || `${type}_ERROR`;
    this.details = details;
    this.timestamp = new Date();

    // 确保错误堆栈正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * 转换为JSON格式
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    // 根据错误类型返回用户友好的消息
    switch (this.type) {
      case ErrorType.VALIDATION:
        return this.message; // 验证错误通常已经是用户友好的
      case ErrorType.AUTHENTICATION:
        return ERROR_MESSAGES.INVALID_PASSWORD;
      case ErrorType.NETWORK:
        return ERROR_MESSAGES.NETWORK_ERROR;
      case ErrorType.DATABASE:
        return ERROR_MESSAGES.DATABASE_ERROR;
      case ErrorType.PROXY:
        return this.code === 'PROXY_START_FAILED' 
          ? ERROR_MESSAGES.PROXY_START_FAILED 
          : ERROR_MESSAGES.PROXY_STOP_FAILED;
      case ErrorType.CERTIFICATE:
        return ERROR_MESSAGES.CERTIFICATE_INSTALL_FAILED;
      case ErrorType.PERMISSION:
        return ERROR_MESSAGES.PERMISSION_DENIED;
      default:
        return ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string, field?: string, value?: any) {
    super(message, ErrorType.VALIDATION, ErrorSeverity.LOW, 'VALIDATION_ERROR', {
      field,
      value
    });
    this.name = 'ValidationError';

    // 确保属性正确设置
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends AppError {
  constructor(message: string = '认证失败') {
    super(message, ErrorType.AUTHENTICATION, ErrorSeverity.HIGH, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * 授权错误
 */
export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, ErrorType.AUTHORIZATION, ErrorSeverity.HIGH, 'AUTHZ_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * 网络错误
 */
export class NetworkError extends AppError {
  constructor(message: string = '网络连接错误', details?: any) {
    super(message, ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

/**
 * 数据库错误
 */
export class DatabaseError extends AppError {
  constructor(message: string = '数据库操作失败', details?: any) {
    super(message, ErrorType.DATABASE, ErrorSeverity.HIGH, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

/**
 * 代理错误
 */
export class ProxyError extends AppError {
  constructor(message: string, operation: 'start' | 'stop' | 'config' = 'config', details?: any) {
    const code = operation === 'start' ? 'PROXY_START_FAILED' : 
                 operation === 'stop' ? 'PROXY_STOP_FAILED' : 'PROXY_CONFIG_ERROR';
    super(message, ErrorType.PROXY, ErrorSeverity.HIGH, code, details);
    this.name = 'ProxyError';
  }
}

/**
 * 证书错误
 */
export class CertificateError extends AppError {
  constructor(message: string = '证书操作失败', details?: any) {
    super(message, ErrorType.CERTIFICATE, ErrorSeverity.HIGH, 'CERTIFICATE_ERROR', details);
    this.name = 'CertificateError';
  }
}

/**
 * 权限错误
 */
export class PermissionError extends AppError {
  constructor(message: string = '权限不足，请以管理员身份运行') {
    super(message, ErrorType.PERMISSION, ErrorSeverity.CRITICAL, 'PERMISSION_ERROR');
    this.name = 'PermissionError';
  }
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: ((error: AppError) => void)[] = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 添加错误监听器
   */
  addErrorListener(listener: (error: AppError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * 移除错误监听器
   */
  removeErrorListener(listener: (error: AppError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * 处理错误
   */
  handleError(error: Error | AppError, context?: string): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else {
      // 将普通错误转换为AppError
      appError = this.convertToAppError(error);
    }

    // 记录错误
    this.logError(appError, context);

    // 通知监听器
    this.notifyListeners(appError);

    return appError;
  }

  /**
   * 将普通错误转换为AppError
   */
  private convertToAppError(error: Error): AppError {
    // 如果已经是AppError的子类，直接返回
    if (error instanceof AppError) {
      return error;
    }

    // 根据错误消息或类型推断错误类型
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return new NetworkError(error.message);
    }

    if (message.includes('database') || message.includes('sql') || message.includes('sqlite')) {
      return new DatabaseError(error.message);
    }

    if (message.includes('permission') || message.includes('access denied') || message.includes('unauthorized')) {
      return new PermissionError(error.message);
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return new ValidationError(error.message);
    }

    if (message.includes('proxy')) {
      return new ProxyError(error.message);
    }

    if (message.includes('certificate') || message.includes('cert') || message.includes('ssl') || message.includes('tls')) {
      return new CertificateError(error.message);
    }

    // 默认为系统错误
    return new AppError(error.message, ErrorType.SYSTEM, ErrorSeverity.MEDIUM);
  }

  /**
   * 记录错误
   */
  private logError(error: AppError, context?: string): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.type}] ${error.message}`;
    const logDetails = {
      code: error.code,
      severity: error.severity,
      context,
      details: error.details,
      timestamp: error.timestamp,
      stack: error.stack
    };

    // 根据严重程度选择日志级别
    switch (logLevel) {
      case 'error':
        console.error(logMessage, logDetails);
        break;
      case 'warn':
        console.warn(logMessage, logDetails);
        break;
      default:
        console.log(logMessage, logDetails);
    }
  }

  /**
   * 获取日志级别
   */
  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      default:
        return 'info';
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * 创建错误响应
   */
  static createErrorResponse(error: Error | AppError, context?: string): {
    success: false;
    error: string;
    code?: string;
    details?: any;
  } {
    const handler = ErrorHandler.getInstance();
    const appError = handler.handleError(error, context);

    return {
      success: false,
      error: appError.getUserMessage(),
      code: appError.code,
      details: appError.details
    };
  }

  /**
   * 安全地执行异步操作
   */
  static async safeAsync<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<{ success: true; data: T } | { success: false; error: string; code?: string }> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      return ErrorHandler.createErrorResponse(error as Error, context);
    }
  }

  /**
   * 安全地执行同步操作
   */
  static safeSync<T>(
    operation: () => T,
    context?: string
  ): { success: true; data: T } | { success: false; error: string; code?: string } {
    try {
      const data = operation();
      return { success: true, data };
    } catch (error) {
      return ErrorHandler.createErrorResponse(error as Error, context);
    }
  }
}
