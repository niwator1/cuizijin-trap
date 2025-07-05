import { FullConfig } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

let electronProcess: ChildProcess | null = null;

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Electron application for testing...');

  try {
    // 确保应用已构建
    await ensureAppBuilt();

    // 启动Electron应用
    await startElectronApp();

    // 等待应用启动
    await waitForAppReady();

    console.log('✅ Electron application started successfully');
  } catch (error) {
    console.error('❌ Failed to start Electron application:', error);
    throw error;
  }
}

async function ensureAppBuilt(): Promise<void> {
  console.log('📦 Checking if application is built...');

  const mainPath = path.join(process.cwd(), 'dist', 'main', 'index.js');
  const rendererPath = path.join(process.cwd(), 'dist', 'renderer', 'index.html');

  try {
    await fs.access(mainPath);
    await fs.access(rendererPath);
    console.log('✅ Application build found');
  } catch (error) {
    console.log('🔨 Building application...');
    
    // 执行构建
    const { spawn } = require('child_process');
    const buildProcess = spawn('npm', ['run', 'build'], {
      stdio: 'inherit',
      shell: true
    });

    await new Promise((resolve, reject) => {
      buildProcess.on('close', (code: number) => {
        if (code === 0) {
          console.log('✅ Application built successfully');
          resolve(void 0);
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });
  }
}

async function startElectronApp(): Promise<void> {
  console.log('🔌 Starting Electron process...');

  return new Promise((resolve, reject) => {
    // 启动Electron应用
    electronProcess = spawn('npx', ['electron', '.'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_ENABLE_LOGGING: '1',
        ELECTRON_DISABLE_SECURITY_WARNINGS: '1'
      }
    });

    if (!electronProcess) {
      reject(new Error('Failed to spawn Electron process'));
      return;
    }

    // 监听进程输出
    electronProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[Electron] ${output}`);
      
      // 检查应用是否准备就绪
      if (output.includes('App ready') || output.includes('Main window created')) {
        resolve();
      }
    });

    electronProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      console.error(`[Electron Error] ${error}`);
    });

    electronProcess.on('error', (error) => {
      console.error('Electron process error:', error);
      reject(error);
    });

    electronProcess.on('exit', (code, signal) => {
      console.log(`Electron process exited with code ${code}, signal ${signal}`);
      if (code !== 0 && code !== null) {
        reject(new Error(`Electron process exited with code ${code}`));
      }
    });

    // 超时处理
    setTimeout(() => {
      if (electronProcess && !electronProcess.killed) {
        console.log('✅ Electron process started (timeout reached)');
        resolve();
      }
    }, 10000); // 10秒超时
  });
}

async function waitForAppReady(): Promise<void> {
  console.log('⏳ Waiting for application to be ready...');

  // 等待一段时间确保应用完全启动
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 这里可以添加更多的就绪检查逻辑
  // 例如检查特定端口是否开放，或者检查特定文件是否存在
}

// 导出进程引用供清理使用
export { electronProcess };

export default globalSetup;
