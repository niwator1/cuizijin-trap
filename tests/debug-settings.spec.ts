import { test, expect } from '@playwright/test';

test.describe('调试设置页面', () => {
  test.beforeEach(async ({ page }) => {
    // 注入mock Electron API
    await page.addInitScript(() => {
      const mockData = {
        isInitialized: true,
        isAuthenticated: true,
        config: {
          theme: 'system',
          language: 'zh-CN',
          sessionTimeout: 3600,
          autoStart: false,
          minimizeToTray: true,
          showNotifications: true,
          proxySettings: {
            httpPort: 8080,
            httpsPort: 8443,
            bindAddress: '127.0.0.1',
            enableLogging: false,
          },
          securitySettings: {
            enableProcessProtection: true,
            enableAntiBypass: true,
            enableConfigEncryption: true,
          },
        },
        systemInfo: {
          appVersion: '1.0.0',
          electronVersion: '22.0.0',
          nodeVersion: '18.14.2',
          chromeVersion: '108.0.0.0',
          platform: 'darwin',
          arch: 'x64'
        }
      };

      const createResponse = (data, success = true) => ({
        success,
        data,
        error: success ? null : 'Mock error'
      });

      window.electronAPI = {
        auth: {
          isInitialized: () => Promise.resolve(createResponse(mockData.isInitialized)),
          checkAuth: () => Promise.resolve(createResponse(mockData.isAuthenticated)),
          login: (password) => Promise.resolve(createResponse(password === 'admin'))
        },
        config: {
          get: () => Promise.resolve(createResponse(mockData.config)),
          update: (newConfig) => {
            mockData.config = { ...mockData.config, ...newConfig };
            return Promise.resolve(createResponse(mockData.config));
          }
        },
        system: {
          getInfo: () => Promise.resolve(createResponse(mockData.systemInfo))
        },
        websites: {
          getAll: () => Promise.resolve(createResponse([])),
          add: (website) => Promise.resolve(createResponse(website)),
          update: (id, updates) => Promise.resolve(createResponse(updates)),
          delete: (id) => Promise.resolve(createResponse(true))
        },
        proxy: {
          getStatus: () => Promise.resolve(createResponse({ running: false, port: 8080 }))
        },
        invoke: (channel, ...args) => {
          console.log(`Mock invoke: ${channel}`, args);
          // 处理特定的invoke调用
          if (channel === 'auth:check') {
            return Promise.resolve(createResponse({
              isAuthenticated: mockData.isAuthenticated,
              sessionId: 'mock-session-id',
              expiresAt: new Date(Date.now() + 3600000).toISOString()
            }));
          }
          if (channel === 'auth:login') {
            const [password] = args;
            if (password === 'admin') {
              mockData.isAuthenticated = true;
              return Promise.resolve(createResponse({
                success: true,
                sessionId: 'mock-session-id',
                expiresAt: new Date(Date.now() + 3600000).toISOString()
              }));
            } else {
              return Promise.resolve(createResponse(null, false));
            }
          }
          if (channel === 'config:get') {
            return Promise.resolve(createResponse(mockData.config));
          }
          if (channel === 'system:getInfo') {
            return Promise.resolve(createResponse(mockData.systemInfo));
          }
          if (channel === 'websites:getAll') {
            return Promise.resolve(createResponse([]));
          }
          if (channel === 'stats:get') {
            return Promise.resolve(createResponse({
              totalBlocked: 0,
              todayBlocked: 0,
              totalRequests: 0,
              blockedCategories: {}
            }));
          }
          if (channel === 'proxy:getStatus') {
            return Promise.resolve(createResponse({ running: false, port: 8080 }));
          }
          return Promise.resolve(createResponse(true));
        },
        on: () => {},
        removeAllListeners: () => {}
      };

      window.module = window.module || {};
    });
  });

  test('查看设置页面内容', async ({ page }) => {
    // 导航到应用
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 等待应用初始化
    await page.waitForTimeout(2000);

    // 检查当前页面状态
    let currentUrl = page.url();
    console.log('初始URL:', currentUrl);

    // 如果在登录页面，先登录
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible()) {
      console.log('检测到登录页面，开始登录...');
      await passwordInput.fill('admin');
      await page.locator('button[type="submit"]').click();

      // 等待登录完成
      await page.waitForTimeout(3000);

      // 检查是否成功跳转
      currentUrl = page.url();
      console.log('登录后URL:', currentUrl);
    }

    // 导航到设置页面
    console.log('导航到设置页面...');
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // 等待页面完全加载
    await page.waitForTimeout(3000);

    // 检查React应用是否加载
    const rootElement = page.locator('#root');
    const rootContent = await rootElement.textContent();
    console.log('React根元素内容:', rootContent);

    // 检查是否有错误
    const errors = await page.evaluate(() => {
      const errors = [];
      if (window.console && window.console.error) {
        // 获取控制台错误（如果有的话）
      }
      return errors;
    });

    // 获取页面内容
    const pageContent = await page.textContent('body');
    console.log('设置页面内容:', pageContent);

    // 检查最终URL
    const finalUrl = page.url();
    console.log('最终URL:', finalUrl);
    
    // 检查是否有外观设置部分
    const appearanceSection = page.locator('text=外观设置');
    if (await appearanceSection.count() > 0) {
      console.log('找到外观设置部分');
      await expect(appearanceSection).toBeVisible();
    } else {
      console.log('未找到外观设置部分');
    }
    
    // 检查是否有主题相关文本
    const themeTexts = ['主题', '浅色', '深色', '跟随系统', '主题模式'];
    for (const text of themeTexts) {
      const element = page.locator(`text=${text}`);
      const count = await element.count();
      console.log(`文本 "${text}" 出现次数: ${count}`);
    }
    
    // 截图保存
    await page.screenshot({ path: 'debug-settings-page.png', fullPage: true });
    
    // 检查页面结构
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    console.log('页面标题:', headings);
    
    // 检查是否有ThemeSettings组件
    const themeSettingsComponent = page.locator('[data-testid="theme-settings"]');
    if (await themeSettingsComponent.count() > 0) {
      console.log('找到ThemeSettings组件');
    } else {
      console.log('未找到ThemeSettings组件');
    }
  });
});
