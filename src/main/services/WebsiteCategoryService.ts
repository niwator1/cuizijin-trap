import { EventEmitter } from 'events';
import { DatabaseService } from '../database';

/**
 * 网站分类管理服务
 * 提供网站分类、批量管理、智能分类等功能
 */
export class WebsiteCategoryService extends EventEmitter {
  private databaseService: DatabaseService;
  private categories: Map<string, WebsiteCategory> = new Map();
  private websiteCategories: Map<string, string[]> = new Map(); // website -> categoryIds
  private predefinedCategories: PredefinedCategory[] = [];

  constructor(databaseService: DatabaseService) {
    super();
    this.databaseService = databaseService;
    this.initializeCategoryService();
  }

  /**
   * 初始化分类服务
   */
  private async initializeCategoryService(): Promise<void> {
    try {
      await this.loadPredefinedCategories();
      await this.loadCategoriesFromDatabase();
      await this.loadWebsiteCategoriesFromDatabase();
      console.log('网站分类服务初始化完成');
    } catch (error) {
      console.error('分类服务初始化失败:', error);
    }
  }

  /**
   * 加载预定义分类
   */
  private async loadPredefinedCategories(): Promise<void> {
    this.predefinedCategories = [
      {
        id: 'social_media',
        name: '社交媒体',
        description: '社交网络、即时通讯等平台',
        icon: '👥',
        keywords: ['facebook', 'twitter', 'instagram', 'weibo', 'wechat', 'qq', 'tiktok'],
        domains: ['facebook.com', 'twitter.com', 'instagram.com', 'weibo.com', 'qq.com']
      },
      {
        id: 'gaming',
        name: '游戏娱乐',
        description: '在线游戏、游戏平台等',
        icon: '🎮',
        keywords: ['game', 'gaming', 'steam', 'epic', 'battle', 'play'],
        domains: ['steam.com', 'epicgames.com', '4399.com', '7k7k.com']
      },
      {
        id: 'shopping',
        name: '购物网站',
        description: '电商平台、购物网站等',
        icon: '🛒',
        keywords: ['shop', 'buy', 'store', 'mall', 'taobao', 'amazon'],
        domains: ['taobao.com', 'tmall.com', 'amazon.com', 'jd.com']
      },
      {
        id: 'video_streaming',
        name: '视频娱乐',
        description: '视频网站、直播平台等',
        icon: '📺',
        keywords: ['video', 'tv', 'movie', 'stream', 'youtube', 'bilibili'],
        domains: ['youtube.com', 'bilibili.com', 'iqiyi.com', 'youku.com']
      },
      {
        id: 'news_media',
        name: '新闻媒体',
        description: '新闻网站、媒体平台等',
        icon: '📰',
        keywords: ['news', 'media', 'press', 'daily', 'times'],
        domains: ['cnn.com', 'bbc.com', 'xinhua.net', 'people.com.cn']
      },
      {
        id: 'adult_content',
        name: '成人内容',
        description: '成人网站、不适宜内容',
        icon: '🔞',
        keywords: ['adult', 'porn', 'sex', 'xxx'],
        domains: [] // 出于安全考虑，不在代码中列出具体域名
      },
      {
        id: 'gambling',
        name: '博彩赌博',
        description: '博彩网站、赌博平台等',
        icon: '🎰',
        keywords: ['casino', 'bet', 'gambling', 'poker', 'lottery'],
        domains: []
      },
      {
        id: 'education',
        name: '教育学习',
        description: '教育网站、学习平台等',
        icon: '📚',
        keywords: ['education', 'school', 'university', 'course', 'learn'],
        domains: ['coursera.org', 'edx.org', 'khan.academy.org']
      },
      {
        id: 'work_productivity',
        name: '工作效率',
        description: '办公软件、生产力工具等',
        icon: '💼',
        keywords: ['office', 'work', 'productivity', 'document', 'email'],
        domains: ['office.com', 'google.com', 'notion.so', 'slack.com']
      },
      {
        id: 'technology',
        name: '科技资讯',
        description: '科技网站、技术论坛等',
        icon: '💻',
        keywords: ['tech', 'technology', 'programming', 'developer', 'github'],
        domains: ['github.com', 'stackoverflow.com', 'techcrunch.com']
      }
    ];
  }

  /**
   * 创建新分类
   */
  async createCategory(category: Omit<WebsiteCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const categoryId = this.generateCategoryId();
      const newCategory: WebsiteCategory = {
        ...category,
        id: categoryId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.saveCategoryToDatabase(newCategory);
      this.categories.set(categoryId, newCategory);
      
      this.emit('category-created', newCategory);
      console.log(`新分类已创建: ${categoryId}`);
      
      return categoryId;
    } catch (error) {
      console.error('创建分类失败:', error);
      throw error;
    }
  }

  /**
   * 更新分类
   */
  async updateCategory(categoryId: string, updates: Partial<WebsiteCategory>): Promise<void> {
    try {
      const existingCategory = this.categories.get(categoryId);
      if (!existingCategory) {
        throw new Error('分类不存在');
      }

      const updatedCategory: WebsiteCategory = {
        ...existingCategory,
        ...updates,
        id: categoryId,
        updatedAt: new Date().toISOString()
      };

      await this.updateCategoryInDatabase(updatedCategory);
      this.categories.set(categoryId, updatedCategory);
      
      this.emit('category-updated', updatedCategory);
    } catch (error) {
      console.error('更新分类失败:', error);
      throw error;
    }
  }

  /**
   * 删除分类
   */
  async deleteCategory(categoryId: string): Promise<void> {
    try {
      const category = this.categories.get(categoryId);
      if (!category) {
        throw new Error('分类不存在');
      }

      // 检查是否有网站使用此分类
      const websitesUsingCategory = this.getWebsitesByCategory(categoryId);
      if (websitesUsingCategory.length > 0) {
        throw new Error('无法删除：仍有网站使用此分类');
      }

      await this.deleteCategoryFromDatabase(categoryId);
      this.categories.delete(categoryId);
      
      this.emit('category-deleted', { categoryId, category });
    } catch (error) {
      console.error('删除分类失败:', error);
      throw error;
    }
  }

  /**
   * 将网站添加到分类
   */
  async addWebsiteToCategory(websiteUrl: string, categoryId: string): Promise<void> {
    try {
      if (!this.categories.has(categoryId)) {
        throw new Error('分类不存在');
      }

      const currentCategories = this.websiteCategories.get(websiteUrl) || [];
      if (!currentCategories.includes(categoryId)) {
        currentCategories.push(categoryId);
        this.websiteCategories.set(websiteUrl, currentCategories);
        
        await this.saveWebsiteCategoryToDatabase(websiteUrl, categoryId);
        this.emit('website-categorized', { websiteUrl, categoryId });
      }
    } catch (error) {
      console.error('添加网站到分类失败:', error);
      throw error;
    }
  }

  /**
   * 从分类中移除网站
   */
  async removeWebsiteFromCategory(websiteUrl: string, categoryId: string): Promise<void> {
    try {
      const currentCategories = this.websiteCategories.get(websiteUrl) || [];
      const index = currentCategories.indexOf(categoryId);
      
      if (index > -1) {
        currentCategories.splice(index, 1);
        this.websiteCategories.set(websiteUrl, currentCategories);
        
        await this.removeWebsiteCategoryFromDatabase(websiteUrl, categoryId);
        this.emit('website-uncategorized', { websiteUrl, categoryId });
      }
    } catch (error) {
      console.error('从分类移除网站失败:', error);
      throw error;
    }
  }

  /**
   * 批量分类网站
   */
  async batchCategorizeWebsites(websites: string[], categoryId: string): Promise<{
    success: string[];
    failed: Array<{ website: string; error: string }>;
  }> {
    const success: string[] = [];
    const failed: Array<{ website: string; error: string }> = [];

    for (const website of websites) {
      try {
        await this.addWebsiteToCategory(website, categoryId);
        success.push(website);
      } catch (error) {
        failed.push({
          website,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return { success, failed };
  }

  /**
   * 智能分类网站
   */
  async autoCategorizWebsite(websiteUrl: string): Promise<string[]> {
    try {
      const suggestedCategories: string[] = [];
      
      // 基于域名匹配
      for (const predefined of this.predefinedCategories) {
        if (this.matchesPredefinedCategory(websiteUrl, predefined)) {
          // 检查是否已有对应的自定义分类
          const existingCategory = this.findCategoryByPredefinedId(predefined.id);
          if (existingCategory) {
            suggestedCategories.push(existingCategory.id);
          } else {
            // 创建对应的分类
            const categoryId = await this.createCategory({
              name: predefined.name,
              description: predefined.description,
              icon: predefined.icon,
              color: this.getDefaultColorForCategory(predefined.id),
              isSystem: true,
              predefinedId: predefined.id
            });
            suggestedCategories.push(categoryId);
          }
        }
      }

      return suggestedCategories;
    } catch (error) {
      console.error('智能分类失败:', error);
      return [];
    }
  }

  /**
   * 获取所有分类
   */
  getAllCategories(): WebsiteCategory[] {
    return Array.from(this.categories.values());
  }

  /**
   * 获取预定义分类
   */
  getPredefinedCategories(): PredefinedCategory[] {
    return this.predefinedCategories;
  }

  /**
   * 获取网站的分类
   */
  getWebsiteCategories(websiteUrl: string): WebsiteCategory[] {
    const categoryIds = this.websiteCategories.get(websiteUrl) || [];
    return categoryIds.map(id => this.categories.get(id)).filter(Boolean) as WebsiteCategory[];
  }

  /**
   * 获取分类下的所有网站
   */
  getWebsitesByCategory(categoryId: string): string[] {
    const websites: string[] = [];
    for (const [website, categories] of this.websiteCategories) {
      if (categories.includes(categoryId)) {
        websites.push(website);
      }
    }
    return websites;
  }

  /**
   * 搜索分类
   */
  searchCategories(query: string): WebsiteCategory[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.categories.values()).filter(category =>
      category.name.toLowerCase().includes(lowerQuery) ||
      (category.description && category.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 检查网站是否匹配预定义分类
   */
  private matchesPredefinedCategory(websiteUrl: string, predefined: PredefinedCategory): boolean {
    try {
      const url = new URL(websiteUrl);
      const hostname = url.hostname.toLowerCase();
      const fullUrl = websiteUrl.toLowerCase();

      // 检查域名匹配
      for (const domain of predefined.domains) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          return true;
        }
      }

      // 检查关键词匹配
      for (const keyword of predefined.keywords) {
        if (fullUrl.includes(keyword.toLowerCase())) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 根据预定义ID查找分类
   */
  private findCategoryByPredefinedId(predefinedId: string): WebsiteCategory | undefined {
    return Array.from(this.categories.values()).find(
      category => category.predefinedId === predefinedId
    );
  }

  /**
   * 获取分类的默认颜色
   */
  private getDefaultColorForCategory(predefinedId: string): string {
    const colorMap: Record<string, string> = {
      social_media: '#3b82f6',
      gaming: '#8b5cf6',
      shopping: '#f59e0b',
      video_streaming: '#ef4444',
      news_media: '#6b7280',
      adult_content: '#dc2626',
      gambling: '#7c2d12',
      education: '#059669',
      work_productivity: '#0891b2',
      technology: '#4f46e5'
    };
    return colorMap[predefinedId] || '#6b7280';
  }

  /**
   * 生成分类ID
   */
  private generateCategoryId(): string {
    return `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 数据库操作方法
  private async loadCategoriesFromDatabase(): Promise<void> {
    // 实现从数据库加载分类
  }

  private async loadWebsiteCategoriesFromDatabase(): Promise<void> {
    // 实现从数据库加载网站分类关系
  }

  private async saveCategoryToDatabase(category: WebsiteCategory): Promise<void> {
    // 实现保存分类到数据库
  }

  private async updateCategoryInDatabase(category: WebsiteCategory): Promise<void> {
    // 实现更新数据库中的分类
  }

  private async deleteCategoryFromDatabase(categoryId: string): Promise<void> {
    // 实现从数据库删除分类
  }

  private async saveWebsiteCategoryToDatabase(websiteUrl: string, categoryId: string): Promise<void> {
    // 实现保存网站分类关系到数据库
  }

  private async removeWebsiteCategoryFromDatabase(websiteUrl: string, categoryId: string): Promise<void> {
    // 实现从数据库删除网站分类关系
  }
}

// 类型定义
export interface WebsiteCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  isSystem: boolean;
  predefinedId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PredefinedCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  keywords: string[];
  domains: string[];
}
