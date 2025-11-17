/**
 * Log transport implementations for different output destinations.
 *
 * Provides console, database, and file transports with configurable
 * log levels and formatting. All transports implement graceful error
 * handling to prevent logging failures from affecting application flow.
 */

import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { LogLevel, LOG_LEVEL_PRIORITY, type LogTransport, type LogEntry } from './types';
import { formatJson, formatHuman, formatDatabase } from './formatters';

/**
 * Configuration options for ConsoleTransport.
 */
interface ConsoleTransportOptions {
  minLevel?: LogLevel;
  useColors?: boolean;
}

/**
 * Console transport for terminal output.
 * Supports both JSON and human-readable formatting with color support.
 */
export class ConsoleTransport implements LogTransport {
  public readonly name = 'console';
  public readonly enabled = true;
  public readonly minLevel: LogLevel;
  private readonly use_colors: boolean;

  constructor(options: ConsoleTransportOptions = {}) {
    this.minLevel = options.minLevel ?? LogLevel.DEBUG;
    this.use_colors = options.useColors ?? true;
  }

  /**
   * Writes a log entry to console output.
   * Uses stderr for WARN/ERROR/CRITICAL, stdout for others.
   *
   * @param entry - Log entry to write
   */
  log(entry: LogEntry): void {
    if (!this.should_log(entry.level)) {
      return;
    }

    const formatted = this.use_colors ? formatHuman(entry) : formatJson(entry);

    // Write errors and warnings to stderr
    if (LOG_LEVEL_PRIORITY[entry.level] >= LOG_LEVEL_PRIORITY[LogLevel.WARN]) {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }

  private should_log(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }
}

/**
 * Configuration options for DatabaseTransport.
 */
interface DatabaseTransportOptions {
  minLevel?: LogLevel;
  batchSize?: number;
  flushInterval?: number;
}

/**
 * Database transport for persistent log storage.
 * Implements batching and automatic flushing to optimize database writes.
 */
export class DatabaseTransport implements LogTransport {
  public readonly name = 'database';
  public enabled = true;
  public readonly minLevel: LogLevel;

  private readonly batch_size: number;
  private readonly flush_interval: number;
  private batch: LogEntry[] = [];
  private flush_timer?: NodeJS.Timeout;
  private is_flushing = false;

  constructor(options: DatabaseTransportOptions = {}) {
    this.minLevel = options.minLevel ?? LogLevel.INFO;
    this.batch_size = options.batchSize ?? 10;
    this.flush_interval = options.flushInterval ?? 5000;
  }

  /**
   * Adds a log entry to the batch queue.
   * Triggers flush when batch size is reached.
   *
   * @param entry - Log entry to write
   */
  async log(entry: LogEntry): Promise<void> {
    if (!this.enabled || !this.should_log(entry.level)) {
      return;
    }

    this.batch.push(entry);

    // Start flush timer if not already running
    if (!this.flush_timer) {
      this.flush_timer = setTimeout(() => this.flush(), this.flush_interval);
    }

    // Flush immediately if batch is full
    if (this.batch.length >= this.batch_size) {
      await this.flush();
    }
  }

  /**
   * Flushes all pending log entries to the database.
   * Implements graceful error handling to prevent data loss.
   */
  async flush(): Promise<void> {
    if (this.is_flushing || this.batch.length === 0) {
      return;
    }

    this.is_flushing = true;

    // Clear flush timer
    if (this.flush_timer) {
      clearTimeout(this.flush_timer);
      this.flush_timer = undefined;
    }

    const entries_to_flush = [...this.batch];
    this.batch = [];

    try {
      // Lazy-load Prisma client to avoid circular dependencies
      const { default: prisma } = await import('@/lib/db');

      // Batch insert log entries
      const formatted_entries = entries_to_flush.map(formatDatabase);

      // Use type assertion to handle dynamic Prisma models
      await (prisma as any).systemLog.createMany({
        data: formatted_entries,
        skipDuplicates: true,
      });
    } catch (error) {
      // Log to console as fallback
      console.error('[DatabaseTransport] Failed to write logs to database:', error);

      // Re-add entries to batch for retry
      this.batch.unshift(...entries_to_flush);

      // Disable transport if database is unavailable
      if (this.is_database_error(error)) {
        this.enabled = false;
        console.warn('[DatabaseTransport] Database unavailable, disabling database logging');
      }
    } finally {
      this.is_flushing = false;
    }
  }

  private should_log(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private is_database_error(error: unknown): boolean {
    if (error && typeof error === 'object' && 'code' in error) {
      const db_error_codes = ['P1001', 'P1002', 'P1003', 'P2024'];
      return db_error_codes.includes(String(error.code));
    }
    return false;
  }
}

/**
 * Configuration options for FileTransport.
 */
interface FileTransportOptions {
  minLevel?: LogLevel;
  filePath: string;
  maxFileSize?: number;
  useJsonFormat?: boolean;
}

/**
 * File transport for local file logging.
 * Useful as a fallback when database is unavailable.
 */
export class FileTransport implements LogTransport {
  public readonly name = 'file';
  public enabled = true;
  public readonly minLevel: LogLevel;

  private readonly file_path: string;
  private readonly max_file_size: number;
  private readonly use_json: boolean;
  private is_initialized = false;

  constructor(options: FileTransportOptions) {
    this.minLevel = options.minLevel ?? LogLevel.INFO;
    this.file_path = options.filePath;
    this.max_file_size = options.maxFileSize ?? 10 * 1024 * 1024; // 10MB default
    this.use_json = options.useJsonFormat ?? true;
  }

  /**
   * Writes a log entry to the log file.
   * Creates file and directory structure on first write.
   *
   * @param entry - Log entry to write
   */
  async log(entry: LogEntry): Promise<void> {
    if (!this.enabled || !this.should_log(entry.level)) {
      return;
    }

    try {
      await this.ensure_initialized();

      const formatted = this.use_json ? formatJson(entry) : formatHuman(entry);
      const line = formatted + '\n';

      await appendFile(this.file_path, line, 'utf-8');

      // Check file size and rotate if needed
      await this.check_rotation();
    } catch (error) {
      console.error('[FileTransport] Failed to write log to file:', error);
      this.enabled = false;
    }
  }

  private async ensure_initialized(): Promise<void> {
    if (this.is_initialized) {
      return;
    }

    try {
      // Create directory if it doesn't exist
      const dir = dirname(this.file_path);
      await mkdir(dir, { recursive: true });

      this.is_initialized = true;
    } catch (error) {
      console.error('[FileTransport] Failed to initialize file transport:', error);
      throw error;
    }
  }

  private async check_rotation(): Promise<void> {
    try {
      const { stat } = await import('node:fs/promises');
      const stats = await stat(this.file_path);

      if (stats.size > this.max_file_size) {
        await this.rotate();
      }
    } catch {
      // File doesn't exist yet, no rotation needed
    }
  }

  private async rotate(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotated_path = `${this.file_path}.${timestamp}`;

    try {
      const { rename } = await import('node:fs/promises');
      await rename(this.file_path, rotated_path);
    } catch (error) {
      console.error('[FileTransport] Failed to rotate log file:', error);
    }
  }

  private should_log(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }
}
