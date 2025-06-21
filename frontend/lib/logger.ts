// Frontend logger implementation
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  source?: string;
}

class Logger {
  private source?: string;
  private context?: Record<string, any>;
  
  constructor(options?: { source?: string; context?: Record<string, any> }) {
    this.source = options?.source;
    this.context = options?.context;
  }
  
  private log(level: LogLevel, message: string, context?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
      source: this.source,
    };
    
    // Console output with styling
    const styles = {
      error: 'color: #ff4444; font-weight: bold',
      warn: 'color: #ff8800; font-weight: bold',
      info: 'color: #0088ff',
      debug: 'color: #888888',
    };
    
    const prefix = this.source ? `[${this.source}]` : '';
    console.log(
      `%c${level.toUpperCase()}${prefix} ${message}`,
      styles[level],
      context || ''
    );
    
    // Store in localStorage for debugging
    this.storeLog(entry);
  }
  
  private storeLog(entry: LogEntry) {
    try {
      const logs = this.getStoredLogs();
      logs.push(entry);
      
      // Keep only last 100 entries
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (error) {
      // Ignore storage errors
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
  
  error(message: string, context?: any) {
    this.log('error', message, context);
  }
  
  warn(message: string, context?: any) {
    this.log('warn', message, context);
  }
  
  info(message: string, context?: any) {
    this.log('info', message, context);
  }
  
  debug(message: string, context?: any) {
    const urlParams = new URLSearchParams(window.location.search);
    const debugEnabled = urlParams.get('log_level') === 'debug' || 
                        localStorage.getItem('log_level') === 'debug';
    
    if (debugEnabled) {
      this.log('debug', message, context);
    }
  }
  
  child(context: Record<string, any>): Logger {
    return new Logger({
      source: this.source,
      context: { ...this.context, ...context },
    });
  }
}

export function createLogger(options?: { source?: string; context?: Record<string, any> }): Logger {
  return new Logger(options);
}

export const logger = createLogger();

// Helper functions
export function getStoredLogs(): LogEntry[] {
  try {
    const stored = localStorage.getItem('app_logs');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearStoredLogs(): void {
  localStorage.removeItem('app_logs');
}