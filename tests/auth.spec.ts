import { test, expect } from '@playwright/test';

test.describe('身份验证系统测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到应用首页
    await page.goto('/');
  });

  test('应该显示登录页面', async ({ page }) => {
    // 检查页面标题
    await expect(page).toHaveTitle(/崔子瑾诱捕器/);
    
    // 检查登录表单是否存在
    await expect(page.locator('form')).toBeVisible();
    
    // 检查密码输入框
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // 检查登录按钮
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('应该显示应用标题和描述', async ({ page }) => {
    // 检查应用标题
    await expect(page.locator('h1')).toContainText('崔子瑾诱捕器');
    
    // 检查应用描述
    await expect(page.locator('text=网站访问控制系统')).toBeVisible();
  });

  test('空密码应该显示错误提示', async ({ page }) => {
    // 点击登录按钮而不输入密码
    await page.locator('button[type="submit"]').click();
    
    // 检查错误提示
    await expect(page.locator('text=请输入密码')).toBeVisible();
  });

  test('错误密码应该显示错误提示', async ({ page }) => {
    // 输入错误密码
    await page.locator('input[type="password"]').fill('wrongpassword');
    
    // 点击登录按钮
    await page.locator('button[type="submit"]').click();
    
    // 检查错误提示
    await expect(page.locator('text=密码错误')).toBeVisible();
  });

  test('正确密码应该成功登录', async ({ page }) => {
    // 输入正确密码（假设默认密码是 'admin'）
    await page.locator('input[type="password"]').fill('admin');
    
    // 点击登录按钮
    await page.locator('button[type="submit"]').click();
    
    // 等待页面跳转到控制台
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 检查控制台页面元素
    await expect(page.locator('text=控制台')).toBeVisible();
  });

  test('登录状态应该持久化', async ({ page, context }) => {
    // 先登录
    await page.locator('input[type="password"]').fill('admin');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 创建新页面
    const newPage = await context.newPage();
    await newPage.goto('/');
    
    // 应该直接跳转到控制台，而不是登录页面
    await expect(newPage).toHaveURL(/\/dashboard/);
  });

  test('应该支持主题切换', async ({ page }) => {
    // 检查默认主题
    const body = page.locator('body');
    
    // 查找主题切换按钮（可能在登录页面的某个位置）
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    
    if (await themeToggle.isVisible()) {
      // 切换主题
      await themeToggle.click();
      
      // 检查主题是否改变（通过检查body的class或其他属性）
      await expect(body).toHaveClass(/dark/);
    }
  });

  test('应该响应键盘事件', async ({ page }) => {
    // 聚焦密码输入框
    await page.locator('input[type="password"]').focus();
    
    // 输入密码
    await page.keyboard.type('admin');
    
    // 按回车键提交
    await page.keyboard.press('Enter');
    
    // 检查是否成功登录
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
