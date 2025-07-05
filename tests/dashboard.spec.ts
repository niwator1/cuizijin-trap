import { test, expect } from '@playwright/test';

test.describe('控制台页面测试', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/');
    await page.locator('input[type="password"]').fill('admin');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('应该显示控制台主要元素', async ({ page }) => {
    // 检查侧边栏
    await expect(page.locator('nav')).toBeVisible();
    
    // 检查应用标题
    await expect(page.locator('text=崔子瑾诱捕器')).toBeVisible();
    
    // 检查导航菜单项
    await expect(page.locator('text=控制台')).toBeVisible();
    await expect(page.locator('text=设置')).toBeVisible();
    await expect(page.locator('text=紧急重置')).toBeVisible();
    
    // 检查代理状态
    await expect(page.locator('text=代理状态')).toBeVisible();
    
    // 检查拦截统计
    await expect(page.locator('text=今日拦截')).toBeVisible();
  });

  test('应该显示代理服务状态', async ({ page }) => {
    // 检查代理状态指示器
    const statusElement = page.locator('[data-testid="proxy-status"]');
    
    // 状态应该是以下之一：运行中、已停止、启动中、停止中、错误
    await expect(statusElement).toContainText(/运行中|已停止|启动中|停止中|错误/);
  });

  test('应该显示统计信息', async ({ page }) => {
    // 检查今日拦截数量
    const todayBlocked = page.locator('[data-testid="today-blocked"]');
    await expect(todayBlocked).toBeVisible();
    
    // 数量应该是数字
    const blockedText = await todayBlocked.textContent();
    expect(blockedText).toMatch(/\d+/);
  });

  test('导航菜单应该正常工作', async ({ page }) => {
    // 点击设置菜单
    await page.locator('text=设置').click();
    await expect(page).toHaveURL(/\/settings/);
    
    // 返回控制台
    await page.locator('text=控制台').click();
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 点击紧急重置（应该有确认对话框）
    await page.locator('text=紧急重置').click();
    await expect(page).toHaveURL(/\/emergency/);
  });

  test('主题切换应该正常工作', async ({ page }) => {
    // 查找主题切换按钮
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    
    if (await themeToggle.isVisible()) {
      const body = page.locator('body');
      
      // 获取当前主题
      const initialClass = await body.getAttribute('class');
      
      // 切换主题
      await themeToggle.click();
      
      // 等待主题切换完成
      await page.waitForTimeout(100);
      
      // 检查主题是否改变
      const newClass = await body.getAttribute('class');
      expect(newClass).not.toBe(initialClass);
    }
  });

  test('退出登录应该正常工作', async ({ page }) => {
    // 点击退出登录按钮
    await page.locator('text=退出登录').click();
    
    // 应该跳转回登录页面
    await expect(page).toHaveURL(/\/login|\/$/);
    
    // 检查登录表单是否显示
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('应该响应窗口大小变化', async ({ page }) => {
    // 设置为移动设备大小
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 检查侧边栏是否适应移动设备
    const sidebar = page.locator('nav');
    await expect(sidebar).toBeVisible();
    
    // 恢复桌面大小
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // 检查布局是否恢复正常
    await expect(sidebar).toBeVisible();
  });

  test('应该显示版本信息', async ({ page }) => {
    // 检查版本号
    await expect(page.locator('text=v1.0.0')).toBeVisible();
  });

  test('键盘导航应该正常工作', async ({ page }) => {
    // 使用Tab键导航
    await page.keyboard.press('Tab');
    
    // 检查焦点是否正确移动
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // 使用回车键激活按钮
    await page.keyboard.press('Enter');
    
    // 根据焦点元素的不同，检查相应的行为
  });
});
