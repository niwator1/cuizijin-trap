import { FileDatabase } from '../main/database/FileDatabase';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock Electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(os.tmpdir(), 'test-cuizijin-trap'))
  }
}));

describe('Website Management', () => {
  let fileDatabase: FileDatabase;
  let testDataPath: string;

  beforeEach(() => {
    // 创建临时测试目录
    testDataPath = path.join(os.tmpdir(), 'test-cuizijin-trap', 'cuizijin-trap-data.json');
    
    // 确保测试目录存在
    const testDir = path.dirname(testDataPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // 清理之前的测试数据
    if (fs.existsSync(testDataPath)) {
      fs.unlinkSync(testDataPath);
    }

    fileDatabase = new FileDatabase();
  });

  afterEach(() => {
    // 清理测试数据
    if (fs.existsSync(testDataPath)) {
      fs.unlinkSync(testDataPath);
    }
  });

  describe('Website Addition', () => {
    test('should add a new website successfully', () => {
      const website = {
        url: 'https://example.com',
        domain: 'example.com',
        title: 'Example Website',
        category: 'general',
        enabled: true
      };

      const result = fileDatabase.addBlockedSite(website);
      
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        url: website.url,
        domain: website.domain,
        title: website.title,
        category: website.category,
        enabled: website.enabled
      });
      expect(result.data.id).toBeDefined();
      expect(result.data.createdAt).toBeDefined();
    });

    test('should reject duplicate URLs', () => {
      const website = {
        url: 'https://example.com',
        domain: 'example.com',
        title: 'Example Website',
        category: 'general',
        enabled: true
      };

      // 添加第一次
      fileDatabase.addBlockedSite(website);
      
      // 尝试添加重复的URL
      const result = fileDatabase.addBlockedSite(website);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    test('should validate URL format', () => {
      const invalidWebsite = {
        url: 'invalid-url',
        domain: 'invalid',
        title: 'Invalid Website',
        category: 'general',
        enabled: true
      };

      const result = fileDatabase.addBlockedSite(invalidWebsite);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    test('should auto-extract domain from URL', () => {
      const website = {
        url: 'https://subdomain.example.com/path',
        domain: '', // 空域名，应该自动提取
        title: 'Subdomain Website',
        category: 'general',
        enabled: true
      };

      const result = fileDatabase.addBlockedSite(website);
      
      expect(result.success).toBe(true);
      expect(result.data.domain).toBe('subdomain.example.com');
    });
  });

  describe('Website Retrieval', () => {
    beforeEach(() => {
      // 添加测试数据
      const websites = [
        {
          url: 'https://example.com',
          domain: 'example.com',
          title: 'Example',
          category: 'general',
          enabled: true
        },
        {
          url: 'https://test.com',
          domain: 'test.com',
          title: 'Test Site',
          category: 'social',
          enabled: false
        },
        {
          url: 'https://gaming.com',
          domain: 'gaming.com',
          title: 'Gaming Site',
          category: 'gaming',
          enabled: true
        }
      ];

      websites.forEach(site => fileDatabase.addBlockedSite(site));
    });

    test('should get all websites', () => {
      const result = fileDatabase.getAllBlockedSites();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    test('should filter websites by enabled status', () => {
      const result = fileDatabase.getAllBlockedSites({ enabled: true });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.every((site: any) => site.enabled)).toBe(true);
    });

    test('should filter websites by category', () => {
      const result = fileDatabase.getAllBlockedSites({ category: 'gaming' });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].category).toBe('gaming');
    });

    test('should search websites by domain', () => {
      const result = fileDatabase.getAllBlockedSites({ search: 'example' });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].domain).toBe('example.com');
    });
  });

  describe('Website Updates', () => {
    let websiteId: string;

    beforeEach(() => {
      const website = {
        url: 'https://example.com',
        domain: 'example.com',
        title: 'Example Website',
        category: 'general',
        enabled: true
      };

      const result = fileDatabase.addBlockedSite(website);
      websiteId = result.data.id;
    });

    test('should toggle website enabled status', () => {
      const result = fileDatabase.toggleBlockedSite(websiteId);
      
      expect(result.success).toBe(true);
      expect(result.data.enabled).toBe(false);

      // 再次切换
      const result2 = fileDatabase.toggleBlockedSite(websiteId);
      expect(result2.success).toBe(true);
      expect(result2.data.enabled).toBe(true);
    });

    test('should update website information', () => {
      const updates = {
        title: 'Updated Title',
        category: 'social',
        description: 'Updated description'
      };

      const result = fileDatabase.updateBlockedSite(websiteId, updates);
      
      expect(result.success).toBe(true);
      expect(result.data.title).toBe(updates.title);
      expect(result.data.category).toBe(updates.category);
      expect(result.data.description).toBe(updates.description);
      expect(result.data.updatedAt).toBeDefined();
    });

    test('should reject updates to non-existent website', () => {
      const result = fileDatabase.updateBlockedSite('non-existent-id', { title: 'New Title' });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Website Deletion', () => {
    let websiteId: string;

    beforeEach(() => {
      const website = {
        url: 'https://example.com',
        domain: 'example.com',
        title: 'Example Website',
        category: 'general',
        enabled: true
      };

      const result = fileDatabase.addBlockedSite(website);
      websiteId = result.data.id;
    });

    test('should delete website successfully', () => {
      const result = fileDatabase.deleteBlockedSite(websiteId);
      
      expect(result.success).toBe(true);

      // 验证网站已被删除
      const allSites = fileDatabase.getAllBlockedSites();
      expect(allSites.data).toHaveLength(0);
    });

    test('should reject deletion of non-existent website', () => {
      const result = fileDatabase.deleteBlockedSite('non-existent-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Website Blocking Check', () => {
    beforeEach(() => {
      const websites = [
        {
          url: 'https://blocked.com',
          domain: 'blocked.com',
          title: 'Blocked Site',
          category: 'general',
          enabled: true
        },
        {
          url: 'https://disabled.com',
          domain: 'disabled.com',
          title: 'Disabled Site',
          category: 'general',
          enabled: false
        }
      ];

      websites.forEach(site => fileDatabase.addBlockedSite(site));
    });

    test('should correctly identify blocked URLs', () => {
      const result = fileDatabase.isUrlBlocked('https://blocked.com/path');
      
      expect(result.isBlocked).toBe(true);
      expect(result.site).toBeDefined();
      expect(result.reason).toBe('URL match');
    });

    test('should not block disabled sites', () => {
      const result = fileDatabase.isUrlBlocked('https://disabled.com');
      
      expect(result.isBlocked).toBe(false);
    });

    test('should not block non-listed sites', () => {
      const result = fileDatabase.isUrlBlocked('https://allowed.com');
      
      expect(result.isBlocked).toBe(false);
    });

    test('should block by domain match', () => {
      const result = fileDatabase.isUrlBlocked('https://subdomain.blocked.com');
      
      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe('Domain match');
    });
  });

  describe('Data Persistence', () => {
    test('should persist data to file', () => {
      const website = {
        url: 'https://example.com',
        domain: 'example.com',
        title: 'Example Website',
        category: 'general',
        enabled: true
      };

      fileDatabase.addBlockedSite(website);

      // 验证文件已创建
      expect(fs.existsSync(testDataPath)).toBe(true);

      // 验证文件内容
      const fileContent = fs.readFileSync(testDataPath, 'utf8');
      const data = JSON.parse(fileContent);
      
      expect(data.blockedSites).toHaveLength(1);
      expect(data.blockedSites[0].url).toBe(website.url);
    });

    test('should load data from file on initialization', () => {
      // 创建测试数据文件
      const testData = {
        userConfig: null,
        blockedSites: [
          {
            id: '1',
            url: 'https://example.com',
            domain: 'example.com',
            title: 'Example',
            category: 'general',
            enabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        operationLogs: [],
        settings: {
          theme: 'system',
          language: 'zh-CN',
          sessionTimeout: 3600,
          autoStart: false
        }
      };

      fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));

      // 创建新的FileDatabase实例
      const newFileDatabase = new FileDatabase();
      const result = newFileDatabase.getAllBlockedSites();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].url).toBe('https://example.com');
    });
  });
});
