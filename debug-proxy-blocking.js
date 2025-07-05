#!/usr/bin/env node

/**
 * 调试代理拦截功能的脚本
 * 检查代理服务器状态、黑名单配置、网络拦截逻辑等
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

console.log('🔍 开始调试代理拦截功能...\n');

// 1. 检查数据库文件
function checkDatabaseFiles() {
  console.log('📁 检查数据库文件...');
  
  const dbPaths = [
    'data/database.json',
    'data/app.db',
    'src/main/database/data.json'
  ];
  
  for (const dbPath of dbPaths) {
    if (fs.existsSync(dbPath)) {
      console.log(`✅ 找到数据库文件: ${dbPath}`);
      try {
        const stats = fs.statSync(dbPath);
        console.log(`   文件大小: ${stats.size} bytes`);
        console.log(`   修改时间: ${stats.mtime}`);
        
        if (dbPath.endsWith('.json')) {
          const content = fs.readFileSync(dbPath, 'utf8');
          const data = JSON.parse(content);
          console.log(`   包含网站数量: ${data.blockedSites?.length || 0}`);
          
          if (data.blockedSites && data.blockedSites.length > 0) {
            console.log('   已阻止的网站:');
            data.blockedSites.forEach((site, index) => {
              console.log(`     ${index + 1}. ${site.domain} (${site.enabled ? '启用' : '禁用'})`);
            });
          }
        }
      } catch (error) {
        console.log(`❌ 读取数据库文件失败: ${error.message}`);
      }
    } else {
      console.log(`❌ 数据库文件不存在: ${dbPath}`);
    }
  }
  console.log('');
}

// 2. 检查代理服务器配置
function checkProxyConfig() {
  console.log('⚙️ 检查代理服务器配置...');
  
  const configPaths = [
    'src/main/proxy/ProxyConfig.ts',
    'dist/main/proxy/ProxyConfig.js'
  ];
  
  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      console.log(`✅ 找到配置文件: ${configPath}`);
      
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        
        // 提取默认端口配置
        const httpPortMatch = content.match(/httpPort:\s*(\d+)/);
        const httpsPortMatch = content.match(/httpsPort:\s*(\d+)/);
        const bindAddressMatch = content.match(/bindAddress:\s*['"`]([^'"`]+)['"`]/);
        
        if (httpPortMatch) {
          console.log(`   HTTP端口: ${httpPortMatch[1]}`);
        }
        if (httpsPortMatch) {
          console.log(`   HTTPS端口: ${httpsPortMatch[1]}`);
        }
        if (bindAddressMatch) {
          console.log(`   绑定地址: ${bindAddressMatch[1]}`);
        }
      } catch (error) {
        console.log(`❌ 读取配置文件失败: ${error.message}`);
      }
    }
  }
  console.log('');
}

// 3. 测试代理服务器连接
async function testProxyConnection() {
  console.log('🌐 测试代理服务器连接...');
  
  const proxyPorts = [8080, 8443, 3128];
  const proxyHost = '127.0.0.1';
  
  for (const port of proxyPorts) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: proxyHost,
          port: port,
          method: 'GET',
          path: 'http://www.example.com',
          timeout: 3000
        }, (res) => {
          console.log(`✅ 代理端口 ${port} 可访问 (状态码: ${res.statusCode})`);
          resolve();
        });
        
        req.on('error', (error) => {
          console.log(`❌ 代理端口 ${port} 不可访问: ${error.message}`);
          reject(error);
        });
        
        req.on('timeout', () => {
          console.log(`⏰ 代理端口 ${port} 连接超时`);
          req.destroy();
          reject(new Error('Timeout'));
        });
        
        req.end();
      });
    } catch (error) {
      // 错误已在上面处理
    }
  }
  console.log('');
}

// 4. 检查系统代理设置
async function checkSystemProxy() {
  console.log('🖥️ 检查系统代理设置...');
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    // macOS 系统代理检查
    if (process.platform === 'darwin') {
      const { stdout } = await execAsync('networksetup -getwebproxy "Wi-Fi"');
      console.log('Wi-Fi HTTP代理设置:');
      console.log(stdout);
      
      const { stdout: httpsStdout } = await execAsync('networksetup -getsecurewebproxy "Wi-Fi"');
      console.log('Wi-Fi HTTPS代理设置:');
      console.log(httpsStdout);
    }
    
    // 检查环境变量
    console.log('环境变量代理设置:');
    console.log(`HTTP_PROXY: ${process.env.HTTP_PROXY || '未设置'}`);
    console.log(`HTTPS_PROXY: ${process.env.HTTPS_PROXY || '未设置'}`);
    console.log(`NO_PROXY: ${process.env.NO_PROXY || '未设置'}`);
    
  } catch (error) {
    console.log(`❌ 检查系统代理失败: ${error.message}`);
  }
  console.log('');
}

// 5. 测试域名拦截逻辑
function testDomainBlocking() {
  console.log('🚫 测试域名拦截逻辑...');
  
  // 模拟HttpHandler的域名匹配逻辑
  function normalizeDomain(domain) {
    return domain.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/:\d+$/, '')
      .replace(/\/.*$/, '');
  }
  
  function matchesDomainPattern(domain, pattern) {
    // 完全匹配
    if (domain === pattern) {
      return true;
    }
    
    // 子域名匹配
    if (domain.endsWith('.' + pattern)) {
      return true;
    }
    
    // 通配符匹配
    if (pattern.startsWith('*.')) {
      const baseDomain = pattern.substring(2);
      return domain === baseDomain || domain.endsWith('.' + baseDomain);
    }
    
    // www前缀处理
    if (pattern.startsWith('www.')) {
      const withoutWww = pattern.substring(4);
      return domain === withoutWww || matchesDomainPattern(domain, withoutWww);
    }
    
    if (domain.startsWith('www.')) {
      const withoutWww = domain.substring(4);
      return withoutWww === pattern || matchesDomainPattern(withoutWww, pattern);
    }
    
    return false;
  }
  
  function isDomainBlocked(domain, blockedDomains) {
    const normalizedDomain = normalizeDomain(domain);
    
    // 检查完全匹配
    if (blockedDomains.has(normalizedDomain)) {
      return true;
    }
    
    // 检查模式匹配
    for (const blockedDomain of blockedDomains) {
      if (matchesDomainPattern(normalizedDomain, blockedDomain)) {
        return true;
      }
    }
    
    return false;
  }
  
  // 测试用例
  const testCases = [
    { domain: 'tieba.baidu.com', blocked: ['tieba.baidu.com'] },
    { domain: 'https://tieba.baidu.com/', blocked: ['tieba.baidu.com'] },
    { domain: 'www.facebook.com', blocked: ['facebook.com'] },
    { domain: 'sub.example.com', blocked: ['*.example.com'] },
    { domain: 'example.com', blocked: ['*.example.com'] }
  ];
  
  testCases.forEach(({ domain, blocked }) => {
    const blockedSet = new Set(blocked);
    const isBlocked = isDomainBlocked(domain, blockedSet);
    console.log(`   ${domain} -> ${isBlocked ? '✅ 被拦截' : '❌ 未拦截'} (规则: ${blocked.join(', ')})`);
  });
  
  console.log('');
}

// 6. 检查应用进程
async function checkAppProcess() {
  console.log('🔄 检查应用进程...');
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    const { stdout } = await execAsync('ps aux | grep -i electron');
    const lines = stdout.split('\n').filter(line => 
      line.includes('electron') && !line.includes('grep')
    );
    
    if (lines.length > 0) {
      console.log('✅ 找到Electron进程:');
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        console.log(`   PID: ${parts[1]}, 命令: ${parts.slice(10).join(' ')}`);
      });
    } else {
      console.log('❌ 未找到Electron进程');
    }
  } catch (error) {
    console.log(`❌ 检查进程失败: ${error.message}`);
  }
  console.log('');
}

// 主函数
async function main() {
  try {
    checkDatabaseFiles();
    checkProxyConfig();
    await testProxyConnection();
    await checkSystemProxy();
    testDomainBlocking();
    await checkAppProcess();
    
    console.log('🎯 调试建议:');
    console.log('1. 确认代理服务器已启动并监听正确端口');
    console.log('2. 检查系统代理设置是否指向应用代理');
    console.log('3. 验证数据库中的网站列表是否正确加载到代理服务器');
    console.log('4. 测试域名匹配逻辑是否按预期工作');
    console.log('5. 检查应用是否正在运行');
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error);
  }
}

// 运行调试
main();
