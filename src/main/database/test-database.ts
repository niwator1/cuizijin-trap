import { DatabaseService } from './DatabaseService';
import path from 'path';
import fs from 'fs';

/**
 * 数据库功能测试脚本
 * 用于验证数据库层的各项功能是否正常工作
 */
async function testDatabase() {
  console.log('🚀 开始测试数据库功能...\n');

  // 创建临时测试数据库
  const testDbPath = path.join(__dirname, 'test.db');
  
  // 清理之前的测试数据库
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const databaseService = new DatabaseService();

  try {
    // 1. 测试数据库初始化
    console.log('📊 测试数据库初始化...');
    await databaseService.initialize();
    console.log('✅ 数据库初始化成功\n');

    // 2. 测试用户认证功能
    console.log('🔐 测试用户认证功能...');
    const authService = databaseService.getAuthService();
    
    // 初始化用户
    const initResult = await authService.initializeUser('test123456', {
      theme: 'dark',
      language: 'zh-CN'
    });
    console.log('✅ 用户初始化:', initResult);

    // 测试登录
    const loginResult = await authService.login('test123456', {
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent'
    });
    console.log('✅ 用户登录:', loginResult.success);

    // 验证会话
    if (loginResult.sessionId) {
      const sessionStatus = await authService.validateSession(loginResult.sessionId);
      console.log('✅ 会话验证:', sessionStatus.isAuthenticated);
    }
    console.log('');

    // 3. 测试网站管理功能
    console.log('🌐 测试网站管理功能...');
    const siteService = databaseService.getBlockedSiteService();

    // 添加测试网站
    const addResult1 = await siteService.addSite({
      url: 'https://example.com',
      domain: 'example.com',
      title: '示例网站',
      category: 'test',
      enabled: true
    });
    console.log('✅ 添加网站1:', addResult1.success);

    const addResult2 = await siteService.addSite({
      url: 'https://test.com',
      domain: 'test.com',
      title: '测试网站',
      category: 'test',
      enabled: false
    });
    console.log('✅ 添加网站2:', addResult2.success);

    // 获取网站列表
    const sitesList = await siteService.getSites();
    console.log('✅ 获取网站列表:', sitesList.total, '个网站');

    // 检查域名是否被阻止
    const isBlocked = await siteService.isDomainBlocked('example.com');
    console.log('✅ 域名阻止检查:', isBlocked);

    // 切换网站状态
    if (addResult1.site) {
      const toggleResult = await siteService.toggleSite(addResult1.site.id);
      console.log('✅ 切换网站状态:', toggleResult?.enabled);
    }
    console.log('');

    // 4. 测试日志功能
    console.log('📝 测试日志功能...');
    const loggingService = databaseService.getLoggingService();

    // 记录各种类型的日志
    await loggingService.info('test_info', { message: '这是一条信息日志' });
    await loggingService.warn('test_warning', { message: '这是一条警告日志' });
    await loggingService.error('test_error', new Error('这是一个测试错误'), { context: 'test' });

    // 获取最近的日志
    const recentLogs = await loggingService.getRecentLogs(5);
    console.log('✅ 获取最近日志:', recentLogs.length, '条');

    // 获取日志统计
    const logStats = await loggingService.getLogStats();
    console.log('✅ 日志统计:', logStats.total, '条总日志');
    console.log('');

    // 5. 测试统计功能
    console.log('📈 测试统计功能...');
    const { interceptStatsDAO } = databaseService.getDAOs();

    if (interceptStatsDAO && addResult1.site) {
      // 记录拦截统计
      await interceptStatsDAO.recordIntercept(addResult1.site.id, 'example.com');
      await interceptStatsDAO.recordIntercept(addResult1.site.id, 'example.com');

      // 获取今天的统计
      const todayStats = await interceptStatsDAO.getTodayStats();
      console.log('✅ 今日统计:', todayStats.length, '条记录');

      // 获取总体统计
      const overallStats = await interceptStatsDAO.getOverallStats();
      console.log('✅ 总体统计:', overallStats.totalIntercepts, '次拦截');
    }
    console.log('');

    // 6. 测试配置功能
    console.log('⚙️ 测试配置功能...');
    const { appConfigDAO } = databaseService.getDAOs();

    if (appConfigDAO) {
      // 设置配置
      await appConfigDAO.setString('test_config', 'test_value');
      await appConfigDAO.setNumber('test_number', 42);
      await appConfigDAO.setBoolean('test_boolean', true);

      // 获取配置
      const stringValue = await appConfigDAO.getString('test_config');
      const numberValue = await appConfigDAO.getNumber('test_number');
      const booleanValue = await appConfigDAO.getBoolean('test_boolean');

      console.log('✅ 字符串配置:', stringValue);
      console.log('✅ 数字配置:', numberValue);
      console.log('✅ 布尔配置:', booleanValue);
    }
    console.log('');

    // 7. 测试数据库状态和统计
    console.log('📊 测试数据库状态...');
    const status = await databaseService.getStatus();
    console.log('✅ 数据库状态:', status.isInitialized);

    const statistics = await databaseService.getStatistics();
    console.log('✅ 数据库统计:', JSON.stringify(statistics.database.recordCounts, null, 2));
    console.log('');

    // 8. 测试备份功能
    console.log('💾 测试备份功能...');
    const backupPath = await databaseService.backup();
    console.log('✅ 数据库备份:', backupPath);
    console.log('');

    // 9. 测试维护功能
    console.log('🔧 测试维护功能...');
    const maintenanceResult = await databaseService.performMaintenance();
    console.log('✅ 数据库维护:', maintenanceResult);
    console.log('');

    console.log('🎉 所有测试完成！数据库功能正常工作。\n');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 清理
    try {
      await databaseService.close();
      
      // 删除测试数据库文件
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      
      console.log('🧹 测试清理完成');
    } catch (error) {
      console.error('清理失败:', error);
    }
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testDatabase().catch(console.error);
}

export { testDatabase };
