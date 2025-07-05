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

describe('Operation Logs', () => {
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

  describe('Basic Log Operations', () => {
    test('should record operation log', () => {
      fileDatabase.logOperation('test_action', true, { test: 'data' }, { target: 'test' });
      
      const logs = fileDatabase.getOperationLogs();
      expect(logs.success).toBe(true);
      expect(logs.data).toHaveLength(1);
      expect(logs.data[0].action).toBe('test_action');
      expect(logs.data[0].success).toBe(true);
      expect(logs.data[0].details).toEqual({ test: 'data' });
      expect(logs.data[0].metadata).toEqual({ target: 'test' });
    });

    test('should record multiple logs', () => {
      fileDatabase.logOperation('action1', true);
      fileDatabase.logOperation('action2', false, { error: 'test error' });
      fileDatabase.logOperation('action3', true, { data: 'test' });
      
      const logs = fileDatabase.getOperationLogs();
      expect(logs.success).toBe(true);
      expect(logs.data).toHaveLength(3);
      
      // 验证日志顺序（最新的在前）
      expect(logs.data[0].action).toBe('action3');
      expect(logs.data[1].action).toBe('action2');
      expect(logs.data[2].action).toBe('action1');
    });

    test('should filter logs by success status', () => {
      fileDatabase.logOperation('success_action', true);
      fileDatabase.logOperation('failed_action', false);
      fileDatabase.logOperation('another_success', true);
      
      const successLogs = fileDatabase.getOperationLogs({ success: true });
      expect(successLogs.success).toBe(true);
      expect(successLogs.data).toHaveLength(2);
      expect(successLogs.data.every(log => log.success)).toBe(true);
      
      const failedLogs = fileDatabase.getOperationLogs({ success: false });
      expect(failedLogs.success).toBe(true);
      expect(failedLogs.data).toHaveLength(1);
      expect(failedLogs.data[0].success).toBe(false);
    });

    test('should filter logs by action', () => {
      fileDatabase.logOperation('login', true);
      fileDatabase.logOperation('logout', true);
      fileDatabase.logOperation('login', false);
      
      const loginLogs = fileDatabase.getOperationLogs({ action: 'login' });
      expect(loginLogs.success).toBe(true);
      expect(loginLogs.data).toHaveLength(2);
      expect(loginLogs.data.every(log => log.action === 'login')).toBe(true);
    });

    test('should filter logs by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      fileDatabase.logOperation('old_action', true);
      
      const logs = fileDatabase.getOperationLogs({
        dateFrom: yesterday.toISOString(),
        dateTo: tomorrow.toISOString()
      });
      
      expect(logs.success).toBe(true);
      expect(logs.data).toHaveLength(1);
    });

    test('should search logs by content', () => {
      fileDatabase.logOperation('user_login', true, { username: 'testuser' });
      fileDatabase.logOperation('site_add', true, { url: 'example.com' });
      fileDatabase.logOperation('proxy_start', true);
      
      const searchResults = fileDatabase.getOperationLogs({ search: 'user' });
      expect(searchResults.success).toBe(true);
      expect(searchResults.data).toHaveLength(1);
      expect(searchResults.data[0].action).toBe('user_login');
    });
  });

  describe('Log Pagination', () => {
    beforeEach(() => {
      // 添加多个日志用于分页测试
      for (let i = 1; i <= 25; i++) {
        fileDatabase.logOperation(`action_${i}`, i % 2 === 0, { index: i });
      }
    });

    test('should paginate logs correctly', () => {
      const page1 = fileDatabase.getOperationLogs({ page: 1, limit: 10 });
      expect(page1.success).toBe(true);
      expect(page1.data).toHaveLength(10);
      expect(page1.total).toBe(25);
      
      const page2 = fileDatabase.getOperationLogs({ page: 2, limit: 10 });
      expect(page2.success).toBe(true);
      expect(page2.data).toHaveLength(10);
      
      const page3 = fileDatabase.getOperationLogs({ page: 3, limit: 10 });
      expect(page3.success).toBe(true);
      expect(page3.data).toHaveLength(5);
    });

    test('should return correct total count with filters', () => {
      const successLogs = fileDatabase.getOperationLogs({ 
        success: true, 
        page: 1, 
        limit: 5 
      });
      
      expect(successLogs.success).toBe(true);
      expect(successLogs.data).toHaveLength(5);
      expect(successLogs.total).toBe(12); // 12 odd numbers from 1-25
    });
  });

  describe('Log Cleanup', () => {
    test('should clear all logs', () => {
      fileDatabase.logOperation('action1', true);
      fileDatabase.logOperation('action2', true);
      
      const beforeClear = fileDatabase.getOperationLogs();
      expect(beforeClear.data).toHaveLength(2);
      
      const result = fileDatabase.clearOperationLogs();
      expect(result.success).toBe(true);
      
      const afterClear = fileDatabase.getOperationLogs();
      expect(afterClear.data).toHaveLength(0);
    });

    test('should cleanup old logs', () => {
      // 添加一些日志
      fileDatabase.logOperation('recent_action', true);
      
      // 手动添加一个旧日志
      const oldLog = {
        id: fileDatabase.generateId(),
        action: 'old_action',
        success: true,
        details: {},
        metadata: {},
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10天前
      };
      
      fileDatabase.data.operationLogs.push(oldLog);
      fileDatabase.saveData();
      
      const beforeCleanup = fileDatabase.getOperationLogs();
      expect(beforeCleanup.data).toHaveLength(2);
      
      const result = fileDatabase.cleanupOldLogs(7); // 清理7天前的日志
      expect(result.success).toBe(true);
      expect(result.data.deletedCount).toBe(1);
      
      const afterCleanup = fileDatabase.getOperationLogs();
      expect(afterCleanup.data).toHaveLength(1);
      expect(afterCleanup.data[0].action).toBe('recent_action');
    });
  });

  describe('Log Statistics', () => {
    beforeEach(() => {
      // 添加测试数据
      fileDatabase.logOperation('login', true);
      fileDatabase.logOperation('login', false);
      fileDatabase.logOperation('logout', true);
      fileDatabase.logOperation('add_site', true);
      fileDatabase.logOperation('add_site', false);
      fileDatabase.logOperation('proxy_start', true);
    });

    test('should get log statistics', () => {
      const stats = fileDatabase.getLogStatistics();
      
      expect(stats.success).toBe(true);
      expect(stats.data.total).toBe(6);
      expect(stats.data.successful).toBe(4);
      expect(stats.data.failed).toBe(2);
      expect(stats.data.actionCounts).toEqual({
        login: 2,
        logout: 1,
        add_site: 2,
        proxy_start: 1
      });
    });

    test('should get statistics with date filter', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const stats = fileDatabase.getLogStatistics({
        dateFrom: yesterday.toISOString(),
        dateTo: tomorrow.toISOString()
      });
      
      expect(stats.success).toBe(true);
      expect(stats.data.total).toBe(6);
    });
  });

  describe('Data Persistence', () => {
    test('should persist logs to file', () => {
      fileDatabase.logOperation('test_action', true, { test: 'data' });
      
      // 验证文件已创建并包含日志
      expect(fs.existsSync(testDataPath)).toBe(true);
      
      const fileContent = fs.readFileSync(testDataPath, 'utf8');
      const data = JSON.parse(fileContent);
      
      expect(data.operationLogs).toHaveLength(1);
      expect(data.operationLogs[0].action).toBe('test_action');
    });

    test('should load logs from file on initialization', () => {
      // 创建测试数据文件
      const testData = {
        userConfig: null,
        blockedSites: [],
        operationLogs: [
          {
            id: '1',
            action: 'test_action',
            success: true,
            details: { test: 'data' },
            metadata: {},
            timestamp: new Date().toISOString()
          }
        ],
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
      const logs = newFileDatabase.getOperationLogs();

      expect(logs.success).toBe(true);
      expect(logs.data).toHaveLength(1);
      expect(logs.data[0].action).toBe('test_action');
    });
  });
});
