#!/usr/bin/env node

/**
 * 完整流程测试脚本
 * 测试从首次设置到登录的完整用户流程
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🎯 开始完整流程测试...\n');

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

console.log('🚀 启动应用进行完整流程测试...');
console.log('📋 测试步骤:');
console.log('1. 应用应该显示"首次设置"界面');
console.log('2. 设置密码（建议使用: 123456）');
console.log('3. 完成设置后应该自动登录到主界面');
console.log('4. 如果出现问题，可以使用"重置应用"功能');
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
      console.log('\n📊 测试结果:');
      console.log('- 用户配置:', data.userConfig ? '✅ 已创建' : '❌ 未创建');
      if (data.userConfig) {
        console.log('- 密码哈希:', data.userConfig.password_hash ? '✅ 存在' : '❌ 缺失');
        console.log('- 创建时间:', data.userConfig.created_at || '未知');
      }
      console.log('- 操作日志数量:', data.operationLogs ? data.operationLogs.length : 0);
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
