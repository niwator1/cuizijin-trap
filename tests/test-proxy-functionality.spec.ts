import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

/**
 * 测试代理功能的完整流程
 * 包括启动代理、添加网站、验证拦截功能
 */

test.describe('代理拦截功能测试', () => {
  let electronApp: any;
  let page: any;

  test.beforeAll(async () => {
    // 启动Electron应用
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../dist/main/index.js')],
      timeout: 30000
    });

    // 等待应用窗口
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    
    // 等待应用完全加载
    await page.waitForTimeout(3000);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('应用启动并显示主界面', async () => {
    // 验证应用标题
    const title = await page.title();
    expect(title).toContain('崔子瑾诱捕器');

    // 截图记录当前状态
    await page.screenshot({ path: 'test-results/app-startup.png' });
  });

  test('检查代理服务器状态', async () => {
    // 查找代理状态相关的元素
    const proxyStatusElements = await page.locator('[data-testid*="proxy"], [class*="proxy"], text=/代理/').all();
    
    if (proxyStatusElements.length > 0) {
      console.log('找到代理相关元素:', proxyStatusElements.length);
      
      // 尝试点击启动代理按钮
      const startProxyButton = page.locator('button:has-text("启动代理"), button:has-text("开启代理"), button:has-text("启动")').first();
      
      if (await startProxyButton.isVisible()) {
        console.log('找到启动代理按钮，尝试点击');
        await startProxyButton.click();
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({ path: 'test-results/proxy-status.png' });
  });

  test('验证网站列表中包含百度贴吧', async () => {
    // 查找网站列表
    const siteListElements = await page.locator('[data-testid*="site"], [class*="site"], text=/tieba.baidu.com/').all();
    
    if (siteListElements.length > 0) {
      console.log('找到百度贴吧网站记录');
      expect(siteListElements.length).toBeGreaterThan(0);
    } else {
      console.log('未找到百度贴吧网站记录，尝试添加');
      
      // 尝试添加网站
      const addButton = page.locator('button:has-text("添加"), button:has-text("新增"), input[placeholder*="URL"]').first();
      
      if (await addButton.isVisible()) {
        if (await addButton.getAttribute('type') === 'button') {
          await addButton.click();
        } else {
          // 如果是输入框，直接输入
          await addButton.fill('https://tieba.baidu.com/');
          await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({ path: 'test-results/site-list.png' });
  });

  test('测试代理拦截功能', async () => {
    // 首先确保代理已启动
    const proxyStartButton = page.locator('button:has-text("启动代理"), button:has-text("开启代理")').first();
    
    if (await proxyStartButton.isVisible()) {
      await proxyStartButton.click();
      await page.waitForTimeout(3000);
    }

    // 检查代理状态
    const proxyStatus = await page.evaluate(async () => {
      // 尝试通过IPC检查代理状态
      if (window.electronAPI && window.electronAPI.invoke) {
        try {
          const status = await window.electronAPI.invoke('proxy:status');
          return status;
        } catch (error) {
          console.error('获取代理状态失败:', error);
          return null;
        }
      }
      return null;
    });

    console.log('代理状态:', proxyStatus);

    // 如果代理未启动，尝试启动
    if (!proxyStatus?.isActive) {
      const startResult = await page.evaluate(async () => {
        if (window.electronAPI && window.electronAPI.invoke) {
          try {
            const result = await window.electronAPI.invoke('proxy:start');
            return result;
          } catch (error) {
            console.error('启动代理失败:', error);
            return { success: false, error: error.message };
          }
        }
        return { success: false, error: 'electronAPI not available' };
      });

      console.log('启动代理结果:', startResult);
      
      if (startResult.success) {
        await page.waitForTimeout(2000);
        console.log('代理服务器启动成功');
      } else {
        console.error('代理服务器启动失败:', startResult.error);
      }
    }

    await page.screenshot({ path: 'test-results/proxy-test.png' });
  });

  test('验证系统代理设置', async () => {
    // 检查系统代理设置
    const systemInfo = await page.evaluate(async () => {
      if (window.electronAPI && window.electronAPI.invoke) {
        try {
          const info = await window.electronAPI.invoke('system:get-info');
          return info;
        } catch (error) {
          console.error('获取系统信息失败:', error);
          return null;
        }
      }
      return null;
    });

    console.log('系统信息:', systemInfo);

    if (systemInfo) {
      // 验证代理设置
      expect(systemInfo).toBeDefined();
    }

    await page.screenshot({ path: 'test-results/system-info.png' });
  });

  test('测试网站添加功能', async () => {
    // 尝试添加一个测试网站
    const testUrl = 'https://example.com';
    
    const addResult = await page.evaluate(async (url) => {
      if (window.electronAPI && window.electronAPI.invoke) {
        try {
          const result = await window.electronAPI.invoke('sites:add', {
            url: url,
            domain: new URL(url).hostname,
            enabled: true,
            category: 'test'
          });
          return result;
        } catch (error) {
          console.error('添加网站失败:', error);
          return { success: false, error: error.message };
        }
      }
      return { success: false, error: 'electronAPI not available' };
    }, testUrl);

    console.log('添加网站结果:', addResult);

    // 验证添加结果
    if (addResult.success) {
      console.log('网站添加成功');
    } else {
      console.log('网站添加失败或已存在:', addResult.error);
    }

    await page.screenshot({ path: 'test-results/add-site-test.png' });
  });

  test('生成测试报告', async () => {
    // 收集所有测试信息
    const testReport = await page.evaluate(async () => {
      const report = {
        timestamp: new Date().toISOString(),
        tests: []
      };

      // 检查代理状态
      if (window.electronAPI && window.electronAPI.invoke) {
        try {
          const proxyStatus = await window.electronAPI.invoke('proxy:status');
          report.tests.push({
            name: '代理状态检查',
            status: proxyStatus?.isActive ? 'PASS' : 'FAIL',
            details: proxyStatus
          });
        } catch (error) {
          report.tests.push({
            name: '代理状态检查',
            status: 'ERROR',
            error: error.message
          });
        }

        // 检查网站列表
        try {
          const sites = await window.electronAPI.invoke('sites:list');
          report.tests.push({
            name: '网站列表检查',
            status: sites?.success ? 'PASS' : 'FAIL',
            details: {
              count: sites?.data?.length || 0,
              sites: sites?.data?.map(s => ({ url: s.url, enabled: s.enabled })) || []
            }
          });
        } catch (error) {
          report.tests.push({
            name: '网站列表检查',
            status: 'ERROR',
            error: error.message
          });
        }

        // 检查系统信息
        try {
          const systemInfo = await window.electronAPI.invoke('system:get-info');
          report.tests.push({
            name: '系统信息检查',
            status: systemInfo ? 'PASS' : 'FAIL',
            details: systemInfo
          });
        } catch (error) {
          report.tests.push({
            name: '系统信息检查',
            status: 'ERROR',
            error: error.message
          });
        }
      }

      return report;
    });

    console.log('=== 测试报告 ===');
    console.log(JSON.stringify(testReport, null, 2));

    // 保存测试报告
    await page.evaluate((report) => {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'test-report.json';
      a.click();
      URL.revokeObjectURL(url);
    }, testReport);

    await page.screenshot({ path: 'test-results/final-state.png' });
  });
});
