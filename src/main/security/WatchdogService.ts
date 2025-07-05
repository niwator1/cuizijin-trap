import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * 外部看门狗服务
 * 独立进程监控主应用，实现强制杀进程后自动重启
 */
export class WatchdogService {
  private watchdogProcess: ChildProcess | null = null;
  private mainProcessPath: string;
  private configPath: string;
  private isEnabled = false;

  constructor() {
    this.mainProcessPath = process.execPath;
    this.configPath = path.join(os.tmpdir(), 'cuizijin-watchdog.json');
  }

  /**
   * 启动看门狗服务
   */
  async start(): Promise<void> {
    if (this.isEnabled) {
      console.log('Watchdog service is already running');
      return;
    }

    try {
      // 创建看门狗配置文件
      await this.createWatchdogConfig();
      
      // 启动看门狗进程
      await this.startWatchdogProcess();
      
      this.isEnabled = true;
      console.log('Watchdog service started successfully');
    } catch (error) {
      console.error('Failed to start watchdog service:', error);
      throw error;
    }
  }

  /**
   * 停止看门狗服务
   */
  async stop(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      // 删除配置文件（信号看门狗停止监控）
      if (fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath);
      }

      // 终止看门狗进程
      if (this.watchdogProcess && !this.watchdogProcess.killed) {
        this.watchdogProcess.kill('SIGTERM');
        
        // 等待进程结束
        await new Promise<void>((resolve) => {
          if (this.watchdogProcess) {
            this.watchdogProcess.on('exit', () => resolve());
          } else {
            resolve();
          }
        });
      }

      this.isEnabled = false;
      console.log('Watchdog service stopped');
    } catch (error) {
      console.error('Error stopping watchdog service:', error);
    }
  }

  /**
   * 更新心跳
   */
  updateHeartbeat(): void {
    if (!this.isEnabled) {
      return;
    }

    try {
      const config = {
        mainProcessPid: process.pid,
        mainProcessPath: this.mainProcessPath,
        lastHeartbeat: Date.now(),
        restartCommand: this.getRestartCommand()
      };

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to update heartbeat:', error);
    }
  }

  /**
   * 创建看门狗配置文件
   */
  private async createWatchdogConfig(): Promise<void> {
    const config = {
      mainProcessPid: process.pid,
      mainProcessPath: this.mainProcessPath,
      lastHeartbeat: Date.now(),
      restartCommand: this.getRestartCommand(),
      checkInterval: 10000, // 10秒检查间隔
      maxRestartAttempts: 5,
      restartDelay: 3000 // 重启延迟3秒
    };

    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  /**
   * 启动看门狗进程
   */
  private async startWatchdogProcess(): Promise<void> {
    // 创建看门狗脚本
    const watchdogScript = this.createWatchdogScript();
    const scriptPath = path.join(os.tmpdir(), 'cuizijin-watchdog.js');
    
    fs.writeFileSync(scriptPath, watchdogScript);

    // 启动看门狗进程
    this.watchdogProcess = spawn('node', [scriptPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });

    // 分离进程，使其独立运行
    this.watchdogProcess.unref();
  }

  /**
   * 获取重启命令
   */
  private getRestartCommand(): string[] {
    if (process.platform === 'win32') {
      return [this.mainProcessPath];
    } else {
      return [this.mainProcessPath];
    }
  }

  /**
   * 创建看门狗脚本
   */
  private createWatchdogScript(): string {
    return `
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const CONFIG_PATH = '${this.configPath}';
let restartAttempts = 0;

console.log('Watchdog started, monitoring:', CONFIG_PATH);

function checkMainProcess() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      console.log('Config file not found, stopping watchdog');
      process.exit(0);
      return;
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const now = Date.now();
    const timeSinceHeartbeat = now - config.lastHeartbeat;
    
    // 检查心跳超时（30秒）
    if (timeSinceHeartbeat > 30000) {
      console.log('Heartbeat timeout detected, checking process...');
      
      // 检查进程是否还在运行
      if (!isProcessRunning(config.mainProcessPid)) {
        console.log('Main process not running, attempting restart...');
        restartMainProcess(config);
      } else {
        console.log('Process is running but heartbeat is stale');
      }
    }
  } catch (error) {
    console.error('Watchdog check error:', error);
  }
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

function restartMainProcess(config) {
  if (restartAttempts >= config.maxRestartAttempts) {
    console.log('Max restart attempts reached, stopping watchdog');
    return;
  }

  restartAttempts++;
  console.log(\`Restart attempt \${restartAttempts}/\${config.maxRestartAttempts}\`);

  setTimeout(() => {
    try {
      const child = spawn(config.mainProcessPath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      console.log('Main process restarted with PID:', child.pid);
      
      // 重置重启计数
      setTimeout(() => {
        restartAttempts = 0;
      }, 60000); // 1分钟后重置
      
    } catch (error) {
      console.error('Failed to restart main process:', error);
    }
  }, config.restartDelay || 3000);
}

// 每10秒检查一次
setInterval(checkMainProcess, 10000);

// 立即执行一次检查
checkMainProcess();

// 处理退出信号
process.on('SIGTERM', () => {
  console.log('Watchdog received SIGTERM, exiting...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Watchdog received SIGINT, exiting...');
  process.exit(0);
});
`;
  }
}
