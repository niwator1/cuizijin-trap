import { test, expect } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import { _electron as electron } from 'playwright';
import path from 'path';

/**
 * 身份验证系统测试
 * 测试用户登录、会话管理、密码修改等功能
 */

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // 启动Electron应用
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../dist/main/index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });
  
  // 获取第一个窗口
  page = await electronApp.firstWindow();
  
  // 等待应用加载
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
});

test.afterAll(async () => {
  await electronApp?.close();
});

test.describe('用户初始化', () => {
  test('检查用户是否已初始化', async () => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.auth.isInitialized();
    });
    
    expect(result.success).toBe(true);
    expect(typeof result.data).toBe('boolean');
  });

  test('初始化用户密码', async () => {
    // 先检查是否已初始化
    const checkResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.isInitialized();
    });

    if (!checkResult.data) {
      // 如果未初始化，则进行初始化
      const initResult = await page.evaluate(async () => {
        return await window.electronAPI.auth.initialize('test123456', {
          sessionTimeout: 3600,
          autoStart: false,
          theme: 'system',
          language: 'zh-CN'
        });
      });

      expect(initResult.success).toBe(true);
    }
  });
});

test.describe('用户登录', () => {
  test('使用正确密码登录', async () => {
    const loginResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.login('test123456', {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        rememberSession: false
      });
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.data).toHaveProperty('sessionId');
    expect(loginResult.data).toHaveProperty('expiresAt');
  });

  test('使用错误密码登录应该失败', async () => {
    const loginResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.login('wrongpassword');
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toBeTruthy();
  });

  test('空密码登录应该失败', async () => {
    const loginResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.login('');
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toBeTruthy();
  });
});

test.describe('会话管理', () => {
  let sessionId: string;

  test.beforeEach(async () => {
    // 每个测试前都先登录获取会话ID
    const loginResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.login('test123456');
    });
    
    expect(loginResult.success).toBe(true);
    sessionId = loginResult.data.sessionId;
  });

  test('验证有效会话', async () => {
    const authResult = await page.evaluate(async (sid) => {
      return await window.electronAPI.auth.checkAuth(sid);
    }, sessionId);

    expect(authResult.success).toBe(true);
    expect(authResult.data.isAuthenticated).toBe(true);
    expect(authResult.data.sessionId).toBe(sessionId);
    expect(authResult.data).toHaveProperty('timeRemaining');
  });

  test('验证无效会话', async () => {
    const invalidSessionId = 'invalid-session-id';
    const authResult = await page.evaluate(async (sid) => {
      return await window.electronAPI.auth.checkAuth(sid);
    }, invalidSessionId);

    expect(authResult.success).toBe(true);
    expect(authResult.data.isAuthenticated).toBe(false);
  });

  test('刷新会话', async () => {
    const refreshResult = await page.evaluate(async (sid) => {
      return await window.electronAPI.auth.refreshSession(sid);
    }, sessionId);

    expect(refreshResult.success).toBe(true);
    expect(refreshResult.data.isAuthenticated).toBe(true);
    expect(refreshResult.data.sessionId).toBe(sessionId);
  });

  test('登出会话', async () => {
    const logoutResult = await page.evaluate(async (sid) => {
      return await window.electronAPI.auth.logout(sid);
    }, sessionId);

    expect(logoutResult.success).toBe(true);

    // 验证会话已失效
    const authResult = await page.evaluate(async (sid) => {
      return await window.electronAPI.auth.checkAuth(sid);
    }, sessionId);

    expect(authResult.data.isAuthenticated).toBe(false);
  });
});

test.describe('密码管理', () => {
  let sessionId: string;

  test.beforeEach(async () => {
    // 登录获取会话
    const loginResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.login('test123456');
    });
    
    sessionId = loginResult.data.sessionId;
  });

  test('修改密码', async () => {
    const newPassword = 'newtest123456';
    
    const changeResult = await page.evaluate(async ({ sid, oldPwd, newPwd }) => {
      return await window.electronAPI.auth.changePassword(sid, oldPwd, newPwd);
    }, { sid: sessionId, oldPwd: 'test123456', newPwd: newPassword });

    expect(changeResult.success).toBe(true);

    // 验证新密码可以登录
    const loginResult = await page.evaluate(async (pwd) => {
      return await window.electronAPI.auth.login(pwd);
    }, newPassword);

    expect(loginResult.success).toBe(true);

    // 恢复原密码以便其他测试
    const restoreResult = await page.evaluate(async ({ sid, oldPwd, newPwd }) => {
      return await window.electronAPI.auth.changePassword(sid, oldPwd, newPwd);
    }, { sid: loginResult.data.sessionId, oldPwd: newPassword, newPwd: 'test123456' });

    expect(restoreResult.success).toBe(true);
  });

  test('使用错误的旧密码修改密码应该失败', async () => {
    const changeResult = await page.evaluate(async ({ sid, oldPwd, newPwd }) => {
      return await window.electronAPI.auth.changePassword(sid, oldPwd, newPwd);
    }, { sid: sessionId, oldPwd: 'wrongpassword', newPwd: 'newtest123456' });

    expect(changeResult.success).toBe(false);
    expect(changeResult.error).toBeTruthy();
  });

  test('使用无效会话修改密码应该失败', async () => {
    const changeResult = await page.evaluate(async ({ sid, oldPwd, newPwd }) => {
      return await window.electronAPI.auth.changePassword(sid, oldPwd, newPwd);
    }, { sid: 'invalid-session', oldPwd: 'test123456', newPwd: 'newtest123456' });

    expect(changeResult.success).toBe(false);
    expect(changeResult.error).toBeTruthy();
  });
});

test.describe('密码验证', () => {
  test('验证正确密码', async () => {
    const verifyResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.verifyPassword('test123456');
    });

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.data.isValid).toBe(true);
  });

  test('验证错误密码', async () => {
    const verifyResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.verifyPassword('wrongpassword');
    });

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.data.isValid).toBe(false);
  });

  test('验证空密码', async () => {
    const verifyResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.verifyPassword('');
    });

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.data.isValid).toBe(false);
  });
});

test.describe('会话超时', () => {
  test('会话应该有正确的过期时间', async () => {
    const loginResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.login('test123456');
    });

    expect(loginResult.success).toBe(true);
    
    const sessionId = loginResult.data.sessionId;
    const expiresAt = new Date(loginResult.data.expiresAt);
    const now = new Date();
    
    // 检查过期时间是否在合理范围内（应该是未来的时间）
    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    
    // 检查过期时间是否在预期范围内（默认1小时）
    const timeDiff = expiresAt.getTime() - now.getTime();
    expect(timeDiff).toBeLessThanOrEqual(3600 * 1000); // 不超过1小时
    expect(timeDiff).toBeGreaterThan(3500 * 1000); // 至少58分钟
  });
});

test.describe('安全功能', () => {
  test('获取安全状态', async () => {
    const securityResult = await page.evaluate(async () => {
      return await window.electronAPI.security.getStatus();
    });

    expect(securityResult.success).toBe(true);
    expect(securityResult.data).toHaveProperty('overall');
    expect(['secure', 'warning', 'critical']).toContain(securityResult.data.overall);
  });

  test('检查证书状态', async () => {
    const certResult = await page.evaluate(async () => {
      return await window.electronAPI.security.getCertificateStatus();
    });

    expect(certResult.success).toBe(true);
    expect(typeof certResult.data).toBe('boolean');
  });
});

test.describe('操作日志', () => {
  test('登录操作应该被记录', async () => {
    // 执行登录操作
    await page.evaluate(async () => {
      return await window.electronAPI.auth.login('test123456');
    });

    // 获取操作日志
    const logsResult = await page.evaluate(async () => {
      return await window.electronAPI.database.getOperationLogs();
    });

    expect(logsResult.success).toBe(true);
    
    // 检查是否有登录日志
    const loginLogs = logsResult.data.filter((log: any) => 
      log.action.includes('login') && log.success === true
    );
    
    expect(loginLogs.length).toBeGreaterThan(0);
  });

  test('密码修改操作应该被记录', async () => {
    // 先登录
    const loginResult = await page.evaluate(async () => {
      return await window.electronAPI.auth.login('test123456');
    });
    
    const sessionId = loginResult.data.sessionId;

    // 修改密码
    await page.evaluate(async ({ sid, oldPwd, newPwd }) => {
      return await window.electronAPI.auth.changePassword(sid, oldPwd, newPwd);
    }, { sid: sessionId, oldPwd: 'test123456', newPwd: 'temppassword' });

    // 恢复密码
    await page.evaluate(async ({ sid, oldPwd, newPwd }) => {
      return await window.electronAPI.auth.changePassword(sid, oldPwd, newPwd);
    }, { sid: sessionId, oldPwd: 'temppassword', newPwd: 'test123456' });

    // 获取操作日志
    const logsResult = await page.evaluate(async () => {
      return await window.electronAPI.database.getOperationLogs();
    });

    // 检查是否有密码修改日志
    const passwordLogs = logsResult.data.filter((log: any) => 
      log.action.includes('password') && log.success === true
    );
    
    expect(passwordLogs.length).toBeGreaterThan(0);
  });
});
