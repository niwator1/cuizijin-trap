import { defineConfig } from '@playwright/test';

/**
 * Electron应用专用的Playwright配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/electron',
  /* 测试超时时间 */
  timeout: 60000,
  /* 期望超时时间 */
  expect: {
    timeout: 10000,
  },
  /* 不并行运行测试，因为Electron应用实例冲突 */
  fullyParallel: false,
  /* 在CI环境中如果意外留下test.only则失败 */
  forbidOnly: !!process.env.CI,
  /* 仅在CI环境中重试 */
  retries: process.env.CI ? 2 : 0,
  /* 使用单个worker避免Electron实例冲突 */
  workers: 1,
  /* 报告器配置 */
  reporter: [
    ['html', { outputFolder: 'playwright-report-electron' }],
    ['json', { outputFile: 'test-results-electron.json' }],
    ['junit', { outputFile: 'test-results-electron.xml' }]
  ],
  /* 全局测试设置 */
  use: {
    /* 截图设置 */
    screenshot: 'only-on-failure',
    /* 视频录制 */
    video: 'retain-on-failure',
    /* 追踪设置 */
    trace: 'on-first-retry',
    /* 操作超时 */
    actionTimeout: 10000,
    /* 导航超时 */
    navigationTimeout: 30000,
  },

  /* 项目配置 */
  projects: [
    {
      name: 'electron-main',
      testDir: './tests/electron/main',
      use: {
        /* Electron主进程测试配置 */
      },
    },
    {
      name: 'electron-renderer',
      testDir: './tests/electron/renderer',
      use: {
        /* Electron渲染进程测试配置 */
      },
    },
    {
      name: 'electron-e2e',
      testDir: './tests/electron/e2e',
      use: {
        /* 端到端测试配置 */
      },
    },
  ],

  /* 全局设置和清理 */
  globalSetup: require.resolve('./tests/electron/global-setup.ts'),
  globalTeardown: require.resolve('./tests/electron/global-teardown.ts'),
});
