import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  AppState, 
  BlockedSite, 
  CreateBlockedSiteDto, 
  UpdateBlockedSiteDto,
  ProxyStatus,
  InterceptionStats,
  SystemInfo,
  AppConfig,
  User,
  ApiResponse
} from '@shared/types';
import { DEFAULT_APP_CONFIG, STORAGE_KEYS } from '@shared/constants';

interface AppStore extends AppState {
  // 会话状态
  sessionId: string | null;
  sessionExpiresAt: Date | null;
  sessionRefreshTimer: NodeJS.Timeout | null;

  // 认证操作
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshSession: () => Promise<void>;
  startSessionRefreshTimer: () => void;
  stopSessionRefreshTimer: () => void;
  handleSessionExpiry: () => Promise<void>;
  getSessionTimeRemaining: () => number;

  // 网站管理操作
  loadBlockedSites: () => Promise<void>;
  addSite: (url: string, options?: { title?: string; category?: string; description?: string }) => Promise<void>;
  toggleSite: (id: string) => Promise<void>;
  deleteSite: (id: string) => Promise<void>;
  resetAllSites: () => Promise<void>;
  initializeDefaultSites: () => Promise<void>;

  // 代理操作
  startProxy: () => Promise<void>;
  stopProxy: () => Promise<void>;
  refreshProxyStatus: () => Promise<void>;

  // 系统信息
  loadSystemInfo: () => Promise<void>;
  installCertificate: () => Promise<void>;

  // 统计信息
  loadStats: () => Promise<void>;

  // 配置管理
  loadConfig: () => Promise<void>;
  updateConfig: (config: Partial<AppConfig>) => Promise<void>;

  // UI状态
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setCurrentPage: (page: string) => void;
  setShowSettings: (show: boolean) => void;
  setLoading: (loading: boolean) => void;

  // 初始化
  initialize: () => Promise<void>;
}

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        isAuthenticated: false,
        user: null,
        sessionId: null,
        sessionExpiresAt: null,
        sessionRefreshTimer: null,
        blockedSites: [],
        isLoading: false,
        proxyStatus: 'stopped',
        proxyConfig: null,
        stats: {
          totalBlocked: 0,
          todayBlocked: 0,
          mostBlockedSite: '',
          lastBlockedAt: undefined,
        },
        systemInfo: null,
        theme: 'system',
        currentPage: '/dashboard',
        showSettings: false,

        // 认证操作
        login: async (password: string) => {
          set({ isLoading: true });
          try {
            const response = await window.electronAPI.invoke('auth:login', password);
            if (response.success && response.data) {
              const loginResult = response.data;
              if (loginResult.success && loginResult.sessionId) {
                set({
                  isAuthenticated: true,
                  sessionId: loginResult.sessionId,
                  sessionExpiresAt: loginResult.expiresAt ? new Date(loginResult.expiresAt) : null,
                  isLoading: false
                });

                // 启动会话刷新定时器
                get().startSessionRefreshTimer();

                // 登录成功后加载数据
                await get().loadBlockedSites();
                await get().loadStats();
                await get().refreshProxyStatus();

                return true;
              } else {
                set({ isLoading: false });
                throw new Error(loginResult.error || '登录失败');
              }
            } else {
              set({ isLoading: false });
              throw new Error(response.error || '登录失败');
            }
          } catch (error) {
            set({ isLoading: false });
            console.error('Login error:', error);
            return false;
          }
        },

        logout: async () => {
          const { sessionId } = get();
          try {
            // 停止会话刷新定时器
            get().stopSessionRefreshTimer();

            if (sessionId) {
              await window.electronAPI.invoke('auth:logout', sessionId);
            }

            set({
              isAuthenticated: false,
              user: null,
              sessionId: null,
              sessionExpiresAt: null,
              blockedSites: [],
              stats: {
                totalBlocked: 0,
                todayBlocked: 0,
                mostBlockedSite: '',
                lastBlockedAt: undefined,
              }
            });
          } catch (error) {
            console.error('Logout error:', error);
          }
        },

        checkAuth: async () => {
          const { sessionId, sessionExpiresAt } = get();

          // 首先检查本地会话是否过期
          if (sessionExpiresAt && sessionExpiresAt.getTime() <= Date.now()) {
            console.log('Local session expired, clearing auth state');
            set({
              isAuthenticated: false,
              sessionId: null,
              sessionExpiresAt: null
            });
            get().stopSessionRefreshTimer();
            return;
          }

          try {
            const response = await window.electronAPI.invoke('auth:check', sessionId);
            if (response.success && response.data && response.data.isAuthenticated) {
              const authStatus = response.data;
              set({
                isAuthenticated: true,
                sessionId: authStatus.sessionId || sessionId,
                sessionExpiresAt: authStatus.expiresAt ? new Date(authStatus.expiresAt) : null
              });

              // 启动会话刷新定时器
              get().startSessionRefreshTimer();

              // 如果已认证，加载必要数据
              await get().loadBlockedSites();
              await get().loadStats();
              await get().refreshProxyStatus();
            } else {
              console.log('Server session invalid, clearing auth state');
              set({
                isAuthenticated: false,
                sessionId: null,
                sessionExpiresAt: null
              });
              get().stopSessionRefreshTimer();
            }
          } catch (error) {
            console.error('Check auth error:', error);
            set({
              isAuthenticated: false,
              sessionId: null,
              sessionExpiresAt: null
            });
            get().stopSessionRefreshTimer();
          }
        },

        // 会话管理
        refreshSession: async () => {
          const { sessionId, sessionExpiresAt } = get();
          if (!sessionId) {
            console.log('No session ID, skipping refresh');
            return;
          }

          // 检查本地会话是否已过期
          if (sessionExpiresAt && sessionExpiresAt.getTime() <= Date.now()) {
            console.log('Local session already expired');
            await get().handleSessionExpiry();
            return;
          }

          try {
            console.log('Refreshing session...');
            const response = await window.electronAPI.invoke('auth:refresh-session', sessionId);

            if (response.success && response.data && response.data.isAuthenticated) {
              const authStatus = response.data;
              const newExpiresAt = authStatus.expiresAt ? new Date(authStatus.expiresAt) : null;

              set({
                sessionExpiresAt: newExpiresAt
              });

              console.log('Session refreshed successfully, expires at:', newExpiresAt);

              // 重新启动定时器以适应新的过期时间
              get().startSessionRefreshTimer();
            } else {
              console.log('Session refresh failed, session invalid');
              await get().handleSessionExpiry();
            }
          } catch (error) {
            console.error('Refresh session error:', error);
            await get().handleSessionExpiry();
          }
        },

        startSessionRefreshTimer: () => {
          const { sessionRefreshTimer, sessionExpiresAt } = get();

          // 清除现有定时器
          if (sessionRefreshTimer) {
            clearInterval(sessionRefreshTimer);
          }

          // 如果没有会话过期时间，不启动定时器
          if (!sessionExpiresAt) {
            return;
          }

          // 计算刷新间隔：在会话过期前5分钟刷新，但最少每5分钟刷新一次
          const now = Date.now();
          const expiresIn = sessionExpiresAt.getTime() - now;
          const refreshInterval = Math.min(
            Math.max(expiresIn - 5 * 60 * 1000, 60 * 1000), // 至少1分钟后刷新
            5 * 60 * 1000 // 最多5分钟刷新一次
          );

          // 如果会话已经过期或即将过期（1分钟内），立即检查
          if (expiresIn <= 60 * 1000) {
            get().refreshSession();
            return;
          }

          const timer = setInterval(() => {
            const { sessionExpiresAt: currentExpiresAt } = get();
            if (!currentExpiresAt) {
              get().stopSessionRefreshTimer();
              return;
            }

            const timeToExpiry = currentExpiresAt.getTime() - Date.now();

            // 如果会话即将在5分钟内过期，刷新会话
            if (timeToExpiry <= 5 * 60 * 1000) {
              get().refreshSession();
            }
          }, refreshInterval);

          set({ sessionRefreshTimer: timer });
        },

        stopSessionRefreshTimer: () => {
          const { sessionRefreshTimer } = get();
          if (sessionRefreshTimer) {
            clearInterval(sessionRefreshTimer);
            set({ sessionRefreshTimer: null });
          }
        },

        handleSessionExpiry: async () => {
          console.log('Session expired, logging out user');

          // 显示会话过期通知
          if (window.electronAPI) {
            try {
              // 可以通过IPC发送通知到主进程显示系统通知
              await window.electronAPI.invoke('notification:show', {
                title: '会话已过期',
                body: '您的登录会话已过期，请重新登录',
                type: 'warning'
              });
            } catch (error) {
              console.error('Failed to show session expiry notification:', error);
            }
          }

          // 执行登出
          await get().logout();
        },

        getSessionTimeRemaining: () => {
          const { sessionExpiresAt } = get();
          if (!sessionExpiresAt) {
            return 0;
          }

          const remaining = Math.max(0, sessionExpiresAt.getTime() - Date.now());
          return Math.floor(remaining / 1000); // 返回秒数
        },

        // 网站管理操作
        loadBlockedSites: async () => {
          try {
            const response: ApiResponse<BlockedSite[]> = await window.electronAPI.invoke('sites:get-all');
            if (response.success && response.data) {
              set({ blockedSites: response.data });
            }
          } catch (error) {
            console.error('Load blocked sites error:', error);
          }
        },

        addSite: async (url: string, options?: { title?: string; category?: string; description?: string }) => {
          set({ isLoading: true });
          try {
            const siteData: CreateBlockedSiteDto & { title?: string; category?: string; description?: string } = {
              url,
              domain: new URL(url).hostname,
              enabled: true,
              title: options?.title,
              category: options?.category || 'general',
              description: options?.description,
            };

            const response: ApiResponse<BlockedSite> = await window.electronAPI.invoke('sites:add', siteData);
            if (response.success && response.data) {
              const currentSites = get().blockedSites;
              set({
                blockedSites: [...currentSites, response.data],
                isLoading: false
              });
            } else {
              set({ isLoading: false });
              throw new Error(response.error || '添加网站失败');
            }
          } catch (error) {
            set({ isLoading: false });
            console.error('Add site error:', error);
            throw error;
          }
        },

        toggleSite: async (id: string) => {
          try {
            const currentSites = get().blockedSites;
            const site = currentSites.find(s => s.id === id);
            if (!site) return;

            const updates: UpdateBlockedSiteDto = {
              enabled: !site.enabled,
            };

            const response: ApiResponse<BlockedSite> = await window.electronAPI.invoke('sites:update', id, updates);
            if (response.success && response.data) {
              const updatedSites = currentSites.map(s => 
                s.id === id ? response.data! : s
              );
              set({ blockedSites: updatedSites });
            }
          } catch (error) {
            console.error('Toggle site error:', error);
          }
        },

        deleteSite: async (id: string) => {
          try {
            const response: ApiResponse = await window.electronAPI.invoke('sites:delete', id);
            if (response.success) {
              const currentSites = get().blockedSites;
              const updatedSites = currentSites.filter(s => s.id !== id);
              set({ blockedSites: updatedSites });
            }
          } catch (error) {
            console.error('Delete site error:', error);
          }
        },

        resetAllSites: async () => {
          set({ isLoading: true });
          try {
            const response: ApiResponse = await window.electronAPI.invoke('sites:reset-all');
            if (response.success) {
              set({
                blockedSites: [],
                isLoading: false
              });
            } else {
              set({ isLoading: false });
              throw new Error(response.error || '重置失败');
            }
          } catch (error) {
            set({ isLoading: false });
            console.error('Reset all sites error:', error);
            throw error;
          }
        },

        initializeDefaultSites: async () => {
          set({ isLoading: true });
          try {
            const response: ApiResponse = await window.electronAPI.invoke('sites:init-defaults');
            if (response.success) {
              // 重新加载网站列表
              await get().loadBlockedSites();
            } else {
              set({ isLoading: false });
              throw new Error(response.error || '初始化默认网站失败');
            }
          } catch (error) {
            set({ isLoading: false });
            console.error('Initialize default sites error:', error);
            throw error;
          }
        },

        // 代理操作
        startProxy: async () => {
          set({ proxyStatus: 'starting' });
          try {
            const response: ApiResponse = await window.electronAPI.invoke('proxy:start');
            if (response.success) {
              set({ proxyStatus: 'running' });
            } else {
              set({ proxyStatus: 'error' });
              throw new Error(response.error || '启动代理失败');
            }
          } catch (error) {
            set({ proxyStatus: 'error' });
            console.error('Start proxy error:', error);
            throw error;
          }
        },

        stopProxy: async () => {
          set({ proxyStatus: 'stopping' });
          try {
            const response: ApiResponse = await window.electronAPI.invoke('proxy:stop');
            if (response.success) {
              set({ proxyStatus: 'stopped' });
            } else {
              set({ proxyStatus: 'error' });
              throw new Error(response.error || '停止代理失败');
            }
          } catch (error) {
            set({ proxyStatus: 'error' });
            console.error('Stop proxy error:', error);
            throw error;
          }
        },

        refreshProxyStatus: async () => {
          try {
            const response: ApiResponse<any> = await window.electronAPI.invoke('proxy:status');
            if (response.success && response.data) {
              // 后端返回的是包含status字段的对象，需要提取status字段
              const status = response.data.status || response.data;
              set({ proxyStatus: status });
            }
          } catch (error) {
            console.error('Refresh proxy status error:', error);
          }
        },

        // 系统信息
        loadSystemInfo: async () => {
          try {
            const response: ApiResponse<SystemInfo> = await window.electronAPI.invoke('system:get-info');
            if (response.success && response.data) {
              set({ systemInfo: response.data });
            }
          } catch (error) {
            console.error('Load system info error:', error);
          }
        },

        installCertificate: async () => {
          set({ isLoading: true });
          try {
            const response: ApiResponse = await window.electronAPI.invoke('system:install-certificate');
            if (response.success) {
              // 重新加载系统信息
              await get().loadSystemInfo();
              set({ isLoading: false });
            } else {
              set({ isLoading: false });
              throw new Error(response.error || '证书安装失败');
            }
          } catch (error) {
            set({ isLoading: false });
            console.error('Install certificate error:', error);
            throw error;
          }
        },

        // 统计信息
        loadStats: async () => {
          try {
            const response: ApiResponse<any> = await window.electronAPI.invoke('stats:get-dashboard');
            if (response.success && response.data) {
              set({
                stats: {
                  totalBlocked: response.data.totalBlocked || 0,
                  todayBlocked: response.data.blockedToday || 0,
                  mostBlockedSite: response.data.mostBlockedSite || '',
                  lastBlockedAt: response.data.lastUpdate ? new Date(response.data.lastUpdate) : undefined,
                }
              });
            }
          } catch (error) {
            console.error('Load stats error:', error);
          }
        },

        // 配置管理
        loadConfig: async () => {
          try {
            const response: ApiResponse<AppConfig> = await window.electronAPI.invoke('config:get');
            if (response.success && response.data) {
              set({ theme: response.data.theme });
            }
          } catch (error) {
            console.error('Load config error:', error);
          }
        },

        updateConfig: async (config: Partial<AppConfig>) => {
          try {
            const response: ApiResponse<AppConfig> = await window.electronAPI.invoke('config:update', config);
            if (response.success && response.data) {
              if (config.theme) {
                set({ theme: config.theme });
              }
            }
          } catch (error) {
            console.error('Update config error:', error);
          }
        },

        // UI状态
        setTheme: (theme) => {
          set({ theme });
          get().updateConfig({ theme });
        },

        setCurrentPage: (page) => set({ currentPage: page }),
        setShowSettings: (show) => set({ showSettings: show }),
        setLoading: (loading) => set({ isLoading: loading }),

        // 初始化
        initialize: async () => {
          try {
            await get().loadSystemInfo();
            await get().loadConfig();
          } catch (error) {
            console.error('Initialize error:', error);
          }
        },
      }),
      {
        name: STORAGE_KEYS.USER_PREFERENCES,
        partialize: (state) => ({
          theme: state.theme,
          currentPage: state.currentPage,
          sessionId: state.sessionId,
          sessionExpiresAt: state.sessionExpiresAt,
        }),
        // 自定义序列化和反序列化以处理Date对象
        serialize: (state) => {
          const serialized = {
            ...state,
            sessionExpiresAt: (state as any).sessionExpiresAt?.toISOString() || null,
          };
          return JSON.stringify(serialized);
        },
        deserialize: (str) => {
          const parsed = JSON.parse(str);
          return {
            ...parsed,
            sessionExpiresAt: parsed.sessionExpiresAt ? new Date(parsed.sessionExpiresAt) : null,
          };
        },
      }
    ),
    {
      name: 'app-store',
    }
  )
);
