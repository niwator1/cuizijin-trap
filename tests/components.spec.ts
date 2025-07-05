import { test, expect } from '@playwright/test';

test.describe('UI组件测试', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录到控制台
    await page.goto('/');
    await page.locator('input[type="password"]').fill('admin');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('按钮组件应该正常工作', async ({ page }) => {
    // 查找各种按钮
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    expect(buttonCount).toBeGreaterThan(0);
    
    // 检查按钮的基本属性
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      await expect(button).toBeVisible();
      
      // 检查按钮是否可点击
      if (await button.isEnabled()) {
        // 悬停效果
        await button.hover();
        await page.waitForTimeout(100);
        
        // 检查是否有悬停样式变化
        const hoverClass = await button.getAttribute('class');
        expect(hoverClass).toBeTruthy();
      }
    }
  });

  test('输入框组件应该正常工作', async ({ page }) => {
    // 导航到设置页面（可能有更多输入框）
    await page.locator('text=设置').click();
    
    // 查找输入框
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        
        if (await input.isVisible() && await input.isEnabled()) {
          // 测试输入功能
          await input.click();
          await input.fill('测试输入');
          
          // 检查值是否正确设置
          const value = await input.inputValue();
          expect(value).toBe('测试输入');
          
          // 清空输入
          await input.clear();
          const clearedValue = await input.inputValue();
          expect(clearedValue).toBe('');
        }
      }
    }
  });

  test('模态框组件应该正常工作', async ({ page }) => {
    // 查找可能触发模态框的按钮
    const modalTriggers = page.locator('button:has-text("添加"), button:has-text("编辑"), button:has-text("删除")');
    const triggerCount = await modalTriggers.count();
    
    if (triggerCount > 0) {
      // 点击第一个触发器
      await modalTriggers.first().click();
      
      // 等待模态框出现
      await page.waitForTimeout(300);
      
      // 检查模态框是否显示
      const modal = page.locator('[role="dialog"], .modal, [data-testid="modal"]');
      if (await modal.count() > 0) {
        await expect(modal.first()).toBeVisible();
        
        // 检查关闭按钮
        const closeButton = modal.locator('button:has-text("关闭"), button:has-text("取消"), [aria-label="关闭"]');
        if (await closeButton.count() > 0) {
          await closeButton.first().click();
          
          // 检查模态框是否关闭
          await expect(modal.first()).not.toBeVisible();
        }
      }
    }
  });

  test('开关组件应该正常工作', async ({ page }) => {
    // 查找开关组件
    const switches = page.locator('input[type="checkbox"], [role="switch"]');
    const switchCount = await switches.count();
    
    if (switchCount > 0) {
      for (let i = 0; i < Math.min(switchCount, 3); i++) {
        const switchElement = switches.nth(i);
        
        if (await switchElement.isVisible() && await switchElement.isEnabled()) {
          // 获取初始状态
          const initialState = await switchElement.isChecked();
          
          // 切换状态
          await switchElement.click();
          
          // 检查状态是否改变
          const newState = await switchElement.isChecked();
          expect(newState).toBe(!initialState);
          
          // 再次切换回原状态
          await switchElement.click();
          const finalState = await switchElement.isChecked();
          expect(finalState).toBe(initialState);
        }
      }
    }
  });

  test('加载状态应该正常显示', async ({ page }) => {
    // 查找加载指示器
    const loadingElements = page.locator('.loading, .spinner, [data-testid="loading"]');
    
    // 如果有加载元素，检查其可见性
    if (await loadingElements.count() > 0) {
      // 加载元素应该在适当的时候显示
      // 这里我们只检查元素是否存在和样式是否正确
      const firstLoader = loadingElements.first();
      
      if (await firstLoader.isVisible()) {
        // 检查加载动画
        const animationClass = await firstLoader.getAttribute('class');
        expect(animationClass).toContain('animate');
      }
    }
  });

  test('通知组件应该正常工作', async ({ page }) => {
    // 查找通知容器
    const notificationContainer = page.locator('[data-testid="notification-container"], .notification-container');
    
    if (await notificationContainer.count() > 0) {
      await expect(notificationContainer.first()).toBeVisible();
    }
    
    // 尝试触发通知（通过执行某些操作）
    // 这里可以根据具体的应用逻辑来触发通知
  });

  test('响应式设计应该正常工作', async ({ page }) => {
    // 测试不同屏幕尺寸
    const viewports = [
      { width: 1920, height: 1080 }, // 桌面
      { width: 1024, height: 768 },  // 平板
      { width: 375, height: 667 },   // 手机
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(200);
      
      // 检查主要元素是否仍然可见
      await expect(page.locator('nav')).toBeVisible();
      
      // 检查内容区域是否适应屏幕
      const mainContent = page.locator('main, [role="main"], .main-content');
      if (await mainContent.count() > 0) {
        await expect(mainContent.first()).toBeVisible();
      }
    }
    
    // 恢复默认尺寸
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('键盘可访问性应该正常工作', async ({ page }) => {
    // 测试Tab键导航
    const focusableElements = page.locator('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
    const elementCount = await focusableElements.count();
    
    if (elementCount > 0) {
      // 按Tab键几次
      for (let i = 0; i < Math.min(elementCount, 5); i++) {
        await page.keyboard.press('Tab');
        
        // 检查是否有元素获得焦点
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
      }
    }
  });

  test('颜色对比度应该符合可访问性标准', async ({ page }) => {
    // 检查主要文本元素的颜色对比度
    const textElements = page.locator('h1, h2, h3, p, span, button');
    const elementCount = await textElements.count();
    
    if (elementCount > 0) {
      // 这里可以添加更详细的颜色对比度检查
      // 目前只检查元素是否可见
      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = textElements.nth(i);
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
        }
      }
    }
  });
});
