import { test, expect } from '@playwright/test';

test.describe('性能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 注入mock Electron API
    await page.addInitScript(() => {
      const mockData = {
        isInitialized: true,
        isAuthenticated: true,
        config: { theme: 'system', language: 'zh-CN' }
      };

      const createResponse = (data, success = true) => ({
        success, data, error: success ? null : 'Mock error'
      });

      window.electronAPI = {
        auth: {
          isInitialized: () => Promise.resolve(createResponse(true)),
          checkAuth: () => Promise.resolve(createResponse({
            isAuthenticated: true,
            sessionId: 'mock-session',
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          })),
          login: () => Promise.resolve(createResponse(true))
        },
        config: {
          get: () => Promise.resolve(createResponse(mockData.config)),
          update: (config) => Promise.resolve(createResponse(config))
        },
        system: {
          getInfo: () => Promise.resolve(createResponse({
            appVersion: '1.0.0', platform: 'darwin'
          }))
        },
        websites: { getAll: () => Promise.resolve(createResponse([])) },
        proxy: { getStatus: () => Promise.resolve(createResponse({ running: false })) },
        invoke: (channel) => {
          if (channel === 'auth:check') {
            return Promise.resolve(createResponse({
              isAuthenticated: true,
              sessionId: 'mock-session',
              expiresAt: new Date(Date.now() + 3600000).toISOString()
            }));
          }
          if (channel === 'config:get') {
            return Promise.resolve(createResponse(mockData.config));
          }
          if (channel === 'system:getInfo') {
            return Promise.resolve(createResponse({
              appVersion: '1.0.0', platform: 'darwin'
            }));
          }
          if (channel === 'websites:getAll') {
            return Promise.resolve(createResponse([]));
          }
          if (channel === 'stats:get') {
            return Promise.resolve(createResponse({
              totalBlocked: 0, todayBlocked: 0
            }));
          }
          if (channel === 'proxy:getStatus') {
            return Promise.resolve(createResponse({ running: false }));
          }
          return Promise.resolve(createResponse(true));
        },
        on: () => {},
        removeAllListeners: () => {}
      };

      localStorage.setItem('user-preferences', JSON.stringify({
        state: {
          theme: 'system',
          currentPage: 'dashboard',
          sessionId: 'mock-session',
          sessionExpiresAt: new Date(Date.now() + 3600000).toISOString(),
          isAuthenticated: true
        },
        version: 0
      }));
    });
  });

  test('应用启动时间应该合理', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`应用加载时间: ${loadTime}ms`);
    
    // 应用加载时间应该在5秒内
    expect(loadTime).toBeLessThan(5000);
  });

  test('主题切换性能应该良好', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 测试主题切换性能
    const switchTimes = [];
    
    for (let i = 0; i < 5; i++) {
      const startTime = performance.now();
      
      await page.evaluate(() => {
        const html = document.documentElement;
        if (html.classList.contains('dark')) {
          html.classList.remove('dark');
        } else {
          html.classList.add('dark');
        }
      });
      
      await page.waitForTimeout(100);
      const endTime = performance.now();
      
      switchTimes.push(endTime - startTime);
    }
    
    const avgSwitchTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
    console.log(`平均主题切换时间: ${avgSwitchTime.toFixed(2)}ms`);
    console.log(`主题切换时间范围: ${Math.min(...switchTimes).toFixed(2)}ms - ${Math.max(...switchTimes).toFixed(2)}ms`);
    
    // 主题切换应该在200ms内完成
    expect(avgSwitchTime).toBeLessThan(200);
  });

  test('内存使用应该稳定', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 获取初始内存使用
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (initialMemory) {
      console.log('初始内存使用:', {
        used: `${(initialMemory.used / 1024 / 1024).toFixed(2)}MB`,
        total: `${(initialMemory.total / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(initialMemory.limit / 1024 / 1024).toFixed(2)}MB`
      });

      // 执行一些操作
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
          // 模拟一些DOM操作
          const div = document.createElement('div');
          div.innerHTML = 'Test content';
          document.body.appendChild(div);
          document.body.removeChild(div);
        });
        await page.waitForTimeout(50);
      }

      // 获取操作后内存使用
      const finalMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });

      if (finalMemory) {
        console.log('操作后内存使用:', {
          used: `${(finalMemory.used / 1024 / 1024).toFixed(2)}MB`,
          total: `${(finalMemory.total / 1024 / 1024).toFixed(2)}MB`,
          limit: `${(finalMemory.limit / 1024 / 1024).toFixed(2)}MB`
        });

        const memoryIncrease = finalMemory.used - initialMemory.used;
        console.log(`内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

        // 内存增长应该在合理范围内（小于10MB）
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }
    } else {
      console.log('浏览器不支持performance.memory API');
    }
  });

  test('CSS动画性能应该良好', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 测试CSS动画性能
    const animationPerformance = await page.evaluate(() => {
      return new Promise((resolve) => {
        const startTime = performance.now();
        let frameCount = 0;
        
        const element = document.createElement('div');
        element.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100px;
          height: 100px;
          background: red;
          transition: transform 1s ease;
          transform: translateX(0px);
        `;
        document.body.appendChild(element);
        
        // 触发动画
        requestAnimationFrame(() => {
          element.style.transform = 'translateX(200px)';
        });
        
        const measureFrame = () => {
          frameCount++;
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(measureFrame);
          } else {
            document.body.removeChild(element);
            const fps = frameCount;
            resolve({ fps, duration: performance.now() - startTime });
          }
        };
        
        requestAnimationFrame(measureFrame);
      });
    });

    console.log(`动画性能: ${animationPerformance.fps} FPS, 持续时间: ${animationPerformance.duration.toFixed(2)}ms`);
    
    // FPS应该大于30
    expect(animationPerformance.fps).toBeGreaterThan(30);
  });

  test('网络请求性能应该良好', async ({ page }) => {
    const responses = [];
    const requestTimes = new Map();

    // 监听网络请求开始
    page.on('request', request => {
      requestTimes.set(request.url(), Date.now());
    });

    // 监听网络请求完成
    page.on('response', response => {
      const startTime = requestTimes.get(response.url());
      const endTime = Date.now();
      const duration = startTime ? endTime - startTime : 0;

      responses.push({
        url: response.url(),
        status: response.status(),
        duration: duration
      });
    });

    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const totalTime = Date.now() - startTime;

    console.log(`总加载时间: ${totalTime}ms`);
    console.log(`网络请求数量: ${responses.length}`);

    // 分析请求性能
    const slowRequests = responses.filter(r => r.duration > 1000); // 超过1秒的请求
    const avgRequestTime = responses.length > 0
      ? responses.reduce((sum, r) => sum + r.duration, 0) / responses.length
      : 0;

    console.log(`慢请求数量: ${slowRequests.length}`);
    console.log(`平均请求时间: ${avgRequestTime.toFixed(2)}ms`);

    if (slowRequests.length > 0) {
      console.log('慢请求详情:', slowRequests.map(r => ({
        url: r.url,
        status: r.status,
        duration: `${r.duration}ms`
      })));
    }

    // 慢请求数量应该很少
    expect(slowRequests.length).toBeLessThan(3);
    // 平均请求时间应该合理
    expect(avgRequestTime).toBeLessThan(500);
  });

  test('DOM元素数量应该合理', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const domStats = await page.evaluate(() => {
      return {
        totalElements: document.querySelectorAll('*').length,
        divElements: document.querySelectorAll('div').length,
        textNodes: document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        ).nextNode() ? 1 : 0, // 简化的文本节点计数
        depth: (() => {
          let maxDepth = 0;
          const traverse = (element, depth = 0) => {
            maxDepth = Math.max(maxDepth, depth);
            for (const child of element.children) {
              traverse(child, depth + 1);
            }
          };
          traverse(document.body);
          return maxDepth;
        })()
      };
    });

    console.log('DOM统计:', {
      总元素数: domStats.totalElements,
      div元素数: domStats.divElements,
      最大深度: domStats.depth
    });

    // DOM元素数量应该在合理范围内
    expect(domStats.totalElements).toBeLessThan(1000);
    expect(domStats.depth).toBeLessThan(20);
  });
});
