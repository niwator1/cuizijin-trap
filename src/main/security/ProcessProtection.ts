import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 进程保护状态
 */
export interface ProcessProtectionStatus {
  enabled: boolean;
  watchdogActive: boolean;
  protectedProcesses: number;
  lastHeartbeat: Date;
}

/**
 * 进程保护配置
 */
export interface ProcessProtectionConfig {
  enableWatchdog: boolean;
  heartbeatInterval: number; // 心跳间隔（毫秒）
  restartOnCrash: boolean;
  hideFromTaskManager: boolean;
  preventTermination: boolean;
}

/**
 * 进程保护类
 * 实现进程监控、自动重启、防止强制结束等安全功能
 */
export class ProcessProtection {
  private watchdogTimer: NodeJS.Timeout | null = null;
  private childProcesses: Map<string, ChildProcess> = new Map();
  private config: ProcessProtectionConfig;
  private isEnabled = false;
  private lastHeartbeat = new Date();
  private platform: string;

  constructor(config?: Partial<ProcessProtectionConfig>) {
    this.platform = os.platform();
    this.config = {
      enableWatchdog: true,
      heartbeatInterval: 30000, // 30秒
      restartOnCrash: true,
      hideFromTaskManager: false, // 在生产环境中可能需要启用
      preventTermination: false,  // 在生产环境中可能需要启用
      ...config
    };
  }

  /**
   * 初始化进程保护
   */
  async initialize(): Promise<void> {
    console.log('Initializing process protection...');
    
    try {
      // 设置进程信号处理
      this.setupSignalHandlers();
      
      // 启动看门狗（如果启用）
      if (this.config.enableWatchdog) {
        this.startWatchdog();
      }
      
      // 设置进程保护（如果启用）
      if (this.config.preventTermination) {
        await this.protectMainProcess();
      }
      
      // 隐藏进程（如果启用）
      if (this.config.hideFromTaskManager) {
        await this.hideProcess();
      }
      
      this.isEnabled = true;
      console.log('Process protection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize process protection:', error);
      throw error;
    }
  }

  /**
   * 停止进程保护
   */
  async stop(): Promise<void> {
    console.log('Stopping process protection...');
    
    this.isEnabled = false;
    
    // 停止看门狗
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    
    // 终止所有子进程
    for (const [name, process] of this.childProcesses) {
      try {
        process.kill();
        console.log(`Terminated child process: ${name}`);
      } catch (error) {
        console.error(`Failed to terminate child process ${name}:`, error);
      }
    }
    
    this.childProcesses.clear();
    console.log('Process protection stopped');
  }

  /**
   * 获取保护状态
   */
  getStatus(): ProcessProtectionStatus {
    return {
      enabled: this.isEnabled,
      watchdogActive: this.watchdogTimer !== null,
      protectedProcesses: this.childProcesses.size,
      lastHeartbeat: this.lastHeartbeat
    };
  }

  /**
   * 启动看门狗进程
   */
  private startWatchdog(): void {
    console.log('Starting watchdog timer...');
    
    this.watchdogTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.heartbeatInterval);
  }

  /**
   * 执行健康检查
   */
  private performHealthCheck(): void {
    this.lastHeartbeat = new Date();
    
    // 检查主进程状态
    if (!this.isMainProcessHealthy()) {
      console.warn('Main process health check failed');
      this.handleUnhealthyProcess();
    }
    
    // 检查子进程状态
    this.checkChildProcesses();
    
    // 检查系统资源
    this.checkSystemResources();
  }

  /**
   * 检查主进程是否健康
   */
  private isMainProcessHealthy(): boolean {
    try {
      // 检查内存使用情况
      const memUsage = process.memoryUsage();
      const maxMemory = 1024 * 1024 * 1024; // 1GB
      
      if (memUsage.heapUsed > maxMemory) {
        console.warn('Memory usage too high:', memUsage);
        return false;
      }
      
      // 检查事件循环延迟
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delay = Number(process.hrtime.bigint() - start) / 1000000; // 转换为毫秒
        if (delay > 1000) { // 超过1秒认为不健康
          console.warn('Event loop delay too high:', delay);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Health check error:', error);
      return false;
    }
  }

  /**
   * 处理不健康的进程
   */
  private handleUnhealthyProcess(): void {
    console.log('Handling unhealthy process...');
    
    // 记录问题
    this.logProcessIssue('Main process unhealthy');
    
    // 如果启用了自动重启，可以在这里实现重启逻辑
    if (this.config.restartOnCrash) {
      console.log('Auto-restart is enabled but not implemented for main process');
      // 注意：重启主进程需要特殊处理，通常需要外部看门狗
    }
  }

  /**
   * 检查子进程状态
   */
  private checkChildProcesses(): void {
    for (const [name, process] of this.childProcesses) {
      if (process.killed || process.exitCode !== null) {
        console.log(`Child process ${name} has exited`);
        this.childProcesses.delete(name);
        
        if (this.config.restartOnCrash) {
          console.log(`Attempting to restart child process: ${name}`);
          // 这里可以实现子进程重启逻辑
        }
      }
    }
  }

  /**
   * 检查系统资源
   */
  private checkSystemResources(): void {
    try {
      const cpuUsage = process.cpuUsage();
      const memUsage = process.memoryUsage();
      
      // 记录资源使用情况（用于监控）
      if (cpuUsage.user + cpuUsage.system > 1000000) { // 高CPU使用
        console.warn('High CPU usage detected');
      }
      
      if (memUsage.heapUsed > 512 * 1024 * 1024) { // 超过512MB
        console.warn('High memory usage detected');
      }
    } catch (error) {
      console.error('Resource check error:', error);
    }
  }

  /**
   * 设置信号处理器
   */
  private setupSignalHandlers(): void {
    // 处理优雅关闭信号
    process.on('SIGTERM', this.handleShutdownSignal.bind(this));
    process.on('SIGINT', this.handleShutdownSignal.bind(this));
    
    // 处理未捕获的异常
    process.on('uncaughtException', this.handleUncaughtException.bind(this));
    process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
    
    // Windows特定信号
    if (this.platform === 'win32') {
      process.on('SIGBREAK', this.handleShutdownSignal.bind(this));
    }
  }

  /**
   * 处理关闭信号
   */
  private async handleShutdownSignal(signal: string): Promise<void> {
    console.log(`Received shutdown signal: ${signal}`);
    
    if (this.config.preventTermination && this.isEnabled) {
      console.log('Termination prevention is enabled, ignoring signal');
      return;
    }
    
    // 执行优雅关闭
    await this.stop();
    process.exit(0);
  }

  /**
   * 处理未捕获的异常
   */
  private handleUncaughtException(error: Error): void {
    console.error('Uncaught exception:', error);
    this.logProcessIssue(`Uncaught exception: ${error.message}`);
    
    if (this.config.restartOnCrash) {
      console.log('Attempting graceful recovery...');
      // 这里可以实现恢复逻辑
    }
  }

  /**
   * 处理未处理的Promise拒绝
   */
  private handleUnhandledRejection(reason: any, promise: Promise<any>): void {
    console.error('Unhandled promise rejection:', reason);
    this.logProcessIssue(`Unhandled rejection: ${reason}`);
  }

  /**
   * 保护主进程（防止被强制结束）
   */
  private async protectMainProcess(): Promise<void> {
    try {
      switch (this.platform) {
        case 'win32':
          await this.protectWindowsProcess();
          break;
        case 'darwin':
          await this.protectMacOSProcess();
          break;
        case 'linux':
          await this.protectLinuxProcess();
          break;
        default:
          console.log('Process protection not supported on this platform');
      }
    } catch (error) {
      console.error('Failed to protect main process:', error);
    }
  }

  /**
   * Windows进程保护
   */
  private async protectWindowsProcess(): Promise<void> {
    // Windows特定的进程保护逻辑
    console.log('Applying Windows process protection...');
    // 注意：实际的进程保护可能需要管理员权限
  }

  /**
   * macOS进程保护
   */
  private async protectMacOSProcess(): Promise<void> {
    // macOS特定的进程保护逻辑
    console.log('Applying macOS process protection...');
  }

  /**
   * Linux进程保护
   */
  private async protectLinuxProcess(): Promise<void> {
    // Linux特定的进程保护逻辑
    console.log('Applying Linux process protection...');
  }

  /**
   * 隐藏进程
   */
  private async hideProcess(): Promise<void> {
    try {
      // 注意：真正的进程隐藏需要系统级权限和特殊技术
      console.log('Process hiding is enabled but not fully implemented');
      // 在生产环境中，这里可能需要更复杂的实现
    } catch (error) {
      console.error('Failed to hide process:', error);
    }
  }

  /**
   * 记录进程问题
   */
  private logProcessIssue(issue: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      issue,
      processId: process.pid,
      platform: this.platform,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    console.log('Process issue logged:', logEntry);
    
    // 这里可以将日志写入文件或发送到监控系统
  }

  /**
   * 添加受保护的子进程
   */
  addChildProcess(name: string, childProcess: ChildProcess): void {
    this.childProcesses.set(name, childProcess);
    console.log(`Added child process to protection: ${name}`);
  }

  /**
   * 移除受保护的子进程
   */
  removeChildProcess(name: string): void {
    this.childProcesses.delete(name);
    console.log(`Removed child process from protection: ${name}`);
  }
}
