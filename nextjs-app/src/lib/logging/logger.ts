/**
 * Core logger implementation with singleton pattern.
 *
 * Provides type-safe, structured logging with support for correlation IDs,
 * metadata, and multiple transports. Automatically integrates with request
 * context for distributed tracing.
 */

import { LogLevel, type LogEntry, type LogMetadata, type LoggerConfig } from './types';
import { getCorrelationId, getJobId } from './context';
import { createDefaultConfig } from './config';

/**
 * Logger class for structured logging with context awareness.
 * Implements the singleton pattern for global access.
 */
class Logger {
  private config: LoggerConfig;
  private default_metadata: LogMetadata;

  constructor(config?: LoggerConfig) {
    this.config = config ?? createDefaultConfig();
    this.default_metadata = this.config.defaultMetadata ?? {};
  }

  /**
   * Creates a log entry with automatic context enrichment.
   *
   * @param level - Log severity level
   * @param message - Log message
   * @param metadata - Additional metadata
   * @returns Complete log entry
   */
  private create_entry(level: LogLevel, message: string, metadata: LogMetadata = {}): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata: {
        ...this.default_metadata,
        ...metadata,
      },
      correlationId: metadata.correlationId ?? getCorrelationId(),
      jobId: metadata.jobId ?? getJobId(),
    };
  }

  /**
   * Writes a log entry to all enabled transports.
   *
   * @param entry - Log entry to write
   */
  private async write(entry: LogEntry): Promise<void> {
    const write_promises = this.config.transports
      .filter((transport) => transport.enabled)
      .map(async (transport) => {
        try {
          await transport.log(entry);
        } catch (error) {
          // Prevent transport errors from breaking the application
          console.error(`[Logger] Transport ${transport.name} failed:`, error);
        }
      });

    await Promise.allSettled(write_promises);
  }

  /**
   * Logs a DEBUG level message.
   * Use for detailed diagnostic information useful during development.
   *
   * @param message - Log message
   * @param metadata - Additional metadata
   *
   * @example
   * ```typescript
   * logger.debug('Request headers parsed', {
   *   component: 'api',
   *   headers: { 'content-type': 'application/json' }
   * });
   * ```
   */
  debug(message: string, metadata?: LogMetadata): void {
    const entry = this.create_entry(LogLevel.DEBUG, message, metadata);
    void this.write(entry);
  }

  /**
   * Logs an INFO level message.
   * Use for general informational messages about application state.
   *
   * @param message - Log message
   * @param metadata - Additional metadata
   *
   * @example
   * ```typescript
   * logger.info('Template generation started', {
   *   component: 'template-generation',
   *   operation: 'discover-categories',
   *   jobId: 'job-123',
   *   documentCount: 3
   * });
   * ```
   */
  info(message: string, metadata?: LogMetadata): void {
    const entry = this.create_entry(LogLevel.INFO, message, metadata);
    void this.write(entry);
  }

  /**
   * Logs a WARN level message.
   * Use for potentially harmful situations that don't prevent operation.
   *
   * @param message - Log message
   * @param metadata - Additional metadata
   *
   * @example
   * ```typescript
   * logger.warn('Rate limit approaching', {
   *   component: 'openai',
   *   operation: 'responses-create',
   *   remainingRequests: 5
   * });
   * ```
   */
  warn(message: string, metadata?: LogMetadata): void {
    const entry = this.create_entry(LogLevel.WARN, message, metadata);
    void this.write(entry);
  }

  /**
   * Logs an ERROR level message.
   * Use for error events that might still allow the application to continue.
   *
   * @param message - Log message
   * @param metadata - Additional metadata
   *
   * @example
   * ```typescript
   * logger.error('OpenAI API failed', {
   *   component: 'openai',
   *   operation: 'responses-create',
   *   model: 'gpt-4.1',
   *   error: new Error('Rate limit exceeded')
   * });
   * ```
   */
  error(message: string, metadata?: LogMetadata): void {
    const entry = this.create_entry(LogLevel.ERROR, message, metadata);
    void this.write(entry);
  }

  /**
   * Logs a CRITICAL level message.
   * Use for severe errors that require immediate attention.
   *
   * @param message - Log message
   * @param metadata - Additional metadata
   *
   * @example
   * ```typescript
   * logger.critical('Database connection lost', {
   *   component: 'database',
   *   operation: 'connect',
   *   error: new Error('Connection refused')
   * });
   * ```
   */
  critical(message: string, metadata?: LogMetadata): void {
    const entry = this.create_entry(LogLevel.CRITICAL, message, metadata);
    void this.write(entry);
  }

  /**
   * Creates a child logger with pre-configured metadata.
   * Useful for maintaining consistent context across related operations.
   *
   * @param metadata - Default metadata for child logger
   * @returns New logger instance with merged metadata
   *
   * @example
   * ```typescript
   * const templateLogger = logger.child({
   *   component: 'template-generation',
   *   jobId: 'job-123'
   * });
   *
   * templateLogger.info('Starting category discovery');
   * // Automatically includes component and jobId
   * ```
   */
  child(metadata: LogMetadata): Logger {
    const child_logger = new Logger(this.config);
    child_logger.default_metadata = {
      ...this.default_metadata,
      ...metadata,
    };
    return child_logger;
  }

  /**
   * Flushes all pending logs to transports.
   * Should be called before application shutdown.
   *
   * @example
   * ```typescript
   * process.on('SIGTERM', async () => {
   *   await logger.flush();
   *   process.exit(0);
   * });
   * ```
   */
  async flush(): Promise<void> {
    const flush_promises = this.config.transports
      .filter((transport) => transport.enabled && transport.flush)
      .map(async (transport) => {
        try {
          await transport.flush!();
        } catch (error) {
          console.error(`[Logger] Failed to flush ${transport.name}:`, error);
        }
      });

    await Promise.allSettled(flush_promises);
  }

  /**
   * Updates the logger configuration.
   * Useful for runtime configuration changes.
   *
   * @param config - New logger configuration
   */
  configure(config: LoggerConfig): void {
    this.config = config;
  }

  /**
   * Gets the current logger configuration.
   *
   * @returns Current logger configuration
   */
  getConfig(): Readonly<LoggerConfig> {
    return this.config;
  }
}

/**
 * Singleton logger instance for global access.
 * Import and use throughout the application.
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logging/logger';
 *
 * logger.info('Application started');
 * ```
 */
export const logger = new Logger();

/**
 * Creates a new logger instance with custom configuration.
 * Useful for testing or specialized logging requirements.
 *
 * @param config - Logger configuration
 * @returns New logger instance
 *
 * @example
 * ```typescript
 * const testLogger = createLogger({
 *   minLevel: LogLevel.ERROR,
 *   transports: [new ConsoleTransport({ useColors: false })]
 * });
 * ```
 */
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

// Export log level enum for convenience
export { LogLevel };
