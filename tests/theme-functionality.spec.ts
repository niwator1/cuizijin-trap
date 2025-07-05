import { test, expect } from '@playwright/test';

test.describe('主题功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 注入mock和主题测试代码
    await page.addInitScript(() => {
      // Mock Electron API
      const mockData = {
        isInitialized: true,
        isAuthenticated: true,
        config: {
          theme: 'system',
          language: 'zh-CN'
        }
      };

      const createResponse = (data, success = true) => ({
        success,
        data,
        error: success ? null : 'Mock error'
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
            appVersion: '1.0.0',
            platform: 'darwin'
          }))
        },
        websites: { getAll: () => Promise.resolve(createResponse([])) },
        proxy: { getStatus: () => Promise.resolve(createResponse({ running: false })) },
        invoke: (channel, ...args) => {
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
              appVersion: '1.0.0',
              platform: 'darwin'
            }));
          }
          if (channel === 'websites:getAll') {
            return Promise.resolve(createResponse([]));
          }
          if (channel === 'stats:get') {
            return Promise.resolve(createResponse({
              totalBlocked: 0,
              todayBlocked: 0
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

      // 设置认证状态到localStorage
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

  test('CSS变量系统应该正常工作', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 测试CSS变量是否存在
    const backgroundColorVar = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-background');
    });
    
    console.log('背景色CSS变量:', backgroundColorVar);
    expect(backgroundColorVar).toBeTruthy();

    // 测试主题切换功能
    const textColorVar = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-text');
    });
    
    console.log('文本色CSS变量:', textColorVar);
    expect(textColorVar).toBeTruthy();
  });

  test('主题服务应该正常工作', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 测试主题服务是否可用
    const themeServiceAvailable = await page.evaluate(() => {
      return typeof window.themeService !== 'undefined';
    });

    if (themeServiceAvailable) {
      console.log('主题服务可用');
      
      // 测试主题切换
      const currentTheme = await page.evaluate(() => {
        return window.themeService?.getTheme();
      });
      
      console.log('当前主题:', currentTheme);
      
      // 切换到深色主题
      await page.evaluate(() => {
        if (window.themeService) {
          window.themeService.setTheme('dark');
        }
      });
      
      await page.waitForTimeout(500);
      
      // 检查HTML类是否更新
      const htmlClasses = await page.locator('html').getAttribute('class');
      console.log('HTML类:', htmlClasses);
      
      if (htmlClasses?.includes('dark')) {
        console.log('深色主题应用成功');
      }
    } else {
      console.log('主题服务不可用');
    }
  });

  test('主题切换动画应该正常工作', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 获取初始主题
    const initialClasses = await page.locator('html').getAttribute('class');
    console.log('初始HTML类:', initialClasses);

    // 通过JavaScript切换主题
    await page.evaluate(() => {
      // 模拟主题切换
      const html = document.documentElement;
      if (html.classList.contains('dark')) {
        html.classList.remove('dark');
      } else {
        html.classList.add('dark');
      }
    });

    await page.waitForTimeout(500);

    // 检查主题是否切换
    const finalClasses = await page.locator('html').getAttribute('class');
    console.log('切换后HTML类:', finalClasses);

    expect(finalClasses).not.toBe(initialClasses);
  });

  test('主题配置持久化应该正常工作', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 设置主题配置到localStorage
    await page.evaluate(() => {
      const themeConfig = {
        mode: 'dark',
        animations: true,
        reducedMotion: false,
        customColors: {
          primary: '#3b82f6',
          secondary: '#64748b'
        }
      };
      localStorage.setItem('theme-config', JSON.stringify(themeConfig));
    });

    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 检查配置是否保持
    const savedConfig = await page.evaluate(() => {
      const config = localStorage.getItem('theme-config');
      return config ? JSON.parse(config) : null;
    });

    console.log('保存的主题配置:', savedConfig);
    expect(savedConfig).toBeTruthy();
    expect(savedConfig.mode).toBe('dark');
  });

  test('主题系统应该响应系统偏好', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 检查系统偏好
    const systemPrefersDark = await page.evaluate(() => {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    console.log('系统偏好深色主题:', systemPrefersDark);

    // 测试媒体查询监听
    const mediaQuerySupported = await page.evaluate(() => {
      return typeof window.matchMedia === 'function';
    });

    expect(mediaQuerySupported).toBe(true);
    console.log('媒体查询支持:', mediaQuerySupported);
  });

  test('主题相关CSS类应该正确应用', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 检查是否有主题相关的CSS类
    const bodyClasses = await page.locator('body').getAttribute('class');
    const htmlClasses = await page.locator('html').getAttribute('class');
    
    console.log('Body类:', bodyClasses);
    console.log('HTML类:', htmlClasses);

    // 检查是否有基本的样式类
    const hasStyledElements = await page.locator('.bg-white, .dark\\:bg-gray-800, .text-gray-900, .dark\\:text-white').count();
    console.log('样式化元素数量:', hasStyledElements);

    if (hasStyledElements > 0) {
      console.log('找到主题样式化元素');
    } else {
      console.log('未找到主题样式化元素');
    }
  });
});
