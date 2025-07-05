#!/usr/bin/env node

/**
 * 崔子瑾诱捕器部署脚本
 * 自动化构建、打包和发布流程
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const config = {
  platforms: ['mac', 'win', 'linux'],
  outputDir: 'release',
  buildDir: 'dist',
  assetsDir: 'assets'
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  log(`\n${description}...`, 'cyan');
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} 完成`, 'green');
  } catch (error) {
    log(`❌ ${description} 失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

function checkPrerequisites() {
  log('检查部署前置条件...', 'yellow');
  
  // 检查Node.js版本
  const nodeVersion = process.version;
  log(`Node.js 版本: ${nodeVersion}`, 'blue');
  
  // 检查npm版本
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`npm 版本: ${npmVersion}`, 'blue');
  } catch (error) {
    log('❌ npm 未安装', 'red');
    process.exit(1);
  }
  
  // 检查必要文件
  const requiredFiles = [
    'package.json',
    'electron-builder.config.js',
    'src/main/index.ts',
    'src/renderer/index.html'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`❌ 缺少必要文件: ${file}`, 'red');
      process.exit(1);
    }
  }
  
  log('✅ 前置条件检查通过', 'green');
}

function cleanBuildDirectories() {
  log('清理构建目录...', 'yellow');
  
  const dirsToClean = [config.buildDir, config.outputDir];
  
  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      execCommand(`rimraf ${dir}`, `清理 ${dir} 目录`);
    }
  }
}

function installDependencies() {
  execCommand('npm ci', '安装依赖');
}

function generateAssets() {
  execCommand('npm run generate:icons', '生成应用图标');
}

function buildApplication() {
  execCommand('npm run build:prod', '构建应用');
}

function packageApplication(platforms) {
  log('\n开始打包应用...', 'yellow');
  
  if (platforms.includes('all')) {
    execCommand('npm run dist:all', '打包所有平台');
  } else {
    for (const platform of platforms) {
      switch (platform) {
        case 'mac':
          execCommand('npm run dist:mac', '打包 macOS 版本');
          break;
        case 'win':
          execCommand('npm run dist:win', '打包 Windows 版本');
          break;
        case 'linux':
          execCommand('npm run dist:linux', '打包 Linux 版本');
          break;
        default:
          log(`⚠️  未知平台: ${platform}`, 'yellow');
      }
    }
  }
}

function validatePackages() {
  log('\n验证打包结果...', 'yellow');
  
  if (!fs.existsSync(config.outputDir)) {
    log('❌ 输出目录不存在', 'red');
    return false;
  }
  
  const files = fs.readdirSync(config.outputDir);
  if (files.length === 0) {
    log('❌ 没有生成任何安装包', 'red');
    return false;
  }
  
  log('📦 生成的安装包:', 'blue');
  files.forEach(file => {
    const filePath = path.join(config.outputDir, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024 / 1024).toFixed(2);
    log(`  - ${file} (${size} MB)`, 'blue');
  });
  
  log('✅ 打包验证通过', 'green');
  return true;
}

function showSummary() {
  log('\n🎉 部署完成!', 'green');
  log('📁 安装包位置: ./release/', 'blue');
  log('📋 下一步操作:', 'yellow');
  log('  1. 测试安装包在目标平台上的运行情况', 'cyan');
  log('  2. 进行代码签名（生产环境）', 'cyan');
  log('  3. 上传到发布平台或分发渠道', 'cyan');
  log('  4. 更新版本文档和发布说明', 'cyan');
}

function main() {
  const args = process.argv.slice(2);
  const platforms = args.length > 0 ? args : ['mac']; // 默认只打包当前平台
  
  log('🚀 崔子瑾诱捕器部署脚本', 'bright');
  log(`📋 目标平台: ${platforms.join(', ')}`, 'blue');
  
  try {
    checkPrerequisites();
    cleanBuildDirectories();
    installDependencies();
    generateAssets();
    buildApplication();
    packageApplication(platforms);
    
    if (validatePackages()) {
      showSummary();
    }
  } catch (error) {
    log(`❌ 部署失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 处理命令行参数
if (require.main === module) {
  main();
}

module.exports = {
  checkPrerequisites,
  cleanBuildDirectories,
  installDependencies,
  generateAssets,
  buildApplication,
  packageApplication,
  validatePackages
};
