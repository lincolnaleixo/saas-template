import { CoreLogger } from './core';
import { ConsoleTransport } from './transports/console.transport';
import { LocalStorageTransport } from './transports/localStorage.transport';
import { RemoteTransport } from './transports/remote.transport';
import { BrowserFormatter } from './formatters';
import { parseLogLevel, LogLevel, Logger, LogContext } from './types';

export * from './types';
export { ConsoleTransport } from './transports/console.transport';
export { LocalStorageTransport } from './transports/localStorage.transport';
export { RemoteTransport } from './transports/remote.transport';

interface CreateLoggerOptions {
  source?: string;
  context?: LogContext;
  level?: LogLevel;
}

interface LoggerFactoryConfig {
  enableLocalStorage?: boolean;
  enableRemote?: boolean;
  remoteEndpoint?: string;
  remoteApiKey?: string;
  logLevel?: string;
}

class LoggerFactory {
  private defaultLogger: Logger;
  private config: LoggerFactoryConfig;
  private remoteTransport?: RemoteTransport;

  constructor(config: LoggerFactoryConfig = {}) {
    this.config = config;
    this.defaultLogger = this.createDefaultLogger();
    
    // Ensure logs are sent before page unload
    if (this.remoteTransport) {
      window.addEventListener('beforeunload', () => {
        this.remoteTransport?.destroy();
      });
    }
  }

  private getLogLevel(): LogLevel {
    // Check URL parameter for debugging
    const urlParams = new URLSearchParams(window.location.search);
    const urlLogLevel = urlParams.get('log_level');
    if (urlLogLevel) {
      return parseLogLevel(urlLogLevel);
    }
    
    // Check localStorage for persisted log level
    const storedLevel = localStorage.getItem('log_level');
    if (storedLevel) {
      return parseLogLevel(storedLevel);
    }
    
    // Use config or default
    return parseLogLevel(this.config.logLevel || 'info');
  }

  private createDefaultLogger(): Logger {
    const transports = [];
    const logLevel = this.getLogLevel();

    // Always add console transport
    transports.push(new ConsoleTransport(new BrowserFormatter()));

    // Add localStorage transport if enabled
    if (this.config.enableLocalStorage !== false) {
      transports.push(new LocalStorageTransport({
        key: 'app-logs',
        maxEntries: 100,
      }));
    }

    // Add remote transport if configured
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.remoteTransport = new RemoteTransport({
        endpoint: this.config.remoteEndpoint,
        apiKey: this.config.remoteApiKey,
        minLevel: LogLevel.WARN, // Only send warnings and errors to remote
        batchSize: 10,
        flushInterval: 5000,
      });
      transports.push(this.remoteTransport);
    }

    return new CoreLogger({
      level: logLevel,
      transports,
      defaultContext: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
      source: 'frontend',
    });
  }

  create(options: CreateLoggerOptions = {}): Logger {
    const config = {
      level: options.level ?? this.getLogLevel(),
      transports: this.defaultLogger['config'].transports,
      defaultContext: {
        ...this.defaultLogger['config'].defaultContext,
        ...options.context,
      },
      source: options.source || 'frontend',
    };

    return new CoreLogger(config);
  }

  getDefault(): Logger {
    return this.defaultLogger;
  }

  setLogLevel(level: LogLevel | string): void {
    const parsedLevel = typeof level === 'string' ? parseLogLevel(level) : level;
    localStorage.setItem('log_level', logLevelToString(parsedLevel));
    
    // Update existing logger
    this.defaultLogger['config'].level = parsedLevel;
  }
}

// Initialize with default config
// In production, you might want to configure this differently
const factory = new LoggerFactory({
  enableLocalStorage: true,
  enableRemote: false, // Enable and configure in production
  // remoteEndpoint: '/api/logs',
  // remoteApiKey: 'your-api-key',
  logLevel: 'info',
});

// Default logger instance
export const logger = factory.getDefault();

// Factory function for creating child loggers
export function createLogger(options: CreateLoggerOptions = {}): Logger {
  return factory.create(options);
}

// Convenience functions for quick logging
export const error = (message: string, context?: LogContext) => logger.error(message, context);
export const warn = (message: string, context?: LogContext) => logger.warn(message, context);
export const info = (message: string, context?: LogContext) => logger.info(message, context);
export const debug = (message: string, context?: LogContext) => logger.debug(message, context);

// Export the factory for advanced configuration
export { factory as loggerFactory };

// Helper function to get stored logs from localStorage
export function getStoredLogs(): any[] {
  const transport = new LocalStorageTransport();
  return transport.getStoredLogs();
}

// Helper function to clear stored logs
export function clearStoredLogs(): void {
  const transport = new LocalStorageTransport();
  transport.clear();
}

// Import helper for logLevelToString
import { logLevelToString } from './types';