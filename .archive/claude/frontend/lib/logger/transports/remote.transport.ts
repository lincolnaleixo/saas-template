import { LogTransport, LogEntry, LogLevel } from '../types';
import { JsonFormatter } from '../formatters';

export interface RemoteTransportOptions {
  endpoint: string;
  apiKey?: string;
  batchSize?: number;
  flushInterval?: number; // milliseconds
  minLevel?: LogLevel;
  formatter?: JsonFormatter;
}

export class RemoteTransport implements LogTransport {
  private queue: LogEntry[] = [];
  private timer: number | null = null;
  private options: Required<RemoteTransportOptions>;
  private formatter: JsonFormatter;

  constructor(options: RemoteTransportOptions) {
    this.options = {
      apiKey: '',
      batchSize: 10,
      flushInterval: 5000,
      minLevel: LogLevel.WARN,
      formatter: new JsonFormatter(),
      ...options,
    };
    this.formatter = this.options.formatter;
  }

  log(entry: LogEntry): void {
    // Only send logs above minimum level to remote
    if (entry.level > this.options.minLevel) {
      return;
    }

    this.queue.push(entry);

    if (this.queue.length >= this.options.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = window.setTimeout(() => this.flush(), this.options.flushInterval);
    }
  }

  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.queue.length);
    
    try {
      const payload = {
        logs: batch.map(entry => JSON.parse(this.formatter.format(entry))),
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.options.apiKey) {
        headers['Authorization'] = `Bearer ${this.options.apiKey}`;
      }

      await fetch(this.options.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // Re-queue failed logs (but limit to prevent infinite growth)
      if (this.queue.length < this.options.batchSize * 2) {
        this.queue.unshift(...batch);
      }
      console.error('RemoteTransport error:', error);
    }
  }

  // Ensure logs are sent before page unload
  destroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    
    // Use sendBeacon for reliability on page unload
    if (this.queue.length > 0 && 'sendBeacon' in navigator) {
      const batch = this.queue.splice(0, this.queue.length);
      const payload = {
        logs: batch.map(entry => JSON.parse(this.formatter.format(entry))),
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };
      
      navigator.sendBeacon(this.options.endpoint, JSON.stringify(payload));
    }
  }
}