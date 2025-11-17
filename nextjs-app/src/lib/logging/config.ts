/**
 * Logging system configuration.
 *
 * Provides environment-based configuration for log levels,
 * transports, and runtime behavior. Automatically adapts
 * to development vs production environments.
 */

import { LogLevel, type LoggerConfig } from './types';
import { ConsoleTransport, DatabaseTransport, FileTransport } from './transports';

/**
 * Determines if the application is running in production mode.
 */
const is_production = process.env.NODE_ENV === 'production';

/**
 * Determines if the application is running in test mode.
 */
const is_test = process.env.NODE_ENV === 'test';

/**
 * Parses the LOG_LEVEL environment variable into a LogLevel enum.
 * Falls back to INFO for production, DEBUG for development.
 *
 * @returns Configured log level
 */
function get_log_level_from_env(): LogLevel {
  const env_level = process.env.LOG_LEVEL?.toUpperCase();

  if (env_level && env_level in LogLevel) {
    return LogLevel[env_level as keyof typeof LogLevel];
  }

  // Default levels by environment
  if (is_test) {
    return LogLevel.WARN;
  }

  return is_production ? LogLevel.INFO : LogLevel.DEBUG;
}

/**
 * Determines if database logging should be enabled.
 * Disabled in test environments to avoid DB dependencies.
 *
 * @returns True if database transport should be enabled
 */
function should_enable_database(): boolean {
  if (is_test) {
    return false;
  }

  const explicit_disable = process.env.LOG_DATABASE === 'false';
  if (explicit_disable) {
    return false;
  }

  // Enable in production by default, optional in development
  return is_production || process.env.LOG_DATABASE === 'true';
}

/**
 * Determines if file logging should be enabled.
 * Useful as a fallback when database is unavailable.
 *
 * @returns True if file transport should be enabled
 */
function should_enable_file(): boolean {
  if (is_test) {
    return false;
  }

  return process.env.LOG_FILE === 'true';
}

/**
 * Gets the log file path from environment or default.
 *
 * @returns Path to log file
 */
function get_log_file_path(): string {
  return process.env.LOG_FILE_PATH || '/tmp/fire-dept-app.log';
}

/**
 * Creates the default logger configuration based on environment.
 *
 * Development:
 * - Console transport with human-readable formatting
 * - DEBUG level logging
 *
 * Production:
 * - Console transport with JSON formatting
 * - Database transport for persistence
 * - INFO level logging
 *
 * @returns Logger configuration object
 */
export function createDefaultConfig(): LoggerConfig {
  const min_level = get_log_level_from_env();
  const transports = [];

  // Console transport - always enabled
  transports.push(
    new ConsoleTransport({
      minLevel: min_level,
      useColors: !is_production,
    })
  );

  // Database transport - production default
  if (should_enable_database()) {
    transports.push(
      new DatabaseTransport({
        minLevel: LogLevel.INFO, // Only persist INFO and above
      })
    );
  }

  // File transport - optional fallback
  if (should_enable_file()) {
    transports.push(
      new FileTransport({
        minLevel: min_level,
        filePath: get_log_file_path(),
      })
    );
  }

  return {
    minLevel: min_level,
    transports,
    defaultMetadata: {
      environment: process.env.NODE_ENV || 'development',
      appVersion: process.env.APP_VERSION || 'dev',
    },
  };
}

/**
 * Environment-aware configuration constants.
 */
export const CONFIG = {
  IS_PRODUCTION: is_production,
  IS_TEST: is_test,
  LOG_LEVEL: get_log_level_from_env(),
  DATABASE_ENABLED: should_enable_database(),
  FILE_ENABLED: should_enable_file(),
  FILE_PATH: get_log_file_path(),
} as const;
