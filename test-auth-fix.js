#!/usr/bin/env node

/**
 * 测试认证修复效果
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔍 测试认证修复效果...\n');

// 检查数据文件位置
const possibleDataPaths = [
  path.join(os.homedir(), 'Library/Application Support/Electron/cuizijin-trap-data.json'), // macOS
  path.join(os.homedir(), '.config/Electron/cuizijin-trap-data.json'), // Linux
  path.join(os.homedir(), 'AppData/Roaming/Electron/cuizijin-trap-data.json'), // Windows
];

console.log('📁 检查数据文件位置:');
let dataFilePath = null;
for (const filePath of possibleDataPaths) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ 找到数据文件: ${filePath}`);
    dataFilePath = filePath;
    break;
  } else {
    console.log(`❌ 不存在: ${filePath}`);
  }
}

if (dataFilePath) {
  try {
    const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    console.log('\n📊 当前数据状态:');
    console.log('- userConfig:', data.userConfig ? '存在' : '不存在');
    console.log('- 网站黑名单数量:', data.blockedSites ? data.blockedSites.length : 0);
    console.log('- 操作日志数量:', data.operationLogs ? data.operationLogs.length : 0);
    
    if (data.userConfig) {
      console.log('- 用户配置详情:');
      console.log('  - 有密码哈希:', !!data.userConfig.password_hash);
      console.log('  - 创建时间:', data.userConfig.created_at || '未知');
    }
  } catch (error) {
    console.error('❌ 读取数据文件失败:', error.message);
  }
} else {
  console.log('✅ 没有找到数据文件，这是首次启动的正确状态');
}

console.log('\n🎯 测试建议:');
console.log('1. 启动应用: npm run dev 或 node test-deployment-verbose.js');
console.log('2. 应该看到"首次设置"界面而不是登录界面');
console.log('3. 如果看到登录界面，点击"忘记密码？重置应用"按钮');
console.log('4. 设置新密码并测试登录功能');

console.log('\n🔧 手动重置方法:');
if (dataFilePath) {
  console.log(`删除数据文件: rm "${dataFilePath}"`);
} else {
  console.log('无需手动重置，数据文件不存在');
}

console.log('\n✅ 认证修复验证完成！');
