import { PerformanceMonitor, performanceMonitor, measurePerformance } from '../shared/utils/performance';
import { MemoryCache, CacheManager, cacheManager, cached } from '../shared/utils/cache';

describe('Performance Optimization', () => {
  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = PerformanceMonitor.getInstance();
      monitor.clearMetrics();
      monitor.setEnabled(true);
    });

    afterEach(() => {
      monitor.clearMetrics();
    });

    test('should measure async function performance', async () => {
      const testFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      };

      const result = await monitor.measureAsync('test-async', 'system', testFunction);
      
      expect(result).toBe('result');
      
      const stats = monitor.getStats('test-async');
      expect(stats.totalOperations).toBe(1);
      expect(stats.averageDuration).toBeGreaterThan(90);
      expect(stats.averageDuration).toBeLessThan(200);
    });

    test('should measure sync function performance', () => {
      const testFunction = () => {
        // 模拟一些计算
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
          sum += i;
        }
        return sum;
      };

      const result = monitor.measureSync('test-sync', 'system', testFunction);
      
      expect(typeof result).toBe('number');
      
      const stats = monitor.getStats('test-sync');
      expect(stats.totalOperations).toBe(1);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });

    test('should handle errors in measured functions', async () => {
      const errorFunction = async () => {
        throw new Error('Test error');
      };

      await expect(
        monitor.measureAsync('test-error', 'system', errorFunction)
      ).rejects.toThrow('Test error');

      const stats = monitor.getStats('test-error');
      expect(stats.totalOperations).toBe(1);
      expect(stats.errorRate).toBe(1);
    });

    test('should calculate performance statistics correctly', async () => {
      // 添加多个测量
      for (let i = 0; i < 10; i++) {
        await monitor.measureAsync('test-stats', 'database', async () => {
          await new Promise(resolve => setTimeout(resolve, 10 + i * 5));
        });
      }

      const stats = monitor.getStats('test-stats');
      expect(stats.totalOperations).toBe(10);
      expect(stats.averageDuration).toBeGreaterThan(0);
      expect(stats.minDuration).toBeLessThan(stats.maxDuration);
      expect(stats.p95Duration).toBeGreaterThan(stats.averageDuration);
    });

    test('should group statistics by category', async () => {
      await monitor.measureAsync('db-query', 'database', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await monitor.measureAsync('api-call', 'network', async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
      });

      const statsByCategory = monitor.getStatsByCategory();
      expect(statsByCategory.database.totalOperations).toBe(1);
      expect(statsByCategory.network.totalOperations).toBe(1);
      expect(statsByCategory.ui.totalOperations).toBe(0);
    });

    test('should generate performance report', async () => {
      // 添加一些测试数据
      await monitor.measureAsync('slow-operation', 'database', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await monitor.measureAsync('fast-operation', 'network', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const report = monitor.getPerformanceReport();
      
      expect(report.summary.totalOperations).toBe(2);
      expect(report.byCategory.database.totalOperations).toBe(1);
      expect(report.byCategory.network.totalOperations).toBe(1);
      expect(report.slowestOperations).toHaveLength(2);
      expect(report.slowestOperations[0].name).toBe('slow-operation');
      expect(report.recentMetrics).toHaveLength(2);
    });

    test('should clean up old metrics', async () => {
      // 添加一个指标
      monitor.addMetric({
        name: 'old-metric',
        duration: 100,
        timestamp: Date.now() - 7200000, // 2小时前
        category: 'system'
      });

      monitor.addMetric({
        name: 'new-metric',
        duration: 50,
        timestamp: Date.now(),
        category: 'system'
      });

      expect(monitor.getAllMetrics()).toHaveLength(2);

      monitor.clearOldMetrics(3600000); // 清理1小时前的指标

      const metrics = monitor.getAllMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('new-metric');
    });
  });

  describe('MemoryCache', () => {
    let cache: MemoryCache<string>;

    beforeEach(() => {
      cache = new MemoryCache<string>({
        maxSize: 5,
        defaultTTL: 1000,
        cleanupInterval: 100
      });
    });

    afterEach(() => {
      cache.destroy();
    });

    test('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      expect(cache.has('key1')).toBe(true);
    });

    test('should handle TTL expiration', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      expect(cache.get('key1')).toBe('value1');

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.has('key1')).toBe(false);
    });

    test('should implement LRU eviction', () => {
      // 填满缓存
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      // 访问key0使其成为最近使用的
      cache.get('key0');

      // 添加新项，应该淘汰key1（最久未使用的）
      cache.set('key5', 'value5');

      expect(cache.has('key0')).toBe(true);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key5')).toBe(true);
    });

    test('should track cache statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key2'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.size).toBe(1);
    });

    test('should support getOrSet pattern', async () => {
      let factoryCalled = false;
      const factory = async () => {
        factoryCalled = true;
        return 'computed-value';
      };

      // 第一次调用应该执行factory
      const result1 = await cache.getOrSet('key1', factory);
      expect(result1).toBe('computed-value');
      expect(factoryCalled).toBe(true);

      // 第二次调用应该从缓存返回
      factoryCalled = false;
      const result2 = await cache.getOrSet('key1', factory);
      expect(result2).toBe('computed-value');
      expect(factoryCalled).toBe(false);
    });

    test('should support batch operations', () => {
      const items = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3']
      ]);

      cache.mset(items);

      const results = cache.mget(['key1', 'key2', 'key4']);
      expect(results.size).toBe(2);
      expect(results.get('key1')).toBe('value1');
      expect(results.get('key2')).toBe('value2');
      expect(results.has('key4')).toBe(false);
    });

    test('should clean up expired items automatically', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL
      cache.set('key2', 'value2', 200); // 200ms TTL

      expect(cache.size()).toBe(2);

      // 等待第一个项过期
      await new Promise(resolve => setTimeout(resolve, 150));

      // 触发清理（通过访问缓存）
      cache.get('key2');

      // 等待清理定时器执行
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.size()).toBe(1);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });
  });

  describe('CacheManager', () => {
    let manager: CacheManager;

    beforeEach(() => {
      manager = CacheManager.getInstance();
    });

    afterEach(() => {
      manager.destroyAll();
    });

    test('should create and manage multiple caches', () => {
      const cache1 = manager.getCache('cache1');
      const cache2 = manager.getCache('cache2');

      expect(cache1).not.toBe(cache2);
      expect(manager.getCache('cache1')).toBe(cache1); // 应该返回同一个实例
    });

    test('should collect statistics from all caches', () => {
      const cache1 = manager.getCache('cache1');
      const cache2 = manager.getCache('cache2');

      cache1.set('key1', 'value1');
      cache2.set('key2', 'value2');

      cache1.get('key1'); // hit
      cache1.get('missing'); // miss
      cache2.get('key2'); // hit

      const allStats = manager.getAllStats();
      expect(allStats.cache1.hits).toBe(1);
      expect(allStats.cache1.misses).toBe(1);
      expect(allStats.cache2.hits).toBe(1);
      expect(allStats.cache2.misses).toBe(0);
    });

    test('should delete specific caches', () => {
      const cache1 = manager.getCache('cache1');
      cache1.set('key1', 'value1');

      expect(manager.deleteCache('cache1')).toBe(true);
      expect(manager.deleteCache('nonexistent')).toBe(false);

      // 获取同名缓存应该创建新实例
      const newCache1 = manager.getCache('cache1');
      expect(newCache1).not.toBe(cache1);
      expect(newCache1.get('key1')).toBeUndefined();
    });
  });

  describe('Performance Decorators', () => {
    class TestService {
      @measurePerformance('test-method', 'database')
      async testMethod(delay: number): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, delay));
        return 'result';
      }

      @cached('test-cache', (arg: string) => `test:${arg}`, 1000)
      async cachedMethod(arg: string): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, 100));
        return `computed:${arg}`;
      }
    }

    test('should measure method performance with decorator', async () => {
      const service = new TestService();
      performanceMonitor.clearMetrics();

      const result = await service.testMethod(50);
      expect(result).toBe('result');

      const stats = performanceMonitor.getStats('TestService.testMethod');
      expect(stats.totalOperations).toBe(1);
      expect(stats.averageDuration).toBeGreaterThan(40);
    });

    test('should cache method results with decorator', async () => {
      const service = new TestService();
      const cache = cacheManager.getCache('test-cache');

      // 第一次调用
      const start1 = Date.now();
      const result1 = await service.cachedMethod('test');
      const duration1 = Date.now() - start1;

      expect(result1).toBe('computed:test');
      expect(duration1).toBeGreaterThan(90);

      // 第二次调用应该从缓存返回
      const start2 = Date.now();
      const result2 = await service.cachedMethod('test');
      const duration2 = Date.now() - start2;

      expect(result2).toBe('computed:test');
      expect(duration2).toBeLessThan(10); // 应该很快

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
    });
  });

  describe('Integration Performance Tests', () => {
    test('should demonstrate performance improvement with caching', async () => {
      const cache = new MemoryCache<number>({ defaultTTL: 5000 });
      
      // 模拟昂贵的计算
      const expensiveComputation = (n: number): number => {
        let result = 0;
        for (let i = 0; i < n * 1000000; i++) {
          result += Math.sqrt(i);
        }
        return result;
      };

      const key = 'expensive-computation';
      const input = 10;

      // 第一次计算（无缓存）
      const start1 = Date.now();
      const result1 = await cache.getOrSet(key, () => Promise.resolve(expensiveComputation(input)));
      const duration1 = Date.now() - start1;

      // 第二次计算（有缓存）
      const start2 = Date.now();
      const result2 = await cache.getOrSet(key, () => Promise.resolve(expensiveComputation(input)));
      const duration2 = Date.now() - start2;

      expect(result1).toBe(result2);
      expect(duration2).toBeLessThan(duration1 / 10); // 缓存应该快至少10倍

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });
});
