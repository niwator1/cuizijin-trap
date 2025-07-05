import { REGEX } from '../constants';

// URL验证和处理
export const urlUtils = {
  /**
   * 验证URL格式是否正确
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return REGEX.URL.test(url);
    } catch {
      return false;
    }
  },

  /**
   * 从URL中提取域名
   */
  extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  },

  /**
   * 标准化URL格式
   */
  normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    try {
      const urlObj = new URL(url);
      return urlObj.href;
    } catch {
      return url;
    }
  },

  /**
   * 检查是否为有效域名
   */
  isValidDomain(domain: string): boolean {
    return REGEX.DOMAIN.test(domain);
  },
};

// 字符串工具
export const stringUtils = {
  /**
   * 生成随机字符串
   */
  generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * 截断字符串
   */
  truncate(str: string, maxLength: number, suffix = '...'): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - suffix.length) + suffix;
  },

  /**
   * 首字母大写
   */
  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * 驼峰转短横线
   */
  camelToKebab(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  },
};

// 时间工具
export const timeUtils = {
  /**
   * 格式化时间
   */
  formatTime(date: Date, format = 'YYYY-MM-DD HH:mm:ss'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  /**
   * 获取相对时间
   */
  getRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  },

  /**
   * 延迟执行
   */
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};

// 数据验证工具
export const validationUtils = {
  /**
   * 验证密码强度
   */
  validatePassword(password: string): { isValid: boolean; message: string } {
    if (password.length < 6) {
      return { isValid: false, message: '密码长度至少6位' };
    }
    if (!/[A-Za-z]/.test(password)) {
      return { isValid: false, message: '密码必须包含字母' };
    }
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: '密码必须包含数字' };
    }
    return { isValid: true, message: '密码强度良好' };
  },

  /**
   * 验证端口号
   */
  validatePort(port: number): boolean {
    return Number.isInteger(port) && port >= 1024 && port <= 65535;
  },

  /**
   * 验证IP地址
   */
  validateIP(ip: string): boolean {
    return REGEX.IP.test(ip);
  },
};

// 对象工具
export const objectUtils = {
  /**
   * 深拷贝对象
   */
  deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as unknown as T;
    if (typeof obj === 'object') {
      const clonedObj = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  },

  /**
   * 合并对象
   */
  merge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
    return Object.assign({}, target, ...sources);
  },

  /**
   * 选择对象属性
   */
  pick<T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },

  /**
   * 排除对象属性
   */
  omit<T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Omit<T, K> {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  },
};

// 数组工具
export const arrayUtils = {
  /**
   * 数组去重
   */
  unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  },

  /**
   * 数组分组
   */
  groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  /**
   * 数组分页
   */
  paginate<T>(array: T[], page: number, pageSize: number): T[] {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return array.slice(start, end);
  },
};

// 错误处理工具
export const errorUtils = {
  /**
   * 安全执行异步函数
   */
  async safeAsync<T>(
    fn: () => Promise<T>,
    fallback?: T
  ): Promise<{ data: T | undefined; error: Error | null }> {
    try {
      const data = await fn();
      return { data, error: null };
    } catch (error) {
      return { data: fallback, error: error as Error };
    }
  },

  /**
   * 重试执行函数
   */
  async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          await timeUtils.delay(delay * Math.pow(2, i)); // 指数退避
        }
      }
    }
    
    throw lastError!;
  },
};

// 导出所有工具
export const utils = {
  url: urlUtils,
  string: stringUtils,
  time: timeUtils,
  validation: validationUtils,
  object: objectUtils,
  array: arrayUtils,
  error: errorUtils,
};
