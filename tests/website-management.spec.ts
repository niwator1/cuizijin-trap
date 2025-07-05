import { test, expect } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import { _electron as electron } from 'playwright';
import path from 'path';

/**
 * 网站管理功能测试
 * 测试网站添加、删除、启用/禁用、批量操作等功能
 */

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // 启动Electron应用
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../dist/main/index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });
  
  // 获取第一个窗口
  page = await electronApp.firstWindow();
  
  // 等待应用加载
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
});

test.afterAll(async () => {
  await electronApp?.close();
});

test.describe('网站管理基础功能', () => {
  test('获取网站列表', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.sites.getAll();
    });
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  test('添加新网站', async () => {
    const testSite = {
      url: 'https://test-management.com',
      title: '测试管理网站',
      description: '用于测试网站管理功能',
      category: 'test',
      enabled: true
    };

    const result = await page.evaluate(async (siteData) => {
      return await window.electronAPI.sites.add(siteData);
    }, testSite);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
    expect(result.data.url).toBe(testSite.url);
    expect(result.data.title).toBe(testSite.title);
    expect(result.data.enabled).toBe(testSite.enabled);
  });

  test('切换网站启用状态', async () => {
    // 先添加一个网站
    const testSite = {
      url: 'https://toggle-test.com',
      title: '切换测试网站',
      enabled: true
    };

    const addResult = await page.evaluate(async (siteData) => {
      return await window.electronAPI.sites.add(siteData);
    }, testSite);

    expect(addResult.success).toBe(true);
    const siteId = addResult.data.id;

    // 切换状态
    const toggleResult = await page.evaluate(async (id) => {
      return await window.electronAPI.sites.toggle(id);
    }, siteId);

    expect(toggleResult.success).toBe(true);
    expect(toggleResult.data.enabled).toBe(false);
  });

  test('删除网站', async () => {
    // 先添加一个网站
    const testSite = {
      url: 'https://delete-test.com',
      title: '删除测试网站'
    };

    const addResult = await page.evaluate(async (siteData) => {
      return await window.electronAPI.sites.add(siteData);
    }, testSite);

    expect(addResult.success).toBe(true);
    const siteId = addResult.data.id;

    // 删除网站
    const deleteResult = await page.evaluate(async (id) => {
      return await window.electronAPI.sites.delete(id);
    }, siteId);

    expect(deleteResult.success).toBe(true);

    // 验证网站已被删除
    const allSites = await page.evaluate(async () => {
      return await window.electronAPI.sites.getAll();
    });

    const deletedSite = allSites.data.find((site: any) => site.id === siteId);
    expect(deletedSite).toBeUndefined();
  });
});

test.describe('网站管理验证功能', () => {
  test('添加无效URL应该失败', async () => {
    const invalidSite = {
      url: 'not-a-valid-url',
      title: '无效URL网站'
    };

    const result = await page.evaluate(async (siteData) => {
      return await window.electronAPI.sites.add(siteData);
    }, invalidSite);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('添加重复网站应该失败', async () => {
    const testSite = {
      url: 'https://duplicate-test.com',
      title: '重复测试网站'
    };

    // 第一次添加
    const firstResult = await page.evaluate(async (siteData) => {
      return await window.electronAPI.sites.add(siteData);
    }, testSite);

    expect(firstResult.success).toBe(true);

    // 第二次添加相同URL
    const secondResult = await page.evaluate(async (siteData) => {
      return await window.electronAPI.sites.add(siteData);
    }, testSite);

    expect(secondResult.success).toBe(false);
    expect(secondResult.error).toContain('already exists');
  });

  test('操作不存在的网站应该失败', async () => {
    const nonExistentId = 'non-existent-id';

    // 尝试切换不存在的网站
    const toggleResult = await page.evaluate(async (id) => {
      return await window.electronAPI.sites.toggle(id);
    }, nonExistentId);

    expect(toggleResult.success).toBe(false);

    // 尝试删除不存在的网站
    const deleteResult = await page.evaluate(async (id) => {
      return await window.electronAPI.sites.delete(id);
    }, nonExistentId);

    expect(deleteResult.success).toBe(false);
  });
});

test.describe('批量操作功能', () => {
  test('批量添加网站', async () => {
    const testSites = [
      { url: 'https://batch1.com', title: '批量测试1' },
      { url: 'https://batch2.com', title: '批量测试2' },
      { url: 'https://batch3.com', title: '批量测试3' }
    ];

    const results = [];
    for (const site of testSites) {
      const result = await page.evaluate(async (siteData) => {
        return await window.electronAPI.sites.add(siteData);
      }, site);
      results.push(result);
    }

    // 检查所有添加操作都成功
    expect(results.every(r => r.success)).toBe(true);

    // 验证网站都已添加
    const allSites = await page.evaluate(async () => {
      return await window.electronAPI.sites.getAll();
    });

    const addedUrls = testSites.map(s => s.url);
    const foundSites = allSites.data.filter((site: any) => 
      addedUrls.includes(site.url)
    );

    expect(foundSites.length).toBe(testSites.length);
  });

  test('重置所有网站', async () => {
    // 先添加一些网站
    const testSites = [
      { url: 'https://reset1.com', title: '重置测试1' },
      { url: 'https://reset2.com', title: '重置测试2' }
    ];

    for (const site of testSites) {
      await page.evaluate(async (siteData) => {
        return await window.electronAPI.sites.add(siteData);
      }, site);
    }

    // 重置所有网站
    const resetResult = await page.evaluate(async () => {
      return await window.electronAPI.sites.resetAll();
    });

    expect(resetResult.success).toBe(true);

    // 验证所有网站都被删除
    const allSites = await page.evaluate(async () => {
      return await window.electronAPI.sites.getAll();
    });

    expect(allSites.data.length).toBe(0);
  });
});

test.describe('网站分类管理', () => {
  test('按分类添加网站', async () => {
    const categories = ['social', 'gaming', 'news', 'entertainment'];
    const testSites = categories.map((category, index) => ({
      url: `https://${category}-test-${index}.com`,
      title: `${category}测试网站`,
      category: category
    }));

    // 添加不同分类的网站
    for (const site of testSites) {
      const result = await page.evaluate(async (siteData) => {
        return await window.electronAPI.sites.add(siteData);
      }, site);
      expect(result.success).toBe(true);
      expect(result.data.category).toBe(site.category);
    }

    // 验证分类正确设置
    const allSites = await page.evaluate(async () => {
      return await window.electronAPI.sites.getAll();
    });

    const categorizedSites = allSites.data.filter((site: any) => 
      categories.includes(site.category)
    );

    expect(categorizedSites.length).toBe(categories.length);
  });
});

test.describe('网站状态管理', () => {
  test('启用和禁用网站', async () => {
    const testSite = {
      url: 'https://status-test.com',
      title: '状态测试网站',
      enabled: true
    };

    // 添加启用的网站
    const addResult = await page.evaluate(async (siteData) => {
      return await window.electronAPI.sites.add(siteData);
    }, testSite);

    expect(addResult.success).toBe(true);
    expect(addResult.data.enabled).toBe(true);

    const siteId = addResult.data.id;

    // 禁用网站
    const disableResult = await page.evaluate(async (id) => {
      return await window.electronAPI.sites.toggle(id);
    }, siteId);

    expect(disableResult.success).toBe(true);
    expect(disableResult.data.enabled).toBe(false);

    // 重新启用网站
    const enableResult = await page.evaluate(async (id) => {
      return await window.electronAPI.sites.toggle(id);
    }, siteId);

    expect(enableResult.success).toBe(true);
    expect(enableResult.data.enabled).toBe(true);
  });
});

test.describe('数据持久化', () => {
  test('网站数据应该持久化保存', async () => {
    const testSite = {
      url: 'https://persistence-test.com',
      title: '持久化测试网站',
      description: '测试数据持久化功能',
      category: 'test'
    };

    // 添加网站
    const addResult = await page.evaluate(async (siteData) => {
      return await window.electronAPI.sites.add(siteData);
    }, testSite);

    expect(addResult.success).toBe(true);

    // 获取数据库状态
    const dbStatus = await page.evaluate(async () => {
      return await window.electronAPI.database.getStatus();
    });

    expect(dbStatus.success).toBe(true);
    expect(dbStatus.data.isInitialized).toBe(true);

    // 验证网站确实被保存
    const allSites = await page.evaluate(async () => {
      return await window.electronAPI.sites.getAll();
    });

    const savedSite = allSites.data.find((site: any) => site.url === testSite.url);
    expect(savedSite).toBeDefined();
    expect(savedSite.title).toBe(testSite.title);
    expect(savedSite.description).toBe(testSite.description);
    expect(savedSite.category).toBe(testSite.category);
  });
});
