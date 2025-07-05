#!/usr/bin/env node

/**
 * 崔子瑾诱捕器 - 检查GitHub Actions构建状态
 */

const https = require('https');

const config = {
  owner: 'niwator1',
  repo: 'cuizijin-trap'
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

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'cuizijin-trap-status-checker'
      }
    };

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
    req.end();
  });
}

function formatDuration(startTime, endTime) {
  if (!startTime) return 'N/A';
  
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const duration = Math.floor((end - start) / 1000);
  
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  return `${minutes}分${seconds}秒`;
}

function getStatusIcon(status, conclusion) {
  if (status === 'completed') {
    switch (conclusion) {
      case 'success': return '✅';
      case 'failure': return '❌';
      case 'cancelled': return '⏹️';
      default: return '❓';
    }
  } else if (status === 'in_progress') {
    return '🔄';
  } else if (status === 'queued') {
    return '⏳';
  }
  return '❓';
}

async function checkWorkflowRuns() {
  try {
    log('🔍 检查GitHub Actions构建状态...', 'blue');
    log('', 'reset');
    
    const runs = await makeRequest(`/repos/${config.owner}/${config.repo}/actions/runs?per_page=5`);
    
    if (runs.total_count === 0) {
      log('📭 没有找到任何workflow运行记录', 'yellow');
      return;
    }
    
    log(`📊 最近的 ${Math.min(runs.total_count, 5)} 次构建:`, 'bright');
    log('', 'reset');
    
    for (const run of runs.workflow_runs.slice(0, 5)) {
      const icon = getStatusIcon(run.status, run.conclusion);
      const duration = formatDuration(run.created_at, run.updated_at);
      const branch = run.head_branch || 'unknown';
      const event = run.event === 'push' ? '推送' : run.event === 'workflow_dispatch' ? '手动触发' : run.event;
      
      log(`${icon} ${run.name}`, 'bright');
      log(`   状态: ${run.status} ${run.conclusion ? `(${run.conclusion})` : ''}`, 'cyan');
      log(`   分支: ${branch}`, 'cyan');
      log(`   触发: ${event}`, 'cyan');
      log(`   时长: ${duration}`, 'cyan');
      log(`   时间: ${new Date(run.created_at).toLocaleString('zh-CN')}`, 'cyan');
      log(`   链接: ${run.html_url}`, 'blue');
      log('', 'reset');
    }
    
    // 检查最新的构建
    const latestRun = runs.workflow_runs[0];
    if (latestRun.status === 'in_progress') {
      log('🔄 当前有构建正在进行中...', 'yellow');
      log('💡 您可以访问以下链接查看实时进度:', 'blue');
      log(latestRun.html_url, 'cyan');
    } else if (latestRun.status === 'completed' && latestRun.conclusion === 'success') {
      log('🎉 最新构建已成功完成！', 'green');
      
      // 检查releases
      try {
        const releases = await makeRequest(`/repos/${config.owner}/${config.repo}/releases?per_page=1`);
        if (releases.length > 0) {
          const latestRelease = releases[0];
          log('📦 最新Release:', 'blue');
          log(`   版本: ${latestRelease.tag_name}`, 'cyan');
          log(`   名称: ${latestRelease.name}`, 'cyan');
          log(`   资源数量: ${latestRelease.assets.length}`, 'cyan');
          log(`   下载链接: ${latestRelease.html_url}`, 'blue');
        }
      } catch (error) {
        log('⚠️ 无法获取release信息', 'yellow');
      }
    } else if (latestRun.status === 'completed' && latestRun.conclusion === 'failure') {
      log('❌ 最新构建失败', 'red');
      log('🔗 请查看构建日志:', 'yellow');
      log(latestRun.html_url, 'cyan');
    }
    
  } catch (error) {
    log(`❌ 检查失败: ${error.message}`, 'red');
  }
}

async function main() {
  log('🚀 崔子瑾诱捕器 - 构建状态检查', 'bright');
  log('========================================', 'cyan');
  log('', 'reset');
  
  await checkWorkflowRuns();
  
  log('', 'reset');
  log('💡 提示:', 'yellow');
  log('- 构建通常需要10-15分钟完成', 'cyan');
  log('- 可以访问GitHub Actions页面查看详细日志', 'cyan');
  log('- 构建完成后会自动创建GitHub Release', 'cyan');
  log('', 'reset');
}

if (require.main === module) {
  main();
}
