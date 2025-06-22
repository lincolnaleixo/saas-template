import { CoreLogger } from './core';
import { ConsoleTransport } from './transports/console.transport';
import { FileTransport } from './transports/file.transport';
import { PrettyFormatter, JsonFormatter, SimpleFormatter } from './formatters';
import { parseLogLevel, LogLevel, Logger, LogContext } from './types';
import * as path from 'path';

export * from './types';
export { ConsoleTransport } from './transports/console.transport';
export { FileTransport } from './transports/file.transport';

interface CreateLoggerOptions {
  source?: string;
  context?: LogContext;
  level?: LogLevel;
}

class LoggerFactory {
  private defaultLogger: Logger;
  private isProduction = process.env.NODE_ENV === 'production';
  private logLevel = parseLogLevel(process.env.LOG_LEVEL);
  private logDir = process.env.LOG_DIR || './logs';

  constructor() {
    this.defaultLogger = this.createDefaultLogger();
  }

  private createDefaultLogger(): Logger {
    const transports = [];

    // Console transport
    if (this.isProduction) {
      transports.push(new ConsoleTransport(new JsonFormatter()));
    } else {
      const useEmojis = process.env.LOG_EMOJIS !== 'false';
      const useColors = process.env.LOG_COLORS !== 'false';
      transports.push(new ConsoleTransport(new PrettyFormatter(useEmojis, useColors)));
    }

    // File transport (only in production or if explicitly enabled)
    if (this.isProduction || process.env.LOG_TO_FILE === 'true') {
      const formatter = this.isProduction ? new JsonFormatter() : new SimpleFormatter();
      transports.push(new FileTransport({
        formatter,
        filepath: path.join(this.logDir, 'app.log'),
        maxSize: parseInt(process.env.LOG_MAX_SIZE || '') || 10 * 1024 * 1024,
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '') || 5,
        datePattern: true,
      }));
    }

    return new CoreLogger({
      level: this.logLevel,
      transports,
      defaultContext: {
        env: process.env.NODE_ENV,
        pid: process.pid,
      },
      source: 'app',
    });
  }

  create(options: CreateLoggerOptions = {}): Logger {
    const config = {
      level: options.level ?? this.logLevel,
      transports: this.defaultLogger['config'].transports,
      defaultContext: {
        ...this.defaultLogger['config'].defaultContext,
        ...options.context,
      },
      source: options.source || 'app',
    };

    return new CoreLogger(config);
  }

  getDefault(): Logger {
    return this.defaultLogger;
  }
}

const factory = new LoggerFactory();

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