/**
 * 默认网站配置
 * 包含常见的需要控制访问的网站
 */

export interface DefaultSite {
  url: string;
  domain: string;
  title: string;
  description: string;
  category: string;
  priority: number;
  enabled: boolean;
}

/**
 * 默认网站列表
 * 根据中国大陆用户需求，只包含百度贴吧作为预设网站
 */
export const DEFAULT_SITES: DefaultSite[] = [
  {
    url: 'https://tieba.baidu.com/',
    domain: 'tieba.baidu.com',
    title: '百度贴吧',
    description: '百度贴吧 - 全球最大的中文社区',
    category: 'social',
    priority: 1,
    enabled: true
  }
];

/**
 * 获取默认启用的网站
 */
export function getDefaultEnabledSites(): DefaultSite[] {
  return DEFAULT_SITES.filter(site => site.enabled);
}

/**
 * 根据分类获取默认网站
 */
export function getDefaultSitesByCategory(category: string): DefaultSite[] {
  return DEFAULT_SITES.filter(site => site.category === category);
}

/**
 * 获取所有默认网站分类
 */
export function getDefaultSiteCategories(): string[] {
  const categories = new Set(DEFAULT_SITES.map(site => site.category));
  return Array.from(categories);
}
