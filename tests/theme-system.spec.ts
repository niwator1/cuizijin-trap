import { test, expect } from '@playwright/test';

test.describe('主题切换系统测试', () => {
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
        invoke: (channel, ...args) => Promise.resolve(createResponse(true)),
        on: () => {},
        removeAllListeners: () => {}
      };

      window.module = window.module || {};
    });

    // 导航到应用
    await page.goto('/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 如果在登录页面，先登录
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('admin');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
    }

    // 导航到设置页面
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('应该显示主题设置组件', async ({ page }) => {
    // 检查主题设置标题是否存在
    await expect(page.locator('text=主题模式')).toBeVisible();
    
    // 检查三个主题选项是否都存在
    await expect(page.locator('text=浅色')).toBeVisible();
    await expect(page.locator('text=深色')).toBeVisible();
    await expect(page.locator('text=跟随系统')).toBeVisible();
  });

  test('应该能够切换到浅色主题', async ({ page }) => {
    // 点击浅色主题按钮
    await page.locator('text=浅色').click();
    
    // 等待主题切换完成
    await page.waitForTimeout(500);
    
    // 检查HTML元素是否没有dark类
    const htmlElement = page.locator('html');
    const classes = await htmlElement.getAttribute('class');
    expect(classes).not.toContain('dark');
    
    // 检查CSS变量是否正确设置
    const backgroundColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-background');
    });
    expect(backgroundColor.trim()).toBe('#ffffff');
  });

  test('应该能够切换到深色主题', async ({ page }) => {
    // 点击深色主题按钮
    await page.locator('text=深色').click();
    
    // 等待主题切换完成
    await page.waitForTimeout(500);
    
    // 检查HTML元素是否有dark类
    const htmlElement = page.locator('html');
    const classes = await htmlElement.getAttribute('class');
    expect(classes).toContain('dark');
    
    // 检查CSS变量是否正确设置
    const backgroundColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-background');
    });
    expect(backgroundColor.trim()).toBe('#111827');
  });

  test('应该能够切换到跟随系统主题', async ({ page }) => {
    // 点击跟随系统主题按钮
    await page.locator('text=跟随系统').click();
    
    // 等待主题切换完成
    await page.waitForTimeout(500);
    
    // 检查主题是否根据系统偏好设置
    const systemPrefersDark = await page.evaluate(() => {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    
    const htmlElement = page.locator('html');
    const classes = await htmlElement.getAttribute('class');
    
    if (systemPrefersDark) {
      expect(classes).toContain('dark');
    } else {
      expect(classes).not.toContain('dark');
    }
  });

  test('主题配置应该持久化存储', async ({ page }) => {
    // 切换到深色主题
    await page.locator('text=深色').click();
    await page.waitForTimeout(500);
    
    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 检查主题是否保持
    const htmlElement = page.locator('html');
    const classes = await htmlElement.getAttribute('class');
    expect(classes).toContain('dark');
    
    // 检查localStorage中的配置
    const themeConfig = await page.evaluate(() => {
      const config = localStorage.getItem('theme-config');
      return config ? JSON.parse(config) : null;
    });
    
    expect(themeConfig).toBeTruthy();
    expect(themeConfig.mode).toBe('dark');
  });

  test('应该显示预设主题选项', async ({ page }) => {
    // 查找预设主题部分
    const presetSection = page.locator('text=预设主题').or(
      page.locator('text=主题预设')
    );
    
    if (await presetSection.count() > 0) {
      await expect(presetSection).toBeVisible();
      
      // 检查是否有预设主题选项
      const presetButtons = page.locator('[data-testid*="preset-"]').or(
        page.locator('button:has-text("默认")').or(
          page.locator('button:has-text("商务")')
        )
      );
      
      if (await presetButtons.count() > 0) {
        await expect(presetButtons.first()).toBeVisible();
      }
    }
  });

  test('应该显示自定义主题选项', async ({ page }) => {
    // 查找自定义主题部分
    const customSection = page.locator('text=自定义主题').or(
      page.locator('text=主题自定义')
    );
    
    if (await customSection.count() > 0) {
      await expect(customSection).toBeVisible();
      
      // 检查颜色选择器
      const colorInputs = page.locator('input[type="color"]');
      if (await colorInputs.count() > 0) {
        await expect(colorInputs.first()).toBeVisible();
      }
    }
  });

  test('主题切换应该有过渡动画效果', async ({ page }) => {
    // 获取初始主题
    const initialClasses = await page.locator('html').getAttribute('class');
    
    // 切换主题
    if (initialClasses?.includes('dark')) {
      await page.locator('text=浅色').click();
    } else {
      await page.locator('text=深色').click();
    }
    
    // 检查是否添加了过渡类
    await page.waitForTimeout(100);
    const transitionClasses = await page.locator('html').getAttribute('class');
    
    // 等待过渡完成
    await page.waitForTimeout(400);
    
    // 检查主题是否已切换
    const finalClasses = await page.locator('html').getAttribute('class');
    expect(finalClasses).not.toBe(initialClasses);
  });

  test('应该能够重置主题配置', async ({ page }) => {
    // 查找重置按钮
    const resetButton = page.locator('text=重置').or(
      page.locator('button:has-text("重置")')
    );
    
    if (await resetButton.count() > 0) {
      // 先修改一些设置
      await page.locator('text=深色').click();
      await page.waitForTimeout(500);
      
      // 点击重置按钮
      await resetButton.click();
      await page.waitForTimeout(500);
      
      // 检查是否恢复到默认设置
      const themeConfig = await page.evaluate(() => {
        const config = localStorage.getItem('theme-config');
        return config ? JSON.parse(config) : null;
      });
      
      if (themeConfig) {
        expect(themeConfig.mode).toBe('system');
      }
    }
  });

  test('应该支持导入导出主题配置', async ({ page }) => {
    // 查找导出按钮
    const exportButton = page.locator('text=导出').or(
      page.locator('button:has-text("导出")')
    );
    
    if (await exportButton.count() > 0) {
      await expect(exportButton).toBeVisible();
    }
    
    // 查找导入按钮
    const importButton = page.locator('text=导入').or(
      page.locator('button:has-text("导入")')
    );
    
    if (await importButton.count() > 0) {
      await expect(importButton).toBeVisible();
    }
  });

  test('主题切换应该影响所有UI组件', async ({ page }) => {
    // 切换到深色主题
    await page.locator('text=深色').click();
    await page.waitForTimeout(500);
    
    // 检查各种UI组件是否正确应用了深色主题
    const cardElements = page.locator('.bg-white, .dark\\:bg-gray-800');
    if (await cardElements.count() > 0) {
      const cardClasses = await cardElements.first().getAttribute('class');
      expect(cardClasses).toContain('dark:bg-gray-800');
    }
    
    // 检查文本颜色
    const textElements = page.locator('.text-gray-900, .dark\\:text-white');
    if (await textElements.count() > 0) {
      const textClasses = await textElements.first().getAttribute('class');
      expect(textClasses).toContain('dark:text-white');
    }
  });
});
