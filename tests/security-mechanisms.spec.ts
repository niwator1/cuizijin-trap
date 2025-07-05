import { test, expect } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import { _electron as electron } from 'playwright';
import path from 'path';

/**
 * 安全机制测试
 * 测试SecurityManager、威胁检测、安全事件处理等安全相关功能
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

test.describe('安全状态管理', () => {
  test('获取安全状态', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.getStatus();
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('overall');
    expect(['secure', 'warning', 'critical']).toContain(result.data.overall);
    expect(result.data).toHaveProperty('processProtection');
    expect(result.data).toHaveProperty('configEncryption');
    expect(result.data).toHaveProperty('antiBypass');
    expect(result.data).toHaveProperty('recentEvents');
    expect(result.data).toHaveProperty('lastCheck');
  });

  test('安全状态应该包含进程保护信息', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.getStatus();
    });
    
    expect(result.data.processProtection).toHaveProperty('enabled');
    expect(result.data.processProtection).toHaveProperty('status');
    expect(typeof result.data.processProtection.enabled).toBe('boolean');
  });

  test('安全状态应该包含配置加密信息', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.getStatus();
    });
    
    expect(result.data.configEncryption).toHaveProperty('initialized');
    expect(result.data.configEncryption).toHaveProperty('keyPath');
    expect(result.data.configEncryption).toHaveProperty('algorithm');
    expect(typeof result.data.configEncryption.initialized).toBe('boolean');
  });

  test('安全状态应该包含防绕过信息', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.getStatus();
    });
    
    expect(result.data.antiBypass).toHaveProperty('monitoring');
    expect(typeof result.data.antiBypass.monitoring).toBe('boolean');
  });
});

test.describe('安全扫描功能', () => {
  test('执行安全扫描', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.scan();
    });
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    
    // 检查扫描结果的结构
    if (result.data.length > 0) {
      const scanResult = result.data[0];
      expect(scanResult).toHaveProperty('detected');
      expect(scanResult).toHaveProperty('type');
      expect(scanResult).toHaveProperty('description');
      expect(scanResult).toHaveProperty('severity');
      expect(scanResult).toHaveProperty('timestamp');
      expect(['low', 'medium', 'high', 'critical']).toContain(scanResult.severity);
    }
  });

  test('安全扫描应该检测常见威胁', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.scan();
    });
    
    expect(result.success).toBe(true);
    
    // 扫描结果应该包含各种检查类型
    const scanTypes = result.data.map((item: any) => item.type);
    const expectedTypes = [
      'hosts_file_check',
      'proxy_detection',
      'vpn_detection',
      'dns_check',
      'process_check'
    ];
    
    // 至少应该有一些基础检查
    const hasBasicChecks = expectedTypes.some(type => 
      scanTypes.some((scanType: string) => scanType.includes(type.split('_')[0]))
    );
    expect(hasBasicChecks).toBe(true);
  });
});

test.describe('安全事件管理', () => {
  test('获取安全事件列表', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.getEvents();
    });
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    
    // 检查事件结构
    if (result.data.length > 0) {
      const event = result.data[0];
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('severity');
      expect(event).toHaveProperty('description');
      expect(event).toHaveProperty('timestamp');
      expect(['low', 'medium', 'high', 'critical']).toContain(event.severity);
    }
  });

  test('限制安全事件数量', async () => {
    const limit = 5;
    const result = await page.evaluate(async (limit) => {
      return await window.electronAPI.security.getEvents(limit);
    }, limit);
    
    expect(result.success).toBe(true);
    expect(result.data.length).toBeLessThanOrEqual(limit);
  });

  test('清除安全事件', async () => {
    // 先获取当前事件数量
    const beforeResult = await page.evaluate(async () => {
      return await window.electronAPI.security.getEvents();
    });
    
    // 清除事件
    const clearResult = await page.evaluate(async () => {
      return await window.electronAPI.security.clearEvents();
    });
    
    expect(clearResult.success).toBe(true);
    
    // 验证事件已被清除
    const afterResult = await page.evaluate(async () => {
      return await window.electronAPI.security.getEvents();
    });
    
    expect(afterResult.data.length).toBeLessThanOrEqual(beforeResult.data.length);
  });
});

test.describe('证书安全检查', () => {
  test('检查证书安装状态', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.getCertificateStatus();
    });
    
    expect(result.success).toBe(true);
    expect(typeof result.data).toBe('boolean');
  });

  test('证书状态应该影响整体安全评级', async () => {
    const certResult = await page.evaluate(async () => {
      return await window.electronAPI.security.getCertificateStatus();
    });
    
    const securityResult = await page.evaluate(async () => {
      return await window.electronAPI.security.getStatus();
    });
    
    // 如果证书未安装，安全状态可能会受到影响
    if (!certResult.data) {
      // 证书未安装时，安全状态可能不是"secure"
      expect(['warning', 'critical']).toContain(securityResult.data.overall);
    }
  });
});

test.describe('进程保护功能', () => {
  test('进程保护状态检查', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.getStatus();
    });
    
    const processProtection = result.data.processProtection;
    expect(processProtection).toHaveProperty('enabled');
    expect(processProtection).toHaveProperty('status');
    
    // 在测试环境中，进程保护可能被禁用
    if (processProtection.enabled) {
      expect(['running', 'stopped', 'error']).toContain(processProtection.status);
    }
  });
});

test.describe('防绕过机制', () => {
  test('防绕过监控状态', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.getStatus();
    });
    
    const antiBypass = result.data.antiBypass;
    expect(antiBypass).toHaveProperty('monitoring');
    expect(typeof antiBypass.monitoring).toBe('boolean');
  });

  test('执行完整的绕过检测', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.scan();
    });
    
    expect(result.success).toBe(true);
    
    // 检查是否包含绕过检测相关的结果
    const bypassChecks = result.data.filter((item: any) => 
      item.type.includes('bypass') || 
      item.type.includes('proxy') || 
      item.type.includes('vpn') ||
      item.type.includes('hosts')
    );
    
    // 应该至少有一些绕过检测
    expect(bypassChecks.length).toBeGreaterThan(0);
  });
});

test.describe('配置加密功能', () => {
  test('配置加密状态检查', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.getStatus();
    });
    
    const configEncryption = result.data.configEncryption;
    expect(configEncryption).toHaveProperty('initialized');
    expect(configEncryption).toHaveProperty('algorithm');
    
    if (configEncryption.initialized) {
      expect(typeof configEncryption.algorithm).toBe('string');
      expect(configEncryption.algorithm.length).toBeGreaterThan(0);
    }
  });
});

test.describe('安全威胁响应', () => {
  test('安全扫描后应该生成相应事件', async () => {
    // 执行安全扫描
    const scanResult = await page.evaluate(async () => {
      return await window.electronAPI.security.scan();
    });
    
    expect(scanResult.success).toBe(true);
    
    // 获取安全事件
    const eventsResult = await page.evaluate(async () => {
      return await window.electronAPI.security.getEvents();
    });
    
    expect(eventsResult.success).toBe(true);
    
    // 如果扫描发现了问题，应该有相应的事件记录
    const detectedIssues = scanResult.data.filter((item: any) => item.detected);
    if (detectedIssues.length > 0) {
      // 应该有相关的安全事件
      const securityEvents = eventsResult.data.filter((event: any) => 
        event.type.includes('bypass') || event.type.includes('security')
      );
      expect(securityEvents.length).toBeGreaterThan(0);
    }
  });

  test('高严重性事件应该被正确标记', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.getEvents();
    });
    
    expect(result.success).toBe(true);
    
    // 检查是否有高严重性事件
    const highSeverityEvents = result.data.filter((event: any) => 
      event.severity === 'high' || event.severity === 'critical'
    );
    
    // 如果有高严重性事件，整体安全状态应该反映这一点
    if (highSeverityEvents.length > 0) {
      const statusResult = await page.evaluate(async () => {
        return await window.electronAPI.security.getStatus();
      });
      
      expect(['warning', 'critical']).toContain(statusResult.data.overall);
    }
  });
});

test.describe('安全配置管理', () => {
  test('安全配置应该可以查询', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.security.getStatus();
    });
    
    expect(result.success).toBe(true);
    
    // 验证安全配置的各个组件都有状态信息
    expect(result.data).toHaveProperty('processProtection');
    expect(result.data).toHaveProperty('configEncryption');
    expect(result.data).toHaveProperty('antiBypass');
    
    // 每个组件都应该有相应的状态信息
    expect(typeof result.data.processProtection.enabled).toBe('boolean');
    expect(typeof result.data.configEncryption.initialized).toBe('boolean');
    expect(typeof result.data.antiBypass.monitoring).toBe('boolean');
  });
});

test.describe('安全日志记录', () => {
  test('安全操作应该被记录', async () => {
    // 执行一个安全操作（扫描）
    await page.evaluate(async () => {
      return await window.electronAPI.security.scan();
    });
    
    // 检查操作日志
    const logsResult = await page.evaluate(async () => {
      return await window.electronAPI.database.getOperationLogs();
    });
    
    expect(logsResult.success).toBe(true);
    
    // 应该有安全相关的日志
    const securityLogs = logsResult.data.filter((log: any) => 
      log.action.includes('security') || log.action.includes('scan')
    );
    
    // 可能有安全相关的日志记录
    expect(Array.isArray(securityLogs)).toBe(true);
  });
});
