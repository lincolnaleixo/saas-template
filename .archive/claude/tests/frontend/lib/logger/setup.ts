// Setup browser globals for tests
import { mock } from 'bun:test';

// Mock browser APIs
global.navigator = { userAgent: 'TestBrowser/1.0' } as any;
global.window = { 
  location: { href: 'http://test.com', search: '' },
  addEventListener: mock(() => {}),
  setTimeout: global.setTimeout,
} as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
global.localStorage = localStorageMock as any;