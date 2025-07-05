#!/usr/bin/env node

/**
 * 测试部署脚本
 * 用于测试一键部署功能
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 开始测试一键部署...\n');

// 检查构建文件是否存在
const mainFile = path.join(__dirname, 'dist/main/index.js');
const rendererFile = path.join(__dirname, 'dist/renderer/index.html');

if (!fs.existsSync(mainFile)) {
  console.error('❌ 主进程文件不存在:', mainFile);
  process.exit(1);
}

if (!fs.existsSync(rendererFile)) {
  console.error('❌ 渲染进程文件不存在:', rendererFile);
  process.exit(1);
}

console.log('✅ 构建文件检查通过');
console.log('📁 主进程文件:', mainFile);
console.log('📁 渲染进程文件:', rendererFile);
console.log('');

// 设置环境变量
const env = {
  ...process.env,
  NODE_ENV: 'production',
  ELECTRON_IS_DEV: 'false'
};

console.log('🔧 环境变量设置:');
console.log('   NODE_ENV:', env.NODE_ENV);
console.log('   ELECTRON_IS_DEV:', env.ELECTRON_IS_DEV);
console.log('');

// 启动应用
console.log('🎯 启动应用...');
const electronProcess = spawn('npx', ['electron', mainFile], {
  stdio: 'inherit',
  env: env,
  cwd: __dirname
});

// 处理进程事件
electronProcess.on('close', (code) => {
  console.log(`\n📊 应用退出，退出码: ${code}`);
  if (code === 0) {
    console.log('✅ 应用正常退出');
  } else {
    console.log('❌ 应用异常退出');
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
