import { performance, PerformanceObserver } from 'perf_hooks';

/**
 * 性能指标接口
 */
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  category: 'database' | 'network' | 'ui' | 'proxy' | 'system';
  details?: any;
}

/**
 * 性能统计信息
 */
export interface PerformanceStats {
  totalOperations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
  errorRate: number;
  throughput: number; // operations per second
}

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private maxMetrics = 10000; // 最大保存的指标数量
  private isEnabled = true;

  private constructor() {
    this.setupPerformanceObserver();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 设置性能观察器
   */
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') {
      console.warn('PerformanceObserver not available');
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.startsWith('app:')) {
            this.addMetric({
              name: entry.name.replace('app:', ''),
              duration: entry.duration,
              timestamp: entry.startTime,
              category: this.getCategoryFromName(entry.name),
              details: { entryType: entry.entryType }
            });
          }
        });
      });

      observer.observe({ entryTypes: ['measure', 'mark'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to setup PerformanceObserver:', error);
    }
  }

  /**
   * 从名称获取分类
   */
  private getCategoryFromName(name: string): PerformanceMetric['category'] {
    if (name.includes('database') || name.includes('db')) return 'database';
    if (name.includes('network') || name.includes('api')) return 'network';
    if (name.includes('ui') || name.includes('render')) return 'ui';
    if (name.includes('proxy')) return 'proxy';
    return 'system';
  }

  /**
   * 启用/禁用性能监控
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * 添加性能指标
   */
  addMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return;

    this.metrics.push(metric);

    // 保持指标数量在限制内
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * 测量函数执行时间
   */
  async measureAsync<T>(
    name: string,
    category: PerformanceMetric['category'],
    fn: () => Promise<T>,
    details?: any
  ): Promise<T> {
    if (!this.isEnabled) {
      return await fn();
    }

    const startTime = performance.now();
    const markStart = `app:${name}-start`;
    const markEnd = `app:${name}-end`;
    const measureName = `app:${name}`;

    try {
      performance.mark(markStart);
      const result = await fn();
      performance.mark(markEnd);
      performance.measure(measureName, markStart, markEnd);

      const duration = performance.now() - startTime;
      this.addMetric({
        name,
        duration,
        timestamp: startTime,
        category,
        details: { ...details, success: true }
      });

      return result;
    } catch (error) {
      performance.mark(markEnd);
      performance.measure(measureName, markStart, markEnd);

      const duration = performance.now() - startTime;
      this.addMetric({
        name,
        duration,
        timestamp: startTime,
        category,
        details: { ...details, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      });

      throw error;
    } finally {
      // 清理标记
      try {
        performance.clearMarks(markStart);
        performance.clearMarks(markEnd);
        performance.clearMeasures(measureName);
      } catch (e) {
        // 忽略清理错误
      }
    }
  }

  /**
   * 测量同步函数执行时间
   */
  measureSync<T>(
    name: string,
    category: PerformanceMetric['category'],
    fn: () => T,
    details?: any
  ): T {
    if (!this.isEnabled) {
      return fn();
    }

    const startTime = performance.now();
    const markStart = `app:${name}-start`;
    const markEnd = `app:${name}-end`;
    const measureName = `app:${name}`;

    try {
      performance.mark(markStart);
      const result = fn();
      performance.mark(markEnd);
      performance.measure(measureName, markStart, markEnd);

      const duration = performance.now() - startTime;
      this.addMetric({
        name,
        duration,
        timestamp: startTime,
        category,
        details: { ...details, success: true }
      });

      return result;
    } catch (error) {
      performance.mark(markEnd);
      performance.measure(measureName, markStart, markEnd);

      const duration = performance.now() - startTime;
      this.addMetric({
        name,
        duration,
        timestamp: startTime,
        category,
        details: { ...details, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      });

      throw error;
    } finally {
      // 清理标记
      try {
        performance.clearMarks(markStart);
        performance.clearMarks(markEnd);
        performance.clearMeasures(measureName);
      } catch (e) {
        // 忽略清理错误
      }
    }
  }

  /**
   * 获取指定操作的统计信息
   */
  getStats(operationName?: string, category?: PerformanceMetric['category']): PerformanceStats {
    let filteredMetrics = this.metrics;

    if (operationName) {
      filteredMetrics = filteredMetrics.filter(m => m.name === operationName);
    }

    if (category) {
      filteredMetrics = filteredMetrics.filter(m => m.category === category);
    }

    if (filteredMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        errorRate: 0,
        throughput: 0
      };
    }

    const durations = filteredMetrics.map(m => m.duration).sort((a, b) => a - b);
    const successfulOps = filteredMetrics.filter(m => m.details?.success !== false);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    
    // 计算时间范围（秒）
    const timeRange = filteredMetrics.length > 1 
      ? (Math.max(...filteredMetrics.map(m => m.timestamp)) - Math.min(...filteredMetrics.map(m => m.timestamp))) / 1000
      : 1;

    return {
      totalOperations: filteredMetrics.length,
      averageDuration: totalDuration / filteredMetrics.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
      p99Duration: durations[Math.floor(durations.length * 0.99)] || 0,
      errorRate: (filteredMetrics.length - successfulOps.length) / filteredMetrics.length,
      throughput: filteredMetrics.length / timeRange
    };
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 获取按分类分组的统计信息
   */
  getStatsByCategory(): Record<string, PerformanceStats> {
    const categories: PerformanceMetric['category'][] = ['database', 'network', 'ui', 'proxy', 'system'];
    const result: Record<string, PerformanceStats> = {};

    categories.forEach(category => {
      result[category] = this.getStats(undefined, category);
    });

    return result;
  }

  /**
   * 清除所有指标
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * 清除旧指标（保留最近的指标）
   */
  clearOldMetrics(maxAge: number = 3600000): void { // 默认1小时
    const cutoffTime = Date.now() - maxAge;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    summary: PerformanceStats;
    byCategory: Record<string, PerformanceStats>;
    slowestOperations: Array<{ name: string; avgDuration: number; count: number }>;
    recentMetrics: PerformanceMetric[];
  } {
    const summary = this.getStats();
    const byCategory = this.getStatsByCategory();

    // 获取最慢的操作
    const operationStats = new Map<string, { totalDuration: number; count: number }>();
    this.metrics.forEach(metric => {
      const existing = operationStats.get(metric.name) || { totalDuration: 0, count: 0 };
      existing.totalDuration += metric.duration;
      existing.count += 1;
      operationStats.set(metric.name, existing);
    });

    const slowestOperations = Array.from(operationStats.entries())
      .map(([name, stats]) => ({
        name,
        avgDuration: stats.totalDuration / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    // 获取最近的指标
    const recentMetrics = this.metrics
      .slice(-50)
      .sort((a, b) => b.timestamp - a.timestamp);

    return {
      summary,
      byCategory,
      slowestOperations,
      recentMetrics
    };
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }
}

/**
 * 性能装饰器
 */
export function measurePerformance(
  name: string,
  category: PerformanceMetric['category'] = 'system'
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const monitor = PerformanceMonitor.getInstance();

    descriptor.value = async function (...args: any[]) {
      return await monitor.measureAsync(
        `${target.constructor.name}.${propertyKey}`,
        category,
        () => originalMethod.apply(this, args),
        { className: target.constructor.name, methodName: propertyKey }
      );
    };

    return descriptor;
  };
}

/**
 * 全局性能监控实例
 */
export const performanceMonitor = PerformanceMonitor.getInstance();
