#!/usr/bin/env node

/**
 * 测试网站管理功能
 * 验证网站添加、默认网站初始化等功能
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🌐 开始测试网站管理功能...\n');

// 检查构建文件
const mainFile = path.join(__dirname, 'dist/main/index.js');
const rendererFile = path.join(__dirname, 'dist/renderer/index.html');

if (!fs.existsSync(mainFile) || !fs.existsSync(rendererFile)) {
  console.error('❌ 构建文件不存在，请先运行: npm run build');
  process.exit(1);
}

console.log('✅ 构建文件检查通过\n');

// 清理现有数据文件
const dataFile = '/Users/zhouyi/Library/Application Support/Electron/cuizijin-trap-data.json';
if (fs.existsSync(dataFile)) {
  fs.unlinkSync(dataFile);
  console.log('🧹 已清理现有数据文件');
}

console.log('🚀 启动应用进行网站管理功能测试...');
console.log('📋 测试步骤:');
console.log('1. 完成首次设置（密码：123456）');
console.log('2. 进入主界面后，应该看到"添加默认网站"按钮');
console.log('3. 点击"添加默认网站"按钮，应该自动添加百度贴吧等网站');
console.log('4. 尝试手动添加新网站，如：https://www.example.com');
console.log('5. 验证网站列表显示和管理功能');
console.log('');

// 设置环境变量
const env = {
  ...process.env,
  NODE_ENV: 'production',
  ELECTRON_IS_DEV: 'false'
};

// 启动应用
const electronProcess = spawn('npx', ['electron', mainFile], {
  stdio: 'inherit',
  env: env,
  cwd: __dirname
});

// 处理进程事件
electronProcess.on('close', (code) => {
  console.log(`\n📊 应用退出，退出码: ${code}`);
  
  // 检查数据文件状态
  if (fs.existsSync(dataFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      console.log('\n📊 网站管理测试结果:');
      console.log('- 用户配置:', data.userConfig ? '✅ 已创建' : '❌ 未创建');
      console.log('- 网站数量:', data.blockedSites ? data.blockedSites.length : 0);
      
      if (data.blockedSites && data.blockedSites.length > 0) {
        console.log('- 网站列表:');
        data.blockedSites.forEach((site, index) => {
          console.log(`  ${index + 1}. ${site.title || site.url} (${site.enabled ? '启用' : '禁用'})`);
        });
        
        // 检查是否包含百度贴吧
        const hasBaiduTieba = data.blockedSites.some(site => 
          site.url.includes('tieba.baidu.com') || site.domain === 'tieba.baidu.com'
        );
        console.log('- 包含百度贴吧:', hasBaiduTieba ? '✅ 是' : '❌ 否');
      }
      
      console.log('- 操作日志数量:', data.operationLogs ? data.operationLogs.length : 0);
      
      if (data.operationLogs && data.operationLogs.length > 0) {
        const siteOperations = data.operationLogs.filter(log => 
          log.action.includes('site') || log.action.includes('add_site')
        );
        console.log('- 网站相关操作:', siteOperations.length);
      }
    } catch (error) {
      console.error('❌ 读取数据文件失败:', error.message);
    }
  } else {
    console.log('\n📊 测试结果: 数据文件未创建（可能是正常的，如果用户未完成设置）');
  }
  
  if (code === 0) {
    console.log('\n✅ 应用正常退出');
  } else {
    console.log('\n❌ 应用异常退出');
  }
  
  console.log('\n🎯 功能验证要点:');
  console.log('- 默认网站初始化功能是否正常工作');
  console.log('- 手动添加网站功能是否正常工作');
  console.log('- 网站列表显示是否正确');
  console.log('- 网站启用/禁用切换是否正常');
  console.log('- 网站删除功能是否正常');
});

electronProcess.on('error', (error) => {
  console.error('❌ 启动应用时发生错误:', error);
});

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n🛑 收到退出信号，正在关闭应用...');
  electronProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 收到终止信号，正在关闭应用...');
  electronProcess.kill('SIGTERM');
});
