#!/usr/bin/env node

/**
 * 重置数据库脚本
 * 清除所有网站，只保留百度贴吧
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 开始重置数据库...\n');

const dbPath = '/Users/zhouyi/Library/Application Support/cuizijin-trap/cuizijin-trap-data.json';

async function resetDatabase() {
  try {
    // 1. 备份当前数据库
    const backupPath = dbPath + '.backup.' + Date.now();
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`✅ 数据库已备份到: ${backupPath}`);
    }

    // 2. 读取当前数据
    let data = {};
    if (fs.existsSync(dbPath)) {
      const content = fs.readFileSync(dbPath, 'utf8');
      data = JSON.parse(content);
      console.log(`📋 当前数据库包含 ${data.blockedSites?.length || 0} 个网站`);
    }

    // 3. 清除所有网站，只保留百度贴吧
    const baiduTieba = {
      "id": 1,
      "url": "https://tieba.baidu.com/",
      "domain": "tieba.baidu.com",
      "title": "百度贴吧",
      "description": "百度贴吧官网",
      "enabled": true,
      "blockType": "domain",
      "category": "general",
      "priority": 0,
      "created_at": new Date().toISOString(),
      "updated_at": new Date().toISOString()
    };

    // 4. 重置数据结构
    const resetData = {
      ...data,
      blockedSites: [baiduTieba],
      operationLogs: [
        ...(data.operationLogs || []),
        {
          id: Date.now(),
          action: "reset_database",
          details: "清除所有网站，只保留百度贴吧",
          timestamp: new Date().toISOString()
        }
      ]
    };

    // 5. 写入新数据
    fs.writeFileSync(dbPath, JSON.stringify(resetData, null, 2));
    console.log('✅ 数据库重置完成');
    console.log('📋 当前网站列表:');
    console.log('   1. tieba.baidu.com (启用)');

    return true;
  } catch (error) {
    console.error('❌ 重置数据库失败:', error);
    return false;
  }
}

async function stopProxyProcesses() {
  console.log('\n🛑 停止可能的代理进程...');
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    // 查找占用8080端口的进程
    const { stdout } = await execAsync('lsof -ti:8080');
    const pids = stdout.trim().split('\n').filter(pid => pid);
    
    if (pids.length > 0) {
      console.log(`找到 ${pids.length} 个占用8080端口的进程`);
      
      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid}`);
          console.log(`✅ 已停止进程 ${pid}`);
        } catch (error) {
          console.log(`⚠️  无法停止进程 ${pid}: ${error.message}`);
        }
      }
    } else {
      console.log('✅ 没有进程占用8080端口');
    }
  } catch (error) {
    console.log('✅ 没有进程占用8080端口');
  }
}

async function checkVPNConflict() {
  console.log('\n🔍 检查VPN冲突...');
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    // 检查常见VPN软件进程
    const vpnProcesses = [
      'ClashX',
      'Surge',
      'Shadowsocks',
      'V2Ray',
      'Proxyman',
      'Charles'
    ];

    for (const vpnName of vpnProcesses) {
      try {
        const { stdout } = await execAsync(`ps aux | grep -i ${vpnName} | grep -v grep`);
        if (stdout.trim()) {
          console.log(`⚠️  发现VPN软件: ${vpnName}`);
          console.log(`   建议: 暂时关闭 ${vpnName} 或配置端口避让`);
        }
      } catch (error) {
        // 进程不存在，继续检查下一个
      }
    }

    // 检查系统代理设置
    const { stdout: httpProxy } = await execAsync('networksetup -getwebproxy "Wi-Fi"');
    const { stdout: httpsProxy } = await execAsync('networksetup -getsecurewebproxy "Wi-Fi"');

    console.log('\n📡 当前系统代理设置:');
    console.log('HTTP代理:', httpProxy.includes('Enabled: Yes') ? '已启用' : '未启用');
    console.log('HTTPS代理:', httpsProxy.includes('Enabled: Yes') ? '已启用' : '未启用');

    if (httpProxy.includes('127.0.0.1:8080')) {
      console.log('✅ 系统代理指向应用代理服务器');
    } else if (httpProxy.includes('Enabled: Yes')) {
      console.log('⚠️  系统代理指向其他服务器，可能与VPN冲突');
    }

  } catch (error) {
    console.log('❌ 检查VPN冲突失败:', error.message);
  }
}

async function main() {
  try {
    // 1. 停止代理进程
    await stopProxyProcesses();
    
    // 2. 检查VPN冲突
    await checkVPNConflict();
    
    // 3. 重置数据库
    const success = await resetDatabase();
    
    if (success) {
      console.log('\n🎯 重置完成！');
      console.log('📋 下一步操作:');
      console.log('   1. 重启应用: ./quick-start.sh --stop && ./quick-start.sh --china');
      console.log('   2. 在应用中启动代理服务器');
      console.log('   3. 测试访问 https://tieba.baidu.com/');
      
      console.log('\n💡 VPN使用建议:');
      console.log('   - 如果需要使用VPN访问YouTube等网站，建议:');
      console.log('   - 1. 配置VPN使用不同端口（避免8080）');
      console.log('   - 2. 或者在VPN的PAC规则中排除百度贴吧域名');
      console.log('   - 3. 或者使用应用的白名单功能');
    }
    
  } catch (error) {
    console.error('❌ 重置过程中发生错误:', error);
  }
}

main();
