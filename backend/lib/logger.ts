import { env } from '../config/env';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Logger implementation for backend
 * Provides console and file logging with structured output
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type LogContext = Record<string, any>;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
  context?: LogContext;
}

class CoreLogger {
  private level: LogLevel;
  private source?: string;
  private context?: LogContext;
  private fileStream?: NodeJS.WritableStream;

  constructor(options?: { source?: string; context?: LogContext; level?: LogLevel }) {
    this.level = options?.level || env.LOG_LEVEL;
    this.source = options?.source;
    this.context = options?.context;
    
    // Initialize file logging if enabled
    if (env.LOG_TO_FILE) {
      this.initializeFileLogging();
    }
  }

  private initializeFileLogging() {
    // Create log directory if it doesn't exist
    if (!existsSync(env.LOG_DIR)) {
      mkdirSync(env.LOG_DIR, { recursive: true });
    }

    // Create log file with current date
    const date = new Date().toISOString().split('T')[0];
    const logPath = join(env.LOG_DIR, `app-${date}.log`);
    
    this.fileStream = createWriteStream(logPath, { flags: 'a' });
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] <= levels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      source: this.source,
      context: { ...this.context, ...context },
    };
  }

  private writeToConsole(entry: LogEntry) {
    const { timestamp, level, message, source, context } = entry;
    
    // Color codes for terminal
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[90m', // Gray
    };
    
    // Emojis for log levels
    const emojis = env.LOG_EMOJIS ? {
      error: '🚨',
      warn: '⚠️ ',
      info: 'ℹ️ ',
      debug: '🐛',
    } : {
      error: '',
      warn: '',
      info: '',
      debug: '',
    };
    
    const reset = '\x1b[0m';
    const color = env.LOG_COLORS ? colors[level] : '';
    const emoji = emojis[level];
    
    // Format the console output
    let output = `${color}${timestamp} ${emoji} [${level.toUpperCase()}]`;
    if (source) {
      output += ` [${source}]`;
    }
    output += ` ${message}${reset}`;
    
    // Log to appropriate console method
    const consoleMethods = {
      error: console.error,
      warn: console.warn,
      info: console.log,
      debug: console.log,
    };
    
    consoleMethods[level](output);
    
    // Log context if present
    if (context && Object.keys(context).length > 0) {
      console.log(`${color}  Context:${reset}`, context);
    }
  }

  private writeToFile(entry: LogEntry) {
    if (!this.fileStream || !env.LOG_TO_FILE) return;
    
    // Format as JSON for file storage
    const logLine = JSON.stringify(entry) + '\n';
    this.fileStream.write(logLine);
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;
    
    const entry = this.formatMessage(level, message, context);
    
    // Write to console
    this.writeToConsole(entry);
    
    // Write to file
    this.writeToFile(entry);
  }

  error(message: string, error?: Error | LogContext) {
    const context = error instanceof Error 
      ? { error: error.message, stack: error.stack }
      : error;
    
    this.log('error', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  child(context: LogContext): CoreLogger {
    return new CoreLogger({
      source: this.source,
      context: { ...this.context, ...context },
      level: this.level,
    });
  }
}

// Create default logger instance
export const logger = new CoreLogger();

// Factory function to create new logger instances
export function createLogger(options?: { source?: string; context?: LogContext; level?: LogLevel }): CoreLogger {
  return new CoreLogger(options);
}