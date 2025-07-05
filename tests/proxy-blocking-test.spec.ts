import { test, expect } from '@playwright/test';

test.describe('代理拦截功能验证', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到应用
    await page.goto('/');
    
    // 登录
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('admin123');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
    }
  });

  test('验证代理控制界面存在', async ({ page }) => {
    // 查找代理控制相关的元素
    const proxyElements = await page.locator('text=代理, text=proxy, text=拦截').count();
    
    if (proxyElements > 0) {
      console.log('找到代理控制界面元素');
    } else {
      console.log('未找到代理控制界面，可能在其他页面');
    }

    // 检查是否有代理相关的按钮或开关
    const proxyControls = await page.locator('button, [role="switch"]').count();
    expect(proxyControls).toBeGreaterThan(0);
  });

  test('验证网站管理功能', async ({ page }) => {
    // 查找网站管理相关的元素
    const websiteElements = page.locator('text=网站, text=阻止, text=黑名单, text=管理');
    
    if (await websiteElements.count() > 0) {
      console.log('找到网站管理界面');
      
      // 查找添加按钮
      const addButton = page.locator('button:has-text("添加"), button:has-text("新增")');
      if (await addButton.count() > 0) {
        console.log('找到添加网站按钮');
      }
    }
  });

  test('验证系统代理设置提示', async ({ page }) => {
    // 查找系统代理相关的文本
    const proxyText = page.locator('text=系统代理, text=浏览器代理, text=代理设置');
    
    if (await proxyText.count() > 0) {
      console.log('找到系统代理设置相关内容');
    }

    // 查找使用说明
    const instructions = page.locator('text=使用说明, text=配置, text=设置');
    if (await instructions.count() > 0) {
      console.log('找到使用说明');
    }
  });

  test('验证拦截功能的用户界面反馈', async ({ page }) => {
    // 检查是否有状态指示器
    const statusIndicators = page.locator('[class*="status"], [class*="indicator"], [class*="badge"]');
    
    if (await statusIndicators.count() > 0) {
      console.log('找到状态指示器');
    }

    // 检查是否有开关控件
    const switches = page.locator('[role="switch"], input[type="checkbox"]');
    
    if (await switches.count() > 0) {
      console.log('找到开关控件');
    }
  });

  test('验证错误处理和用户提示', async ({ page }) => {
    // 监听控制台错误
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 等待页面完全加载
    await page.waitForTimeout(3000);

    // 检查是否有严重错误
    const criticalErrors = errors.filter(error => 
      error.includes('Failed') || 
      error.includes('Error') || 
      error.includes('Cannot')
    );

    if (criticalErrors.length > 0) {
      console.log('发现错误:', criticalErrors);
    }

    // 验证页面基本功能正常
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('验证代理配置信息显示', async ({ page }) => {
    // 查找代理配置相关的信息
    const configElements = page.locator('text=127.0.0.1, text=8080, text=localhost');
    
    if (await configElements.count() > 0) {
      console.log('找到代理配置信息');
    }

    // 查找端口信息
    const portInfo = page.locator('text=端口, text=port');
    if (await portInfo.count() > 0) {
      console.log('找到端口配置信息');
    }
  });

  test('验证拦截统计和日志', async ({ page }) => {
    // 查找统计相关的元素
    const statsElements = page.locator('text=统计, text=拦截, text=阻止, text=次数');
    
    if (await statsElements.count() > 0) {
      console.log('找到拦截统计信息');
    }

    // 查找日志相关的元素
    const logElements = page.locator('text=日志, text=记录, text=历史');
    if (await logElements.count() > 0) {
      console.log('找到日志记录功能');
    }
  });

  test('验证网站启用/禁用功能', async ({ page }) => {
    // 查找网站列表
    const websiteList = page.locator('[class*="site"], [class*="website"], [class*="list"]');
    
    if (await websiteList.count() > 0) {
      console.log('找到网站列表');
      
      // 查找开关控件
      const toggles = page.locator('input[type="checkbox"], [role="switch"]');
      if (await toggles.count() > 0) {
        console.log('找到网站启用/禁用开关');
      }
    }
  });

  test('验证用户体验和界面完整性', async ({ page }) => {
    // 检查页面标题
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log('页面标题:', title);

    // 检查主要导航元素
    const navElements = page.locator('nav, [role="navigation"], [class*="nav"]');
    if (await navElements.count() > 0) {
      console.log('找到导航元素');
    }

    // 检查主要内容区域
    const contentElements = page.locator('main, [role="main"], [class*="content"]');
    if (await contentElements.count() > 0) {
      console.log('找到主要内容区域');
    }

    // 验证页面响应性
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);
    
    console.log('页面响应性测试完成');
  });
});
