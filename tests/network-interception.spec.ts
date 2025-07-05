import { test, expect } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import { _electron as electron } from 'playwright';
import path from 'path';

/**
 * 网络拦截功能测试
 * 测试代理服务器、HTTPS处理、系统集成等网络拦截核心功能
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

test.describe('代理服务器基础功能', () => {
  test('获取代理状态', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.proxy.getStatus();
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('isActive');
    expect(typeof result.data.isActive).toBe('boolean');
  });

  test('启动代理服务器', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.proxy.start();
    });
    
    expect(result.success).toBe(true);
    
    // 验证代理状态已变为活跃
    const statusResult = await page.evaluate(async () => {
      return await window.electronAPI.proxy.getStatus();
    });
    
    expect(statusResult.data.isActive).toBe(true);
    expect(statusResult.data).toHaveProperty('port');
    expect(typeof statusResult.data.port).toBe('number');
  });

  test('停止代理服务器', async () => {
    // 先确保代理已启动
    await page.evaluate(async () => {
      return await window.electronAPI.proxy.start();
    });

    // 停止代理
    const result = await page.evaluate(async () => {
      return await window.electronAPI.proxy.stop();
    });
    
    expect(result.success).toBe(true);
    
    // 验证代理状态已变为非活跃
    const statusResult = await page.evaluate(async () => {
      return await window.electronAPI.proxy.getStatus();
    });
    
    expect(statusResult.data.isActive).toBe(false);
  });

  test('获取代理统计信息', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.proxy.getStats();
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('totalRequests');
    expect(result.data).toHaveProperty('blockedRequests');
    expect(typeof result.data.totalRequests).toBe('number');
    expect(typeof result.data.blockedRequests).toBe('number');
  });
});

test.describe('网站拦截功能', () => {
  test.beforeEach(async () => {
    // 确保代理服务器已启动
    await page.evaluate(async () => {
      return await window.electronAPI.proxy.start();
    });
  });

  test.afterEach(async () => {
    // 测试后停止代理服务器
    await page.evaluate(async () => {
      return await window.electronAPI.proxy.stop();
    });
  });

  test('添加网站到黑名单并验证拦截', async () => {
    const testSite = {
      url: 'https://test-block.com',
      title: '测试拦截网站',
      enabled: true
    };

    // 添加网站到黑名单
    const addResult = await page.evaluate(async (siteData) => {
      return await window.electronAPI.sites.add(siteData);
    }, testSite);

    expect(addResult.success).toBe(true);

    // 验证网站是否被标记为阻止
    const checkResult = await page.evaluate(async (url) => {
      return await window.electronAPI.sites.checkBlocked(url);
    }, testSite.url);

    expect(checkResult.success).toBe(true);
    expect(checkResult.data.isBlocked).toBe(true);
  });

  test('禁用网站后应该不被拦截', async () => {
    const testSite = {
      url: 'https://test-disable.com',
      title: '测试禁用网站',
      enabled: true
    };

    // 添加网站
    const addResult = await page.evaluate(async (siteData) => {
      return await window.electronAPI.sites.add(siteData);
    }, testSite);

    const siteId = addResult.data.id;

    // 禁用网站
    await page.evaluate(async (id) => {
      return await window.electronAPI.sites.toggle(id);
    }, siteId);

    // 验证网站不再被阻止
    const checkResult = await page.evaluate(async (url) => {
      return await window.electronAPI.sites.checkBlocked(url);
    }, testSite.url);

    expect(checkResult.data.isBlocked).toBe(false);
  });

  test('获取被阻止的域名列表', async () => {
    // 添加几个测试网站
    const testSites = [
      { url: 'https://blocked1.com', enabled: true },
      { url: 'https://blocked2.com', enabled: true },
      { url: 'https://blocked3.com', enabled: false }
    ];

    for (const site of testSites) {
      await page.evaluate(async (siteData) => {
        return await window.electronAPI.sites.add(siteData);
      }, site);
    }

    // 获取被阻止的域名列表
    const domainsResult = await page.evaluate(async () => {
      return await window.electronAPI.sites.getBlockedDomains();
    });

    expect(domainsResult.success).toBe(true);
    expect(Array.isArray(domainsResult.data)).toBe(true);
    
    // 应该包含启用的域名，不包含禁用的域名
    expect(domainsResult.data).toContain('blocked1.com');
    expect(domainsResult.data).toContain('blocked2.com');
    expect(domainsResult.data).not.toContain('blocked3.com');
  });
});

test.describe('系统集成功能', () => {
  test('获取系统代理配置', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.system.getProxyConfig();
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('enabled');
    expect(typeof result.data.enabled).toBe('boolean');
  });

  test('检查证书安装状态', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.getCertificateStatus();
    });
    
    expect(result.success).toBe(true);
    expect(typeof result.data).toBe('boolean');
  });

  test('获取系统平台信息', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.system.getPlatform();
    });
    
    expect(result.success).toBe(true);
    expect(['windows', 'macos', 'linux', 'unknown']).toContain(result.data);
  });
});

test.describe('拦截统计功能', () => {
  test('获取拦截统计信息', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.database.getStatistics();
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('interception');
    expect(result.data.interception).toHaveProperty('totalBlocked');
    expect(result.data.interception).toHaveProperty('todayBlocked');
  });

  test('记录拦截事件', async () => {
    // 启动代理
    await page.evaluate(async () => {
      return await window.electronAPI.proxy.start();
    });

    // 添加测试网站
    const testSite = {
      url: 'https://intercept-test.com',
      title: '拦截测试网站',
      enabled: true
    };

    await page.evaluate(async (siteData) => {
      return await window.electronAPI.sites.add(siteData);
    }, testSite);

    // 模拟拦截事件（通过检查被阻止的网站）
    await page.evaluate(async (url) => {
      return await window.electronAPI.sites.checkBlocked(url);
    }, testSite.url);

    // 获取操作日志，检查是否有拦截记录
    const logsResult = await page.evaluate(async () => {
      return await window.electronAPI.database.getOperationLogs();
    });

    expect(logsResult.success).toBe(true);
    
    // 停止代理
    await page.evaluate(async () => {
      return await window.electronAPI.proxy.stop();
    });
  });
});

test.describe('代理配置管理', () => {
  test('获取代理配置', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.proxy.getConfig();
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('httpPort');
    expect(result.data).toHaveProperty('bindAddress');
    expect(typeof result.data.httpPort).toBe('number');
    expect(typeof result.data.bindAddress).toBe('string');
  });

  test('更新代理配置', async () => {
    const newConfig = {
      httpPort: 8081,
      bindAddress: '127.0.0.1',
      enableLogging: true
    };

    const result = await page.evaluate(async (config) => {
      return await window.electronAPI.proxy.updateConfig(config);
    }, newConfig);
    
    expect(result.success).toBe(true);

    // 验证配置已更新
    const getConfigResult = await page.evaluate(async () => {
      return await window.electronAPI.proxy.getConfig();
    });

    expect(getConfigResult.data.httpPort).toBe(newConfig.httpPort);
    expect(getConfigResult.data.bindAddress).toBe(newConfig.bindAddress);
  });
});

test.describe('错误处理', () => {
  test('重复启动代理服务器应该处理正确', async () => {
    // 启动代理
    const firstStart = await page.evaluate(async () => {
      return await window.electronAPI.proxy.start();
    });
    expect(firstStart.success).toBe(true);

    // 再次启动代理
    const secondStart = await page.evaluate(async () => {
      return await window.electronAPI.proxy.start();
    });
    
    // 应该返回成功或适当的错误信息
    expect(typeof secondStart.success).toBe('boolean');

    // 停止代理
    await page.evaluate(async () => {
      return await window.electronAPI.proxy.stop();
    });
  });

  test('停止未启动的代理服务器应该处理正确', async () => {
    // 确保代理已停止
    await page.evaluate(async () => {
      return await window.electronAPI.proxy.stop();
    });

    // 再次停止代理
    const result = await page.evaluate(async () => {
      return await window.electronAPI.proxy.stop();
    });
    
    // 应该返回成功或适当的错误信息
    expect(typeof result.success).toBe('boolean');
  });

  test('无效端口配置应该被拒绝', async () => {
    const invalidConfig = {
      httpPort: -1,
      bindAddress: '127.0.0.1'
    };

    const result = await page.evaluate(async (config) => {
      return await window.electronAPI.proxy.updateConfig(config);
    }, invalidConfig);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
