import { FullConfig } from '@playwright/test';
import { electronProcess } from './global-setup';

async function globalTeardown(config: FullConfig) {
  console.log('🛑 Shutting down Electron application...');

  try {
    if (electronProcess && !electronProcess.killed) {
      // 尝试优雅关闭
      console.log('📤 Sending SIGTERM to Electron process...');
      electronProcess.kill('SIGTERM');

      // 等待进程关闭
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('⚠️ Electron process did not exit gracefully, forcing kill...');
          if (electronProcess && !electronProcess.killed) {
            electronProcess.kill('SIGKILL');
          }
          resolve(void 0);
        }, 5000); // 5秒超时

        electronProcess?.on('exit', () => {
          clearTimeout(timeout);
          resolve(void 0);
        });
      });

      console.log('✅ Electron application shut down successfully');
    } else {
      console.log('ℹ️ Electron process was not running');
    }
  } catch (error) {
    console.error('❌ Error during Electron shutdown:', error);
  }

  // 清理测试数据
  await cleanupTestData();
}

async function cleanupTestData(): Promise<void> {
  console.log('🧹 Cleaning up test data...');

  try {
    const { promises: fs } = require('fs');
    const path = require('path');
    const os = require('os');

    // 清理测试数据库文件
    const testDbPath = path.join(os.homedir(), '.cuizijin-trap-test');
    try {
      await fs.rmdir(testDbPath, { recursive: true });
      console.log('✅ Test database cleaned up');
    } catch (error) {
      // 文件可能不存在，忽略错误
    }

    // 清理测试日志文件
    const testLogsPath = path.join(process.cwd(), 'test-logs');
    try {
      await fs.rmdir(testLogsPath, { recursive: true });
      console.log('✅ Test logs cleaned up');
    } catch (error) {
      // 文件可能不存在，忽略错误
    }

    // 清理临时文件
    const tempPath = path.join(os.tmpdir(), 'cuizijin-trap-test-*');
    // 这里可以添加更复杂的临时文件清理逻辑

    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('⚠️ Error during test data cleanup:', error);
    // 不抛出错误，因为清理失败不应该影响测试结果
  }
}

export default globalTeardown;
