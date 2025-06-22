/**
 * Frontend Logger
 * Browser-optimized logging with localStorage persistence
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source?: string;
  message: string;
  context?: any;
}

interface LoggerOptions {
  source?: string;
  context?: Record<string, any>;
  level?: LogLevel;
}

class Logger {
  private source?: string;
  private context: Record<string, any>;
  private minLevel: number;
  
  private static levels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };
  
  private static colors: Record<LogLevel, string> = {
    error: '#ef4444',
    warn: '#f59e0b',
    info: '#3b82f6',
    debug: '#6b7280',
  };
  
  private static emojis: Record<LogLevel, string> = {
    error: '🚨',
    warn: '⚠️',
    info: 'ℹ️',
    debug: '🐛',
  };
  
  constructor(options: LoggerOptions = {}) {
    this.source = options.source;
    this.context = options.context || {};
    this.minLevel = Logger.levels[options.level || this.getStoredLogLevel() || 'info'];
  }
  
  error(message: string, context?: any): void {
    this.log('error', message, context);
  }
  
  warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }
  
  info(message: string, context?: any): void {
    this.log('info', message, context);
  }
  
  debug(message: string, context?: any): void {
    this.log('debug', message, context);
  }
  
  child(context: Record<string, any>): Logger {
    return new Logger({
      source: this.source,
      context: { ...this.context, ...context },
      level: Object.keys(Logger.levels)[this.minLevel] as LogLevel,
    });
  }
  
  private log(level: LogLevel, message: string, context?: any): void {
    if (Logger.levels[level] > this.minLevel) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      source: this.source,
      message,
      context: { ...this.context, ...context },
    };
    
    // Console output with styling
    this.consoleOutput(logEntry);
    
    // Store in localStorage
    this.storeLog(logEntry);
  }
  
  private consoleOutput(entry: LogEntry): void {
    const { timestamp, level, source, message, context } = entry;
    const emoji = Logger.emojis[level];
    const color = Logger.colors[level];
    
    const prefix = `%c${emoji} [${timestamp}]${source ? ` [${source}]` : ''} ${level.toUpperCase()}:`;
    const style = `color: ${color}; font-weight: bold;`;
    
    if (context && Object.keys(context).length > 0) {
      console.groupCollapsed(prefix + ' ' + message, style);
      console.log('Context:', context);
      console.groupEnd();
    } else {
      console.log(prefix + ' ' + message, style);
    }
    
    // Log stack trace for errors
    if (level === 'error' && context instanceof Error) {
      console.error(context);
    }
  }
  
  private storeLog(entry: LogEntry): void {
    try {
      const logs = this.getStoredLogs();
      logs.push(entry);
      
      // Keep only last 1000 entries
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }
      
      localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (e) {
      // Ignore localStorage errors (quota exceeded, etc.)
    }
  }
  
  private getStoredLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem('app_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  private getStoredLogLevel(): LogLevel | null {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const urlLevel = urlParams.get('log_level') as LogLevel;
    if (urlLevel && urlLevel in Logger.levels) {
      return urlLevel;
    }
    
    // Check localStorage
    try {
      const stored = localStorage.getItem('log_level');
      return stored as LogLevel || null;
    } catch {
      return null;
    }
  }
}

/**
 * Logger Factory
 */
export class LoggerFactory {
  private defaultLogger: Logger;
  
  constructor() {
    this.defaultLogger = new Logger();
  }
  
  create(options?: LoggerOptions): Logger {
    return new Logger(options);
  }
  
  setLogLevel(level: LogLevel): void {
    try {
      localStorage.setItem('log_level', level);
    } catch {
      // Ignore localStorage errors
    }
  }
  
  getDefaultLogger(): Logger {
    return this.defaultLogger;
  }
}

// Create factory instance
const factory = new LoggerFactory();

// Export convenience functions
export const logger = factory.getDefaultLogger();
export const createLogger = (options?: LoggerOptions) => factory.create(options);

/**
 * Get stored logs from localStorage
 */
export function getStoredLogs(): LogEntry[] {
  try {
    const stored = localStorage.getItem('app_logs');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Clear stored logs
 */
export function clearStoredLogs(): void {
  try {
    localStorage.removeItem('app_logs');
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Export logs as JSON
 */
export function exportLogs(): string {
  return JSON.stringify(getStoredLogs(), null, 2);
}

/**
 * Download logs as a file
 */
export function downloadLogs(): void {
  const logs = exportLogs();
  const blob = new Blob([logs], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `logs-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}