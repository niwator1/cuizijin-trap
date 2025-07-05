#!/usr/bin/env node

/**
 * 验证解决方案的脚本
 * 检查应用状态和配置，确认问题已解决
 */

const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

console.log('🔍 验证解决方案...\n');

async function verifyDatabaseContent() {
  console.log('📋 1. 检查数据库内容...');
  
  const dbPath = '/Users/zhouyi/Library/Application Support/cuizijin-trap/cuizijin-trap-data.json';
  
  if (!fs.existsSync(dbPath)) {
    console.log('❌ 数据库文件不存在');
    return false;
  }
  
  try {
    const content = fs.readFileSync(dbPath, 'utf8');
    const data = JSON.parse(content);
    
    console.log(`✅ 数据库文件存在，包含 ${data.blockedSites?.length || 0} 个网站`);
    
    if (data.blockedSites && data.blockedSites.length > 0) {
      console.log('   网站列表:');
      data.blockedSites.forEach((site, index) => {
        console.log(`     ${index + 1}. ${site.domain} (${site.enabled ? '启用' : '禁用'})`);
      });
      
      // 检查百度贴吧
      const baiduTieba = data.blockedSites.find(site => site.domain === 'tieba.baidu.com');
      if (baiduTieba) {
        console.log('✅ 百度贴吧已在数据库中');
        return true;
      } else {
        console.log('❌ 百度贴吧不在数据库中');
        return false;
      }
    } else {
      console.log('❌ 数据库中没有网站记录');
      return false;
    }
  } catch (error) {
    console.log('❌ 读取数据库失败:', error.message);
    return false;
  }
}

async function verifySystemProxy() {
  console.log('\n🖥️  2. 检查系统代理设置...');
  
  try {
    const { stdout } = await execAsync('networksetup -getwebproxy "Wi-Fi"');
    
    console.log('   Wi-Fi HTTP代理设置:');
    console.log('  ', stdout.replace(/\n/g, '\n   '));
    
    if (stdout.includes('Enabled: Yes') && stdout.includes('127.0.0.1') && stdout.includes('8080')) {
      console.log('✅ 系统代理已正确设置');
      return true;
    } else {
      console.log('❌ 系统代理设置不正确');
      return false;
    }
  } catch (error) {
    console.log('❌ 检查系统代理失败:', error.message);
    return false;
  }
}

async function verifyProxyPort() {
  console.log('\n🌐 3. 检查代理端口状态...');
  
  try {
    const { stdout } = await execAsync('lsof -i :8080');
    
    if (stdout.trim()) {
      console.log('✅ 端口8080有进程监听:');
      console.log('  ', stdout.replace(/\n/g, '\n   '));
      return true;
    } else {
      console.log('❌ 端口8080没有进程监听（代理服务器未启动）');
      return false;
    }
  } catch (error) {
    console.log('❌ 端口8080没有进程监听（代理服务器未启动）');
    return false;
  }
}

async function verifyApplicationFiles() {
  console.log('\n📁 4. 检查应用文件...');
  
  const requiredFiles = [
    'dist/main/index.js',
    'src/main/proxy/ProxyServer.ts',
    'src/main/app/AppController.ts',
    'package.json'
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} 存在`);
    } else {
      console.log(`❌ ${file} 不存在`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

async function generateReport() {
  console.log('\n📊 5. 生成验证报告...');
  
  const results = {
    database: await verifyDatabaseContent(),
    systemProxy: await verifySystemProxy(),
    proxyPort: await verifyProxyPort(),
    applicationFiles: await verifyApplicationFiles()
  };
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecks: 4,
      passed: Object.values(results).filter(Boolean).length,
      failed: Object.values(results).filter(r => !r).length
    },
    results: results,
    issues: [],
    solutions: []
  };
  
  // 分析问题和解决方案
  if (!results.database) {
    report.issues.push('数据库中缺少网站记录');
    report.solutions.push('重新添加网站到黑名单');
  }
  
  if (!results.systemProxy) {
    report.issues.push('系统代理设置不正确');
    report.solutions.push('检查网络设置中的代理配置');
  }
  
  if (!results.proxyPort) {
    report.issues.push('代理服务器未启动');
    report.solutions.push('在应用中手动启动代理服务器');
  }
  
  if (!results.applicationFiles) {
    report.issues.push('应用文件缺失');
    report.solutions.push('重新构建应用');
  }
  
  // 总体状态
  if (results.database && results.systemProxy && results.applicationFiles) {
    if (results.proxyPort) {
      report.status = 'READY';
      report.message = '所有组件正常，网站拦截功能应该正常工作';
    } else {
      report.status = 'NEEDS_PROXY_START';
      report.message = '需要启动代理服务器才能使用网站拦截功能';
    }
  } else {
    report.status = 'NEEDS_CONFIGURATION';
    report.message = '需要修复配置问题';
  }
  
  console.log('\n=== 验证报告 ===');
  console.log(JSON.stringify(report, null, 2));
  
  // 保存报告
  if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results');
  }
  
  fs.writeFileSync('test-results/verification-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 验证报告已保存到: test-results/verification-report.json');
  
  return report;
}

async function main() {
  try {
    const report = await generateReport();
    
    console.log('\n🎯 结论:');
    console.log(`状态: ${report.status}`);
    console.log(`消息: ${report.message}`);
    
    if (report.issues.length > 0) {
      console.log('\n❌ 发现的问题:');
      report.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
      
      console.log('\n💡 建议的解决方案:');
      report.solutions.forEach((solution, index) => {
        console.log(`   ${index + 1}. ${solution}`);
      });
    }
    
    if (report.status === 'NEEDS_PROXY_START') {
      console.log('\n🚀 下一步操作:');
      console.log('   1. 启动应用: npm run electron');
      console.log('   2. 在应用界面中点击"启动代理"按钮');
      console.log('   3. 或者通过托盘菜单选择"启动代理"');
      console.log('   4. 验证代理状态显示为"运行中"');
      console.log('   5. 测试访问 http://tieba.baidu.com 查看拦截效果');
    }
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error);
  }
}

main();
