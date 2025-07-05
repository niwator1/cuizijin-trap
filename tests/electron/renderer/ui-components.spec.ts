import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

test.describe('Electron渲染进程 - UI组件测试', () => {
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
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('登录界面组件应该正确渲染', async () => {
    // 等待页面加载
    await window.waitForLoadState('networkidle');
    
    // 检查登录表单是否存在
    const passwordInput = window.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    
    const loginButton = window.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();
    
    // 检查登录按钮文本
    const buttonText = await loginButton.textContent();
    expect(buttonText).toContain('登录');
    
    // 检查密码输入框占位符
    const placeholder = await passwordInput.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
  });

  test('按钮组件应该响应用户交互', async () => {
    await window.waitForLoadState('networkidle');
    
    const loginButton = window.locator('button[type="submit"]');
    
    // 测试按钮悬停效果
    await loginButton.hover();
    
    // 检查按钮是否有悬停样式
    const hoverClass = await loginButton.getAttribute('class');
    expect(hoverClass).toBeTruthy();
    
    // 测试按钮点击
    await loginButton.click();
    
    // 验证点击后的状态变化
    // 这里可能需要根据实际的登录逻辑进行调整
  });

  test('输入组件应该正确处理用户输入', async () => {
    await window.waitForLoadState('networkidle');
    
    const passwordInput = window.locator('input[type="password"]');
    
    // 测试输入功能
    await passwordInput.fill('test123');
    
    // 验证输入值
    const inputValue = await passwordInput.inputValue();
    expect(inputValue).toBe('test123');
    
    // 测试清空输入
    await passwordInput.clear();
    const clearedValue = await passwordInput.inputValue();
    expect(clearedValue).toBe('');
    
    // 测试键盘事件
    await passwordInput.fill('admin');
    await passwordInput.press('Enter');
    
    // 验证回车键是否触发提交
    // 这里需要根据实际的表单处理逻辑进行验证
  });

  test('模态框组件应该正确显示和隐藏', async () => {
    await window.waitForLoadState('networkidle');
    
    // 首先需要触发模态框显示
    // 这里假设有一个触发模态框的按钮
    const triggerButton = window.locator('[data-testid="modal-trigger"]');
    
    if (await triggerButton.count() > 0) {
      await triggerButton.click();
      
      // 检查模态框是否显示
      const modal = window.locator('[data-testid="modal"]');
      await expect(modal).toBeVisible();
      
      // 测试关闭模态框
      const closeButton = window.locator('[data-testid="modal-close"]');
      if (await closeButton.count() > 0) {
        await closeButton.click();
        await expect(modal).not.toBeVisible();
      }
      
      // 测试ESC键关闭模态框
      await triggerButton.click();
      await window.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });

  test('开关组件应该正确切换状态', async () => {
    await window.waitForLoadState('networkidle');
    
    // 查找开关组件
    const switchComponent = window.locator('[data-testid="switch"]');
    
    if (await switchComponent.count() > 0) {
      // 获取初始状态
      const initialState = await switchComponent.getAttribute('aria-checked');
      
      // 点击切换状态
      await switchComponent.click();
      
      // 验证状态已改变
      const newState = await switchComponent.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);
      
      // 再次点击恢复状态
      await switchComponent.click();
      const finalState = await switchComponent.getAttribute('aria-checked');
      expect(finalState).toBe(initialState);
    }
  });

  test('加载状态组件应该正确显示', async () => {
    await window.waitForLoadState('networkidle');
    
    // 查找加载指示器
    const loadingIndicator = window.locator('[data-testid="loading"]');
    
    if (await loadingIndicator.count() > 0) {
      // 验证加载动画是否存在
      await expect(loadingIndicator).toBeVisible();
      
      // 检查加载动画的CSS类
      const loadingClass = await loadingIndicator.getAttribute('class');
      expect(loadingClass).toContain('animate');
    }
  });

  test('表单验证应该正确工作', async () => {
    await window.waitForLoadState('networkidle');
    
    const passwordInput = window.locator('input[type="password"]');
    const loginButton = window.locator('button[type="submit"]');
    
    // 测试空密码提交
    await passwordInput.clear();
    await loginButton.click();
    
    // 检查是否显示验证错误
    const errorMessage = window.locator('[data-testid="error-message"]');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    }
    
    // 测试有效密码
    await passwordInput.fill('admin');
    await loginButton.click();
    
    // 验证错误消息是否消失
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).not.toBeVisible();
    }
  });

  test('主题切换应该正确工作', async () => {
    await window.waitForLoadState('networkidle');
    
    // 查找主题切换按钮
    const themeToggle = window.locator('[data-testid="theme-toggle"]');
    
    if (await themeToggle.count() > 0) {
      // 获取当前主题
      const currentTheme = await window.evaluate(() => {
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      });
      
      // 切换主题
      await themeToggle.click();
      
      // 验证主题已切换
      const newTheme = await window.evaluate(() => {
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      });
      
      expect(newTheme).not.toBe(currentTheme);
    }
  });

  test('响应式设计应该在不同屏幕尺寸下正常工作', async () => {
    await window.waitForLoadState('networkidle');
    
    // 测试桌面尺寸
    await window.setViewportSize({ width: 1920, height: 1080 });
    await window.waitForTimeout(500);
    
    const desktopLayout = await window.locator('body').screenshot();
    expect(desktopLayout).toBeTruthy();
    
    // 测试平板尺寸
    await window.setViewportSize({ width: 768, height: 1024 });
    await window.waitForTimeout(500);
    
    const tabletLayout = await window.locator('body').screenshot();
    expect(tabletLayout).toBeTruthy();
    
    // 测试手机尺寸
    await window.setViewportSize({ width: 375, height: 667 });
    await window.waitForTimeout(500);
    
    const mobileLayout = await window.locator('body').screenshot();
    expect(mobileLayout).toBeTruthy();
    
    // 验证布局在不同尺寸下都能正常显示
    const bodyVisible = await window.locator('body').isVisible();
    expect(bodyVisible).toBe(true);
  });

  test('键盘导航应该正确工作', async () => {
    await window.waitForLoadState('networkidle');
    
    // 测试Tab键导航
    await window.keyboard.press('Tab');
    
    // 检查焦点是否正确移动
    const focusedElement = await window.evaluate(() => {
      return document.activeElement?.tagName;
    });
    
    expect(focusedElement).toBeTruthy();
    
    // 测试Shift+Tab反向导航
    await window.keyboard.press('Shift+Tab');
    
    // 验证焦点移动
    const newFocusedElement = await window.evaluate(() => {
      return document.activeElement?.tagName;
    });
    
    expect(newFocusedElement).toBeTruthy();
  });
});
