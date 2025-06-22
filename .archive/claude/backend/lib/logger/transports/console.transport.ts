import { LogTransport, LogEntry, LogLevel } from '../types';
import { LogFormatter } from '../formatters';

export class ConsoleTransport implements LogTransport {
  constructor(private formatter: LogFormatter) {}

  log(entry: LogEntry): void {
    const formatted = this.formatter.format(entry);
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
    }
  }
}