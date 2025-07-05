import { test, expect } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import { _electron as electron } from 'playwright';
import path from 'path';

/**
 * 综合功能测试
 * 测试崔子瑾诱捕器的完整工作流程和核心功能集成
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

test.describe('应用初始化和基础功能', () => {
  test('应用应该正常启动', async () => {
    // 检查应用标题
    await expect(page).toHaveTitle(/崔子瑾诱捕器/);
    
    // 检查基本UI元素存在
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('数据库应该正常初始化', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.database.getStatus();
    });
    
    expect(result.success).toBe(true);
    expect(result.data.isInitialized).toBe(true);
  });

  test('所有核心服务应该可用', async () => {
    // 检查数据库服务
    const dbResult = await page.evaluate(async () => {
      return await window.electronAPI.database.getStatus();
    });
    expect(dbResult.success).toBe(true);

    // 检查代理服务
    const proxyResult = await page.evaluate(async () => {
      return await window.electronAPI.proxy.getStatus();
    });
    expect(proxyResult.success).toBe(true);

    // 检查安全服务
    const securityResult = await page.evaluate(async () => {
      return await window.electronAPI.security.getStatus();
    });
    expect(securityResult.success).toBe(true);

    // 检查认证服务
    const authResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.isInitialized();
    });
    expect(authResult.success).toBe(true);
  });
});

test.describe('完整的用户工作流程', () => {
  test('用户初始化和登录流程', async () => {
    // 检查是否已初始化
    const initResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.isInitialized();
    });

    if (!initResult.data) {
      // 初始化用户
      const setupResult = await page.evaluate(async () => {
        return await window.electronAPI.auth.initialize('test123456', {
          sessionTimeout: 3600,
          autoStart: false,
          theme: 'system',
          language: 'zh-CN'
        });
      });
      expect(setupResult.success).toBe(true);
    }

    // 用户登录
    const loginResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.login('test123456');
    });
    expect(loginResult.success).toBe(true);
    expect(loginResult.data).toHaveProperty('sessionId');

    // 验证会话
    const sessionId = loginResult.data.sessionId;
    const authResult = await page.evaluate(async (sid) => {
      return await window.electronAPI.auth.checkAuth(sid);
    }, sessionId);
    expect(authResult.data.isAuthenticated).toBe(true);
  });

  test('网站管理完整流程', async () => {
    // 添加测试网站
    const testSites = [
      { url: 'https://example1.com', title: '测试网站1', category: 'social' },
      { url: 'https://example2.com', title: '测试网站2', category: 'gaming' },
      { url: 'https://example3.com', title: '测试网站3', category: 'news' }
    ];

    const addedSites = [];
    for (const site of testSites) {
      const result = await page.evaluate(async (siteData) => {
        return await window.electronAPI.sites.add(siteData);
      }, site);
      
      expect(result.success).toBe(true);
      addedSites.push(result.data);
    }

    // 获取网站列表
    const listResult = await page.evaluate(async () => {
      return await window.electronAPI.sites.getAll();
    });
    expect(listResult.success).toBe(true);
    expect(listResult.data.length).toBeGreaterThanOrEqual(testSites.length);

    // 更新网站信息
    const siteToUpdate = addedSites[0];
    const updateResult = await page.evaluate(async ({ id, updates }) => {
      return await window.electronAPI.sites.update(id, updates);
    }, { 
      id: siteToUpdate.id, 
      updates: { title: '更新后的标题', description: '更新后的描述' }
    });
    expect(updateResult.success).toBe(true);

    // 切换网站状态
    const toggleResult = await page.evaluate(async (id) => {
      return await window.electronAPI.sites.toggle(id);
    }, siteToUpdate.id);
    expect(toggleResult.success).toBe(true);

    // 删除网站
    const deleteResult = await page.evaluate(async (id) => {
      return await window.electronAPI.sites.delete(id);
    }, addedSites[2].id);
    expect(deleteResult.success).toBe(true);
  });

  test('代理服务器管理流程', async () => {
    // 获取初始状态
    const initialStatus = await page.evaluate(async () => {
      return await window.electronAPI.proxy.getStatus();
    });
    expect(initialStatus.success).toBe(true);

    // 启动代理服务器
    const startResult = await page.evaluate(async () => {
      return await window.electronAPI.proxy.start();
    });
    expect(startResult.success).toBe(true);

    // 验证代理已启动
    const runningStatus = await page.evaluate(async () => {
      return await window.electronAPI.proxy.getStatus();
    });
    expect(runningStatus.data.isActive).toBe(true);

    // 获取代理统计
    const statsResult = await page.evaluate(async () => {
      return await window.electronAPI.proxy.getStats();
    });
    expect(statsResult.success).toBe(true);
    expect(statsResult.data).toHaveProperty('totalRequests');

    // 停止代理服务器
    const stopResult = await page.evaluate(async () => {
      return await window.electronAPI.proxy.stop();
    });
    expect(stopResult.success).toBe(true);

    // 验证代理已停止
    const stoppedStatus = await page.evaluate(async () => {
      return await window.electronAPI.proxy.getStatus();
    });
    expect(stoppedStatus.data.isActive).toBe(false);
  });

  test('安全检查和监控流程', async () => {
    // 获取安全状态
    const statusResult = await page.evaluate(async () => {
      return await window.electronAPI.security.getStatus();
    });
    expect(statusResult.success).toBe(true);
    expect(['secure', 'warning', 'critical']).toContain(statusResult.data.overall);

    // 执行安全扫描
    const scanResult = await page.evaluate(async () => {
      return await window.electronAPI.security.scan();
    });
    expect(scanResult.success).toBe(true);
    expect(Array.isArray(scanResult.data)).toBe(true);

    // 获取安全事件
    const eventsResult = await page.evaluate(async () => {
      return await window.electronAPI.security.getEvents();
    });
    expect(eventsResult.success).toBe(true);
    expect(Array.isArray(eventsResult.data)).toBe(true);

    // 检查证书状态
    const certResult = await page.evaluate(async () => {
      return await window.electronAPI.security.getCertificateStatus();
    });
    expect(certResult.success).toBe(true);
    expect(typeof certResult.data).toBe('boolean');
  });
});

test.describe('数据持久化和恢复', () => {
  test('数据应该正确持久化', async () => {
    // 添加测试数据
    const testSite = {
      url: 'https://persistence-test.com',
      title: '持久化测试网站',
      description: '测试数据持久化功能'
    };

    const addResult = await page.evaluate(async (siteData) => {
      return await window.electronAPI.sites.add(siteData);
    }, testSite);
    expect(addResult.success).toBe(true);

    // 获取数据库统计
    const statsResult = await page.evaluate(async () => {
      return await window.electronAPI.database.getStatistics();
    });
    expect(statsResult.success).toBe(true);
    expect(statsResult.data.database.recordCounts.blocked_sites).toBeGreaterThan(0);

    // 验证数据确实被保存
    const allSites = await page.evaluate(async () => {
      return await window.electronAPI.sites.getAll();
    });
    const savedSite = allSites.data.find((site: any) => site.url === testSite.url);
    expect(savedSite).toBeDefined();
    expect(savedSite.title).toBe(testSite.title);
  });

  test('操作日志应该被正确记录', async () => {
    // 执行一些操作
    await page.evaluate(async () => {
      return await window.electronAPI.sites.add({
        url: 'https://log-test.com',
        title: '日志测试网站'
      });
    });

    await page.evaluate(async () => {
      return await window.electronAPI.proxy.start();
    });

    await page.evaluate(async () => {
      return await window.electronAPI.proxy.stop();
    });

    // 获取操作日志
    const logsResult = await page.evaluate(async () => {
      return await window.electronAPI.database.getOperationLogs();
    });
    expect(logsResult.success).toBe(true);
    expect(logsResult.data.length).toBeGreaterThan(0);

    // 验证日志包含我们的操作
    const addSiteLog = logsResult.data.find((log: any) => 
      log.action === 'add_blocked_site' && log.success === true
    );
    expect(addSiteLog).toBeDefined();
  });
});

test.describe('错误处理和边界情况', () => {
  test('应该正确处理无效输入', async () => {
    // 尝试添加无效网站
    const invalidSite = {
      url: 'invalid-url',
      title: '无效网站'
    };

    const result = await page.evaluate(async (siteData) => {
      return await window.electronAPI.sites.add(siteData);
    }, invalidSite);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('应该正确处理重复操作', async () => {
    // 重复启动代理
    await page.evaluate(async () => {
      return await window.electronAPI.proxy.start();
    });

    const secondStart = await page.evaluate(async () => {
      return await window.electronAPI.proxy.start();
    });
    
    // 应该处理重复启动
    expect(typeof secondStart.success).toBe('boolean');

    // 清理
    await page.evaluate(async () => {
      return await window.electronAPI.proxy.stop();
    });
  });

  test('应该正确处理不存在的资源', async () => {
    // 尝试操作不存在的网站
    const result = await page.evaluate(async () => {
      return await window.electronAPI.sites.delete('non-existent-id');
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

test.describe('性能和稳定性', () => {
  test('应该能处理批量操作', async () => {
    const batchSize = 10;
    const testSites = Array.from({ length: batchSize }, (_, i) => ({
      url: `https://batch-${i}.com`,
      title: `批量测试网站 ${i}`
    }));

    // 批量添加网站
    const results = [];
    for (const site of testSites) {
      const result = await page.evaluate(async (siteData) => {
        return await window.electronAPI.sites.add(siteData);
      }, site);
      results.push(result);
    }

    // 检查所有操作都成功
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(batchSize);

    // 验证数据完整性
    const allSites = await page.evaluate(async () => {
      return await window.electronAPI.sites.getAll();
    });
    expect(allSites.data.length).toBeGreaterThanOrEqual(batchSize);
  });

  test('应用应该保持响应性', async () => {
    // 执行多个并发操作
    const operations = [
      page.evaluate(async () => window.electronAPI.database.getStatus()),
      page.evaluate(async () => window.electronAPI.proxy.getStatus()),
      page.evaluate(async () => window.electronAPI.security.getStatus()),
      page.evaluate(async () => window.electronAPI.sites.getAll()),
      page.evaluate(async () => window.electronAPI.database.getStatistics())
    ];

    const results = await Promise.all(operations);
    
    // 所有操作都应该成功
    expect(results.every(r => r.success)).toBe(true);
  });
});

test.describe('系统集成', () => {
  test('系统信息应该可以获取', async () => {
    const platformResult = await page.evaluate(async () => {
      return await window.electronAPI.system.getPlatform();
    });
    expect(platformResult.success).toBe(true);
    expect(['windows', 'macos', 'linux', 'unknown']).toContain(platformResult.data);

    const proxyConfigResult = await page.evaluate(async () => {
      return await window.electronAPI.system.getProxyConfig();
    });
    expect(proxyConfigResult.success).toBe(true);
    expect(proxyConfigResult.data).toHaveProperty('enabled');
  });

  test('应用统计信息应该准确', async () => {
    const statsResult = await page.evaluate(async () => {
      return await window.electronAPI.database.getStatistics();
    });
    
    expect(statsResult.success).toBe(true);
    expect(statsResult.data).toHaveProperty('database');
    expect(statsResult.data).toHaveProperty('interception');
    expect(statsResult.data.database).toHaveProperty('recordCounts');
    expect(statsResult.data.interception).toHaveProperty('totalBlocked');
  });
});
