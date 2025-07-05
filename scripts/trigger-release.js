#!/usr/bin/env node

/**
 * 崔子瑾诱捕器 - 手动触发GitHub Actions Release
 * 通过GitHub API手动触发构建和发布流程
 */

const https = require('https');
const { execSync } = require('child_process');

// 配置
const config = {
  owner: 'niwator1',
  repo: 'cuizijin-trap',
  workflow: 'build-and-release.yml'
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getCurrentVersion() {
  try {
    const packageJson = require('../package.json');
    return packageJson.version;
  } catch (error) {
    log('❌ 无法读取package.json', 'red');
    process.exit(1);
  }
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${response.message || body}`));
          }
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function triggerWorkflow(version, token) {
  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${config.owner}/${config.repo}/actions/workflows/${config.workflow}/dispatches`,
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'cuizijin-trap-release-script',
      'Content-Type': 'application/json'
    }
  };

  const data = {
    ref: 'main',
    inputs: {
      version: version
    }
  };

  try {
    await makeRequest(options, data);
    return true;
  } catch (error) {
    throw new Error(`触发工作流失败: ${error.message}`);
  }
}

async function main() {
  log('🚀 崔子瑾诱捕器 - 手动触发Release构建', 'bright');
  log('========================================', 'cyan');
  
  // 获取当前版本
  const currentVersion = getCurrentVersion();
  log(`📋 当前版本: v${currentVersion}`, 'blue');
  
  // 询问版本号
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const askQuestion = (question) => {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  };
  
  try {
    const version = await askQuestion(`请输入要发布的版本号 (当前: v${currentVersion}): `);
    const finalVersion = version.trim() || `v${currentVersion}`;
    
    if (!finalVersion.startsWith('v')) {
      log('❌ 版本号必须以 "v" 开头', 'red');
      process.exit(1);
    }
    
    log(`🎯 准备发布版本: ${finalVersion}`, 'green');
    
    // 检查GitHub Token
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      log('❌ 错误: 未找到GITHUB_TOKEN环境变量', 'red');
      log('请设置GitHub Personal Access Token:', 'yellow');
      log('export GITHUB_TOKEN=your_token_here', 'cyan');
      process.exit(1);
    }
    
    // 确认发布
    const confirm = await askQuestion(`确认触发 ${finalVersion} 的构建和发布？(y/n): `);
    if (confirm.toLowerCase() !== 'y') {
      log('操作已取消', 'yellow');
      process.exit(0);
    }
    
    log('🤖 正在触发GitHub Actions工作流...', 'yellow');
    
    await triggerWorkflow(finalVersion, token);
    
    log('✅ 工作流已成功触发！', 'green');
    log('', 'reset');
    log('📊 您可以在以下地址查看构建进度:', 'blue');
    log(`https://github.com/${config.owner}/${config.repo}/actions`, 'cyan');
    log('', 'reset');
    log('📦 构建完成后，release包将发布到:', 'blue');
    log(`https://github.com/${config.owner}/${config.repo}/releases`, 'cyan');
    log('', 'reset');
    log('⏱️ 预计构建时间: 10-15分钟', 'yellow');
    
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main();
}
