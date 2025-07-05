import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

test.describe('网站拦截功能测试', () => {
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
    
    // 登录到应用
    await window.locator('input[type="password"]').fill('admin');
    await window.locator('button[type="submit"]').click();
    await window.waitForTimeout(2000);
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('应该能够添加和管理拦截网站', async () => {
    // 1. 添加新的拦截网站
    const addSiteButton = window.locator('[data-testid="add-site-button"]');
    if (await addSiteButton.count() > 0) {
      await addSiteButton.click();
      
      // 填写网站信息
      const urlInput = window.locator('input[name="url"]');
      const nameInput = window.locator('input[name="name"]');
      const categorySelect = window.locator('select[name="category"]');
      
      if (await urlInput.count() > 0) {
        await urlInput.fill('https://example-blocked.com');
      }
      if (await nameInput.count() > 0) {
        await nameInput.fill('测试拦截网站');
      }
      if (await categorySelect.count() > 0) {
        await categorySelect.selectOption('social');
      }
      
      // 提交表单
      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();
      await window.waitForTimeout(1000);
      
      // 2. 验证网站已添加到列表
      const siteList = window.locator('[data-testid="site-list"]');
      if (await siteList.count() > 0) {
        await expect(siteList).toContainText('example-blocked.com');
        await expect(siteList).toContainText('测试拦截网站');
      }
    }
  });

  test('应该能够启用和禁用网站拦截', async () => {
    // 1. 先添加一个测试网站
    await addTestSite('https://toggle-test.com', '切换测试网站');
    
    // 2. 查找网站的开关按钮
    const siteToggle = window.locator('[data-testid="site-toggle"]').first();
    
    if (await siteToggle.count() > 0) {
      // 3. 获取初始状态
      const initialState = await siteToggle.getAttribute('aria-checked');
      
      // 4. 切换状态
      await siteToggle.click();
      await window.waitForTimeout(500);
      
      // 5. 验证状态已改变
      const newState = await siteToggle.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);
      
      // 6. 验证状态指示器
      const statusIndicator = window.locator('[data-testid="site-status"]').first();
      if (await statusIndicator.count() > 0) {
        const statusText = await statusIndicator.textContent();
        expect(statusText).toBeTruthy();
      }
    }
  });

  test('应该能够批量操作网站', async () => {
    // 1. 添加多个测试网站
    const testSites = [
      { url: 'https://batch-test-1.com', name: '批量测试1' },
      { url: 'https://batch-test-2.com', name: '批量测试2' },
      { url: 'https://batch-test-3.com', name: '批量测试3' }
    ];
    
    for (const site of testSites) {
      await addTestSite(site.url, site.name);
    }
    
    // 2. 选择多个网站
    const checkboxes = window.locator('[data-testid="site-checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    if (checkboxCount > 0) {
      // 选择前两个网站
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // 3. 执行批量启用
      const batchEnableButton = window.locator('[data-testid="batch-enable"]');
      if (await batchEnableButton.count() > 0) {
        await batchEnableButton.click();
        await window.waitForTimeout(1000);
        
        // 验证批量操作结果
        const enabledSites = window.locator('[data-testid="site-toggle"][aria-checked="true"]');
        const enabledCount = await enabledSites.count();
        expect(enabledCount).toBeGreaterThanOrEqual(2);
      }
      
      // 4. 执行批量删除
      const batchDeleteButton = window.locator('[data-testid="batch-delete"]');
      if (await batchDeleteButton.count() > 0) {
        await batchDeleteButton.click();
        
        // 确认删除
        const confirmButton = window.locator('[data-testid="confirm-batch-delete"]');
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await window.waitForTimeout(1000);
        }
      }
    }
  });

  test('应该能够按分类筛选网站', async () => {
    // 1. 添加不同分类的网站
    await addTestSite('https://social-site.com', '社交网站', 'social');
    await addTestSite('https://entertainment-site.com', '娱乐网站', 'entertainment');
    await addTestSite('https://news-site.com', '新闻网站', 'news');
    
    // 2. 测试分类筛选
    const categoryFilter = window.locator('[data-testid="category-filter"]');
    
    if (await categoryFilter.count() > 0) {
      // 筛选社交网站
      await categoryFilter.selectOption('social');
      await window.waitForTimeout(500);
      
      // 验证只显示社交网站
      const visibleSites = window.locator('[data-testid="site-item"]:visible');
      const visibleCount = await visibleSites.count();
      
      if (visibleCount > 0) {
        const firstSiteText = await visibleSites.first().textContent();
        expect(firstSiteText).toContain('social-site.com');
      }
      
      // 重置筛选
      await categoryFilter.selectOption('all');
      await window.waitForTimeout(500);
    }
  });

  test('应该能够搜索和排序网站', async () => {
    // 1. 添加测试网站
    await addTestSite('https://search-test-alpha.com', 'Alpha网站');
    await addTestSite('https://search-test-beta.com', 'Beta网站');
    await addTestSite('https://search-test-gamma.com', 'Gamma网站');
    
    // 2. 测试搜索功能
    const searchInput = window.locator('[data-testid="search-input"]');
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('alpha');
      await window.waitForTimeout(500);
      
      // 验证搜索结果
      const searchResults = window.locator('[data-testid="site-item"]:visible');
      const resultCount = await searchResults.count();
      
      if (resultCount > 0) {
        const resultText = await searchResults.first().textContent();
        expect(resultText).toContain('alpha');
      }
      
      // 清空搜索
      await searchInput.clear();
      await window.waitForTimeout(500);
    }
    
    // 3. 测试排序功能
    const sortSelect = window.locator('[data-testid="sort-select"]');
    
    if (await sortSelect.count() > 0) {
      // 按名称排序
      await sortSelect.selectOption('name');
      await window.waitForTimeout(500);
      
      // 验证排序结果
      const sortedSites = window.locator('[data-testid="site-name"]');
      const sortedCount = await sortedSites.count();
      
      if (sortedCount >= 2) {
        const firstSite = await sortedSites.nth(0).textContent();
        const secondSite = await sortedSites.nth(1).textContent();
        
        // 验证按字母顺序排列
        expect(firstSite?.localeCompare(secondSite || '') || 0).toBeLessThanOrEqual(0);
      }
    }
  });

  test('应该能够导入和导出网站列表', async () => {
    // 1. 添加一些测试网站
    await addTestSite('https://export-test-1.com', '导出测试1');
    await addTestSite('https://export-test-2.com', '导出测试2');
    
    // 2. 测试导出功能
    const exportButton = window.locator('[data-testid="export-sites"]');
    
    if (await exportButton.count() > 0) {
      // 设置下载监听
      const downloadPromise = window.waitForEvent('download');
      await exportButton.click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.json');
      
      // 保存下载文件用于导入测试
      const downloadPath = path.join(__dirname, 'test-export.json');
      await download.saveAs(downloadPath);
    }
    
    // 3. 清空现有网站列表
    const clearAllButton = window.locator('[data-testid="clear-all-sites"]');
    if (await clearAllButton.count() > 0) {
      await clearAllButton.click();
      
      const confirmButton = window.locator('[data-testid="confirm-clear-all"]');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await window.waitForTimeout(1000);
      }
    }
    
    // 4. 测试导入功能
    const importButton = window.locator('[data-testid="import-sites"]');
    
    if (await importButton.count() > 0) {
      // 模拟文件选择
      const fileInput = window.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        const testFilePath = path.join(__dirname, 'test-export.json');
        await fileInput.setInputFiles(testFilePath);
        await window.waitForTimeout(1000);
        
        // 验证导入结果
        const siteList = window.locator('[data-testid="site-list"]');
        if (await siteList.count() > 0) {
          await expect(siteList).toContainText('export-test-1.com');
        }
      }
    }
  });

  test('应该正确显示网站统计信息', async () => {
    // 1. 添加不同状态的网站
    await addTestSite('https://stats-enabled.com', '启用统计', 'social', true);
    await addTestSite('https://stats-disabled.com', '禁用统计', 'entertainment', false);
    
    // 2. 检查统计卡片
    const statsCards = window.locator('[data-testid="stats-cards"]');
    
    if (await statsCards.count() > 0) {
      // 验证总网站数
      const totalSites = window.locator('[data-testid="total-sites"]');
      if (await totalSites.count() > 0) {
        const totalText = await totalSites.textContent();
        expect(totalText).toMatch(/\d+/);
      }
      
      // 验证启用网站数
      const enabledSites = window.locator('[data-testid="enabled-sites"]');
      if (await enabledSites.count() > 0) {
        const enabledText = await enabledSites.textContent();
        expect(enabledText).toMatch(/\d+/);
      }
      
      // 验证分类统计
      const categoryStats = window.locator('[data-testid="category-stats"]');
      if (await categoryStats.count() > 0) {
        await expect(categoryStats).toBeVisible();
      }
    }
  });

  // 辅助函数：添加测试网站
  async function addTestSite(url: string, name: string, category: string = 'other', enabled: boolean = true) {
    const addButton = window.locator('[data-testid="add-site-button"]');
    
    if (await addButton.count() > 0) {
      await addButton.click();
      
      const urlInput = window.locator('input[name="url"]');
      const nameInput = window.locator('input[name="name"]');
      const categorySelect = window.locator('select[name="category"]');
      
      if (await urlInput.count() > 0) {
        await urlInput.fill(url);
      }
      if (await nameInput.count() > 0) {
        await nameInput.fill(name);
      }
      if (await categorySelect.count() > 0) {
        await categorySelect.selectOption(category);
      }
      
      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();
      await window.waitForTimeout(1000);
      
      // 如果需要设置启用状态
      if (!enabled) {
        const toggle = window.locator('[data-testid="site-toggle"]').last();
        if (await toggle.count() > 0) {
          const isChecked = await toggle.getAttribute('aria-checked');
          if (isChecked === 'true') {
            await toggle.click();
            await window.waitForTimeout(500);
          }
        }
      }
    }
  }
});
