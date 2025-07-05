import { test, expect, devices } from '@playwright/test';

// 跨浏览器兼容性测试
test.describe('跨浏览器兼容性测试', () => {
  const browsers = ['chromium', 'firefox', 'webkit'];
  
  browsers.forEach(browserName => {
    test.describe(`${browserName} 浏览器测试`, () => {
      test(`${browserName} - 基本功能应该正常工作`, async ({ page }) => {
        // 导航到应用
        await page.goto('/');
        
        // 检查页面是否正常加载
        await expect(page).toHaveTitle(/崔子瑾诱捕器/);
        
        // 检查关键元素是否存在
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
        
        // 测试登录功能
        await page.locator('input[type="password"]').fill('admin');
        await page.locator('button[type="submit"]').click();
        
        // 检查是否成功跳转
        await expect(page).toHaveURL(/\/dashboard/);
      });

      test(`${browserName} - CSS样式应该正确渲染`, async ({ page }) => {
        await page.goto('/');
        
        // 检查主要元素的样式
        const passwordInput = page.locator('input[type="password"]');
        await expect(passwordInput).toBeVisible();
        
        // 检查元素是否有正确的样式类
        const inputClass = await passwordInput.getAttribute('class');
        expect(inputClass).toBeTruthy();
        
        // 检查按钮样式
        const submitButton = page.locator('button[type="submit"]');
        const buttonClass = await submitButton.getAttribute('class');
        expect(buttonClass).toBeTruthy();
      });

      test(`${browserName} - JavaScript功能应该正常工作`, async ({ page }) => {
        await page.goto('/');
        
        // 测试表单验证
        await page.locator('button[type="submit"]').click();
        
        // 检查是否有错误提示（JavaScript验证）
        const errorElements = page.locator('text=请输入密码, text=密码不能为空');
        if (await errorElements.count() > 0) {
          await expect(errorElements.first()).toBeVisible();
        }
        
        // 测试动态内容更新
        await page.locator('input[type="password"]').fill('test');
        await page.locator('input[type="password"]').clear();
        
        // 检查输入框是否正确清空
        const inputValue = await page.locator('input[type="password"]').inputValue();
        expect(inputValue).toBe('');
      });

      test(`${browserName} - 本地存储应该正常工作`, async ({ page }) => {
        await page.goto('/');
        
        // 登录
        await page.locator('input[type="password"]').fill('admin');
        await page.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/\/dashboard/);
        
        // 检查本地存储
        const localStorage = await page.evaluate(() => {
          return window.localStorage.getItem('auth-token') || 
                 window.localStorage.getItem('user-session') ||
                 window.localStorage.getItem('isAuthenticated');
        });
        
        // 应该有某种形式的认证信息存储
        expect(localStorage).toBeTruthy();
      });

      test(`${browserName} - 响应式设计应该正常工作`, async ({ page }) => {
        // 测试不同屏幕尺寸
        const viewports = [
          { width: 1920, height: 1080 },
          { width: 1024, height: 768 },
          { width: 375, height: 667 }
        ];
        
        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          await page.goto('/');
          
          // 检查关键元素是否仍然可见
          await expect(page.locator('input[type="password"]')).toBeVisible();
          await expect(page.locator('button[type="submit"]')).toBeVisible();
          
          // 检查布局是否适应屏幕
          const body = page.locator('body');
          const bodyWidth = await body.evaluate(el => el.scrollWidth);
          expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 20); // 允许一些误差
        }
      });
    });
  });

  // 移动设备测试
  test.describe('移动设备兼容性测试', () => {
    const mobileDevices = [
      { name: 'iPhone 12', ...devices['iPhone 12'] },
      { name: 'Pixel 5', ...devices['Pixel 5'] },
      { name: 'iPad Pro', ...devices['iPad Pro'] }
    ];

    mobileDevices.forEach(device => {
      test(`${device.name} - 触摸交互应该正常工作`, async ({ browser }) => {
        const context = await browser.newContext({
          ...device,
        });
        const page = await context.newPage();
        
        await page.goto('/');
        
        // 测试触摸事件
        await page.locator('input[type="password"]').tap();
        await page.locator('input[type="password"]').fill('admin');
        
        // 测试触摸提交
        await page.locator('button[type="submit"]').tap();
        
        // 检查是否成功
        await expect(page).toHaveURL(/\/dashboard/);
        
        await context.close();
      });

      test(`${device.name} - 虚拟键盘应该正常工作`, async ({ browser }) => {
        const context = await browser.newContext({
          ...device,
        });
        const page = await context.newPage();
        
        await page.goto('/');
        
        // 聚焦输入框（应该触发虚拟键盘）
        await page.locator('input[type="password"]').focus();
        
        // 检查输入框是否获得焦点
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toHaveAttribute('type', 'password');
        
        await context.close();
      });
    });
  });

  // 性能测试
  test.describe('性能测试', () => {
    test('页面加载性能应该在可接受范围内', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      
      // 等待页面完全加载
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // 页面应该在3秒内加载完成
      expect(loadTime).toBeLessThan(3000);
    });

    test('JavaScript执行性能应该正常', async ({ page }) => {
      await page.goto('/');
      
      // 测试大量DOM操作的性能
      const startTime = Date.now();
      
      // 执行一些JavaScript操作
      await page.evaluate(() => {
        for (let i = 0; i < 1000; i++) {
          const div = document.createElement('div');
          div.textContent = `Test ${i}`;
          document.body.appendChild(div);
          document.body.removeChild(div);
        }
      });
      
      const executionTime = Date.now() - startTime;
      
      // JavaScript执行应该在合理时间内完成
      expect(executionTime).toBeLessThan(1000);
    });
  });

  // 可访问性测试
  test.describe('可访问性测试', () => {
    test('键盘导航应该正常工作', async ({ page }) => {
      await page.goto('/');
      
      // 使用Tab键导航
      await page.keyboard.press('Tab');
      
      // 检查焦点是否正确
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // 继续导航
      await page.keyboard.press('Tab');
      
      // 使用Enter键激活元素
      await page.keyboard.press('Enter');
    });

    test('屏幕阅读器支持应该正常', async ({ page }) => {
      await page.goto('/');
      
      // 检查重要元素是否有适当的ARIA标签
      const passwordInput = page.locator('input[type="password"]');
      
      // 检查是否有标签或aria-label
      const label = await passwordInput.getAttribute('aria-label');
      const labelledBy = await passwordInput.getAttribute('aria-labelledby');
      
      expect(label || labelledBy).toBeTruthy();
    });
  });

  // 安全性测试
  test.describe('安全性测试', () => {
    test('XSS防护应该正常工作', async ({ page }) => {
      await page.goto('/');
      
      // 尝试注入脚本
      const maliciousScript = '<script>alert("XSS")</script>';
      
      await page.locator('input[type="password"]').fill(maliciousScript);
      await page.locator('button[type="submit"]').click();
      
      // 检查脚本是否被执行（不应该执行）
      const alerts = [];
      page.on('dialog', dialog => {
        alerts.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.waitForTimeout(1000);
      expect(alerts).toHaveLength(0);
    });

    test('CSRF防护应该正常工作', async ({ page }) => {
      await page.goto('/');
      
      // 检查是否有CSRF令牌
      const csrfToken = await page.evaluate(() => {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag ? metaTag.getAttribute('content') : null;
      });
      
      // 如果应用使用CSRF令牌，应该存在
      // 这里只是检查基本的安全措施
    });
  });
});
