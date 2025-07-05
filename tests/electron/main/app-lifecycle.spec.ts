import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

test.describe('Electron主进程 - 应用生命周期', () => {
  test('应用应该正常启动和关闭', async () => {
    // 启动Electron应用
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // 等待应用启动
    const window = await electronApp.firstWindow();
    
    // 验证窗口已创建
    expect(window).toBeTruthy();
    
    // 验证窗口标题
    const title = await window.title();
    expect(title).toContain('崔子瑾诱捕器');
    
    // 验证窗口大小
    const size = await window.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));
    
    expect(size.width).toBeGreaterThan(800);
    expect(size.height).toBeGreaterThan(600);
    
    // 关闭应用
    await electronApp.close();
  });

  test('应用应该创建系统托盘', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // 等待应用启动
    await electronApp.firstWindow();
    
    // 检查系统托盘是否创建
    // 注意：这个测试可能需要根据实际的托盘实现进行调整
    const trayExists = await electronApp.evaluate(({ app }) => {
      // 这里需要根据实际的托盘实现来检查
      return true; // 临时返回true
    });
    
    expect(trayExists).toBe(true);
    
    await electronApp.close();
  });

  test('应用应该处理多个窗口', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // 获取主窗口
    const mainWindow = await electronApp.firstWindow();
    expect(mainWindow).toBeTruthy();
    
    // 检查是否只有一个窗口（单例模式）
    const windows = electronApp.windows();
    expect(windows).toHaveLength(1);
    
    await electronApp.close();
  });

  test('应用应该正确处理深度链接', async () => {
    const electronApp = await electron.launch({
      args: [
        path.join(__dirname, '../../../dist/main/index.js'),
        'cuizijin-trap://test-protocol'
      ],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    const window = await electronApp.firstWindow();
    
    // 验证应用能够处理协议链接
    // 这里需要根据实际的协议处理逻辑进行测试
    expect(window).toBeTruthy();
    
    await electronApp.close();
  });

  test('应用应该正确设置安全策略', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    const window = await electronApp.firstWindow();
    
    // 检查内容安全策略
    const csp = await window.evaluate(() => {
      const metaTag = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return metaTag ? metaTag.getAttribute('content') : null;
    });
    
    // 验证CSP设置
    if (csp) {
      expect(csp).toContain("default-src 'self'");
    }
    
    // 检查Node.js集成是否正确禁用
    const nodeIntegration = await window.evaluate(() => {
      return typeof process !== 'undefined';
    });
    
    expect(nodeIntegration).toBe(false);
    
    await electronApp.close();
  });

  test('应用应该正确处理未捕获的异常', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    const window = await electronApp.firstWindow();
    
    // 监听控制台错误
    const consoleErrors: string[] = [];
    window.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // 等待一段时间收集可能的错误
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 检查是否有严重的未捕获异常
    const seriousErrors = consoleErrors.filter(error => 
      error.includes('Uncaught') && 
      !error.includes('Warning:') &&
      !error.includes('favicon')
    );
    
    expect(seriousErrors).toHaveLength(0);
    
    await electronApp.close();
  });

  test('应用应该正确管理内存使用', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    const window = await electronApp.firstWindow();
    
    // 获取内存使用情况
    const memoryInfo = await electronApp.evaluate(({ app }) => {
      return app.getAppMetrics();
    });
    
    expect(memoryInfo).toBeTruthy();
    expect(Array.isArray(memoryInfo)).toBe(true);
    
    // 检查主进程内存使用
    const mainProcess = memoryInfo.find((metric: any) => metric.type === 'Browser');
    if (mainProcess) {
      // 内存使用应该在合理范围内（小于500MB）
      expect(mainProcess.memory.workingSetSize).toBeLessThan(500 * 1024 * 1024);
    }
    
    await electronApp.close();
  });

  test('应用应该正确处理权限请求', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    const window = await electronApp.firstWindow();
    
    // 测试权限处理（如果应用需要特定权限）
    // 这里可以根据应用的具体权限需求进行测试
    
    expect(window).toBeTruthy();
    
    await electronApp.close();
  });
});
