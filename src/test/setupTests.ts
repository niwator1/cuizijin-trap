import '@testing-library/jest-dom';

// Mock Electron API
const mockElectronAPI = {
  invoke: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: jest.fn(() => true),
  writable: true,
});

// Mock window.alert
Object.defineProperty(window, 'alert', {
  value: jest.fn(),
  writable: true,
});

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
        args[0].includes('componentWillUpdate'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockElectronAPI.invoke.mockResolvedValue({ success: true, data: {} });
});

// Global test utilities
global.testUtils = {
  mockElectronAPI,
  createMockResponse: (success: boolean, data?: any, error?: string) => ({
    success,
    data,
    error,
  }),
};

// Extend global types for TypeScript
declare global {
  var testUtils: {
    mockElectronAPI: typeof mockElectronAPI;
    createMockResponse: (success: boolean, data?: any, error?: string) => any;
  };
}
