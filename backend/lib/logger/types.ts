/**
 * Log levels in order of severity
 * Lower values indicate higher severity
 */
export enum LogLevel {
  /** Critical errors that require immediate attention */
  ERROR = 0,
  /** Warning messages for concerning but handled situations */
  WARN = 1,
  /** Informational messages for significant application events */
  INFO = 2,
  /** Detailed debugging information */
  DEBUG = 3,
}

/**
 * Additional context data that can be attached to log entries
 * Used for structured logging and better log analysis
 */
export interface LogContext {
  [key: string]: any;
}

/**
 * Complete log entry structure containing all log information
 */
export interface LogEntry {
  /** When the log entry was created */
  timestamp: Date;
  /** Severity level of the log */
  level: LogLevel;
  /** Human-readable log message */
  message: string;
  /** Additional structured data */
  context?: LogContext;
  /** Error object if logging an error */
  error?: Error;
  /** Source/component that generated the log */
  source?: string;
}

/**
 * Interface for log transport implementations
 * Transports handle where/how logs are output (console, file, etc.)
 */
export interface LogTransport {
  /**
   * Output a log entry
   * @param entry - The log entry to output
   */
  log(entry: LogEntry): void | Promise<void>;
}

/**
 * Configuration for logger instances
 */
export interface LoggerConfig {
  /** Minimum log level to process */
  level: LogLevel;
  /** Array of transports to send logs to */
  transports: LogTransport[];
  /** Default context to include in all log entries */
  defaultContext?: LogContext;
  /** Source identifier for this logger */
  source?: string;
}

/**
 * Main logger interface providing logging methods
 */
export interface Logger {
  /**
   * Log an error message
   * @param message - The error message
   * @param context - Additional context or Error object
   */
  error(message: string, context?: LogContext): void;
  
  /**
   * Log a warning message
   * @param message - The warning message
   * @param context - Additional context data
   */
  warn(message: string, context?: LogContext): void;
  
  /**
   * Log an informational message
   * @param message - The info message
   * @param context - Additional context data
   */
  info(message: string, context?: LogContext): void;
  
  /**
   * Log a debug message
   * @param message - The debug message
   * @param context - Additional context data
   */
  debug(message: string, context?: LogContext): void;
  
  /**
   * Create a child logger with additional context
   * @param context - Context to add to all child logger entries
   * @returns A new logger instance with merged context
   */
  child(context: LogContext): Logger;
}

/** String representation of log levels */
export type LogLevelString = 'error' | 'warn' | 'info' | 'debug';

/**
 * Parse a string log level into LogLevel enum
 * @param level - String representation of log level
 * @returns Corresponding LogLevel enum value, defaults to INFO for invalid input
 */
export function parseLogLevel(level: string | undefined): LogLevel {
  switch (level?.toLowerCase()) {
    case 'error':
      return LogLevel.ERROR;
    case 'warn':
      return LogLevel.WARN;
    case 'info':
      return LogLevel.INFO;
    case 'debug':
      return LogLevel.DEBUG;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Convert LogLevel enum to string representation
 * @param level - LogLevel enum value
 * @returns String representation of the log level
 */
export function logLevelToString(level: LogLevel): LogLevelString {
  switch (level) {
    case LogLevel.ERROR:
      return 'error';
    case LogLevel.WARN:
      return 'warn';
    case LogLevel.INFO:
      return 'info';
    case LogLevel.DEBUG:
      return 'debug';
  }
}