#!/usr/bin/env node

/**
 * 网站拦截功能测试脚本
 * 用于验证修复后的拦截功能是否正常工作
 */

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

console.log('🧪 网站拦截功能测试开始...\n');

// 测试配置
const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 8080;
const TEST_DOMAINS = [
  'example.com',
  'test.com',
  'google.com',
  'baidu.com'
];

// 测试代理服务器是否运行
async function testProxyServer() {
  console.log('📡 测试代理服务器连接...');
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: PROXY_HOST,
      port: PROXY_PORT,
      method: 'GET',
      path: 'http://httpbin.org/ip',
      timeout: 5000
    }, (res) => {
      console.log('✅ 代理服务器响应正常');
      console.log(`   状态码: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.log('❌ 代理服务器连接失败');
      console.log(`   错误: ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('❌ 代理服务器连接超时');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// 测试域名拦截
async function testDomainBlocking(domain) {
  console.log(`🔍 测试域名拦截: ${domain}`);
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: PROXY_HOST,
      port: PROXY_PORT,
      method: 'GET',
      path: `http://${domain}/`,
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 && data.includes('网站已被阻止')) {
          console.log(`✅ ${domain} 被正确拦截`);
          resolve(true);
        } else if (res.statusCode === 200) {
          console.log(`⚠️  ${domain} 未被拦截（可能未在黑名单中）`);
          resolve(false);
        } else {
          console.log(`❓ ${domain} 返回状态码: ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${domain} 请求失败: ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`⏰ ${domain} 请求超时`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// 测试HTTPS拦截
async function testHttpsBlocking(domain) {
  console.log(`🔒 测试HTTPS拦截: ${domain}`);
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: PROXY_HOST,
      port: PROXY_PORT,
      method: 'CONNECT',
      path: `${domain}:443`,
      timeout: 5000
    }, (res) => {
      if (res.statusCode === 200) {
        console.log(`⚠️  ${domain} HTTPS连接建立（可能未被拦截）`);
        resolve(false);
      } else {
        console.log(`✅ ${domain} HTTPS连接被拒绝`);
        resolve(true);
      }
    });

    req.on('error', (err) => {
      if (err.message.includes('ECONNREFUSED') || err.message.includes('socket hang up')) {
        console.log(`✅ ${domain} HTTPS连接被正确拦截`);
        resolve(true);
      } else {
        console.log(`❌ ${domain} HTTPS测试失败: ${err.message}`);
        resolve(false);
      }
    });

    req.on('timeout', () => {
      console.log(`⏰ ${domain} HTTPS请求超时`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// 检查系统代理设置
async function checkSystemProxy() {
  console.log('🔧 检查系统代理设置...');
  
  return new Promise((resolve) => {
    const child = spawn('networksetup', ['-getwebproxy', 'Wi-Fi'], {
      stdio: 'pipe'
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      if (output.includes('127.0.0.1') && output.includes('8080')) {
        console.log('✅ 系统代理已正确配置');
        console.log(`   配置信息: ${output.trim()}`);
        resolve(true);
      } else {
        console.log('❌ 系统代理未配置或配置错误');
        console.log(`   当前配置: ${output.trim()}`);
        resolve(false);
      }
    });

    child.on('error', (err) => {
      console.log(`❌ 检查系统代理失败: ${err.message}`);
      resolve(false);
    });
  });
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始网站拦截功能测试\n');

  // 1. 测试代理服务器连接
  const proxyRunning = await testProxyServer();
  if (!proxyRunning) {
    console.log('\n❌ 代理服务器未运行，请先启动应用并开启代理');
    return;
  }

  console.log('');

  // 2. 检查系统代理设置
  const systemProxyConfigured = await checkSystemProxy();
  console.log('');

  // 3. 测试HTTP域名拦截
  console.log('📋 测试HTTP域名拦截...');
  for (const domain of TEST_DOMAINS) {
    await testDomainBlocking(domain);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
  }

  console.log('');

  // 4. 测试HTTPS域名拦截
  console.log('📋 测试HTTPS域名拦截...');
  for (const domain of TEST_DOMAINS) {
    await testHttpsBlocking(domain);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
  }

  console.log('\n📊 测试总结:');
  console.log(`✅ 代理服务器运行: ${proxyRunning ? '正常' : '异常'}`);
  console.log(`✅ 系统代理配置: ${systemProxyConfigured ? '正常' : '需要手动配置'}`);
  
  if (proxyRunning) {
    console.log('\n💡 测试建议:');
    if (!systemProxyConfigured) {
      console.log('   - 建议启用应用中的"系统代理设置"开关');
      console.log('   - 或手动在浏览器中配置代理: 127.0.0.1:8080');
    }
    console.log('   - 在应用中添加要拦截的网站并启用');
    console.log('   - 使用浏览器访问被拦截的网站验证效果');
  }

  console.log('\n🎉 测试完成！');
}

// 运行测试
runTests().catch(console.error);
