#!/usr/bin/env node

/**
 * 简单的网站拦截功能测试
 * 不需要终端权限，可以在应用运行时使用
 */

const http = require('http');

console.log('🧪 简单网站拦截功能测试');
console.log('时间:', new Date().toLocaleString());
console.log('');

// 测试配置
const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 8080;
const TEST_URL = 'http://example.com';

// 测试1: 检查代理服务器是否运行
function testProxyServer() {
  return new Promise((resolve) => {
    console.log('📡 测试1: 检查代理服务器连接...');
    
    const req = http.request({
      hostname: PROXY_HOST,
      port: PROXY_PORT,
      method: 'GET',
      path: '/',
      timeout: 3000
    }, (res) => {
      console.log('✅ 代理服务器响应正常');
      console.log(`   状态码: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.log('❌ 代理服务器连接失败');
      console.log(`   错误: ${err.message}`);
      console.log('   请确认:');
      console.log('   1. 应用已启动');
      console.log('   2. 在应用中启动了代理服务器');
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

// 测试2: 通过代理访问测试网站
function testProxyAccess() {
  return new Promise((resolve) => {
    console.log('\n🌐 测试2: 通过代理访问测试网站...');
    console.log(`   测试URL: ${TEST_URL}`);
    
    const req = http.request({
      hostname: PROXY_HOST,
      port: PROXY_PORT,
      method: 'GET',
      path: TEST_URL,
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   状态码: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          if (data.includes('网站已被阻止') || data.includes('访问被阻止') || data.includes('blocked')) {
            console.log('✅ 网站被正确拦截');
            console.log('   显示了拦截页面');
            resolve('blocked');
          } else if (data.includes('Example Domain') || data.includes('<title>')) {
            console.log('⚠️  网站未被拦截');
            console.log('   显示了原始网站内容');
            console.log('   可能原因:');
            console.log('   1. example.com 未添加到黑名单');
            console.log('   2. 拦截开关未启用');
            console.log('   3. 系统代理未正确配置');
            resolve('allowed');
          } else {
            console.log('❓ 返回了未知内容');
            console.log(`   内容长度: ${data.length} 字符`);
            resolve('unknown');
          }
        } else {
          console.log(`❓ 非200状态码: ${res.statusCode}`);
          resolve('error');
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ 通过代理访问失败');
      console.log(`   错误: ${err.message}`);
      resolve('failed');
    });

    req.on('timeout', () => {
      console.log('⏰ 通过代理访问超时');
      req.destroy();
      resolve('timeout');
    });

    req.end();
  });
}

// 测试3: 直接访问（不通过代理）
function testDirectAccess() {
  return new Promise((resolve) => {
    console.log('\n🔗 测试3: 直接访问测试网站（不通过代理）...');
    
    const req = http.request({
      hostname: 'example.com',
      port: 80,
      method: 'GET',
      path: '/',
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 && data.includes('Example Domain')) {
          console.log('✅ 直接访问成功');
          console.log('   网络连接正常');
          resolve(true);
        } else {
          console.log('❓ 直接访问异常');
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ 直接访问失败');
      console.log(`   错误: ${err.message}`);
      console.log('   可能是网络连接问题');
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('⏰ 直接访问超时');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试...\n');

  // 测试1: 代理服务器连接
  const proxyRunning = await testProxyServer();
  
  if (!proxyRunning) {
    console.log('\n❌ 代理服务器未运行，无法继续测试');
    console.log('\n📋 解决步骤:');
    console.log('1. 确认应用已启动');
    console.log('2. 在应用的"代理控制"页面启动代理服务器');
    console.log('3. 重新运行此测试');
    return;
  }

  // 测试2: 代理访问
  const proxyResult = await testProxyAccess();
  
  // 测试3: 直接访问
  const directResult = await testDirectAccess();

  // 测试总结
  console.log('\n📊 测试总结:');
  console.log('================');
  console.log(`代理服务器状态: ${proxyRunning ? '✅ 运行中' : '❌ 未运行'}`);
  console.log(`网络连接状态: ${directResult ? '✅ 正常' : '❌ 异常'}`);
  
  if (proxyResult === 'blocked') {
    console.log('拦截功能状态: ✅ 正常工作');
    console.log('\n🎉 恭喜！网站拦截功能正常工作！');
  } else if (proxyResult === 'allowed') {
    console.log('拦截功能状态: ⚠️  未拦截');
    console.log('\n🔧 需要检查的项目:');
    console.log('1. 在应用中添加 example.com 到网站列表');
    console.log('2. 启用该网站的拦截开关');
    console.log('3. 确认"系统代理设置"已启用');
    console.log('4. 重启浏览器后再次测试');
  } else {
    console.log('拦截功能状态: ❓ 状态未知');
    console.log('\n🔍 建议进一步调试:');
    console.log('1. 检查应用的控制台日志');
    console.log('2. 确认代理服务器配置正确');
    console.log('3. 检查网络设置');
  }

  console.log('\n💡 提示:');
  console.log('- 如果拦截功能不工作，请在应用中启用"系统代理设置"');
  console.log('- 或者手动在浏览器中配置代理: 127.0.0.1:8080');
  console.log('- 修改设置后需要重启浏览器');
}

// 运行测试
runTests().catch(console.error);
