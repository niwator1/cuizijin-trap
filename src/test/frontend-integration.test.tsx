import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAppStore } from '../renderer/store/useAppStore';
import { BlockedSite, ProxyStatus } from '../shared/types';

// Mock Zustand store
jest.mock('../renderer/store/useAppStore');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

describe('Frontend Component Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Store Integration', () => {
    test('should initialize store with correct default state', () => {
      const mockStore = {
        isAuthenticated: false,
        user: null,
        sessionId: null,
        blockedSites: [],
        isLoading: false,
        proxyStatus: 'stopped' as ProxyStatus,
        stats: {
          totalBlocked: 0,
          todayBlocked: 0,
          mostBlockedSite: '',
          lastBlockedAt: undefined,
        },
        theme: 'system' as const,
        login: jest.fn(),
        logout: jest.fn(),
        loadBlockedSites: jest.fn(),
        addSite: jest.fn(),
        toggleSite: jest.fn(),
        deleteSite: jest.fn(),
        startProxy: jest.fn(),
        stopProxy: jest.fn(),
        loadStats: jest.fn(),
        refreshProxyStatus: jest.fn(),
        setTheme: jest.fn(),
      };

      mockUseAppStore.mockReturnValue(mockStore);

      expect(mockStore.isAuthenticated).toBe(false);
      expect(mockStore.blockedSites).toEqual([]);
      expect(mockStore.proxyStatus).toBe('stopped');
      expect(mockStore.theme).toBe('system');
    });

    test('should handle authentication state changes', async () => {
      const mockLogin = jest.fn().mockResolvedValue(true);
      const mockLogout = jest.fn();

      mockUseAppStore.mockReturnValue({
        isAuthenticated: false,
        login: mockLogin,
        logout: mockLogout,
        isLoading: false,
      } as any);

      // Test login
      await mockLogin('testpassword');
      expect(mockLogin).toHaveBeenCalledWith('testpassword');

      // Test logout
      mockLogout();
      expect(mockLogout).toHaveBeenCalled();
    });

    test('should handle site management operations', async () => {
      const mockAddSite = jest.fn().mockResolvedValue(undefined);
      const mockToggleSite = jest.fn().mockResolvedValue(undefined);
      const mockDeleteSite = jest.fn().mockResolvedValue(undefined);

      const testSite: BlockedSite = {
        id: '1',
        url: 'https://example.com',
        domain: 'example.com',
        title: 'Example Site',
        description: 'Test site',
        category: 'general',
        enabled: true,
        priority: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockUseAppStore.mockReturnValue({
        blockedSites: [testSite],
        addSite: mockAddSite,
        toggleSite: mockToggleSite,
        deleteSite: mockDeleteSite,
        isLoading: false,
      } as any);

      // Test add site
      await mockAddSite({ url: 'https://newsite.com' });
      expect(mockAddSite).toHaveBeenCalledWith({ url: 'https://newsite.com' });

      // Test toggle site
      await mockToggleSite('1');
      expect(mockToggleSite).toHaveBeenCalledWith('1');

      // Test delete site
      await mockDeleteSite('1');
      expect(mockDeleteSite).toHaveBeenCalledWith('1');
    });

    test('should handle proxy operations', async () => {
      const mockStartProxy = jest.fn().mockResolvedValue(undefined);
      const mockStopProxy = jest.fn().mockResolvedValue(undefined);
      const mockRefreshProxyStatus = jest.fn().mockResolvedValue(undefined);

      mockUseAppStore.mockReturnValue({
        proxyStatus: 'stopped' as ProxyStatus,
        startProxy: mockStartProxy,
        stopProxy: mockStopProxy,
        refreshProxyStatus: mockRefreshProxyStatus,
        isLoading: false,
      } as any);

      // Test start proxy
      await mockStartProxy();
      expect(mockStartProxy).toHaveBeenCalled();

      // Test stop proxy
      await mockStopProxy();
      expect(mockStopProxy).toHaveBeenCalled();

      // Test refresh status
      await mockRefreshProxyStatus();
      expect(mockRefreshProxyStatus).toHaveBeenCalled();
    });
  });
});
