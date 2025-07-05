import { test, expect } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import { _electron as electron } from 'playwright';
import path from 'path';

/**
 * 数据库功能测试
 * 测试FileDatabase的数据存储、验证和错误处理功能
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
  await page.waitForTimeout(2000);
});

test.afterAll(async () => {
  await electronApp?.close();
});

test.describe('数据库基础功能', () => {
  test('应用启动时数据库初始化', async () => {
    // 检查应用是否正常启动
    await expect(page).toHaveTitle(/崔子瑾诱捕器/);
    
    // 检查数据库状态
    const dbStatus = await page.evaluate(async () => {
      return await window.electronAPI.database.getStatus();
    });
    
    expect(dbStatus.success).toBe(true);
    expect(dbStatus.data.isInitialized).toBe(true);
  });

  test('数据库统计信息获取', async () => {
    const stats = await page.evaluate(async () => {
      return await window.electronAPI.database.getStatistics();
    });
    
    expect(stats.success).toBe(true);
    expect(stats.data).toHaveProperty('database');
    expect(stats.data.database).toHaveProperty('recordCounts');
  });
});

test.describe('网站黑名单管理', () => {
  test('添加有效网站到黑名单', async () => {
    const testSite = {
      url: 'https://example.com',
      title: '测试网站',
      description: '这是一个测试网站',
      category: 'test',
      enabled: true
    };

    const result = await page.evaluate(async (siteData) => {
      return await window.electronAPI.database.addBlockedSite(siteData);
    }, testSite);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
    expect(result.data.url).toBe(testSite.url);
    expect(result.data.domain).toBe('example.com');
    expect(result.data.title).toBe(testSite.title);
  });

  test('添加无效URL应该失败', async () => {
    const invalidSite = {
      url: 'invalid-url',
      title: '无效网站'
    };

    const result = await page.evaluate(async (siteData) => {
      return await window.electronAPI.database.addBlockedSite(siteData);
    }, invalidSite);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid URL format');
  });

  test('添加重复网站应该失败', async () => {
    const duplicateSite = {
      url: 'https://example.com',
      title: '重复网站'
    };

    const result = await page.evaluate(async (siteData) => {
      return await window.electronAPI.database.addBlockedSite(siteData);
    }, duplicateSite);

    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });

  test('获取网站列表', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.database.getAllBlockedSites();
    });

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  test('更新网站信息', async () => {
    // 先获取一个网站
    const sites = await page.evaluate(async () => {
      return await window.electronAPI.database.getAllBlockedSites();
    });
    
    expect(sites.success).toBe(true);
    expect(sites.data.length).toBeGreaterThan(0);
    
    const siteId = sites.data[0].id;
    const updates = {
      title: '更新后的标题',
      description: '更新后的描述'
    };

    const result = await page.evaluate(async ({ id, updates }) => {
      return await window.electronAPI.database.updateBlockedSite(id, updates);
    }, { id: siteId, updates });

    expect(result.success).toBe(true);
    expect(result.data.title).toBe(updates.title);
    expect(result.data.description).toBe(updates.description);
  });

  test('切换网站启用状态', async () => {
    // 先获取一个网站
    const sites = await page.evaluate(async () => {
      return await window.electronAPI.database.getAllBlockedSites();
    });
    
    const siteId = sites.data[0].id;
    const originalState = sites.data[0].enabled;

    const result = await page.evaluate(async (id) => {
      return await window.electronAPI.database.toggleBlockedSite(id);
    }, siteId);

    expect(result.success).toBe(true);
    expect(result.data.enabled).toBe(!originalState);
  });

  test('删除网站', async () => {
    // 先添加一个测试网站
    const testSite = {
      url: 'https://test-delete.com',
      title: '待删除网站'
    };

    const addResult = await page.evaluate(async (siteData) => {
      return await window.electronAPI.database.addBlockedSite(siteData);
    }, testSite);

    expect(addResult.success).toBe(true);
    const siteId = addResult.data.id;

    // 删除网站
    const deleteResult = await page.evaluate(async (id) => {
      return await window.electronAPI.database.removeBlockedSite(id);
    }, siteId);

    expect(deleteResult.success).toBe(true);
  });
});

test.describe('数据验证测试', () => {
  test('标题长度验证', async () => {
    const longTitle = 'a'.repeat(300); // 超过255字符限制
    const invalidSite = {
      url: 'https://long-title.com',
      title: longTitle
    };

    const result = await page.evaluate(async (siteData) => {
      return await window.electronAPI.database.addBlockedSite(siteData);
    }, invalidSite);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Title too long');
  });

  test('描述长度验证', async () => {
    const longDescription = 'a'.repeat(1100); // 超过1000字符限制
    const invalidSite = {
      url: 'https://long-desc.com',
      description: longDescription
    };

    const result = await page.evaluate(async (siteData) => {
      return await window.electronAPI.database.addBlockedSite(siteData);
    }, invalidSite);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Description too long');
  });

  test('分类名称长度验证', async () => {
    const longCategory = 'a'.repeat(60); // 超过50字符限制
    const invalidSite = {
      url: 'https://long-category.com',
      category: longCategory
    };

    const result = await page.evaluate(async (siteData) => {
      return await window.electronAPI.database.addBlockedSite(siteData);
    }, invalidSite);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Category name too long');
  });

  test('空URL验证', async () => {
    const invalidSite = {
      url: '',
      title: '空URL网站'
    };

    const result = await page.evaluate(async (siteData) => {
      return await window.electronAPI.database.addBlockedSite(siteData);
    }, invalidSite);

    expect(result.success).toBe(false);
    expect(result.error).toContain('URL is required');
  });
});

test.describe('操作日志功能', () => {
  test('操作日志记录', async () => {
    // 执行一个操作（添加网站）
    const testSite = {
      url: 'https://log-test.com',
      title: '日志测试网站'
    };

    await page.evaluate(async (siteData) => {
      return await window.electronAPI.database.addBlockedSite(siteData);
    }, testSite);

    // 获取操作日志
    const logs = await page.evaluate(async () => {
      return await window.electronAPI.database.getOperationLogs();
    });

    expect(logs.success).toBe(true);
    expect(Array.isArray(logs.data)).toBe(true);
    
    // 检查是否有添加网站的日志
    const addSiteLog = logs.data.find((log: any) => 
      log.action === 'add_blocked_site' && log.success === true
    );
    expect(addSiteLog).toBeDefined();
  });

  test('错误操作日志记录', async () => {
    // 执行一个会失败的操作
    const invalidSite = {
      url: 'invalid-url-for-log-test',
      title: '错误日志测试'
    };

    await page.evaluate(async (siteData) => {
      return await window.electronAPI.database.addBlockedSite(siteData);
    }, invalidSite);

    // 获取操作日志
    const logs = await page.evaluate(async () => {
      return await window.electronAPI.database.getOperationLogs();
    });

    // 检查是否有失败的日志
    const failedLog = logs.data.find((log: any) =>
      log.action === 'add_blocked_site' && log.success === false
    );
    expect(failedLog).toBeDefined();
    expect(failedLog.metadata).toHaveProperty('error');
  });
});

test.describe('用户配置管理', () => {
  test('设置用户密码', async () => {
    const password = 'test123456';

    const result = await page.evaluate(async (pwd) => {
      return await window.electronAPI.auth.setPassword(pwd);
    }, password);

    expect(result.success).toBe(true);
  });

  test('验证用户密码', async () => {
    const password = 'test123456';

    const result = await page.evaluate(async (pwd) => {
      return await window.electronAPI.auth.verifyPassword(pwd);
    }, password);

    expect(result.success).toBe(true);
    expect(result.data.isValid).toBe(true);
  });

  test('错误密码验证应该失败', async () => {
    const wrongPassword = 'wrongpassword';

    const result = await page.evaluate(async (pwd) => {
      return await window.electronAPI.auth.verifyPassword(pwd);
    }, wrongPassword);

    expect(result.success).toBe(true);
    expect(result.data.isValid).toBe(false);
  });

  test('修改用户密码', async () => {
    const oldPassword = 'test123456';
    const newPassword = 'newtest123456';

    const result = await page.evaluate(async ({ oldPwd, newPwd }) => {
      return await window.electronAPI.auth.changePassword(oldPwd, newPwd);
    }, { oldPwd: oldPassword, newPwd: newPassword });

    expect(result.success).toBe(true);

    // 验证新密码
    const verifyResult = await page.evaluate(async (pwd) => {
      return await window.electronAPI.auth.verifyPassword(pwd);
    }, newPassword);

    expect(verifyResult.data.isValid).toBe(true);
  });
});

test.describe('数据备份和恢复', () => {
  test('创建数据备份', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.database.backup();
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('backupPath');
    expect(typeof result.data.backupPath).toBe('string');
  });

  test('数据完整性检查', async () => {
    // 添加一些测试数据
    const testSites = [
      { url: 'https://integrity-test1.com', title: '完整性测试1' },
      { url: 'https://integrity-test2.com', title: '完整性测试2' }
    ];

    for (const site of testSites) {
      await page.evaluate(async (siteData) => {
        return await window.electronAPI.database.addBlockedSite(siteData);
      }, site);
    }

    // 获取数据统计
    const stats = await page.evaluate(async () => {
      return await window.electronAPI.database.getStatistics();
    });

    expect(stats.success).toBe(true);
    expect(stats.data.database.recordCounts.blocked_sites).toBeGreaterThan(0);
  });
});

test.describe('错误处理和恢复', () => {
  test('处理无效的网站ID', async () => {
    const invalidId = 'invalid-site-id';

    const result = await page.evaluate(async (id) => {
      return await window.electronAPI.database.toggleBlockedSite(id);
    }, invalidId);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Site not found');
  });

  test('处理空的更新数据', async () => {
    // 先获取一个有效的网站ID
    const sites = await page.evaluate(async () => {
      return await window.electronAPI.database.getAllBlockedSites();
    });

    if (sites.data.length > 0) {
      const siteId = sites.data[0].id;

      const result = await page.evaluate(async (id) => {
        return await window.electronAPI.database.updateBlockedSite(id, {});
      }, siteId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No updates provided');
    }
  });

  test('处理过长的输入数据', async () => {
    const longUrl = 'https://' + 'a'.repeat(2000) + '.com';

    const result = await page.evaluate(async (url) => {
      return await window.electronAPI.database.addBlockedSite({ url });
    }, longUrl);

    expect(result.success).toBe(false);
    // 应该因为URL过长或域名无效而失败
  });
});

test.describe('性能和并发测试', () => {
  test('批量添加网站', async () => {
    const batchSize = 10;
    const promises = [];

    for (let i = 0; i < batchSize; i++) {
      const site = {
        url: `https://batch-test-${i}.com`,
        title: `批量测试网站 ${i}`,
        category: 'batch-test'
      };

      promises.push(
        page.evaluate(async (siteData) => {
          return await window.electronAPI.database.addBlockedSite(siteData);
        }, site)
      );
    }

    const results = await Promise.all(promises);

    // 检查所有操作都成功
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(batchSize);
  });

  test('并发读写操作', async () => {
    const readPromises = [];
    const writePromises = [];

    // 创建多个并发读操作
    for (let i = 0; i < 5; i++) {
      readPromises.push(
        page.evaluate(async () => {
          return await window.electronAPI.database.getAllBlockedSites();
        })
      );
    }

    // 创建多个并发写操作
    for (let i = 0; i < 3; i++) {
      const site = {
        url: `https://concurrent-test-${i}.com`,
        title: `并发测试网站 ${i}`
      };

      writePromises.push(
        page.evaluate(async (siteData) => {
          return await window.electronAPI.database.addBlockedSite(siteData);
        }, site)
      );
    }

    // 等待所有操作完成
    const [readResults, writeResults] = await Promise.all([
      Promise.all(readPromises),
      Promise.all(writePromises)
    ]);

    // 检查读操作都成功
    expect(readResults.every(r => r.success)).toBe(true);

    // 检查写操作都成功
    expect(writeResults.every(r => r.success)).toBe(true);
  });
});
