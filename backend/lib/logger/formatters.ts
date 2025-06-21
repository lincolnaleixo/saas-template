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

export class PrettyFormatter implements LogFormatter {
  private readonly levelColors = {
    [LogLevel.ERROR]: '\x1b[31m', // Red
    [LogLevel.WARN]: '\x1b[33m',  // Yellow
    [LogLevel.INFO]: '\x1b[36m',  // Cyan
    [LogLevel.DEBUG]: '\x1b[90m', // Gray
  };
  
  private readonly resetColor = '\x1b[0m';
  
  private readonly levelEmojis = {
    [LogLevel.ERROR]: '❌',
    [LogLevel.WARN]: '⚠️ ',
    [LogLevel.INFO]: '💡',
    [LogLevel.DEBUG]: '🔍',
  };

  constructor(private useEmojis: boolean = true, private useColors: boolean = true) {}

  format(entry: LogEntry): string {
    const time = entry.timestamp.toLocaleTimeString();
    const level = logLevelToString(entry.level).toUpperCase();
    const source = entry.source ? `[${entry.source}] ` : '';
    
    let levelStr = level.padEnd(5);
    if (this.useEmojis) {
      levelStr = `${this.levelEmojis[entry.level]} ${levelStr}`;
    }
    if (this.useColors) {
      levelStr = `${this.levelColors[entry.level]}${levelStr}${this.resetColor}`;
    }
    
    let output = `${time} ${levelStr} ${source}${entry.message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = JSON.stringify(entry.context, null, 2)
        .split('\n')
        .map(line => `    ${line}`)
        .join('\n');
      output += `\n${contextStr}`;
    }
    
    if (entry.error) {
      const errorStr = (entry.error.stack || entry.error.message)
        .split('\n')
        .map(line => `    ${line}`)
        .join('\n');
      output += `\n${errorStr}`;
    }
    
    return output;
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