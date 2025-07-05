# 崔子瑾诱捕器 - 数据库层

这是崔子瑾诱捕器应用的完整数据库层实现，基于SQLite数据库，提供用户认证、网站黑名单管理、操作日志记录和统计功能。

## 📁 目录结构

```
src/main/database/
├── index.ts                    # 统一导出入口
├── DatabaseService.ts          # 数据库服务主入口
├── DatabaseManager.ts          # 数据库管理器
├── MigrationManager.ts         # 数据库迁移管理
├── schema.sql                  # 数据库Schema定义
├── models/                     # 数据访问对象(DAO)
│   ├── BaseDAO.ts             # 基础DAO类
│   ├── UserDAO.ts             # 用户数据访问
│   ├── BlockedSiteDAO.ts      # 网站黑名单数据访问
│   ├── OperationLogDAO.ts     # 操作日志数据访问
│   ├── InterceptStatsDAO.ts   # 拦截统计数据访问
│   └── AppConfigDAO.ts        # 应用配置数据访问
├── services/                   # 业务服务层
│   ├── AuthService.ts         # 用户认证服务
│   ├── BlockedSiteService.ts  # 网站管理服务
│   └── LoggingService.ts      # 日志记录服务
├── migrations/                 # 数据库迁移文件
│   └── 001_initial_schema.ts  # 初始Schema迁移
├── test-database.ts           # 数据库功能测试
└── README.md                  # 本文档
```

## 🚀 快速开始

### 基本使用

```typescript
import { DatabaseService } from './database';

// 创建数据库服务实例
const databaseService = new DatabaseService();

// 初始化数据库
await databaseService.initialize();

// 获取各种服务
const authService = databaseService.getAuthService();
const siteService = databaseService.getBlockedSiteService();
const loggingService = databaseService.getLoggingService();
```

### 用户认证

```typescript
// 初始化用户（首次设置）
await authService.initializeUser('password123', {
  theme: 'dark',
  language: 'zh-CN'
});

// 用户登录
const loginResult = await authService.login('password123', {
  ipAddress: '127.0.0.1',
  userAgent: 'MyApp/1.0'
});

if (loginResult.success) {
  console.log('登录成功，会话ID:', loginResult.sessionId);
}

// 验证会话
const authStatus = await authService.validateSession(sessionId);
if (authStatus.isAuthenticated) {
  console.log('会话有效，剩余时间:', authStatus.timeRemaining);
}
```

### 网站管理

```typescript
// 添加网站到黑名单
const addResult = await siteService.addSite({
  url: 'https://example.com',
  domain: 'example.com',
  title: '示例网站',
  category: 'social',
  enabled: true
});

// 获取网站列表
const sites = await siteService.getSites({
  filter: { enabled: true },
  page: 1,
  limit: 20
});

// 检查域名是否被阻止
const isBlocked = await siteService.isDomainBlocked('example.com');

// 切换网站状态
await siteService.toggleSite(siteId);

// 批量操作
await siteService.addMultipleSites([
  { url: 'site1.com', domain: 'site1.com' },
  { url: 'site2.com', domain: 'site2.com' }
]);
```

### 日志记录

```typescript
// 记录不同级别的日志
await loggingService.info('user_login', { userId: 1 });
await loggingService.warn('suspicious_activity', { details: '...' });
await loggingService.error('database_error', new Error('Connection failed'));

// 搜索日志
const logs = await loggingService.searchLogs({
  query: 'login',
  dateFrom: new Date('2025-01-01'),
  limit: 50
});

// 获取日志统计
const stats = await loggingService.getLogStats(7); // 最近7天
```

## 📊 数据库Schema

### 主要表结构

#### user_config - 用户配置表
- `id` - 主键
- `password_hash` - 密码哈希
- `salt` - 密码盐值
- `session_timeout` - 会话超时时间
- `theme` - 主题设置
- `language` - 语言设置

#### blocked_sites - 黑名单网站表
- `id` - 主键
- `url` - 完整URL
- `domain` - 域名
- `title` - 网站标题
- `enabled` - 是否启用
- `category` - 分类
- `priority` - 优先级

#### operation_logs - 操作日志表
- `id` - 主键
- `action` - 操作类型
- `target` - 操作目标
- `details` - 详细信息(JSON)
- `success` - 是否成功
- `timestamp` - 时间戳

#### intercept_stats - 拦截统计表
- `id` - 主键
- `site_id` - 网站ID
- `domain` - 域名
- `intercept_count` - 拦截次数
- `date` - 日期

#### app_config - 应用配置表
- `id` - 主键
- `key` - 配置键
- `value` - 配置值
- `type` - 值类型

## 🔧 高级功能

### 数据库迁移

数据库支持版本化迁移，确保数据结构的平滑升级：

```typescript
const migrationManager = new MigrationManager(db);

// 检查是否需要迁移
if (migrationManager.needsMigration()) {
  await migrationManager.migrate();
}

// 获取迁移状态
const status = migrationManager.getMigrationStatus();
```

### 数据备份与恢复

```typescript
// 备份数据库
const backupPath = await databaseService.backup();

// 导出数据
const exportData = await databaseService.exportData({
  includeSites: true,
  includeLogs: true,
  format: 'json'
});
```

### 性能优化

数据库层包含多项性能优化：

- **索引优化** - 为常用查询字段创建索引
- **连接池** - 复用数据库连接
- **批量操作** - 支持批量插入和更新
- **缓存机制** - 缓存频繁访问的配置
- **日志缓冲** - 批量写入日志以提高性能

### 数据维护

```typescript
// 执行数据库维护
const result = await databaseService.performMaintenance();
console.log('清理日志:', result.logsCleanedUp);
console.log('清理统计:', result.statsCleanedUp);

// 手动清理
await loggingService.cleanupLogs();
await interceptStatsDAO.cleanupOldStats(90); // 保留90天
```

## 🛡️ 安全特性

### 密码安全
- 使用bcrypt进行密码哈希
- 随机盐值生成
- 密码强度验证

### SQL注入防护
- 使用参数化查询
- 输入验证和清理
- 类型安全的TypeScript接口

### 会话管理
- 安全的会话ID生成
- 会话超时控制
- 自动清理过期会话

## 🧪 测试

运行数据库功能测试：

```bash
# 编译TypeScript
npm run build

# 运行测试
node dist/main/database/test-database.js
```

测试覆盖以下功能：
- 数据库初始化
- 用户认证流程
- 网站管理操作
- 日志记录功能
- 统计数据收集
- 配置管理
- 备份和维护

## 📝 最佳实践

### 错误处理
```typescript
try {
  await siteService.addSite(siteData);
} catch (error) {
  await loggingService.error('add_site_failed', error, { siteData });
  throw error;
}
```

### 事务使用
```typescript
// 在DAO层使用事务
const result = this.transaction(() => {
  // 多个数据库操作
  this.execute(sql1, params1);
  this.execute(sql2, params2);
  return this.execute(sql3, params3);
});
```

### 资源清理
```typescript
// 应用关闭时清理资源
process.on('SIGTERM', async () => {
  await databaseService.close();
  process.exit(0);
});
```

## 🔄 版本历史

- **v1.0.0** - 初始版本，包含完整的数据库层实现
  - 用户认证系统
  - 网站黑名单管理
  - 操作日志记录
  - 拦截统计功能
  - 应用配置管理
  - 数据库迁移支持

## 📞 支持

如有问题或建议，请查看项目文档或联系开发团队。
