import { EventEmitter } from 'events';
import { DatabaseService } from '../database';

/**
 * 高级拦截规则引擎
 * 支持复杂的规则匹配、时间段控制、用户组管理等功能
 */
export class AdvancedRuleEngine extends EventEmitter {
  private databaseService: DatabaseService;
  private rules: Map<string, BlockingRule> = new Map();
  private userGroups: Map<string, UserGroup> = new Map();
  private schedules: Map<string, Schedule> = new Map();

  constructor(databaseService: DatabaseService) {
    super();
    this.databaseService = databaseService;
    this.initializeRuleEngine();
  }

  /**
   * 初始化规则引擎
   */
  private async initializeRuleEngine(): Promise<void> {
    try {
      await this.loadRulesFromDatabase();
      await this.loadUserGroupsFromDatabase();
      await this.loadSchedulesFromDatabase();
      console.log('高级规则引擎初始化完成');
    } catch (error) {
      console.error('规则引擎初始化失败:', error);
    }
  }

  /**
   * 检查URL是否应该被拦截
   */
  async shouldBlock(
    url: string, 
    userId?: string, 
    timestamp: Date = new Date()
  ): Promise<{
    shouldBlock: boolean;
    matchedRule?: BlockingRule;
    reason?: string;
  }> {
    try {
      // 获取用户所属的用户组
      const userGroup = userId ? this.getUserGroup(userId) : null;
      
      // 遍历所有规则进行匹配
      for (const [ruleId, rule] of this.rules) {
        // 检查规则是否启用
        if (!rule.enabled) continue;
        
        // 检查用户组权限
        if (!this.checkUserGroupPermission(rule, userGroup)) continue;
        
        // 检查时间段限制
        if (!this.checkSchedulePermission(rule, timestamp)) continue;
        
        // 检查URL匹配
        if (this.matchesRule(url, rule)) {
          return {
            shouldBlock: true,
            matchedRule: rule,
            reason: rule.description || '匹配拦截规则'
          };
        }
      }
      
      return { shouldBlock: false };
    } catch (error) {
      console.error('规则检查失败:', error);
      return { shouldBlock: false };
    }
  }

  /**
   * 添加新的拦截规则
   */
  async addRule(rule: Omit<BlockingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const ruleId = this.generateRuleId();
      const newRule: BlockingRule = {
        ...rule,
        id: ruleId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 验证规则
      this.validateRule(newRule);
      
      // 保存到数据库
      await this.saveRuleToDatabase(newRule);
      
      // 添加到内存缓存
      this.rules.set(ruleId, newRule);
      
      this.emit('rule-added', newRule);
      console.log(`新规则已添加: ${ruleId}`);
      
      return ruleId;
    } catch (error) {
      console.error('添加规则失败:', error);
      throw error;
    }
  }

  /**
   * 更新拦截规则
   */
  async updateRule(ruleId: string, updates: Partial<BlockingRule>): Promise<void> {
    try {
      const existingRule = this.rules.get(ruleId);
      if (!existingRule) {
        throw new Error('规则不存在');
      }

      const updatedRule: BlockingRule = {
        ...existingRule,
        ...updates,
        id: ruleId, // 确保ID不被修改
        updatedAt: new Date().toISOString()
      };

      // 验证更新后的规则
      this.validateRule(updatedRule);
      
      // 更新数据库
      await this.updateRuleInDatabase(updatedRule);
      
      // 更新内存缓存
      this.rules.set(ruleId, updatedRule);
      
      this.emit('rule-updated', updatedRule);
      console.log(`规则已更新: ${ruleId}`);
    } catch (error) {
      console.error('更新规则失败:', error);
      throw error;
    }
  }

  /**
   * 删除拦截规则
   */
  async deleteRule(ruleId: string): Promise<void> {
    try {
      const rule = this.rules.get(ruleId);
      if (!rule) {
        throw new Error('规则不存在');
      }

      // 从数据库删除
      await this.deleteRuleFromDatabase(ruleId);
      
      // 从内存缓存删除
      this.rules.delete(ruleId);
      
      this.emit('rule-deleted', { ruleId, rule });
      console.log(`规则已删除: ${ruleId}`);
    } catch (error) {
      console.error('删除规则失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有规则
   */
  getAllRules(): BlockingRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取指定规则
   */
  getRule(ruleId: string): BlockingRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * 添加用户组
   */
  async addUserGroup(group: Omit<UserGroup, 'id' | 'createdAt'>): Promise<string> {
    try {
      const groupId = this.generateGroupId();
      const newGroup: UserGroup = {
        ...group,
        id: groupId,
        createdAt: new Date().toISOString()
      };

      await this.saveUserGroupToDatabase(newGroup);
      this.userGroups.set(groupId, newGroup);
      
      this.emit('user-group-added', newGroup);
      return groupId;
    } catch (error) {
      console.error('添加用户组失败:', error);
      throw error;
    }
  }

  /**
   * 添加时间计划
   */
  async addSchedule(schedule: Omit<Schedule, 'id' | 'createdAt'>): Promise<string> {
    try {
      const scheduleId = this.generateScheduleId();
      const newSchedule: Schedule = {
        ...schedule,
        id: scheduleId,
        createdAt: new Date().toISOString()
      };

      await this.saveScheduleToDatabase(newSchedule);
      this.schedules.set(scheduleId, newSchedule);
      
      this.emit('schedule-added', newSchedule);
      return scheduleId;
    } catch (error) {
      console.error('添加时间计划失败:', error);
      throw error;
    }
  }

  /**
   * 检查URL是否匹配规则
   */
  private matchesRule(url: string, rule: BlockingRule): boolean {
    try {
      switch (rule.matchType) {
        case 'exact':
          return url === rule.pattern;
        
        case 'domain':
          const urlObj = new URL(url);
          return urlObj.hostname === rule.pattern || 
                 urlObj.hostname.endsWith('.' + rule.pattern);
        
        case 'contains':
          return url.includes(rule.pattern);
        
        case 'regex':
          const regex = new RegExp(rule.pattern, rule.caseSensitive ? '' : 'i');
          return regex.test(url);
        
        case 'wildcard':
          const wildcardRegex = new RegExp(
            rule.pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
            rule.caseSensitive ? '' : 'i'
          );
          return wildcardRegex.test(url);
        
        default:
          return false;
      }
    } catch (error) {
      console.error('规则匹配检查失败:', error);
      return false;
    }
  }

  /**
   * 检查用户组权限
   */
  private checkUserGroupPermission(rule: BlockingRule, userGroup: UserGroup | null): boolean {
    // 如果规则没有指定用户组，则对所有用户生效
    if (!rule.userGroups || rule.userGroups.length === 0) {
      return true;
    }
    
    // 如果用户没有分组，则只能匹配无分组限制的规则
    if (!userGroup) {
      return false;
    }
    
    // 检查用户组是否在规则的允许列表中
    return rule.userGroups.includes(userGroup.id);
  }

  /**
   * 检查时间段权限
   */
  private checkSchedulePermission(rule: BlockingRule, timestamp: Date): boolean {
    // 如果规则没有指定时间计划，则始终生效
    if (!rule.scheduleId) {
      return true;
    }
    
    const schedule = this.schedules.get(rule.scheduleId);
    if (!schedule) {
      return true; // 如果找不到时间计划，默认允许
    }
    
    return this.isTimeInSchedule(timestamp, schedule);
  }

  /**
   * 检查时间是否在计划范围内
   */
  private isTimeInSchedule(timestamp: Date, schedule: Schedule): boolean {
    const dayOfWeek = timestamp.getDay(); // 0 = Sunday, 1 = Monday, ...
    const timeStr = timestamp.toTimeString().substring(0, 5); // HH:MM
    
    // 检查是否在允许的星期几
    if (!schedule.daysOfWeek.includes(dayOfWeek)) {
      return false;
    }
    
    // 检查是否在允许的时间范围内
    for (const timeRange of schedule.timeRanges) {
      if (timeStr >= timeRange.start && timeStr <= timeRange.end) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 验证规则有效性
   */
  private validateRule(rule: BlockingRule): void {
    if (!rule.name || rule.name.trim() === '') {
      throw new Error('规则名称不能为空');
    }
    
    if (!rule.pattern || rule.pattern.trim() === '') {
      throw new Error('匹配模式不能为空');
    }
    
    if (rule.matchType === 'regex') {
      try {
        new RegExp(rule.pattern);
      } catch (error) {
        throw new Error('正则表达式格式无效');
      }
    }
  }

  /**
   * 获取用户所属的用户组
   */
  private getUserGroup(userId: string): UserGroup | null {
    for (const group of this.userGroups.values()) {
      if (group.userIds.includes(userId)) {
        return group;
      }
    }
    return null;
  }

  /**
   * 生成规则ID
   */
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成用户组ID
   */
  private generateGroupId(): string {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成时间计划ID
   */
  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 从数据库加载规则
   */
  private async loadRulesFromDatabase(): Promise<void> {
    try {
      const db = await this.databaseService.getDatabase();

      // 确保表存在
      db.exec(`
        CREATE TABLE IF NOT EXISTS advanced_rules (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          pattern TEXT NOT NULL,
          match_type TEXT NOT NULL,
          case_sensitive INTEGER DEFAULT 0,
          enabled INTEGER DEFAULT 1,
          priority INTEGER DEFAULT 0,
          action TEXT DEFAULT 'block',
          redirect_url TEXT,
          user_groups TEXT,
          schedule_id TEXT,
          tags TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      const stmt = db.prepare('SELECT * FROM advanced_rules');
      const rows = stmt.all();

      for (const row of rows) {
        const rule: BlockingRule = {
          id: row.id,
          name: row.name,
          description: row.description,
          pattern: row.pattern,
          matchType: row.match_type,
          caseSensitive: Boolean(row.case_sensitive),
          enabled: Boolean(row.enabled),
          priority: row.priority,
          action: row.action,
          redirectUrl: row.redirect_url,
          userGroups: row.user_groups ? JSON.parse(row.user_groups) : [],
          scheduleId: row.schedule_id,
          tags: row.tags ? JSON.parse(row.tags) : [],
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };

        this.rules.set(rule.id, rule);
      }

      console.log(`已加载 ${this.rules.size} 条高级规则`);
    } catch (error) {
      console.error('加载规则失败:', error);
    }
  }

  /**
   * 从数据库加载用户组
   */
  private async loadUserGroupsFromDatabase(): Promise<void> {
    try {
      const db = await this.databaseService.getDatabase();

      // 确保表存在
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          user_ids TEXT NOT NULL,
          permissions TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);

      const stmt = db.prepare('SELECT * FROM user_groups');
      const rows = stmt.all();

      for (const row of rows) {
        const group: UserGroup = {
          id: row.id,
          name: row.name,
          description: row.description,
          userIds: JSON.parse(row.user_ids),
          permissions: JSON.parse(row.permissions),
          createdAt: row.created_at
        };

        this.userGroups.set(group.id, group);
      }

      console.log(`已加载 ${this.userGroups.size} 个用户组`);
    } catch (error) {
      console.error('加载用户组失败:', error);
    }
  }

  /**
   * 从数据库加载时间计划
   */
  private async loadSchedulesFromDatabase(): Promise<void> {
    try {
      const db = await this.databaseService.getDatabase();

      // 确保表存在
      db.exec(`
        CREATE TABLE IF NOT EXISTS schedules (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          days_of_week TEXT NOT NULL,
          time_ranges TEXT NOT NULL,
          timezone TEXT,
          created_at TEXT NOT NULL
        )
      `);

      const stmt = db.prepare('SELECT * FROM schedules');
      const rows = stmt.all();

      for (const row of rows) {
        const schedule: Schedule = {
          id: row.id,
          name: row.name,
          description: row.description,
          daysOfWeek: JSON.parse(row.days_of_week),
          timeRanges: JSON.parse(row.time_ranges),
          timezone: row.timezone,
          createdAt: row.created_at
        };

        this.schedules.set(schedule.id, schedule);
      }

      console.log(`已加载 ${this.schedules.size} 个时间计划`);
    } catch (error) {
      console.error('加载时间计划失败:', error);
    }
  }

  /**
   * 保存规则到数据库
   */
  private async saveRuleToDatabase(rule: BlockingRule): Promise<void> {
    const db = await this.databaseService.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO advanced_rules (
        id, name, description, pattern, match_type, case_sensitive,
        enabled, priority, action, redirect_url, user_groups,
        schedule_id, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      rule.id,
      rule.name,
      rule.description,
      rule.pattern,
      rule.matchType,
      rule.caseSensitive ? 1 : 0,
      rule.enabled ? 1 : 0,
      rule.priority,
      rule.action,
      rule.redirectUrl,
      JSON.stringify(rule.userGroups || []),
      rule.scheduleId,
      JSON.stringify(rule.tags || []),
      rule.createdAt,
      rule.updatedAt
    );
  }

  /**
   * 更新数据库中的规则
   */
  private async updateRuleInDatabase(rule: BlockingRule): Promise<void> {
    const db = await this.databaseService.getDatabase();
    const stmt = db.prepare(`
      UPDATE advanced_rules SET
        name = ?, description = ?, pattern = ?, match_type = ?,
        case_sensitive = ?, enabled = ?, priority = ?, action = ?,
        redirect_url = ?, user_groups = ?, schedule_id = ?,
        tags = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      rule.name,
      rule.description,
      rule.pattern,
      rule.matchType,
      rule.caseSensitive ? 1 : 0,
      rule.enabled ? 1 : 0,
      rule.priority,
      rule.action,
      rule.redirectUrl,
      JSON.stringify(rule.userGroups || []),
      rule.scheduleId,
      JSON.stringify(rule.tags || []),
      rule.updatedAt,
      rule.id
    );
  }

  /**
   * 从数据库删除规则
   */
  private async deleteRuleFromDatabase(ruleId: string): Promise<void> {
    const db = await this.databaseService.getDatabase();
    const stmt = db.prepare('DELETE FROM advanced_rules WHERE id = ?');
    stmt.run(ruleId);
  }

  /**
   * 保存用户组到数据库
   */
  private async saveUserGroupToDatabase(group: UserGroup): Promise<void> {
    const db = await this.databaseService.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO user_groups (
        id, name, description, user_ids, permissions, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      group.id,
      group.name,
      group.description,
      JSON.stringify(group.userIds),
      JSON.stringify(group.permissions),
      group.createdAt
    );
  }

  /**
   * 保存时间计划到数据库
   */
  private async saveScheduleToDatabase(schedule: Schedule): Promise<void> {
    const db = await this.databaseService.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO schedules (
        id, name, description, days_of_week, time_ranges, timezone, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      schedule.id,
      schedule.name,
      schedule.description,
      JSON.stringify(schedule.daysOfWeek),
      JSON.stringify(schedule.timeRanges),
      schedule.timezone,
      schedule.createdAt
    );
  }
}

// 类型定义
export interface BlockingRule {
  id: string;
  name: string;
  description?: string;
  pattern: string;
  matchType: 'exact' | 'domain' | 'contains' | 'regex' | 'wildcard';
  caseSensitive: boolean;
  enabled: boolean;
  priority: number;
  action: 'block' | 'allow' | 'redirect';
  redirectUrl?: string;
  userGroups?: string[];
  scheduleId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  userIds: string[];
  permissions: string[];
  createdAt: string;
}

export interface Schedule {
  id: string;
  name: string;
  description?: string;
  daysOfWeek: number[]; // 0-6, 0 = Sunday
  timeRanges: TimeRange[];
  timezone?: string;
  createdAt: string;
}

export interface TimeRange {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}
