import { LogTransport, LogEntry, LogLevel } from '../types';
import { BrowserFormatter } from '../formatters';

export class ConsoleTransport implements LogTransport {
  constructor(private formatter: BrowserFormatter) {}

  log(entry: LogEntry): void {
    const formatted = this.formatter.format(entry);
    const styles = this.formatter.getStyles(entry.level);
    
    // Build arguments for console with context and error
    const args: any[] = [formatted, ...styles];
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      args.push('\nContext:', entry.context);
    }
    
    if (entry.error) {
      args.push('\nError:', entry.error);
    }
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(...args);
        break;
      case LogLevel.WARN:
        console.warn(...args);
        break;
      case LogLevel.INFO:
        console.info(...args);
        break;
      case LogLevel.DEBUG:
        console.debug(...args);
        break;
    }
  }
}