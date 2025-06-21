import { Logger, LoggerConfig, LogLevel, LogContext, LogEntry } from './types';

/**
 * Core logger implementation that handles log level filtering,
 * context management, and transport coordination
 */
export class CoreLogger implements Logger {
  private config: LoggerConfig;
  private context: LogContext;

  /**
   * Create a new CoreLogger instance
   * @param config - Logger configuration including level and transports
   * @param context - Initial context to merge with default context
   */
  constructor(config: LoggerConfig, context: LogContext = {}) {
    this.config = config;
    this.context = { ...config.defaultContext, ...context };
  }

  /**
   * Check if a log level should be processed based on current configuration
   * @param level - Log level to check
   * @returns True if the level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  /**
   * Send a log entry to all configured transports
   * Handles both sync and async transports with error recovery
   * @param entry - The log entry to send to transports
   */
  private async logToTransports(entry: LogEntry): Promise<void> {
    const promises = this.config.transports.map(transport => {
      try {
        const result = transport.log(entry);
        return result instanceof Promise ? result : Promise.resolve();
      } catch (error) {
        // Don't let transport errors break the logging system
        console.error('Logger transport error:', error);
        return Promise.resolve();
      }
    });
    
    await Promise.all(promises);
  }

  /**
   * Create a complete log entry with merged context
   * @param level - Log level for the entry
   * @param message - Human-readable message
   * @param context - Additional context data
   * @param error - Optional error object
   * @returns Complete log entry ready for transport
   */
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

  /**
   * Log an error message with optional context or Error object
   * Automatically detects if context is an Error instance
   */
  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const error = context instanceof Error ? context : undefined;
      const ctx = context instanceof Error ? {} : context;
      const entry = this.createLogEntry(LogLevel.ERROR, message, ctx, error);
      this.logToTransports(entry).catch(console.error);
    }
  }

  /**
   * Log a warning message with optional context
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.createLogEntry(LogLevel.WARN, message, context);
      this.logToTransports(entry).catch(console.error);
    }
  }

  /**
   * Log an informational message with optional context
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.createLogEntry(LogLevel.INFO, message, context);
      this.logToTransports(entry).catch(console.error);
    }
  }

  /**
   * Log a debug message with optional context
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
      this.logToTransports(entry).catch(console.error);
    }
  }

  /**
   * Create a child logger with additional context
   * All logs from the child logger will include both parent and child context
   * @param context - Additional context to merge with existing context
   * @returns New logger instance with merged context
   */
  child(context: LogContext): Logger {
    return new CoreLogger(this.config, { ...this.context, ...context });
  }
}