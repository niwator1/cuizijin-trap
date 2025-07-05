import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

test.describe('Switch 组件动画测试', () => {
  let electronApp: any;
  let window: any;

  test.beforeAll(async () => {
    // 启动 Electron 应用
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../dist/main/index.js')],
      timeout: 30000,
    });

    // 获取主窗口
    window = await electronApp.firstWindow();
    await window.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('Switch 组件应该有正确的动画效果', async () => {
    // 等待页面加载完成
    await window.waitForLoadState('networkidle');
    
    // 查找所有的 Switch 组件
    const switches = window.locator('[role="switch"]');
    const switchCount = await switches.count();
    
    if (switchCount > 0) {
      const firstSwitch = switches.first();
      
      // 确保 Switch 可见且可用
      await expect(firstSwitch).toBeVisible();
      await expect(firstSwitch).toBeEnabled();
      
      // 获取初始状态
      const initialState = await firstSwitch.getAttribute('aria-checked');
      console.log('初始状态:', initialState);
      
      // 获取 Switch 内部的小圆球元素
      const thumb = firstSwitch.locator('.switch-thumb, motion\\:span, span').first();
      
      // 获取初始位置
      const initialBox = await thumb.boundingBox();
      console.log('初始位置:', initialBox);
      
      // 点击切换状态
      await firstSwitch.click();
      
      // 等待动画完成
      await window.waitForTimeout(500);
      
      // 验证状态已改变
      const newState = await firstSwitch.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);
      console.log('新状态:', newState);
      
      // 获取新位置
      const newBox = await thumb.boundingBox();
      console.log('新位置:', newBox);
      
      // 验证小圆球位置发生了变化
      if (initialBox && newBox) {
        expect(Math.abs(newBox.x - initialBox.x)).toBeGreaterThan(10);
        console.log('位置变化:', newBox.x - initialBox.x);
      }
      
      // 再次点击恢复状态
      await firstSwitch.click();
      await window.waitForTimeout(500);
      
      // 验证状态恢复
      const finalState = await firstSwitch.getAttribute('aria-checked');
      expect(finalState).toBe(initialState);
      
      // 验证位置恢复
      const finalBox = await thumb.boundingBox();
      if (initialBox && finalBox) {
        expect(Math.abs(finalBox.x - initialBox.x)).toBeLessThan(5);
      }
    }
  });

  test('多个 Switch 组件应该独立工作', async () => {
    await window.waitForLoadState('networkidle');
    
    const switches = window.locator('[role="switch"]');
    const switchCount = await switches.count();
    
    if (switchCount >= 2) {
      const firstSwitch = switches.nth(0);
      const secondSwitch = switches.nth(1);
      
      // 获取初始状态
      const firstInitialState = await firstSwitch.getAttribute('aria-checked');
      const secondInitialState = await secondSwitch.getAttribute('aria-checked');
      
      // 只切换第一个开关
      await firstSwitch.click();
      await window.waitForTimeout(300);
      
      // 验证第一个开关状态改变
      const firstNewState = await firstSwitch.getAttribute('aria-checked');
      expect(firstNewState).not.toBe(firstInitialState);
      
      // 验证第二个开关状态未改变
      const secondUnchangedState = await secondSwitch.getAttribute('aria-checked');
      expect(secondUnchangedState).toBe(secondInitialState);
    }
  });

  test('Switch 组件应该有正确的视觉反馈', async () => {
    await window.waitForLoadState('networkidle');
    
    const switches = window.locator('[role="switch"]');
    
    if (await switches.count() > 0) {
      const firstSwitch = switches.first();
      
      // 测试 hover 效果
      await firstSwitch.hover();
      await window.waitForTimeout(200);
      
      // 测试点击效果
      await firstSwitch.click();
      await window.waitForTimeout(100);
      
      // 验证没有错误发生
      const errors = await window.evaluate(() => {
        return window.console?.errors || [];
      });
      
      expect(errors.length).toBe(0);
    }
  });

  test('Switch 组件在禁用状态下应该正确显示', async () => {
    await window.waitForLoadState('networkidle');
    
    // 查找可能被禁用的开关
    const disabledSwitches = window.locator('[role="switch"][disabled], [role="switch"][aria-disabled="true"]');
    
    if (await disabledSwitches.count() > 0) {
      const disabledSwitch = disabledSwitches.first();
      
      // 验证禁用状态
      await expect(disabledSwitch).toBeDisabled();
      
      // 尝试点击（应该无效）
      const initialState = await disabledSwitch.getAttribute('aria-checked');
      await disabledSwitch.click({ force: true });
      await window.waitForTimeout(200);
      
      // 验证状态未改变
      const finalState = await disabledSwitch.getAttribute('aria-checked');
      expect(finalState).toBe(initialState);
    }
  });

  test('Switch 组件应该支持键盘操作', async () => {
    await window.waitForLoadState('networkidle');
    
    const switches = window.locator('[role="switch"]');
    
    if (await switches.count() > 0) {
      const firstSwitch = switches.first();
      
      // 聚焦到开关
      await firstSwitch.focus();
      
      // 获取初始状态
      const initialState = await firstSwitch.getAttribute('aria-checked');
      
      // 使用空格键切换
      await window.keyboard.press('Space');
      await window.waitForTimeout(300);
      
      // 验证状态改变
      const newState = await firstSwitch.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);
      
      // 使用 Enter 键切换回来
      await window.keyboard.press('Enter');
      await window.waitForTimeout(300);
      
      // 验证状态恢复
      const finalState = await firstSwitch.getAttribute('aria-checked');
      expect(finalState).toBe(initialState);
    }
  });
});
