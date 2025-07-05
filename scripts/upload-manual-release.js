#!/usr/bin/env node

/**
 * 崔子瑾诱捕器 - 手动上传现有文件到GitHub Release
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const config = {
  owner: 'niwator1',
  repo: 'cuizijin-trap',
  version: 'v1.0.0'
};

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

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = body ? JSON.parse(body) : {};
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
      if (typeof data === 'string') {
        req.write(data);
      } else {
        req.write(JSON.stringify(data));
      }
    }
    
    req.end();
  });
}

async function createRelease(token) {
  log('📝 创建GitHub Release...', 'yellow');
  
  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${config.owner}/${config.repo}/releases`,
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'cuizijin-trap-manual-release',
      'Content-Type': 'application/json'
    }
  };

  const releaseData = {
    tag_name: config.version,
    name: `崔子瑾诱捕器 ${config.version}`,
    body: `## 崔子瑾诱捕器 - 网站访问控制应用

### 🚀 新功能
- 网站访问控制和拦截
- 进程保护和自动重启
- 密码保护退出机制
- 跨平台支持 (Windows/macOS/Linux)

### 📦 安装说明

**Windows:**
- 下载 \`cuizijin-trap-windows.exe\` 可执行文件
- 以管理员身份运行
- 支持开机自启动和进程保护

### ⚠️ 重要提醒
- Windows 版本需要管理员权限才能启用完整功能
- 请妥善保管管理员密码，这是退出应用的唯一方式
- 生产环境下会启用进程保护功能

### 🔒 安全特性
- ✅ 看门狗进程监控
- ✅ 自动重启机制  
- ✅ 密码保护退出
- ✅ 开机自启动
- ✅ 防火墙规则配置
- ✅ 进程隐藏保护`,
    draft: false,
    prerelease: false
  };

  try {
    const release = await makeRequest(options, releaseData);
    log(`✅ Release创建成功: ${release.html_url}`, 'green');
    return release;
  } catch (error) {
    if (error.message.includes('already_exists')) {
      log('ℹ️ Release已存在，获取现有Release...', 'blue');
      return await getExistingRelease(token);
    }
    throw error;
  }
}

async function getExistingRelease(token) {
  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${config.owner}/${config.repo}/releases/tags/${config.version}`,
    method: 'GET',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'cuizijin-trap-manual-release'
    }
  };

  return await makeRequest(options);
}

async function uploadAsset(release, filePath, token) {
  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;
  
  log(`📤 上传文件: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`, 'blue');

  // 解析upload_url
  const uploadUrl = release.upload_url.replace('{?name,label}', `?name=${encodeURIComponent(fileName)}`);
  const url = new URL(uploadUrl);

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'cuizijin-trap-manual-release',
      'Content-Type': 'application/octet-stream',
      'Content-Length': fileSize
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            log(`✅ 上传成功: ${fileName}`, 'green');
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
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(req);
  });
}

async function main() {
  log('🚀 崔子瑾诱捕器 - 手动上传Release', 'bright');
  log('========================================', 'cyan');
  
  // 检查GitHub Token
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    log('❌ 错误: 未找到GITHUB_TOKEN环境变量', 'red');
    log('请设置GitHub Personal Access Token:', 'yellow');
    log('export GITHUB_TOKEN=your_token_here', 'cyan');
    process.exit(1);
  }

  try {
    // 检查release目录
    const releaseDir = 'release';
    if (!fs.existsSync(releaseDir)) {
      log('❌ 错误: release目录不存在', 'red');
      process.exit(1);
    }

    // 查找压缩包文件
    const zipPath = path.join(releaseDir, 'cuizijin-trap-windows-v1.0.1-fixed.zip');
    if (!fs.existsSync(zipPath)) {
      log('❌ 错误: 找不到Windows压缩包', 'red');
      process.exit(1);
    }

    log(`📁 找到文件: ${zipPath}`, 'blue');

    // 创建或获取Release
    const release = await createRelease(token);

    // 上传文件
    await uploadAsset(release, zipPath, token);
    
    log('', 'reset');
    log('🎉 上传完成！', 'green');
    log(`📦 Release地址: ${release.html_url}`, 'cyan');
    
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
