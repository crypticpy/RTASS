/**
 * Core type definitions for the logging infrastructure.
 *
 * Provides type-safe interfaces for log levels, entries, metadata,
 * and transport configurations used throughout the logging system.
 */

/**
 * Log severity levels in ascending order of criticality.
 * Maps to standard syslog severity levels.
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Numeric representation of log levels for comparison operations.
 * Higher numbers indicate greater severity.
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.CRITICAL]: 4,
};

/**
 * Structured metadata attached to log entries.
 * Supports arbitrary key-value pairs for contextual information.
 */
export interface LogMetadata {
  component?: string;
  operation?: string;
  jobId?: string;
  correlationId?: string;
  userId?: string;
  incidentId?: string;
  templateId?: string;
  duration?: number;
  statusCode?: number;
  error?: Error | SerializedError;
  [key: string]: unknown;
}

/**
 * Serialized error structure for safe JSON logging.
 * Preserves error details without circular references.
 */
export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  cause?: SerializedError;
  [key: string]: unknown;
}

/**
 * Complete log entry structure with all contextual information.
 * This is the core data structure passed through the logging pipeline.
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata: LogMetadata;
  correlationId?: string;
  jobId?: string;
}

/**
 * Transport interface for log output destinations.
 * All transports must implement this interface.
 */
export interface LogTransport {
  name: string;
  enabled: boolean;
  minLevel: LogLevel;
  log(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
}

/**
 * Configuration options for the logger instance.
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  transports: LogTransport[];
  defaultMetadata?: LogMetadata;
}

/**
 * Request context stored in AsyncLocalStorage.
 * Propagates correlation IDs and job IDs across async boundaries.
 */
export interface RequestContext {
  correlationId: string;
  jobId?: string;
  userId?: string;
  startTime: number;
  metadata?: Record<string, unknown>;
}
