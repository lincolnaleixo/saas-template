import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { 
  createLogger, 
  LogLevel, 
  parseLogLevel, 
  logLevelToString,
  ConsoleTransport,
  FileTransport
} from '@/backend/lib/logger';
import { CoreLogger } from '@/backend/lib/logger/core';
import { SimpleFormatter, PrettyFormatter, JsonFormatter } from '@/backend/lib/logger/formatters';

describe('Logger Tests', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;
  let consoleDebugSpy: any;

  beforeEach(() => {
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('LogLevel', () => {
    test('parseLogLevel should parse string levels correctly', () => {
      expect(parseLogLevel('error')).toBe(LogLevel.ERROR);
      expect(parseLogLevel('warn')).toBe(LogLevel.WARN);
      expect(parseLogLevel('info')).toBe(LogLevel.INFO);
      expect(parseLogLevel('debug')).toBe(LogLevel.DEBUG);
      expect(parseLogLevel('ERROR')).toBe(LogLevel.ERROR);
      expect(parseLogLevel(undefined)).toBe(LogLevel.INFO);
      expect(parseLogLevel('invalid')).toBe(LogLevel.INFO);
    });

    test('logLevelToString should convert levels to strings', () => {
      expect(logLevelToString(LogLevel.ERROR)).toBe('error');
      expect(logLevelToString(LogLevel.WARN)).toBe('warn');
      expect(logLevelToString(LogLevel.INFO)).toBe('info');
      expect(logLevelToString(LogLevel.DEBUG)).toBe('debug');
    });
  });

  describe('CoreLogger', () => {
    test('should log messages at appropriate levels', () => {
      const transport = new ConsoleTransport(new SimpleFormatter());
      const logger = new CoreLogger({
        level: LogLevel.DEBUG,
        transports: [transport],
      });

      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
    });

    test('should respect log level filtering', () => {
      const transport = new ConsoleTransport(new SimpleFormatter());
      const logger = new CoreLogger({
        level: LogLevel.WARN,
        transports: [transport],
      });

      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0);
      expect(consoleDebugSpy).toHaveBeenCalledTimes(0);
    });

    test('should include context in log entries', () => {
      const transport = new ConsoleTransport(new SimpleFormatter());
      const logger = new CoreLogger({
        level: LogLevel.INFO,
        transports: [transport],
        defaultContext: { app: 'test' },
      });

      logger.info('Test message', { userId: 123 });
      
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('Test message');
      expect(logOutput).toContain('"app":"test"');
      expect(logOutput).toContain('"userId":123');
    });

    test('should create child loggers with merged context', () => {
      const transport = new ConsoleTransport(new SimpleFormatter());
      const parentLogger = new CoreLogger({
        level: LogLevel.INFO,
        transports: [transport],
        defaultContext: { app: 'test' },
      });

      const childLogger = parentLogger.child({ module: 'auth' });
      childLogger.info('Child message');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('"app":"test"');
      expect(logOutput).toContain('"module":"auth"');
    });

    test('should handle errors properly', () => {
      const transport = new ConsoleTransport(new SimpleFormatter());
      const logger = new CoreLogger({
        level: LogLevel.ERROR,
        transports: [transport],
      });

      const error = new Error('Test error');
      logger.error('Error occurred', error as any);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain('Error occurred');
      expect(logOutput).toContain('Test error');
    });
  });

  describe('Formatters', () => {
    const mockEntry = {
      timestamp: new Date('2024-01-01T12:00:00Z'),
      level: LogLevel.INFO,
      message: 'Test message',
      context: { userId: 123 },
      source: 'test',
    };

    test('SimpleFormatter should format correctly', () => {
      const formatter = new SimpleFormatter();
      const formatted = formatter.format(mockEntry);
      
      expect(formatted).toContain('2024-01-01T12:00:00.000Z');
      expect(formatted).toContain('INFO');
      expect(formatted).toContain('[test]');
      expect(formatted).toContain('Test message');
      expect(formatted).toContain('{"userId":123}');
    });

    test('JsonFormatter should format as valid JSON', () => {
      const formatter = new JsonFormatter();
      const formatted = formatter.format(mockEntry);
      
      const parsed = JSON.parse(formatted);
      expect(parsed.timestamp).toBe('2024-01-01T12:00:00.000Z');
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test message');
      expect(parsed.source).toBe('test');
      expect(parsed.context).toEqual({ userId: 123 });
    });

    test('PrettyFormatter should include emojis and colors', () => {
      const formatter = new PrettyFormatter(true, true);
      const formatted = formatter.format(mockEntry);
      
      expect(formatted).toContain('💡'); // Info emoji
      expect(formatted).toContain('\x1b[36m'); // Cyan color
      expect(formatted).toContain('Test message');
    });
  });

  describe('createLogger', () => {
    test('should create logger with custom options', () => {
      const logger = createLogger({
        source: 'custom-module',
        context: { version: '1.0.0' },
      });

      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });
  });
});