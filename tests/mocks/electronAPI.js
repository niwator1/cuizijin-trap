/**
 * Mock Electron API for testing in browser environment
 */

// Mock data
const mockData = {
  isInitialized: false,
  isAuthenticated: false,
  config: {
    theme: 'system',
    language: 'zh-CN',
    sessionTimeout: 3600,
    autoStart: false,
    minimizeToTray: true,
    showNotifications: true,
    proxySettings: {
      httpPort: 8080,
      httpsPort: 8443,
      bindAddress: '127.0.0.1',
      enableLogging: false,
    },
    securitySettings: {
      enableProcessProtection: true,
      enableAntiBypass: true,
      enableConfigEncryption: true,
    },
  },
  systemInfo: {
    appVersion: '1.0.0',
    electronVersion: '22.0.0',
    nodeVersion: '18.14.2',
    chromeVersion: '108.0.0.0',
    platform: 'darwin',
    arch: 'x64'
  },
  websites: [],
  stats: {
    totalBlocked: 0,
    todayBlocked: 0,
    totalRequests: 0,
    blockedCategories: {}
  }
};

// Mock API responses
const createResponse = (data, success = true) => ({
  success,
  data,
  error: success ? null : 'Mock error'
});

// Mock Electron API
const mockElectronAPI = {
  // Authentication APIs
  auth: {
    isInitialized: () => Promise.resolve(createResponse(mockData.isInitialized)),
    initialize: (password, config) => {
      mockData.isInitialized = true;
      mockData.config = { ...mockData.config, ...config };
      return Promise.resolve(createResponse(true));
    },
    login: (password) => {
      mockData.isAuthenticated = password === 'admin';
      return Promise.resolve(createResponse(mockData.isAuthenticated));
    },
    logout: () => {
      mockData.isAuthenticated = false;
      return Promise.resolve(createResponse(true));
    },
    checkAuth: () => Promise.resolve(createResponse(mockData.isAuthenticated)),
    changePassword: (oldPassword, newPassword) => Promise.resolve(createResponse(true))
  },

  // Configuration APIs
  config: {
    get: () => Promise.resolve(createResponse(mockData.config)),
    update: (newConfig) => {
      mockData.config = { ...mockData.config, ...newConfig };
      return Promise.resolve(createResponse(mockData.config));
    },
    reset: () => {
      mockData.config = {
        theme: 'system',
        language: 'zh-CN',
        sessionTimeout: 3600,
        autoStart: false,
        minimizeToTray: true,
        showNotifications: true,
        proxySettings: {
          httpPort: 8080,
          httpsPort: 8443,
          bindAddress: '127.0.0.1',
          enableLogging: false,
        },
        securitySettings: {
          enableProcessProtection: true,
          enableAntiBypass: true,
          enableConfigEncryption: true,
        },
      };
      return Promise.resolve(createResponse(mockData.config));
    },
    export: () => Promise.resolve(createResponse(true)),
    import: () => Promise.resolve(createResponse(true))
  },

  // System APIs
  system: {
    getInfo: () => Promise.resolve(createResponse(mockData.systemInfo)),
    getStats: () => Promise.resolve(createResponse(mockData.stats))
  },

  // Website management APIs
  websites: {
    getAll: () => Promise.resolve(createResponse(mockData.websites)),
    add: (website) => {
      const newWebsite = {
        id: Date.now().toString(),
        ...website,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      mockData.websites.push(newWebsite);
      return Promise.resolve(createResponse(newWebsite));
    },
    update: (id, updates) => {
      const index = mockData.websites.findIndex(w => w.id === id);
      if (index !== -1) {
        mockData.websites[index] = { ...mockData.websites[index], ...updates, updatedAt: new Date().toISOString() };
        return Promise.resolve(createResponse(mockData.websites[index]));
      }
      return Promise.resolve(createResponse(null, false));
    },
    delete: (id) => {
      const index = mockData.websites.findIndex(w => w.id === id);
      if (index !== -1) {
        mockData.websites.splice(index, 1);
        return Promise.resolve(createResponse(true));
      }
      return Promise.resolve(createResponse(false, false));
    },
    import: (data) => Promise.resolve(createResponse(true)),
    export: () => Promise.resolve(createResponse(mockData.websites))
  },

  // Proxy APIs
  proxy: {
    start: () => Promise.resolve(createResponse(true)),
    stop: () => Promise.resolve(createResponse(true)),
    getStatus: () => Promise.resolve(createResponse({ running: false, port: 8080 })),
    installCertificate: () => Promise.resolve(createResponse(true)),
    uninstallCertificate: () => Promise.resolve(createResponse(true)),
    getCertificateStatus: () => Promise.resolve(createResponse(false))
  },

  // Security APIs
  security: {
    getStatus: () => Promise.resolve(createResponse({
      overall: 'secure',
      processProtection: { enabled: true, watchdogActive: true, protectedProcesses: 1, lastHeartbeat: new Date().toISOString() },
      configEncryption: { initialized: true, keyPath: '/mock/path', algorithm: 'aes-256-gcm' },
      antiBypass: { monitoring: true },
      recentEvents: [],
      lastCheck: new Date().toISOString()
    })),
    performScan: () => Promise.resolve(createResponse([])),
    getEvents: (limit = 50) => Promise.resolve(createResponse([])),
    clearEvents: () => Promise.resolve(createResponse(true))
  },

  // Generic invoke method
  invoke: (channel, ...args) => {
    console.log(`Mock invoke: ${channel}`, args);
    return Promise.resolve(createResponse(true));
  },

  // Event listeners
  on: (channel, callback) => {
    console.log(`Mock event listener registered: ${channel}`);
  },

  removeAllListeners: (channel) => {
    console.log(`Mock event listeners removed: ${channel}`);
  }
};

// Install mock in global scope
if (typeof window !== 'undefined') {
  window.electronAPI = mockElectronAPI;
  
  // Also mock module for compatibility
  window.module = window.module || {};
  
  console.log('Mock Electron API installed for testing');
}

export default mockElectronAPI;
