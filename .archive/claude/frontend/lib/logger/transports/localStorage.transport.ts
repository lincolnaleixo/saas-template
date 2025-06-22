import { LogTransport, LogEntry } from '../types';
import { JsonFormatter } from '../formatters';

export interface LocalStorageTransportOptions {
  key?: string;
  maxEntries?: number;
  formatter?: JsonFormatter;
}

export class LocalStorageTransport implements LogTransport {
  private key: string;
  private maxEntries: number;
  private formatter: JsonFormatter;

  constructor(options: LocalStorageTransportOptions = {}) {
    this.key = options.key || 'app-logs';
    this.maxEntries = options.maxEntries || 100;
    this.formatter = options.formatter || new JsonFormatter();
  }

  log(entry: LogEntry): void {
    try {
      // Get existing logs
      const existingLogs = this.getLogs();
      
      // Add new entry
      existingLogs.push(this.formatter.format(entry));
      
      // Trim to max entries
      if (existingLogs.length > this.maxEntries) {
        existingLogs.splice(0, existingLogs.length - this.maxEntries);
      }
      
      // Save back to localStorage
      localStorage.setItem(this.key, JSON.stringify(existingLogs));
    } catch (error) {
      // Silently fail if localStorage is full or unavailable
      console.error('LocalStorageTransport error:', error);
    }
  }

  private getLogs(): string[] {
    try {
      const stored = localStorage.getItem(this.key);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }

  getStoredLogs(): LogEntry[] {
    return this.getLogs().map(logStr => {
      try {
        return JSON.parse(logStr);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }
}