import { LogEntry, LogLevel, logLevelToString } from './types';

export interface LogFormatter {
  format(entry: LogEntry): string;
}

export class SimpleFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = logLevelToString(entry.level).toUpperCase();
    const source = entry.source ? `[${entry.source}] ` : '';
    const context = Object.keys(entry.context || {}).length > 0 
      ? ` ${JSON.stringify(entry.context)}` 
      : '';
    const error = entry.error 
      ? `\n${entry.error.stack || entry.error.message}` 
      : '';
    
    return `${timestamp} ${level} ${source}${entry.message}${context}${error}`;
  }
}

export class BrowserFormatter implements LogFormatter {
  private readonly levelStyles = {
    [LogLevel.ERROR]: 'color: #ff0000; font-weight: bold;',
    [LogLevel.WARN]: 'color: #ff9800; font-weight: bold;',
    [LogLevel.INFO]: 'color: #2196f3;',
    [LogLevel.DEBUG]: 'color: #9e9e9e;',
  };

  format(entry: LogEntry): string {
    const time = entry.timestamp.toLocaleTimeString();
    const level = logLevelToString(entry.level).toUpperCase();
    const source = entry.source ? `[${entry.source}] ` : '';
    
    return `%c${time} ${level}%c ${source}${entry.message}`;
  }

  getStyles(level: LogLevel): string[] {
    return [this.levelStyles[level], 'color: inherit;'];
  }
}

export class JsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const output = {
      timestamp: entry.timestamp.toISOString(),
      level: logLevelToString(entry.level),
      message: entry.message,
      source: entry.source,
      context: entry.context,
      error: entry.error ? {
        message: entry.error.message,
        stack: entry.error.stack,
        name: entry.error.name,
      } : undefined,
    };
    
    return JSON.stringify(output);
  }
}