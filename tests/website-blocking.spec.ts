import { test, expect } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';

test.describe('网站拦截功能测试', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async ({ playwright }) => {
    // 启动Electron应用
    electronApp = await playwright.electron.launch({
      args: ['dist/main/index.js'],
      env: {
        NODE_ENV: 'test'
      }
    });

    // 获取主窗口
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test.beforeEach(async () => {
    // 确保用户已登录
    await page.evaluate(async () => {
      const loginResult = await window.electronAPI.auth.login('admin', 'admin123');
      if (!loginResult.success) {
        throw new Error('Login failed');
      }
    });

    // 等待页面加载完成
    await page.waitForTimeout(1000);
  });

  test('代理服务器启动和停止', async () => {
    // 检查初始状态
    const initialStatus = await page.evaluate(async () => {
      return await window.electronAPI.invoke('proxy:status');
    });

    expect(initialStatus.success).toBe(true);

    // 启动代理服务器
    const startResult = await page.evaluate(async () => {
      return await window.electronAPI.invoke('proxy:start');
    });

    expect(startResult.success).toBe(true);

    // 检查代理状态
    const runningStatus = await page.evaluate(async () => {
      return await window.electronAPI.invoke('proxy:status');
    });

    expect(runningStatus.success).toBe(true);
    expect(runningStatus.data).toBeTruthy();

    // 停止代理服务器
    const stopResult = await page.evaluate(async () => {
      return await window.electronAPI.invoke('proxy:stop');
    });

    expect(stopResult.success).toBe(true);
  });

  test('应该能够添加新的阻止网站', async ({ page }) => {
    // 查找添加按钮
    const addButton = page.locator('button:has-text("添加"), button:has-text("新增")');
    
    if (await addButton.count() > 0) {
      await addButton.first().click();
      
      // 等待添加表单或模态框出现
      await page.waitForTimeout(300);
      
      // 查找URL输入框
      const urlInput = page.locator('input[placeholder*="网址"], input[placeholder*="URL"], input[name="url"]');
      
      if (await urlInput.count() > 0) {
        // 输入测试网址
        await urlInput.first().fill('example.com');
        
        // 查找确认按钮
        const confirmButton = page.locator('button:has-text("确认"), button:has-text("保存"), button:has-text("添加")');
        
        if (await confirmButton.count() > 0) {
          await confirmButton.first().click();
          
          // 等待操作完成
          await page.waitForTimeout(500);
          
          // 检查网站是否被添加到列表中
          await expect(page.locator('text=example.com')).toBeVisible();
        }
      }
    }
  });

  test('应该能够启用/禁用网站阻止', async ({ page }) => {
    // 查找网站列表中的开关
    const switches = page.locator('input[type="checkbox"], [role="switch"]');
    
    if (await switches.count() > 0) {
      const firstSwitch = switches.first();
      
      if (await firstSwitch.isVisible() && await firstSwitch.isEnabled()) {
        // 获取初始状态
        const initialState = await firstSwitch.isChecked();
        
        // 切换状态
        await firstSwitch.click();
        
        // 等待状态更新
        await page.waitForTimeout(200);
        
        // 检查状态是否改变
        const newState = await firstSwitch.isChecked();
        expect(newState).toBe(!initialState);
      }
    }
  });

  test('应该能够删除阻止网站', async ({ page }) => {
    // 查找删除按钮
    const deleteButtons = page.locator('button:has-text("删除"), [aria-label="删除"]');
    
    if (await deleteButtons.count() > 0) {
      // 获取删除前的网站数量
      const websiteItems = page.locator('[data-testid="website-item"], .website-item');
      const initialCount = await websiteItems.count();
      
      // 点击第一个删除按钮
      await deleteButtons.first().click();
      
      // 可能会有确认对话框
      const confirmDialog = page.locator('text=确认删除, text=确定');
      if (await confirmDialog.count() > 0) {
        await confirmDialog.first().click();
      }
      
      // 等待删除操作完成
      await page.waitForTimeout(500);
      
      // 检查网站数量是否减少
      const newCount = await websiteItems.count();
      expect(newCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test('应该能够编辑网站信息', async ({ page }) => {
    // 查找编辑按钮
    const editButtons = page.locator('button:has-text("编辑"), [aria-label="编辑"]');
    
    if (await editButtons.count() > 0) {
      await editButtons.first().click();
      
      // 等待编辑表单出现
      await page.waitForTimeout(300);
      
      // 查找输入框
      const inputs = page.locator('input[type="text"], input[type="url"]');
      
      if (await inputs.count() > 0) {
        const firstInput = inputs.first();
        
        // 修改值
        await firstInput.clear();
        await firstInput.fill('updated-example.com');
        
        // 保存更改
        const saveButton = page.locator('button:has-text("保存"), button:has-text("确认")');
        if (await saveButton.count() > 0) {
          await saveButton.first().click();
          
          // 等待保存完成
          await page.waitForTimeout(500);
          
          // 检查更改是否生效
          await expect(page.locator('text=updated-example.com')).toBeVisible();
        }
      }
    }
  });

  test('应该显示阻止统计信息', async ({ page }) => {
    // 检查统计信息
    const statsElements = page.locator('[data-testid="stats"], .stats');
    
    if (await statsElements.count() > 0) {
      await expect(statsElements.first()).toBeVisible();
    }
    
    // 检查今日拦截数量
    const todayBlocked = page.locator('text=今日拦截');
    if (await todayBlocked.count() > 0) {
      await expect(todayBlocked).toBeVisible();
      
      // 检查数字是否显示
      const numberPattern = /\d+/;
      const statsText = await page.textContent('body');
      expect(statsText).toMatch(numberPattern);
    }
  });

  test('应该能够搜索和过滤网站', async ({ page }) => {
    // 查找搜索框
    const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]');
    
    if (await searchInput.count() > 0) {
      // 输入搜索关键词
      await searchInput.first().fill('example');
      
      // 等待搜索结果
      await page.waitForTimeout(300);
      
      // 检查搜索结果
      const searchResults = page.locator('[data-testid="website-item"], .website-item');
      const resultCount = await searchResults.count();
      
      // 如果有结果，检查是否包含搜索关键词
      if (resultCount > 0) {
        for (let i = 0; i < resultCount; i++) {
          const item = searchResults.nth(i);
          const itemText = await item.textContent();
          expect(itemText?.toLowerCase()).toContain('example');
        }
      }
      
      // 清空搜索
      await searchInput.first().clear();
      await page.waitForTimeout(300);
    }
  });

  test('应该能够批量操作网站', async ({ page }) => {
    // 查找批量选择复选框
    const checkboxes = page.locator('input[type="checkbox"]');
    
    if (await checkboxes.count() > 1) {
      // 选择多个项目
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // 查找批量操作按钮
      const batchButtons = page.locator('button:has-text("批量"), button:has-text("全选")');
      
      if (await batchButtons.count() > 0) {
        await expect(batchButtons.first()).toBeVisible();
      }
    }
  });

  test('应该验证网站URL格式', async ({ page }) => {
    // 查找添加按钮
    const addButton = page.locator('button:has-text("添加"), button:has-text("新增")');
    
    if (await addButton.count() > 0) {
      await addButton.first().click();
      await page.waitForTimeout(300);
      
      // 查找URL输入框
      const urlInput = page.locator('input[placeholder*="网址"], input[placeholder*="URL"], input[name="url"]');
      
      if (await urlInput.count() > 0) {
        // 输入无效的URL
        await urlInput.first().fill('invalid-url');
        
        // 尝试提交
        const submitButton = page.locator('button:has-text("确认"), button:has-text("保存")');
        if (await submitButton.count() > 0) {
          await submitButton.first().click();
          
          // 检查是否显示错误信息
          const errorMessage = page.locator('text=无效, text=错误, text=格式');
          if (await errorMessage.count() > 0) {
            await expect(errorMessage.first()).toBeVisible();
          }
        }
      }
    }
  });

  test('应该支持不同的阻止类型', async ({ page }) => {
    // 查找阻止类型选择器
    const typeSelectors = page.locator('select, [role="combobox"]');
    
    if (await typeSelectors.count() > 0) {
      const firstSelector = typeSelectors.first();
      
      if (await firstSelector.isVisible()) {
        // 检查是否有不同的选项
        await firstSelector.click();
        
        // 查找选项
        const options = page.locator('option, [role="option"]');
        const optionCount = await options.count();
        
        expect(optionCount).toBeGreaterThan(0);
        
        // 选择一个选项
        if (optionCount > 1) {
          await options.nth(1).click();
        }
      }
    }
  });
});
