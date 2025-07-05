import { test, expect } from '@playwright/test';

test.describe('基础功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 注入mock Electron API
    await page.addInitScript(() => {
      // Mock data
      const mockData = {
        isInitialized: false,
        isAuthenticated: false,
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
        },
        websites: [],
        stats: {
          totalBlocked: 0,
          todayBlocked: 0,
          totalRequests: 0,
          blockedCategories: {}
        }
      };

      // Mock API responses
      const createResponse = (data, success = true) => ({
        success,
        data,
        error: success ? null : 'Mock error'
      });

      // Mock Electron API
      window.electronAPI = {
        auth: {
          isInitialized: () => Promise.resolve(createResponse(mockData.isInitialized)),
          initialize: (password, config) => Promise.resolve(createResponse(true)),
          login: (password) => Promise.resolve(createResponse(password === 'admin')),
          logout: () => Promise.resolve(createResponse(true)),
          checkAuth: () => Promise.resolve(createResponse(mockData.isAuthenticated)),
          changePassword: () => Promise.resolve(createResponse(true))
        },
        config: {
          get: () => Promise.resolve(createResponse(mockData.config)),
          update: (newConfig) => Promise.resolve(createResponse(mockData.config)),
          reset: () => Promise.resolve(createResponse(mockData.config)),
          export: () => Promise.resolve(createResponse(true)),
          import: () => Promise.resolve(createResponse(true))
        },
        system: {
          getInfo: () => Promise.resolve(createResponse(mockData.systemInfo)),
          getStats: () => Promise.resolve(createResponse(mockData.stats))
        },
        websites: {
          getAll: () => Promise.resolve(createResponse(mockData.websites)),
          add: (website) => Promise.resolve(createResponse(website)),
          update: (id, updates) => Promise.resolve(createResponse(updates)),
          delete: (id) => Promise.resolve(createResponse(true)),
          import: () => Promise.resolve(createResponse(true)),
          export: () => Promise.resolve(createResponse(mockData.websites))
        },
        proxy: {
          start: () => Promise.resolve(createResponse(true)),
          stop: () => Promise.resolve(createResponse(true)),
          getStatus: () => Promise.resolve(createResponse({ running: false, port: 8080 })),
          installCertificate: () => Promise.resolve(createResponse(true)),
          uninstallCertificate: () => Promise.resolve(createResponse(true)),
          getCertificateStatus: () => Promise.resolve(createResponse(false))
        },
        security: {
          getStatus: () => Promise.resolve(createResponse({
            overall: 'secure',
            processProtection: { enabled: true, watchdogActive: true, protectedProcesses: 1, lastHeartbeat: new Date().toISOString() },
            configEncryption: { initialized: true, keyPath: '/mock/path', algorithm: 'aes-256-gcm' },
            antiBypass: { monitoring: true },
            recentEvents: [],
            lastCheck: new Date().toISOString()
          })),
          performScan: () => Promise.resolve(createResponse([])),
          getEvents: () => Promise.resolve(createResponse([])),
          clearEvents: () => Promise.resolve(createResponse(true))
        },
        invoke: (channel, ...args) => Promise.resolve(createResponse(true)),
        on: () => {},
        removeAllListeners: () => {}
      };

      // Mock module for compatibility
      window.module = window.module || {};
    });
  });

  test('应用应该正常加载', async ({ page }) => {
    // 导航到应用首页
    await page.goto('/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 检查页面是否包含基本内容
    await expect(page.locator('body')).toBeVisible();

    // 检查是否有React应用的根元素
    await expect(page.locator('#root')).toBeVisible();
  });

  test('页面标题应该正确', async ({ page }) => {
    await page.goto('/');
    
    // 检查页面标题
    await expect(page).toHaveTitle(/崔子瑾诱捕器|Cuizijin|网站访问控制/);
  });

  test('基本元素应该存在', async ({ page }) => {
    await page.goto('/');
    
    // 等待React应用加载
    await page.waitForSelector('#root', { timeout: 10000 });
    
    // 检查是否有任何可见的内容
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(0);
  });

  test('控制台不应该有错误', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // 监听控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 检查是否有严重错误（忽略一些常见的警告）
    const seriousErrors = consoleErrors.filter(error => 
      !error.includes('Warning:') && 
      !error.includes('favicon') &&
      !error.includes('404')
    );
    
    expect(seriousErrors).toHaveLength(0);
  });

  test('网络请求应该成功', async ({ page }) => {
    const failedRequests: string[] = [];
    
    // 监听失败的网络请求
    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 过滤掉一些预期的失败请求（如favicon等）
    const criticalFailures = failedRequests.filter(url => 
      !url.includes('favicon') && 
      !url.includes('.ico') &&
      !url.includes('manifest.json')
    );
    
    expect(criticalFailures).toHaveLength(0);
  });
});
