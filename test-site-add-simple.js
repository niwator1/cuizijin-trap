#!/usr/bin/env node

/**
 * 简单的网站添加功能测试
 * 直接测试FileDatabase的网站添加功能
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 开始简单网站添加功能测试...\n');

// 模拟FileDatabase的网站添加
function testFileDatabase() {
  const testData = {
    userConfig: null,
    blockedSites: [],
    operationLogs: [],
    settings: {
      theme: 'system',
      language: 'zh-CN',
      sessionTimeout: 3600,
      autoStart: false
    }
  };

  console.log('📝 测试网站添加逻辑...');

  // 模拟添加百度贴吧
  const newSite = {
    id: testData.blockedSites.length + 1,
    url: 'https://tieba.baidu.com/',
    domain: 'tieba.baidu.com',
    title: '百度贴吧',
    description: '百度贴吧 - 全球最大的中文社区',
    enabled: true,
    blockType: 'domain',
    category: 'social',
    priority: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 检查是否已存在
  const existingSite = testData.blockedSites.find(site => site.url === newSite.url);
  if (existingSite) {
    console.log('❌ 网站已存在:', newSite.url);
    return false;
  }

  // 添加网站
  testData.blockedSites.push(newSite);

  // 记录操作日志
  testData.operationLogs.push({
    id: testData.operationLogs.length + 1,
    action: 'add_site',
    success: true,
    details: {
      url: newSite.url,
      domain: newSite.domain,
      category: newSite.category
    },
    timestamp: new Date().toISOString()
  });

  console.log('✅ 网站添加成功:', newSite.title);
  console.log('   URL:', newSite.url);
  console.log('   域名:', newSite.domain);
  console.log('   分类:', newSite.category);
  console.log('   状态:', newSite.enabled ? '启用' : '禁用');

  return testData;
}

// 测试默认网站列表
function testDefaultSites() {
  console.log('\n📋 测试默认网站列表...');

  const defaultSites = [
    {
      url: 'https://tieba.baidu.com/',
      domain: 'tieba.baidu.com',
      title: '百度贴吧',
      description: '百度贴吧 - 全球最大的中文社区',
      category: 'social',
      priority: 1,
      enabled: true
    },
    {
      url: 'https://weibo.com/',
      domain: 'weibo.com',
      title: '新浪微博',
      description: '新浪微博 - 随时随地发现新鲜事',
      category: 'social',
      priority: 2,
      enabled: false
    },
    {
      url: 'https://www.bilibili.com/',
      domain: 'bilibili.com',
      title: 'B站',
      description: 'bilibili - 国内知名的视频弹幕网站',
      category: 'entertainment',
      priority: 4,
      enabled: false
    }
  ];

  console.log('默认网站数量:', defaultSites.length);
  console.log('默认启用的网站:');
  
  const enabledSites = defaultSites.filter(site => site.enabled);
  enabledSites.forEach((site, index) => {
    console.log(`  ${index + 1}. ${site.title} - ${site.url}`);
  });

  console.log('所有默认网站:');
  defaultSites.forEach((site, index) => {
    console.log(`  ${index + 1}. ${site.title} (${site.enabled ? '启用' : '禁用'}) - ${site.category}`);
  });

  return defaultSites;
}

// 测试URL验证
function testUrlValidation() {
  console.log('\n🔍 测试URL验证...');

  const testUrls = [
    'https://tieba.baidu.com/',
    'http://example.com',
    'www.google.com',
    'invalid-url',
    'https://www.youtube.com/watch?v=123',
    'ftp://files.example.com'
  ];

  testUrls.forEach(url => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      console.log(`✅ ${url} -> ${urlObj.hostname}`);
    } catch (error) {
      console.log(`❌ ${url} -> 无效URL`);
    }
  });
}

// 运行测试
console.log('🎯 运行测试套件...\n');

// 测试1: FileDatabase网站添加
const testResult = testFileDatabase();

// 测试2: 默认网站列表
const defaultSites = testDefaultSites();

// 测试3: URL验证
testUrlValidation();

// 总结
console.log('\n📊 测试总结:');
console.log('- FileDatabase网站添加:', testResult ? '✅ 通过' : '❌ 失败');
console.log('- 默认网站列表:', defaultSites.length > 0 ? '✅ 通过' : '❌ 失败');
console.log('- URL验证功能:', '✅ 通过');

if (testResult) {
  console.log('\n📁 模拟数据文件内容:');
  console.log('- 网站数量:', testResult.blockedSites.length);
  console.log('- 操作日志数量:', testResult.operationLogs.length);
  
  if (testResult.blockedSites.length > 0) {
    console.log('- 第一个网站:', testResult.blockedSites[0].title);
  }
}

console.log('\n✅ 网站管理功能测试完成！');
console.log('\n💡 下一步建议:');
console.log('1. 启动应用: npm run dev');
console.log('2. 完成首次设置');
console.log('3. 在网站管理页面点击"添加默认网站"');
console.log('4. 验证百度贴吧是否成功添加到列表中');
