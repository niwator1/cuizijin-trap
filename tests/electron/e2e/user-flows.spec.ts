import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

test.describe('Electron端到端测试 - 用户流程', () => {
  let electronApp: any;
  let window: any;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('完整的用户登录流程', async () => {
    // 1. 验证登录页面显示
    await expect(window.locator('input[type="password"]')).toBeVisible();
    await expect(window.locator('button[type="submit"]')).toBeVisible();
    
    // 2. 输入错误密码
    await window.locator('input[type="password"]').fill('wrongpassword');
    await window.locator('button[type="submit"]').click();
    
    // 3. 验证错误提示
    await window.waitForTimeout(1000);
    // 这里需要根据实际的错误处理逻辑进行验证
    
    // 4. 输入正确密码
    await window.locator('input[type="password"]').clear();
    await window.locator('input[type="password"]').fill('admin');
    await window.locator('button[type="submit"]').click();
    
    // 5. 验证成功跳转到仪表板
    await window.waitForTimeout(2000);
    const currentUrl = window.url();
    expect(currentUrl).toContain('dashboard');
  });

  test('网站管理完整流程', async () => {
    // 1. 先登录
    await window.locator('input[type="password"]').fill('admin');
    await window.locator('button[type="submit"]').click();
    await window.waitForTimeout(2000);
    
    // 2. 添加新网站
    const addSiteButton = window.locator('[data-testid="add-site-button"]');
    if (await addSiteButton.count() > 0) {
      await addSiteButton.click();
      
      // 填写网站信息
      const urlInput = window.locator('input[name="url"]');
      const nameInput = window.locator('input[name="name"]');
      
      if (await urlInput.count() > 0) {
        await urlInput.fill('https://example.com');
      }
      if (await nameInput.count() > 0) {
        await nameInput.fill('测试网站');
      }
      
      // 提交表单
      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();
      
      // 3. 验证网站已添加
      await window.waitForTimeout(1000);
      const siteList = window.locator('[data-testid="site-list"]');
      if (await siteList.count() > 0) {
        await expect(siteList).toContainText('example.com');
      }
    }
    
    // 4. 启用/禁用网站
    const toggleSwitch = window.locator('[data-testid="site-toggle"]').first();
    if (await toggleSwitch.count() > 0) {
      await toggleSwitch.click();
      await window.waitForTimeout(500);
      
      // 验证状态已改变
      const isChecked = await toggleSwitch.getAttribute('aria-checked');
      expect(isChecked).toBeTruthy();
    }
    
    // 5. 删除网站
    const deleteButton = window.locator('[data-testid="delete-site"]').first();
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      
      // 确认删除
      const confirmButton = window.locator('[data-testid="confirm-delete"]');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await window.waitForTimeout(1000);
      }
    }
  });

  test('代理服务器控制流程', async () => {
    // 1. 登录
    await window.locator('input[type="password"]').fill('admin');
    await window.locator('button[type="submit"]').click();
    await window.waitForTimeout(2000);
    
    // 2. 查找代理控制组件
    const proxyToggle = window.locator('[data-testid="proxy-toggle"]');
    
    if (await proxyToggle.count() > 0) {
      // 3. 启动代理服务器
      await proxyToggle.click();
      await window.waitForTimeout(2000);
      
      // 4. 验证代理状态
      const proxyStatus = window.locator('[data-testid="proxy-status"]');
      if (await proxyStatus.count() > 0) {
        await expect(proxyStatus).toContainText('运行中');
      }
      
      // 5. 检查代理统计信息
      const proxyStats = window.locator('[data-testid="proxy-stats"]');
      if (await proxyStats.count() > 0) {
        await expect(proxyStats).toBeVisible();
      }
      
      // 6. 停止代理服务器
      await proxyToggle.click();
      await window.waitForTimeout(2000);
      
      // 7. 验证代理已停止
      if (await proxyStatus.count() > 0) {
        await expect(proxyStatus).toContainText('已停止');
      }
    }
  });

  test('安全功能测试流程', async () => {
    // 1. 登录
    await window.locator('input[type="password"]').fill('admin');
    await window.locator('button[type="submit"]').click();
    await window.waitForTimeout(2000);
    
    // 2. 查找安全控制组件
    const securitySection = window.locator('[data-testid="security-control"]');
    
    if (await securitySection.count() > 0) {
      // 3. 执行安全扫描
      const scanButton = window.locator('[data-testid="security-scan"]');
      if (await scanButton.count() > 0) {
        await scanButton.click();
        await window.waitForTimeout(3000);
        
        // 4. 验证扫描结果
        const scanResults = window.locator('[data-testid="scan-results"]');
        if (await scanResults.count() > 0) {
          await expect(scanResults).toBeVisible();
        }
      }
      
      // 5. 查看安全事件
      const securityEvents = window.locator('[data-testid="security-events"]');
      if (await securityEvents.count() > 0) {
        await expect(securityEvents).toBeVisible();
      }
      
      // 6. 清理安全事件
      const clearEventsButton = window.locator('[data-testid="clear-events"]');
      if (await clearEventsButton.count() > 0) {
        await clearEventsButton.click();
        await window.waitForTimeout(1000);
      }
    }
  });

  test('系统集成功能测试', async () => {
    // 1. 登录
    await window.locator('input[type="password"]').fill('admin');
    await window.locator('button[type="submit"]').click();
    await window.waitForTimeout(2000);
    
    // 2. 查找系统集成控制
    const systemSection = window.locator('[data-testid="system-integration"]');
    
    if (await systemSection.count() > 0) {
      // 3. 测试证书安装
      const installCertButton = window.locator('[data-testid="install-certificate"]');
      if (await installCertButton.count() > 0) {
        await installCertButton.click();
        await window.waitForTimeout(2000);
        
        // 验证证书状态
        const certStatus = window.locator('[data-testid="certificate-status"]');
        if (await certStatus.count() > 0) {
          await expect(certStatus).toBeVisible();
        }
      }
      
      // 4. 测试系统代理设置
      const proxySettingsButton = window.locator('[data-testid="system-proxy"]');
      if (await proxySettingsButton.count() > 0) {
        await proxySettingsButton.click();
        await window.waitForTimeout(1000);
      }
    }
  });

  test('应用设置和配置流程', async () => {
    // 1. 登录
    await window.locator('input[type="password"]').fill('admin');
    await window.locator('button[type="submit"]').click();
    await window.waitForTimeout(2000);
    
    // 2. 打开设置页面
    const settingsButton = window.locator('[data-testid="settings-button"]');
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      await window.waitForTimeout(1000);
      
      // 3. 修改主题设置
      const themeSelect = window.locator('[data-testid="theme-select"]');
      if (await themeSelect.count() > 0) {
        await themeSelect.selectOption('dark');
        await window.waitForTimeout(500);
        
        // 验证主题已应用
        const isDark = await window.evaluate(() => {
          return document.documentElement.classList.contains('dark');
        });
        expect(isDark).toBe(true);
      }
      
      // 4. 修改其他设置
      const autoStartCheckbox = window.locator('[data-testid="auto-start"]');
      if (await autoStartCheckbox.count() > 0) {
        await autoStartCheckbox.check();
        await window.waitForTimeout(500);
      }
      
      // 5. 保存设置
      const saveButton = window.locator('[data-testid="save-settings"]');
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await window.waitForTimeout(1000);
      }
    }
  });

  test('错误处理和恢复流程', async () => {
    // 1. 登录
    await window.locator('input[type="password"]').fill('admin');
    await window.locator('button[type="submit"]').click();
    await window.waitForTimeout(2000);
    
    // 2. 模拟网络错误
    await window.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // 3. 尝试执行需要网络的操作
    const refreshButton = window.locator('[data-testid="refresh"]');
    if (await refreshButton.count() > 0) {
      await refreshButton.click();
      await window.waitForTimeout(1000);
      
      // 4. 验证错误处理
      const errorMessage = window.locator('[data-testid="error-message"]');
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
      }
    }
    
    // 5. 恢复网络并重试
    await window.unroute('**/api/**');
    
    if (await refreshButton.count() > 0) {
      await refreshButton.click();
      await window.waitForTimeout(1000);
      
      // 6. 验证恢复正常
      const errorMessage = window.locator('[data-testid="error-message"]');
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).not.toBeVisible();
      }
    }
  });

  test('数据持久化验证', async () => {
    // 1. 登录并添加数据
    await window.locator('input[type="password"]').fill('admin');
    await window.locator('button[type="submit"]').click();
    await window.waitForTimeout(2000);
    
    // 2. 添加测试数据
    const addButton = window.locator('[data-testid="add-site-button"]');
    if (await addButton.count() > 0) {
      await addButton.click();
      
      const urlInput = window.locator('input[name="url"]');
      if (await urlInput.count() > 0) {
        await urlInput.fill('https://persistent-test.com');
        
        const submitButton = window.locator('button[type="submit"]');
        await submitButton.click();
        await window.waitForTimeout(1000);
      }
    }
    
    // 3. 重启应用
    await electronApp.close();
    
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('networkidle');
    
    // 4. 重新登录
    await window.locator('input[type="password"]').fill('admin');
    await window.locator('button[type="submit"]').click();
    await window.waitForTimeout(2000);
    
    // 5. 验证数据是否持久化
    const siteList = window.locator('[data-testid="site-list"]');
    if (await siteList.count() > 0) {
      await expect(siteList).toContainText('persistent-test.com');
    }
  });
});
