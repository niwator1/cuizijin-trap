#!/usr/bin/env node

/**
 * 触发Windows构建的便捷脚本
 * 使用GitHub API触发Windows构建workflow
 */

const https = require('https');
const { execSync } = require('child_process');

// 配置
const REPO_OWNER = 'niwator1';
const REPO_NAME = 'cuizijin-trap';
const WORKFLOW_FILE = 'windows-build.yml';

/**
 * 获取GitHub Token
 */
function getGitHubToken() {
  try {
    // 尝试从环境变量获取
    if (process.env.GITHUB_TOKEN) {
      return process.env.GITHUB_TOKEN;
    }
    
    // 尝试从git配置获取
    const token = execSync('git config --get github.token', { encoding: 'utf8' }).trim();
    if (token) {
      return token;
    }
  } catch (error) {
    // 忽略错误
  }
  
  console.error('❌ 未找到GitHub Token');
  console.log('请设置GitHub Token:');
  console.log('1. 环境变量: export GITHUB_TOKEN=your_token');
  console.log('2. Git配置: git config --global github.token your_token');
  console.log('3. 在GitHub Settings > Developer settings > Personal access tokens 创建token');
  process.exit(1);
}

/**
 * 发送HTTP请求
 */
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
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

/**
 * 触发Windows构建
 */
async function triggerWindowsBuild(branch = 'main', debug = false) {
  const token = getGitHubToken();
  
  console.log('🚀 触发Windows构建...');
  console.log(`📂 分支: ${branch}`);
  console.log(`🐛 调试模式: ${debug ? '启用' : '禁用'}`);
  
  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'cuizijin-trap-build-script',
      'Content-Type': 'application/json'
    }
  };
  
  const data = {
    ref: branch,
    inputs: {
      branch: branch,
      debug: debug.toString()
    }
  };
  
  try {
    const response = await makeRequest(options, data);
    
    if (response.status === 204) {
      console.log('✅ Windows构建已触发成功！');
      console.log('📱 请访问以下链接查看构建进度:');
      console.log(`   https://github.com/${REPO_OWNER}/${REPO_NAME}/actions`);
      console.log('');
      console.log('⏱️  构建通常需要5-10分钟完成');
      console.log('📦 构建完成后可在Actions页面下载exe文件');
    } else {
      console.error('❌ 构建触发失败:', response.status);
      console.error('响应:', response.data);
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

/**
 * 获取最近的构建状态
 */
async function getBuildStatus() {
  const token = getGitHubToken();
  
  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=5`,
    method: 'GET',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'cuizijin-trap-build-script'
    }
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.status === 200 && response.data.workflow_runs) {
      console.log('📊 最近的Windows构建状态:');
      console.log('');
      
      response.data.workflow_runs.slice(0, 3).forEach((run, index) => {
        const status = run.status === 'completed' ? 
          (run.conclusion === 'success' ? '✅' : '❌') : '🔄';
        const date = new Date(run.created_at).toLocaleString('zh-CN');
        
        console.log(`${index + 1}. ${status} ${run.display_title}`);
        console.log(`   状态: ${run.status} ${run.conclusion ? `(${run.conclusion})` : ''}`);
        console.log(`   时间: ${date}`);
        console.log(`   链接: ${run.html_url}`);
        console.log('');
      });
    } else {
      console.error('❌ 获取构建状态失败:', response.status);
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'build':
    const branch = args[1] || 'main';
    const debug = args.includes('--debug');
    triggerWindowsBuild(branch, debug);
    break;
    
  case 'status':
    getBuildStatus();
    break;
    
  default:
    console.log('🔨 Windows构建工具');
    console.log('');
    console.log('用法:');
    console.log('  node scripts/trigger-windows-build.js build [branch] [--debug]');
    console.log('  node scripts/trigger-windows-build.js status');
    console.log('');
    console.log('示例:');
    console.log('  node scripts/trigger-windows-build.js build main');
    console.log('  node scripts/trigger-windows-build.js build develop --debug');
    console.log('  node scripts/trigger-windows-build.js status');
    break;
}
