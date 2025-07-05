import { DatabaseService } from './DatabaseService';

/**
 * 数据库服务使用示例
 * 展示如何在主进程中集成和使用数据库功能
 */
export class DatabaseUsageExample {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * 初始化数据库服务
   */
  async initialize(): Promise<void> {
    try {
      await this.databaseService.initialize();
      console.log('✅ 数据库服务初始化成功');
    } catch (error) {
      console.error('❌ 数据库服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 用户认证示例
   */
  async handleUserAuthentication(): Promise<void> {
    const authService = this.databaseService.getAuthService();

    // 检查是否已初始化用户
    const isInitialized = await authService.isUserInitialized();
    
    if (!isInitialized) {
      // 首次使用，初始化用户
      console.log('首次使用，请设置密码...');
      await authService.initializeUser('defaultPassword123', {
        theme: 'system',
        language: 'zh-CN',
        sessionTimeout: 3600
      });
      console.log('✅ 用户初始化完成');
    }

    // 用户登录
    const loginResult = await authService.login('defaultPassword123', {
      ipAddress: '127.0.0.1',
      userAgent: 'CuiZijinTrap/1.0'
    });

    if (loginResult.success) {
      console.log('✅ 用户登录成功，会话ID:', loginResult.sessionId);
      
      // 验证会话
      const authStatus = await authService.validateSession(loginResult.sessionId!);
      console.log('✅ 会话验证:', authStatus.isAuthenticated);
    } else {
      console.log('❌ 用户登录失败:', loginResult.error);
    }
  }

  /**
   * 网站管理示例
   */
  async handleSiteManagement(): Promise<void> {
    const siteService = this.databaseService.getBlockedSiteService();

    // 添加一些示例网站
    const sitesToAdd = [
      {
        url: 'https://facebook.com',
        domain: 'facebook.com',
        title: 'Facebook',
        category: 'social',
        enabled: true
      },
      {
        url: 'https://twitter.com',
        domain: 'twitter.com',
        title: 'Twitter',
        category: 'social',
        enabled: true
      },
      {
        url: 'https://youtube.com',
        domain: 'youtube.com',
        title: 'YouTube',
        category: 'entertainment',
        enabled: false
      }
    ];

    // 批量添加网站
    const batchResult = await siteService.addMultipleSites(sitesToAdd);
    console.log(`✅ 批量添加网站: ${batchResult.processed}个成功, ${batchResult.failed}个失败`);

    // 获取网站列表
    const sitesList = await siteService.getSites({
      filter: { enabled: true },
      orderBy: 'domain',
      order: 'ASC'
    });
    console.log(`✅ 获取启用的网站: ${sitesList.total}个`);

    // 检查特定域名是否被阻止
    const isBlocked = await siteService.isDomainBlocked('facebook.com');
    console.log('✅ Facebook是否被阻止:', isBlocked);

    // 获取网站统计
    const stats = await siteService.getStats();
    console.log('✅ 网站统计:', {
      total: stats.total,
      enabled: stats.enabled,
      categories: stats.categories
    });
  }

  /**
   * 日志记录示例
   */
  async handleLogging(): Promise<void> {
    const loggingService = this.databaseService.getLoggingService();

    // 记录各种类型的日志
    await loggingService.info('app_started', { version: '1.0.0' });
    await loggingService.warn('high_memory_usage', { usage: '85%' });
    
    try {
      // 模拟一个错误
      throw new Error('模拟错误');
    } catch (error) {
      await loggingService.error('simulated_error', error as Error, { context: 'example' });
    }

    // 记录用户操作
    await loggingService.logUserAction('site_added', true, {
      domain: 'example.com',
      category: 'test'
    });

    // 记录网站拦截
    await loggingService.logIntercept('facebook.com', 'https://facebook.com/login');

    // 获取最近的日志
    const recentLogs = await loggingService.getRecentLogs(10);
    console.log(`✅ 最近的日志: ${recentLogs.length}条`);

    // 获取日志统计
    const logStats = await loggingService.getLogStats(7);
    console.log('✅ 日志统计:', {
      total: logStats.total,
      errors: logStats.byLevel.error,
      warnings: logStats.byLevel.warn
    });
  }

  /**
   * 拦截统计示例
   */
  async handleInterceptStats(): Promise<void> {
    const { interceptStatsDAO } = this.databaseService.getDAOs();
    
    if (!interceptStatsDAO) return;

    // 模拟一些拦截记录
    await interceptStatsDAO.recordIntercept(1, 'facebook.com');
    await interceptStatsDAO.recordIntercept(1, 'facebook.com');
    await interceptStatsDAO.recordIntercept(2, 'twitter.com');

    // 获取今天的统计
    const todayStats = await interceptStatsDAO.getTodayStats();
    console.log(`✅ 今日拦截统计: ${todayStats.length}条记录`);

    // 获取总体统计
    const overallStats = await interceptStatsDAO.getOverallStats();
    console.log('✅ 总体统计:', {
      totalIntercepts: overallStats.totalIntercepts,
      uniqueSites: overallStats.uniqueSites,
      mostBlocked: overallStats.mostBlockedSite?.domain
    });

    // 获取趋势数据
    const trendData = await interceptStatsDAO.getTrendData(7);
    console.log(`✅ 7天趋势数据: ${trendData.length}个数据点`);
  }

  /**
   * 配置管理示例
   */
  async handleConfiguration(): Promise<void> {
    const { appConfigDAO } = this.databaseService.getDAOs();
    
    if (!appConfigDAO) return;

    // 设置一些配置
    await appConfigDAO.setNumber('proxy_port', 8888);
    await appConfigDAO.setBoolean('enable_notifications', true);
    await appConfigDAO.setString('theme', 'dark');
    await appConfigDAO.setJson('window_bounds', {
      width: 1200,
      height: 800,
      x: 100,
      y: 100
    });

    // 读取配置
    const proxyPort = await appConfigDAO.getNumber('proxy_port');
    const enableNotifications = await appConfigDAO.getBoolean('enable_notifications');
    const theme = await appConfigDAO.getString('theme');
    const windowBounds = await appConfigDAO.getJson('window_bounds');

    console.log('✅ 配置读取:', {
      proxyPort,
      enableNotifications,
      theme,
      windowBounds
    });

    // 批量获取配置
    const configs = await appConfigDAO.getMultiple([
      'proxy_port',
      'enable_notifications',
      'theme'
    ]);
    console.log('✅ 批量配置:', configs);
  }

  /**
   * 数据维护示例
   */
  async handleMaintenance(): Promise<void> {
    // 执行数据库维护
    const maintenanceResult = await this.databaseService.performMaintenance();
    console.log('✅ 数据库维护完成:', maintenanceResult);

    // 获取数据库状态
    const status = await this.databaseService.getStatus();
    console.log('✅ 数据库状态:', {
      isInitialized: status.isInitialized,
      databaseSize: status.databaseStatus.databaseSize,
      tableCount: status.databaseStatus.tableCount
    });

    // 创建备份
    const backupPath = await this.databaseService.backup();
    console.log('✅ 数据库备份:', backupPath);
  }

  /**
   * 数据导出示例
   */
  async handleDataExport(): Promise<void> {
    // 导出所有数据
    const exportData = await this.databaseService.exportData({
      includeSites: true,
      includeLogs: true,
      format: 'json',
      dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 最近7天
    });

    console.log('✅ 数据导出完成');
    console.log('- 网站数据长度:', exportData.sites?.length || 0);
    console.log('- 日志数据长度:', exportData.logs?.length || 0);
    console.log('- 导出时间:', exportData.metadata.exportDate);
  }

  /**
   * 运行完整示例
   */
  async runExample(): Promise<void> {
    try {
      console.log('🚀 开始数据库使用示例...\n');

      // 1. 初始化
      await this.initialize();

      // 2. 用户认证
      console.log('\n📝 用户认证示例:');
      await this.handleUserAuthentication();

      // 3. 网站管理
      console.log('\n🌐 网站管理示例:');
      await this.handleSiteManagement();

      // 4. 日志记录
      console.log('\n📋 日志记录示例:');
      await this.handleLogging();

      // 5. 拦截统计
      console.log('\n📊 拦截统计示例:');
      await this.handleInterceptStats();

      // 6. 配置管理
      console.log('\n⚙️ 配置管理示例:');
      await this.handleConfiguration();

      // 7. 数据维护
      console.log('\n🔧 数据维护示例:');
      await this.handleMaintenance();

      // 8. 数据导出
      console.log('\n💾 数据导出示例:');
      await this.handleDataExport();

      console.log('\n🎉 所有示例完成！');

    } catch (error) {
      console.error('❌ 示例执行失败:', error);
    } finally {
      // 清理资源
      await this.databaseService.close();
      console.log('🧹 资源清理完成');
    }
  }
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  const example = new DatabaseUsageExample();
  example.runExample().catch(console.error);
}
