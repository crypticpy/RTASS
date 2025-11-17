/**
 * Log formatters for different output destinations and environments.
 *
 * Provides machine-readable JSON formatting for production systems
 * and human-readable formatting for development workflows.
 */

import type { LogEntry, SerializedError } from './types';

/**
 * Serializes an Error object to a plain object structure.
 * Handles nested causes and preserves stack traces.
 *
 * @param error - Error object to serialize
 * @returns Serialized error structure safe for JSON stringification
 */
function serialize_error(error: Error): SerializedError {
  const serialized: SerializedError = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  // Capture error cause chain (ES2022 Error.cause property)
  const error_with_cause = error as Error & { cause?: unknown };
  if (error_with_cause.cause && error_with_cause.cause instanceof Error) {
    serialized.cause = serialize_error(error_with_cause.cause);
  }

  // Include custom error properties
  for (const [key, value] of Object.entries(error)) {
    if (!['name', 'message', 'stack', 'cause'].includes(key)) {
      serialized[key] = value;
    }
  }

  return serialized;
}

/**
 * Prepares metadata for serialization by converting Error objects
 * and handling non-serializable values.
 *
 * @param metadata - Raw metadata object
 * @returns Serializable metadata object
 */
function sanitize_metadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value instanceof Error) {
      sanitized[key] = serialize_error(value);
    } else if (value === undefined) {
      sanitized[key] = null;
    } else if (typeof value === 'function') {
      sanitized[key] = '[Function]';
    } else if (typeof value === 'bigint') {
      sanitized[key] = value.toString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      try {
        JSON.stringify(value);
        sanitized[key] = value;
      } catch {
        sanitized[key] = '[Circular]';
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Formats a log entry as a JSON string.
 * Machine-readable format optimized for log aggregation systems.
 *
 * @param entry - Log entry to format
 * @returns JSON string representation
 *
 * @example
 * ```typescript
 * const formatted = formatJson({
 *   timestamp: '2024-10-05T12:00:00.000Z',
 *   level: LogLevel.INFO,
 *   message: 'Template generation started',
 *   metadata: { component: 'template-generation', jobId: 'job-123' }
 * });
 * // Output: {"timestamp":"2024-10-05T12:00:00.000Z","level":"INFO",...}
 * ```
 */
export function formatJson(entry: LogEntry): string {
  const sanitized = {
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    ...(entry.correlationId && { correlationId: entry.correlationId }),
    ...(entry.jobId && { jobId: entry.jobId }),
    ...sanitize_metadata(entry.metadata),
  };

  return JSON.stringify(sanitized);
}

/**
 * ANSI color codes for terminal output.
 * Used by the human-readable formatter.
 */
const COLORS = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m', // Green
  WARN: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
  CRITICAL: '\x1b[35m', // Magenta
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  RED: '\x1b[31m', // Red (for error formatting)
} as const;

/**
 * Formats a log entry as a human-readable string with color coding.
 * Optimized for development console output with visual hierarchy.
 *
 * @param entry - Log entry to format
 * @returns Formatted string with ANSI color codes
 *
 * @example
 * ```typescript
 * const formatted = formatHuman({
 *   timestamp: '2024-10-05T12:00:00.000Z',
 *   level: LogLevel.ERROR,
 *   message: 'OpenAI API failed',
 *   metadata: { component: 'openai', operation: 'responses-create' }
 * });
 * // Output: [2024-10-05 12:00:00] ERROR [openai.responses-create] OpenAI API failed
 * ```
 */
export function formatHuman(entry: LogEntry): string {
  const color = COLORS[entry.level] || COLORS.RESET;
  const timestamp = new Date(entry.timestamp).toISOString().replace('T', ' ').substring(0, 19);

  // Build component path
  const parts: string[] = [];
  if (entry.metadata.component) {
    parts.push(String(entry.metadata.component));
  }
  if (entry.metadata.operation) {
    parts.push(String(entry.metadata.operation));
  }
  const component_path = parts.length > 0 ? `[${parts.join('.')}]` : '';

  // Format main log line
  const main_line = `${COLORS.DIM}[${timestamp}]${COLORS.RESET} ${color}${COLORS.BOLD}${entry.level}${COLORS.RESET} ${component_path} ${entry.message}`;

  // Build metadata section
  const metadata_entries: string[] = [];

  if (entry.correlationId) {
    metadata_entries.push(`correlationId=${entry.correlationId}`);
  }
  if (entry.jobId) {
    metadata_entries.push(`jobId=${entry.jobId}`);
  }

  for (const [key, value] of Object.entries(entry.metadata)) {
    if (['component', 'operation', 'error'].includes(key)) {
      continue;
    }

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'object') {
      metadata_entries.push(`${key}=${JSON.stringify(value)}`);
    } else {
      metadata_entries.push(`${key}=${String(value)}`);
    }
  }

  let output = main_line;

  if (metadata_entries.length > 0) {
    output += `\n  ${COLORS.DIM}${metadata_entries.join(' ')}${COLORS.RESET}`;
  }

  // Format error stack trace
  if (entry.metadata.error) {
    let error_name: string;
    let error_message: string;
    let error_stack: string | undefined;
    let current_cause: SerializedError | undefined;

    if (entry.metadata.error instanceof Error) {
      error_name = entry.metadata.error.name;
      error_message = entry.metadata.error.message;
      error_stack = entry.metadata.error.stack;

      // Show error cause chain (ES2022 Error.cause property)
      const error_with_cause = entry.metadata.error as Error & { cause?: unknown };
      if (error_with_cause.cause instanceof Error) {
        current_cause = serialize_error(error_with_cause.cause);
      }
    } else {
      const serialized = entry.metadata.error as SerializedError;
      error_name = serialized.name;
      error_message = serialized.message;
      error_stack = serialized.stack;
      current_cause = serialized.cause;
    }

    output += `\n  ${COLORS.RED}${error_name}: ${error_message}${COLORS.RESET}`;

    if (error_stack) {
      const stack_lines = error_stack.split('\n').slice(1);
      for (const line of stack_lines) {
        output += `\n    ${COLORS.DIM}${line.trim()}${COLORS.RESET}`;
      }
    }

    while (current_cause) {
      output += `\n  ${COLORS.DIM}Caused by: ${current_cause.name}: ${current_cause.message}${COLORS.RESET}`;
      current_cause = current_cause.cause;
    }
  }

  return output;
}

/**
 * Formats a log entry for database storage.
 * Produces a compact JSON structure optimized for Prisma storage.
 *
 * @param entry - Log entry to format
 * @returns Object ready for database insertion
 *
 * @example
 * ```typescript
 * const dbEntry = formatDatabase({
 *   timestamp: '2024-10-05T12:00:00.000Z',
 *   level: LogLevel.INFO,
 *   message: 'Template generation complete',
 *   metadata: { component: 'template-generation', duration: 1250 }
 * });
 * // Returns object ready for Prisma create/insert
 * ```
 */
export function formatDatabase(entry: LogEntry): {
  timestamp: Date;
  level: string;
  message: string;
  metadata: Record<string, unknown>;
} {
  return {
    timestamp: new Date(entry.timestamp),
    level: entry.level,
    message: entry.message,
    metadata: sanitize_metadata({
      ...entry.metadata,
      ...(entry.correlationId && { correlationId: entry.correlationId }),
      ...(entry.jobId && { jobId: entry.jobId }),
    }),
  };
}
