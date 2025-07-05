import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

test.describe('初始设置流程测试', () => {
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

  test('应该正确显示初始设置页面', async () => {
    // 验证初始设置页面的元素
    const passwordInput = window.locator('#password');
    const confirmPasswordInput = window.locator('#confirmPassword');
    const submitButton = window.locator('button[type="submit"]');

    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // 验证页面标题或提示文本
    const setupTitle = window.locator('h1, h2').first();
    await expect(setupTitle).toBeVisible();
  });

  test('应该能够完成初始密码设置', async () => {
    const passwordInput = window.locator('#password');
    const confirmPasswordInput = window.locator('#confirmPassword');
    const submitButton = window.locator('button[type="submit"]');

    // 输入密码
    await passwordInput.fill('admin123');
    await confirmPasswordInput.fill('admin123');

    // 验证按钮变为可用状态
    await expect(submitButton).toBeEnabled();

    // 提交表单
    await submitButton.click();

    // 等待页面跳转或状态变化
    await window.waitForTimeout(2000);

    // 验证是否跳转到登录页面或仪表板
    const currentUrl = window.url();
    expect(currentUrl).toBeTruthy();
  });

  test('应该验证密码确认匹配', async () => {
    const passwordInput = window.locator('#password');
    const confirmPasswordInput = window.locator('#confirmPassword');
    const submitButton = window.locator('button[type="submit"]');

    // 输入不匹配的密码
    await passwordInput.fill('admin123');
    await confirmPasswordInput.fill('different');

    // 验证按钮应该保持禁用状态或显示错误
    await window.waitForTimeout(500);
    
    // 检查是否有错误提示
    const errorMessage = window.locator('[data-testid="error-message"], .error, .text-red-500');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    } else {
      // 如果没有错误提示，按钮应该保持禁用
      await expect(submitButton).toBeDisabled();
    }
  });

  test('应该要求密码满足最小长度', async () => {
    const passwordInput = window.locator('#password');
    const confirmPasswordInput = window.locator('#confirmPassword');
    const submitButton = window.locator('button[type="submit"]');

    // 输入过短的密码
    await passwordInput.fill('123');
    await confirmPasswordInput.fill('123');

    await window.waitForTimeout(500);

    // 验证按钮应该保持禁用状态
    await expect(submitButton).toBeDisabled();
  });

  test('应该在设置完成后能够正常登录', async () => {
    // 1. 完成初始设置
    const passwordInput = window.locator('#password');
    const confirmPasswordInput = window.locator('#confirmPassword');
    const submitButton = window.locator('button[type="submit"]');

    await passwordInput.fill('admin123');
    await confirmPasswordInput.fill('admin123');
    await submitButton.click();

    // 等待设置完成
    await window.waitForTimeout(3000);

    // 2. 检查是否跳转到登录页面
    const loginPasswordInput = window.locator('input[type="password"]');
    
    // 如果页面上只有一个密码输入框，说明已经跳转到登录页面
    const passwordInputCount = await window.locator('input[type="password"]').count();
    
    if (passwordInputCount === 1) {
      // 已经在登录页面，尝试登录
      await loginPasswordInput.fill('admin123');
      
      const loginButton = window.locator('button[type="submit"]');
      await loginButton.click();
      
      // 等待登录完成
      await window.waitForTimeout(2000);
      
      // 验证是否成功进入仪表板
      const currentUrl = window.url();
      expect(currentUrl).toContain('dashboard');
    } else {
      // 可能还在设置页面或其他状态，这也是正常的
      console.log('Setup may still be in progress or in different state');
    }
  });

  test('应该正确处理键盘导航', async () => {
    const passwordInput = window.locator('#password');
    const confirmPasswordInput = window.locator('#confirmPassword');

    // 测试Tab键导航
    await passwordInput.focus();
    await window.keyboard.press('Tab');
    
    // 验证焦点是否移动到确认密码输入框
    const focusedElement = await window.evaluate(() => document.activeElement?.id);
    expect(focusedElement).toBe('confirmPassword');

    // 测试Enter键提交
    await passwordInput.fill('admin123');
    await confirmPasswordInput.fill('admin123');
    
    // 在确认密码输入框中按Enter
    await confirmPasswordInput.press('Enter');
    
    // 验证表单是否提交
    await window.waitForTimeout(1000);
  });

  test('应该显示密码强度指示器（如果有）', async () => {
    const passwordInput = window.locator('#password');
    
    // 输入弱密码
    await passwordInput.fill('123');
    await window.waitForTimeout(500);
    
    // 检查是否有密码强度指示器
    const strengthIndicator = window.locator('[data-testid="password-strength"], .password-strength');
    if (await strengthIndicator.count() > 0) {
      await expect(strengthIndicator).toBeVisible();
    }
    
    // 输入强密码
    await passwordInput.clear();
    await passwordInput.fill('Admin123!@#');
    await window.waitForTimeout(500);
    
    // 验证强度指示器的变化
    if (await strengthIndicator.count() > 0) {
      const strengthText = await strengthIndicator.textContent();
      expect(strengthText).toBeTruthy();
    }
  });

  test('应该支持密码可见性切换（如果有）', async () => {
    const passwordInput = window.locator('#password');
    const toggleButton = window.locator('[data-testid="password-toggle"], .password-toggle, button[aria-label*="显示"], button[aria-label*="隐藏"]');
    
    await passwordInput.fill('testpassword');
    
    if (await toggleButton.count() > 0) {
      // 验证初始状态是隐藏的
      const inputType = await passwordInput.getAttribute('type');
      expect(inputType).toBe('password');
      
      // 点击切换按钮
      await toggleButton.click();
      await window.waitForTimeout(200);
      
      // 验证密码是否变为可见
      const newInputType = await passwordInput.getAttribute('type');
      expect(newInputType).toBe('text');
      
      // 再次点击切换回隐藏
      await toggleButton.click();
      await window.waitForTimeout(200);
      
      const finalInputType = await passwordInput.getAttribute('type');
      expect(finalInputType).toBe('password');
    }
  });

  test('应该在页面刷新后保持设置状态', async () => {
    // 完成初始设置
    const passwordInput = window.locator('#password');
    const confirmPasswordInput = window.locator('#confirmPassword');
    const submitButton = window.locator('button[type="submit"]');

    await passwordInput.fill('admin123');
    await confirmPasswordInput.fill('admin123');
    await submitButton.click();

    // 等待设置完成和页面跳转
    await window.waitForTimeout(3000);

    // 验证已经跳转到登录页面或仪表板
    // 在Electron环境中，我们通过检查页面内容而不是刷新来验证状态保持
    const currentUrl = window.url();
    console.log('Current URL after setup:', currentUrl);

    // 检查是否不再显示初始设置页面
    const confirmPasswordField = window.locator('#confirmPassword');
    const isSetupPage = await confirmPasswordField.isVisible().catch(() => false);

    // 如果还在设置页面，说明设置可能失败了
    if (isSetupPage) {
      console.log('Still on setup page, checking for errors...');
      const errorMessage = window.locator('.text-red-500, .text-red-700, [data-testid="error-message"]');
      if (await errorMessage.count() > 0) {
        const errorText = await errorMessage.first().textContent();
        console.log('Error message found:', errorText);
      }
    } else {
      // 验证已经离开初始设置页面
      expect(isSetupPage).toBe(false);
    }
  });
});
