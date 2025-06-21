import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { 
  createLogger, 
  LogLevel, 
  ConsoleTransport,
  LocalStorageTransport,
  getStoredLogs,
  clearStoredLogs
} from '@/frontend/lib/logger';
import { BrowserFormatter } from '@/frontend/lib/logger/formatters';

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

describe('Frontend Logger Tests', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;
  let consoleDebugSpy: any;

  beforeEach(() => {
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = spyOn(console, 'debug').mockImplementation(() => {});
    localStorageMock.clear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('BrowserFormatter', () => {
    test('should format with styles', () => {
      const formatter = new BrowserFormatter();
      const entry = {
        timestamp: new Date('2024-01-01T12:00:00Z'),
        level: LogLevel.INFO,
        message: 'Test message',
        source: 'test',
      };

      const formatted = formatter.format(entry);
      const styles = formatter.getStyles(LogLevel.INFO);

      expect(formatted).toContain('%c');
      expect(formatted).toContain('Test message');
      expect(styles[0]).toContain('color: #2196f3');
    });
  });

  describe('ConsoleTransport', () => {
    test('should log to appropriate console method', () => {
      const transport = new ConsoleTransport(new BrowserFormatter());
      
      transport.log({
        timestamp: new Date(),
        level: LogLevel.ERROR,
        message: 'Error message',
      });

      transport.log({
        timestamp: new Date(),
        level: LogLevel.WARN,
        message: 'Warning message',
      });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    test('should include context and error in output', () => {
      const transport = new ConsoleTransport(new BrowserFormatter());
      const error = new Error('Test error');
      
      transport.log({
        timestamp: new Date(),
        level: LogLevel.ERROR,
        message: 'Error with context',
        context: { userId: 123 },
        error,
      });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const args = consoleErrorSpy.mock.calls[0];
      expect(args).toContain(error);
      expect(args.some((arg: any) => arg?.userId === 123)).toBe(true);
    });
  });

  describe('LocalStorageTransport', () => {
    test('should store logs in localStorage', () => {
      const transport = new LocalStorageTransport({ maxEntries: 5 });
      
      transport.log({
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: 'Test message',
      });

      const stored = localStorage.getItem('app-logs');
      expect(stored).toBeTruthy();
      
      const logs = JSON.parse(stored!);
      expect(logs).toHaveLength(1);
      expect(JSON.parse(logs[0]).message).toBe('Test message');
    });

    test('should respect maxEntries limit', () => {
      const transport = new LocalStorageTransport({ maxEntries: 3 });
      
      for (let i = 0; i < 5; i++) {
        transport.log({
          timestamp: new Date(),
          level: LogLevel.INFO,
          message: `Message ${i}`,
        });
      }

      const stored = localStorage.getItem('app-logs');
      const logs = JSON.parse(stored!);
      expect(logs).toHaveLength(3);
      
      // Should keep the most recent logs
      expect(JSON.parse(logs[0]).message).toBe('Message 2');
      expect(JSON.parse(logs[2]).message).toBe('Message 4');
    });

    test('should handle localStorage errors gracefully', () => {
      const transport = new LocalStorageTransport();
      
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => { throw new Error('Storage full'); };
      
      // Should not throw
      expect(() => {
        transport.log({
          timestamp: new Date(),
          level: LogLevel.ERROR,
          message: 'Test',
        });
      }).not.toThrow();
      
      localStorage.setItem = originalSetItem;
    });

    test('getStoredLogs should return parsed logs', () => {
      const transport = new LocalStorageTransport();
      
      transport.log({
        timestamp: new Date('2024-01-01T12:00:00Z'),
        level: LogLevel.INFO,
        message: 'Test message',
      });

      const logs = transport.getStoredLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].level).toBe('info');
    });

    test('clear should remove all logs', () => {
      const transport = new LocalStorageTransport();
      
      transport.log({
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: 'Test',
      });

      expect(localStorage.getItem('app-logs')).toBeTruthy();
      
      transport.clear();
      expect(localStorage.getItem('app-logs')).toBeNull();
    });
  });

  describe('Logger Integration', () => {
    test('createLogger should create functional logger', () => {
      const logger = createLogger({
        source: 'test-component',
        context: { component: 'TestComponent' },
      });

      logger.info('Test message');
      
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      
      // Check localStorage
      const stored = localStorage.getItem('app-logs');
      const logs = JSON.parse(stored!);
      expect(logs).toHaveLength(1);
    });

    test('getStoredLogs helper should work', () => {
      const logger = createLogger();
      logger.error('Error message');
      logger.info('Info message');
      
      const logs = getStoredLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe('error');
      expect(logs[1].level).toBe('info');
    });

    test('clearStoredLogs helper should work', () => {
      const logger = createLogger();
      logger.info('Test');
      
      expect(getStoredLogs()).toHaveLength(1);
      
      clearStoredLogs();
      expect(getStoredLogs()).toHaveLength(0);
    });
  });
});