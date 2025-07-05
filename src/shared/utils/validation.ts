import { REGEX, ERROR_MESSAGES } from '../constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationRule<T = any> {
  name: string;
  validate: (value: T) => boolean | Promise<boolean>;
  message: string;
  severity?: 'error' | 'warning';
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 数据验证工具类
 */
export class Validator {
  private rules: ValidationRule[] = [];

  /**
   * 添加验证规则
   */
  addRule<T>(rule: ValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }

  /**
   * 验证值
   */
  async validate<T>(value: T): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of this.rules) {
      try {
        const isValid = await rule.validate(value);
        if (!isValid) {
          if (rule.severity === 'warning') {
            warnings.push(rule.message);
          } else {
            errors.push(rule.message);
          }
        }
      } catch (error) {
        errors.push(`验证规则 "${rule.name}" 执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * 清除所有规则
   */
  clear(): this {
    this.rules = [];
    return this;
  }
}

/**
 * 预定义的验证规则
 */
export const ValidationRules = {
  // 必填验证
  required: (message = '此字段为必填项'): ValidationRule => ({
    name: 'required',
    validate: (value: any) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },
    message
  }),

  // 字符串长度验证
  minLength: (min: number, message?: string): ValidationRule<string> => ({
    name: 'minLength',
    validate: (value: string) => !value || value.length >= min,
    message: message || `最少需要 ${min} 个字符`
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    name: 'maxLength',
    validate: (value: string) => !value || value.length <= max,
    message: message || `最多允许 ${max} 个字符`
  }),

  // URL验证
  url: (message = ERROR_MESSAGES.INVALID_URL): ValidationRule<string> => ({
    name: 'url',
    validate: (value: string) => {
      if (!value) return true; // 空值由required规则处理
      try {
        // 如果没有协议，自动添加 https://
        const urlToValidate = value.startsWith('http://') || value.startsWith('https://') 
          ? value 
          : `https://${value}`;
        new URL(urlToValidate);
        return REGEX.URL.test(urlToValidate);
      } catch {
        return false;
      }
    },
    message
  }),

  // 域名验证
  domain: (message = '请输入有效的域名'): ValidationRule<string> => ({
    name: 'domain',
    validate: (value: string) => {
      if (!value) return true;
      return REGEX.DOMAIN.test(value);
    },
    message
  }),

  // IP地址验证
  ip: (message = '请输入有效的IP地址'): ValidationRule<string> => ({
    name: 'ip',
    validate: (value: string) => {
      if (!value) return true;
      return REGEX.IP.test(value);
    },
    message
  }),

  // 密码强度验证
  password: (minLength = 6, message?: string): ValidationRule<string> => ({
    name: 'password',
    validate: (value: string) => {
      if (!value) return true;
      return value.length >= minLength;
    },
    message: message || `密码至少需要 ${minLength} 个字符`
  }),

  // 密码确认验证
  passwordConfirm: (originalPassword: string, message = '两次输入的密码不一致'): ValidationRule<string> => ({
    name: 'passwordConfirm',
    validate: (value: string) => value === originalPassword,
    message
  }),

  // 数字范围验证
  numberRange: (min: number, max: number, message?: string): ValidationRule<number> => ({
    name: 'numberRange',
    validate: (value: number) => {
      if (value === null || value === undefined) return true;
      return value >= min && value <= max;
    },
    message: message || `数值必须在 ${min} 到 ${max} 之间`
  }),

  // 邮箱验证
  email: (message = '请输入有效的邮箱地址'): ValidationRule<string> => ({
    name: 'email',
    validate: (value: string) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message
  }),

  // 端口号验证
  port: (message = '请输入有效的端口号 (1-65535)'): ValidationRule<number> => ({
    name: 'port',
    validate: (value: number) => {
      if (value === null || value === undefined) return true;
      return Number.isInteger(value) && value >= 1 && value <= 65535;
    },
    message
  }),

  // 自定义正则表达式验证
  pattern: (regex: RegExp, message = '格式不正确'): ValidationRule<string> => ({
    name: 'pattern',
    validate: (value: string) => {
      if (!value) return true;
      return regex.test(value);
    },
    message
  }),

  // 数组长度验证
  arrayLength: (min?: number, max?: number, message?: string): ValidationRule<any[]> => ({
    name: 'arrayLength',
    validate: (value: any[]) => {
      if (!Array.isArray(value)) return false;
      if (min !== undefined && value.length < min) return false;
      if (max !== undefined && value.length > max) return false;
      return true;
    },
    message: message || `数组长度必须在 ${min || 0} 到 ${max || '无限制'} 之间`
  }),

  // 唯一性验证（异步）
  unique: (checkFn: (value: any) => Promise<boolean>, message = '该值已存在'): ValidationRule => ({
    name: 'unique',
    validate: checkFn,
    message
  })
};

/**
 * 常用验证器组合
 */
export const CommonValidators = {
  // 网站URL验证器
  siteUrl: () => new Validator()
    .addRule(ValidationRules.required('请输入网站URL'))
    .addRule(ValidationRules.url())
    .addRule(ValidationRules.maxLength(2048, 'URL长度不能超过2048个字符')),

  // 网站标题验证器
  siteTitle: () => new Validator()
    .addRule(ValidationRules.maxLength(255, '标题长度不能超过255个字符')),

  // 网站描述验证器
  siteDescription: () => new Validator()
    .addRule(ValidationRules.maxLength(1000, '描述长度不能超过1000个字符')),

  // 密码验证器
  password: (minLength = 6) => new Validator()
    .addRule(ValidationRules.required('请输入密码'))
    .addRule(ValidationRules.password(minLength))
    .addRule(ValidationRules.maxLength(128, '密码长度不能超过128个字符')),

  // 密码确认验证器
  passwordConfirm: (originalPassword: string) => new Validator()
    .addRule(ValidationRules.required('请确认密码'))
    .addRule(ValidationRules.passwordConfirm(originalPassword)),

  // 代理端口验证器
  proxyPort: () => new Validator()
    .addRule(ValidationRules.required('请输入端口号'))
    .addRule(ValidationRules.port()),

  // 域名验证器
  domain: () => new Validator()
    .addRule(ValidationRules.required('请输入域名'))
    .addRule(ValidationRules.domain())
    .addRule(ValidationRules.maxLength(253, '域名长度不能超过253个字符')),

  // 分类名称验证器
  category: () => new Validator()
    .addRule(ValidationRules.required('请选择分类'))
    .addRule(ValidationRules.maxLength(50, '分类名称不能超过50个字符'))
};

/**
 * 验证对象的多个字段
 */
export async function validateObject<T extends Record<string, any>>(
  obj: T,
  validators: Partial<Record<keyof T, Validator>>
): Promise<{ isValid: boolean; errors: Record<string, string[]>; warnings?: Record<string, string[]> }> {
  const errors: Record<string, string[]> = {};
  const warnings: Record<string, string[]> = {};
  let isValid = true;

  for (const [field, validator] of Object.entries(validators)) {
    if (validator && obj.hasOwnProperty(field)) {
      const result = await validator.validate(obj[field]);
      if (!result.isValid) {
        errors[field] = result.errors;
        isValid = false;
      }
      if (result.warnings && result.warnings.length > 0) {
        warnings[field] = result.warnings;
      }
    }
  }

  return {
    isValid,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined
  };
}

/**
 * 安全地解析JSON
 */
export function safeJsonParse<T = any>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

/**
 * 清理和标准化URL
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  // 移除前后空格
  url = url.trim();
  
  // 如果没有协议，添加https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  
  try {
    const urlObj = new URL(url);
    // 标准化URL（移除默认端口等）
    return urlObj.toString();
  } catch {
    return url; // 如果无法解析，返回原始URL
  }
}

/**
 * 提取域名
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(sanitizeUrl(url));
    return urlObj.hostname;
  } catch {
    return url;
  }
}
