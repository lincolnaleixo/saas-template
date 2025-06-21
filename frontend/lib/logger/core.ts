import { Logger, LoggerConfig, LogLevel, LogContext, LogEntry } from './types';

export class CoreLogger implements Logger {
  private config: LoggerConfig;
  private context: LogContext;

  constructor(config: LoggerConfig, context: LogContext = {}) {
    this.config = config;
    this.context = { ...config.defaultContext, ...context };
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private async logToTransports(entry: LogEntry): Promise<void> {
    const promises = this.config.transports.map(transport => {
      try {
        const result = transport.log(entry);
        return result instanceof Promise ? result : Promise.resolve();
      } catch (error) {
        console.error('Logger transport error:', error);
        return Promise.resolve();
      }
    });
    
    await Promise.all(promises);
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date(),
      level,
      message,
      context: { ...this.context, ...context },
      error,
      source: this.config.source,
    };
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const error = context instanceof Error ? context : undefined;
      const ctx = context instanceof Error ? {} : context;
      const entry = this.createLogEntry(LogLevel.ERROR, message, ctx, error);
      this.logToTransports(entry).catch(console.error);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.createLogEntry(LogLevel.WARN, message, context);
      this.logToTransports(entry).catch(console.error);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.createLogEntry(LogLevel.INFO, message, context);
      this.logToTransports(entry).catch(console.error);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
      this.logToTransports(entry).catch(console.error);
    }
  }

  child(context: LogContext): Logger {
    return new CoreLogger(this.config, { ...this.context, ...context });
  }
}