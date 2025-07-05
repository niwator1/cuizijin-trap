/**
 * 缓存项接口
 */
export interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  enableStats: boolean;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
  totalAccesses: number;
}

/**
 * 内存缓存类
 */
export class MemoryCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalAccesses: 0
  };
  private cleanupTimer?: NodeJS.Timeout;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      enableStats: true,
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * 设置缓存项
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const itemTTL = ttl || this.config.defaultTTL;

    // 如果缓存已满，执行LRU淘汰
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: now,
      ttl: itemTTL,
      accessCount: 0,
      lastAccessed: now
    });
  }

  /**
   * 获取缓存项
   */
  get(key: string): T | undefined {
    if (this.config.enableStats) {
      this.stats.totalAccesses++;
    }

    const item = this.cache.get(key);
    if (!item) {
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return undefined;
    }

    const now = Date.now();
    
    // 检查是否过期
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return undefined;
    }

    // 更新访问信息
    item.accessCount++;
    item.lastAccessed = now;

    if (this.config.enableStats) {
      this.stats.hits++;
    }

    return item.value;
  }

  /**
   * 检查缓存项是否存在且未过期
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * 获取或设置缓存项（如果不存在则调用工厂函数）
   */
  async getOrSet<R = T>(
    key: string,
    factory: () => Promise<R>,
    ttl?: number
  ): Promise<R> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached as R;
    }

    const value = await factory();
    this.set(key, value as T, ttl);
    return value;
  }

  /**
   * 批量获取
   */
  mget(keys: string[]): Map<string, T> {
    const result = new Map<string, T>();
    keys.forEach(key => {
      const value = this.get(key);
      if (value !== undefined) {
        result.set(key, value);
      }
    });
    return result;
  }

  /**
   * 批量设置
   */
  mset(items: Map<string, T>, ttl?: number): void {
    items.forEach((value, key) => {
      this.set(key, value, ttl);
    });
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    const hitRate = this.stats.totalAccesses > 0 
      ? this.stats.hits / this.stats.totalAccesses 
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      evictions: this.stats.evictions,
      totalAccesses: this.stats.totalAccesses
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalAccesses: 0
    };
  }

  /**
   * LRU淘汰策略
   */
  private evictLRU(): void {
    if (this.cache.size === 0) return;

    let oldestKey: string | undefined;
    let oldestTime = Date.now();

    // 找到最久未访问的项
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      if (this.config.enableStats) {
        this.stats.evictions++;
      }
    }
  }

  /**
   * 清理过期项
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 销毁缓存
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}

/**
 * 缓存管理器
 */
export class CacheManager {
  private static instance: CacheManager;
  private caches = new Map<string, MemoryCache>();

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 创建或获取缓存实例
   */
  getCache<T = any>(name: string, config?: Partial<CacheConfig>): MemoryCache<T> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new MemoryCache<T>(config));
    }
    return this.caches.get(name) as MemoryCache<T>;
  }

  /**
   * 删除缓存实例
   */
  deleteCache(name: string): boolean {
    const cache = this.caches.get(name);
    if (cache) {
      cache.destroy();
      return this.caches.delete(name);
    }
    return false;
  }

  /**
   * 获取所有缓存的统计信息
   */
  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    this.caches.forEach((cache, name) => {
      stats[name] = cache.getStats();
    });
    return stats;
  }

  /**
   * 清空所有缓存
   */
  clearAll(): void {
    this.caches.forEach(cache => cache.clear());
  }

  /**
   * 销毁所有缓存
   */
  destroyAll(): void {
    this.caches.forEach(cache => cache.destroy());
    this.caches.clear();
  }
}

/**
 * 缓存装饰器
 */
export function cached(
  cacheName: string,
  keyGenerator?: (...args: any[]) => string,
  ttl?: number
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cacheManager = CacheManager.getInstance();
    const cache = cacheManager.getCache(cacheName);

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator 
        ? keyGenerator(...args)
        : `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;

      return await cache.getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}

/**
 * 全局缓存管理器实例
 */
export const cacheManager = CacheManager.getInstance();
