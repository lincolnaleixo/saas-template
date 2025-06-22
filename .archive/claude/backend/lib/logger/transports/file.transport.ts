import { LogTransport, LogEntry, LogLevel, logLevelToString } from '../types';
import { LogFormatter } from '../formatters';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface FileTransportOptions {
  formatter: LogFormatter;
  filepath: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  datePattern?: boolean;
}

export class FileTransport implements LogTransport {
  private options: Required<FileTransportOptions>;
  private writeQueue: string[] = [];
  private isWriting = false;

  constructor(options: FileTransportOptions) {
    this.options = {
      maxSize: 10 * 1024 * 1024, // 10MB default
      maxFiles: 5,
      datePattern: true,
      ...options,
    };
    
    this.ensureDirectory();
  }

  private async ensureDirectory(): Promise<void> {
    const dir = path.dirname(this.options.filepath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private getFilePath(): string {
    if (!this.options.datePattern) {
      return this.options.filepath;
    }

    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const ext = path.extname(this.options.filepath);
    const basename = path.basename(this.options.filepath, ext);
    const dir = path.dirname(this.options.filepath);
    
    return path.join(dir, `${basename}-${dateStr}${ext}`);
  }

  private async rotateIfNeeded(filepath: string): Promise<void> {
    try {
      const stats = await fs.stat(filepath);
      if (stats.size > this.options.maxSize) {
        await this.rotate(filepath);
      }
    } catch (error) {
      // File doesn't exist yet, which is fine
    }
  }

  private async rotate(filepath: string): Promise<void> {
    const timestamp = new Date().getTime();
    const rotatedPath = `${filepath}.${timestamp}`;
    
    try {
      await fs.rename(filepath, rotatedPath);
      await this.cleanOldFiles(filepath);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  private async cleanOldFiles(baseFilepath: string): Promise<void> {
    const dir = path.dirname(baseFilepath);
    const basename = path.basename(baseFilepath);
    
    try {
      const files = await fs.readdir(dir);
      const logFiles = files
        .filter(file => file.startsWith(basename))
        .map(file => ({
          name: file,
          path: path.join(dir, file),
        }));
      
      // Sort by modification time
      const fileStats = await Promise.all(
        logFiles.map(async (file) => ({
          ...file,
          mtime: (await fs.stat(file.path)).mtime.getTime(),
        }))
      );
      
      fileStats.sort((a, b) => b.mtime - a.mtime);
      
      // Remove old files
      if (fileStats.length > this.options.maxFiles) {
        const filesToDelete = fileStats.slice(this.options.maxFiles);
        await Promise.all(
          filesToDelete.map(file => fs.unlink(file.path).catch(console.error))
        );
      }
    } catch (error) {
      console.error('Failed to clean old log files:', error);
    }
  }

  async log(entry: LogEntry): Promise<void> {
    const formatted = this.formatter.format(entry);
    this.writeQueue.push(formatted + '\\n');
    
    if (!this.isWriting) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.writeQueue.length === 0) {
      this.isWriting = false;
      return;
    }

    this.isWriting = true;
    const messages = this.writeQueue.splice(0, this.writeQueue.length);
    const filepath = this.getFilePath();
    
    try {
      await this.rotateIfNeeded(filepath);
      await fs.appendFile(filepath, messages.join(''));
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
    
    // Process any new messages that arrived while writing
    setImmediate(() => this.processQueue());
  }
}