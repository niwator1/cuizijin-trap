import { test, expect } from '@playwright/test';
import { FileDatabase } from '../../../src/main/database/FileDatabase';
import { ValidationError, DatabaseError } from '../../../src/shared/utils/errorHandler';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * FileDatabase 单元测试
 * 直接测试FileDatabase类的方法，不依赖Electron环境
 */

let testDataPath: string;
let fileDb: FileDatabase;

test.beforeEach(async () => {
  // 创建临时测试目录
  testDataPath = path.join(os.tmpdir(), `cuizijin-test-${Date.now()}`);
  fs.mkdirSync(testDataPath, { recursive: true });
  
  // 模拟app.getPath('userData')
  const originalGetPath = require('electron').app?.getPath;
  if (require('electron').app) {
    require('electron').app.getPath = () => testDataPath;
  }
  
  // 创建FileDatabase实例
  fileDb = new FileDatabase();
});

test.afterEach(async () => {
  // 清理测试文件
  if (fs.existsSync(testDataPath)) {
    fs.rmSync(testDataPath, { recursive: true, force: true });
  }
});

test.describe('FileDatabase 初始化', () => {
  test('应该创建默认数据结构', async () => {
    const stats = fileDb.getStats();
    
    expect(stats.userConfigExists).toBe(false);
    expect(stats.blockedSitesCount).toBe(0);
    expect(stats.operationLogsCount).toBe(0);
    expect(typeof stats.dataPath).toBe('string');
  });

  test('应该创建数据文件', async () => {
    const stats = fileDb.getStats();
    expect(fs.existsSync(stats.dataPath)).toBe(true);
  });
});

test.describe('网站管理功能', () => {
  test('添加有效网站', async () => {
    const siteData = {
      url: 'https://example.com',
      title: '示例网站',
      description: '这是一个示例网站',
      category: 'test',
      enabled: true
    };

    const result = fileDb.addBlockedSite(siteData);
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
    expect(result.data.domain).toBe('example.com');
    expect(result.data.url).toBe(siteData.url);
  });

  test('添加无效URL应该失败', async () => {
    const invalidSiteData = {
      url: 'not-a-valid-url',
      title: '无效网站'
    };

    const result = fileDb.addBlockedSite(invalidSiteData);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid URL format');
  });

  test('添加重复网站应该失败', async () => {
    const siteData = {
      url: 'https://duplicate.com',
      title: '重复网站'
    };

    // 第一次添加应该成功
    const firstResult = fileDb.addBlockedSite(siteData);
    expect(firstResult.success).toBe(true);

    // 第二次添加应该失败
    const secondResult = fileDb.addBlockedSite(siteData);
    expect(secondResult.success).toBe(false);
    expect(secondResult.error).toContain('already exists');
  });

  test('获取网站列表', async () => {
    // 先添加一些网站
    const sites = [
      { url: 'https://site1.com', title: '网站1' },
      { url: 'https://site2.com', title: '网站2' },
      { url: 'https://site3.com', title: '网站3' }
    ];

    for (const site of sites) {
      fileDb.addBlockedSite(site);
    }

    const result = fileDb.getAllBlockedSites();
    
    expect(result.success).toBe(true);
    expect(result.data.length).toBe(3);
  });

  test('过滤启用的网站', async () => {
    // 添加启用和禁用的网站
    fileDb.addBlockedSite({ url: 'https://enabled.com', title: '启用网站', enabled: true });
    fileDb.addBlockedSite({ url: 'https://disabled.com', title: '禁用网站', enabled: false });

    const enabledResult = fileDb.getAllBlockedSites({ enabled: true });
    const disabledResult = fileDb.getAllBlockedSites({ enabled: false });
    
    expect(enabledResult.success).toBe(true);
    expect(enabledResult.data.length).toBe(1);
    expect(enabledResult.data[0].enabled).toBe(true);
    
    expect(disabledResult.success).toBe(true);
    expect(disabledResult.data.length).toBe(1);
    expect(disabledResult.data[0].enabled).toBe(false);
  });

  test('搜索网站', async () => {
    fileDb.addBlockedSite({ url: 'https://google.com', title: '谷歌搜索' });
    fileDb.addBlockedSite({ url: 'https://baidu.com', title: '百度搜索' });
    fileDb.addBlockedSite({ url: 'https://facebook.com', title: '脸书社交' });

    const searchResult = fileDb.getAllBlockedSites({ search: '搜索' });
    
    expect(searchResult.success).toBe(true);
    expect(searchResult.data.length).toBe(2);
  });

  test('更新网站信息', async () => {
    const addResult = fileDb.addBlockedSite({ url: 'https://update-test.com', title: '原标题' });
    const siteId = addResult.data.id;

    const updateResult = fileDb.updateBlockedSite(siteId, {
      title: '新标题',
      description: '新描述'
    });

    expect(updateResult.success).toBe(true);
    expect(updateResult.data.title).toBe('新标题');
    expect(updateResult.data.description).toBe('新描述');
  });

  test('切换网站状态', async () => {
    const addResult = fileDb.addBlockedSite({ url: 'https://toggle-test.com', enabled: true });
    const siteId = addResult.data.id;

    const toggleResult = fileDb.toggleBlockedSite(siteId);

    expect(toggleResult.success).toBe(true);
    expect(toggleResult.data.enabled).toBe(false);
  });

  test('删除网站', async () => {
    const addResult = fileDb.addBlockedSite({ url: 'https://delete-test.com', title: '待删除' });
    const siteId = addResult.data.id;

    const deleteResult = fileDb.removeBlockedSite(siteId);

    expect(deleteResult.success).toBe(true);

    // 验证网站已被删除
    const getResult = fileDb.getAllBlockedSites();
    const deletedSite = getResult.data.find((site: any) => site.id === siteId);
    expect(deletedSite).toBeUndefined();
  });
});

test.describe('数据验证', () => {
  test('验证标题长度限制', async () => {
    const longTitle = 'a'.repeat(300);
    const result = fileDb.addBlockedSite({
      url: 'https://long-title.com',
      title: longTitle
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Title too long');
  });

  test('验证描述长度限制', async () => {
    const longDescription = 'a'.repeat(1100);
    const result = fileDb.addBlockedSite({
      url: 'https://long-desc.com',
      description: longDescription
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Description too long');
  });

  test('验证分类长度限制', async () => {
    const longCategory = 'a'.repeat(60);
    const result = fileDb.addBlockedSite({
      url: 'https://long-category.com',
      category: longCategory
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Category name too long');
  });

  test('验证空URL', async () => {
    const result = fileDb.addBlockedSite({
      url: '',
      title: '空URL'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('URL is required');
  });

  test('验证无效域名', async () => {
    const result = fileDb.addBlockedSite({
      url: 'https://invalid..domain..com',
      title: '无效域名'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid');
  });
});

test.describe('操作日志', () => {
  test('记录成功操作', async () => {
    fileDb.addBlockedSite({ url: 'https://log-test.com', title: '日志测试' });

    const logs = fileDb.getOperationLogs();
    
    expect(logs.success).toBe(true);
    expect(logs.data.length).toBeGreaterThan(0);
    
    const addLog = logs.data.find((log: any) => 
      log.action === 'add_blocked_site' && log.success === true
    );
    expect(addLog).toBeDefined();
  });

  test('记录失败操作', async () => {
    fileDb.addBlockedSite({ url: 'invalid-url', title: '失败测试' });

    const logs = fileDb.getOperationLogs();
    const failedLog = logs.data.find((log: any) => 
      log.action === 'add_blocked_site' && log.success === false
    );
    
    expect(failedLog).toBeDefined();
    expect(failedLog.metadata).toHaveProperty('error');
  });

  test('日志分页', async () => {
    // 添加多个操作以生成日志
    for (let i = 0; i < 15; i++) {
      fileDb.addBlockedSite({ url: `https://log-${i}.com`, title: `日志${i}` });
    }

    const page1 = fileDb.getOperationLogs({ page: 1, limit: 10 });
    const page2 = fileDb.getOperationLogs({ page: 2, limit: 10 });

    expect(page1.success).toBe(true);
    expect(page1.data.length).toBe(10);
    expect(page2.success).toBe(true);
    expect(page2.data.length).toBeGreaterThan(0);
  });
});

test.describe('网站检查功能', () => {
  test('检查被阻止的网站', async () => {
    fileDb.addBlockedSite({ url: 'https://blocked.com', enabled: true });

    const result = fileDb.checkSiteBlocked('https://blocked.com');
    
    expect(result.isBlocked).toBe(true);
  });

  test('检查未被阻止的网站', async () => {
    const result = fileDb.checkSiteBlocked('https://allowed.com');
    
    expect(result.isBlocked).toBe(false);
  });

  test('检查禁用的网站', async () => {
    fileDb.addBlockedSite({ url: 'https://disabled-block.com', enabled: false });

    const result = fileDb.checkSiteBlocked('https://disabled-block.com');
    
    expect(result.isBlocked).toBe(false);
  });

  test('获取被阻止的域名列表', async () => {
    fileDb.addBlockedSite({ url: 'https://domain1.com', enabled: true });
    fileDb.addBlockedSite({ url: 'https://domain2.com', enabled: true });
    fileDb.addBlockedSite({ url: 'https://domain3.com', enabled: false });

    const domains = fileDb.getBlockedDomains();
    
    expect(domains).toContain('domain1.com');
    expect(domains).toContain('domain2.com');
    expect(domains).not.toContain('domain3.com'); // 禁用的不应该包含
  });
});
