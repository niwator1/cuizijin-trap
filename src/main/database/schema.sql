-- 崔子瑾诱捕器数据库Schema
-- 版本: 1.0.0
-- 创建时间: 2025-06-28

-- 启用外键约束
PRAGMA foreign_keys = ON;

-- 用户配置表
CREATE TABLE IF NOT EXISTS user_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  session_timeout INTEGER DEFAULT 3600, -- 会话超时时间（秒）
  auto_start BOOLEAN DEFAULT 0, -- 是否开机自启
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'zh-CN',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 黑名单网站表
CREATE TABLE IF NOT EXISTS blocked_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE, -- 完整URL
  domain TEXT NOT NULL, -- 提取的域名
  title TEXT, -- 网站标题（可选）
  description TEXT, -- 网站描述（可选）
  enabled BOOLEAN DEFAULT 1, -- 是否启用拦截
  block_type TEXT DEFAULT 'domain' CHECK (block_type IN ('domain', 'url', 'keyword')), -- 拦截类型
  category TEXT DEFAULT 'general', -- 网站分类
  priority INTEGER DEFAULT 0, -- 优先级（数字越大优先级越高）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL, -- 操作类型：login, logout, add_site, remove_site, toggle_site, reset_all, etc.
  target TEXT, -- 操作目标（如网站URL、用户ID等）
  target_id INTEGER, -- 操作目标的ID
  details TEXT, -- 操作详情（JSON格式）
  ip_address TEXT, -- 操作来源IP
  user_agent TEXT, -- 用户代理
  success BOOLEAN DEFAULT 1, -- 操作是否成功
  error_message TEXT, -- 错误信息（如果操作失败）
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 拦截统计表
CREATE TABLE IF NOT EXISTS intercept_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  domain TEXT NOT NULL,
  intercept_count INTEGER DEFAULT 1,
  last_intercept_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  date TEXT NOT NULL, -- 日期（YYYY-MM-DD格式）
  FOREIGN KEY (site_id) REFERENCES blocked_sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, date)
);

-- 应用配置表
CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  type TEXT DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_blocked_sites_domain ON blocked_sites(domain);
CREATE INDEX IF NOT EXISTS idx_blocked_sites_enabled ON blocked_sites(enabled);
CREATE INDEX IF NOT EXISTS idx_blocked_sites_category ON blocked_sites(category);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);
CREATE INDEX IF NOT EXISTS idx_operation_logs_timestamp ON operation_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_operation_logs_target ON operation_logs(target);
CREATE INDEX IF NOT EXISTS idx_intercept_stats_domain ON intercept_stats(domain);
CREATE INDEX IF NOT EXISTS idx_intercept_stats_date ON intercept_stats(date);
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(key);

-- 创建触发器以自动更新updated_at字段
CREATE TRIGGER IF NOT EXISTS update_user_config_timestamp 
  AFTER UPDATE ON user_config
  FOR EACH ROW
  BEGIN
    UPDATE user_config SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_blocked_sites_timestamp 
  AFTER UPDATE ON blocked_sites
  FOR EACH ROW
  BEGIN
    UPDATE blocked_sites SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_app_config_timestamp 
  AFTER UPDATE ON app_config
  FOR EACH ROW
  BEGIN
    UPDATE app_config SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- 插入默认配置数据
INSERT OR IGNORE INTO app_config (key, value, type, description) VALUES
  ('proxy_port', '8888', 'number', '代理服务器端口'),
  ('proxy_auth_token_length', '32', 'number', '代理认证令牌长度'),
  ('max_log_entries', '10000', 'number', '最大日志条目数'),
  ('log_retention_days', '30', 'number', '日志保留天数'),
  ('auto_backup', 'true', 'boolean', '是否自动备份'),
  ('backup_interval_hours', '24', 'number', '备份间隔（小时）'),
  ('enable_statistics', 'true', 'boolean', '是否启用统计功能'),
  ('block_page_template', 'default', 'string', '拦截页面模板'),
  ('notification_enabled', 'true', 'boolean', '是否启用通知'),
  ('debug_mode', 'false', 'boolean', '调试模式');

-- 创建视图以简化常用查询
CREATE VIEW IF NOT EXISTS active_blocked_sites AS
SELECT 
  id,
  url,
  domain,
  title,
  description,
  category,
  priority,
  created_at,
  updated_at
FROM blocked_sites 
WHERE enabled = 1
ORDER BY priority DESC, domain ASC;

CREATE VIEW IF NOT EXISTS daily_stats AS
SELECT 
  date,
  COUNT(DISTINCT site_id) as unique_sites_blocked,
  SUM(intercept_count) as total_intercepts,
  MAX(last_intercept_at) as last_intercept_time
FROM intercept_stats 
GROUP BY date
ORDER BY date DESC;

CREATE VIEW IF NOT EXISTS top_blocked_sites AS
SELECT 
  bs.domain,
  bs.title,
  bs.category,
  SUM(ist.intercept_count) as total_intercepts,
  MAX(ist.last_intercept_at) as last_intercept_at
FROM blocked_sites bs
LEFT JOIN intercept_stats ist ON bs.id = ist.site_id
WHERE bs.enabled = 1
GROUP BY bs.id, bs.domain, bs.title, bs.category
ORDER BY total_intercepts DESC, last_intercept_at DESC;
