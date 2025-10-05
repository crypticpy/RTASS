/**
 * Error Handling Utilities
 * Fire Department Radio Transcription System
 *
 * Centralized error handling with structured logging and error classification.
 * Provides consistent error responses across all services and API routes.
 */

import type { APIError } from '@/lib/types';

/**
 * Custom error class for service layer errors
 *
 * Provides structured error information with error codes, messages,
 * and HTTP status codes for consistent API responses.
 */
export class ServiceError extends Error {
  /**
   * Create a new ServiceError
   *
   * @param {string} code - Error code (e.g., 'INVALID_FILE_FORMAT')
   * @param {string} message - Human-readable error message
   * @param {any} details - Additional error details
   * @param {number} statusCode - HTTP status code (default: 500)
   */
  constructor(
    public code: string,
    public message: string,
    public details?: any,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ServiceError';

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceError);
    }
  }

  /**
   * Convert ServiceError to APIError format
   *
   * @returns {APIError} Formatted API error response
   */
  toAPIError(): APIError {
    return {
      error: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Handle and format any error into a structured APIError
 *
 * Provides consistent error handling across all services.
 * Classifies errors by type and returns appropriate HTTP status codes.
 *
 * @param {unknown} error - Error to handle
 * @returns {APIError} Formatted API error response
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const apiError = handleServiceError(error);
 *   return NextResponse.json(apiError, { status: apiError.statusCode });
 * }
 * ```
 */
export function handleServiceError(error: unknown): APIError {
  // ServiceError - our custom errors
  if (error instanceof ServiceError) {
    logError(error);
    return error.toAPIError();
  }

  // OpenAI API errors
  if (isOpenAIError(error)) {
    const apiError = handleOpenAIError(error);
    logError(apiError);
    return apiError;
  }

  // Prisma database errors
  if (isPrismaError(error)) {
    const apiError = handlePrismaError(error);
    logError(apiError);
    return apiError;
  }

  // Zod validation errors
  if (isZodError(error)) {
    const apiError = handleZodError(error);
    logError(apiError);
    return apiError;
  }

  // Generic JavaScript errors
  if (error instanceof Error) {
    logError(error);
    return {
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      statusCode: 500,
    };
  }

  // Unknown errors
  logError(new Error(String(error)));
  return {
    error: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
  };
}

/**
 * Check if error is from OpenAI API
 */
function isOpenAIError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('status' in error || 'type' in error) &&
    'message' in error
  );
}

/**
 * Handle OpenAI API errors
 */
function handleOpenAIError(error: any): APIError {
  const status = error.status || 502;
  const message = error.message || 'OpenAI API error';

  // Rate limit errors
  if (status === 429) {
    return {
      error: 'OPENAI_RATE_LIMIT',
      message: 'OpenAI API rate limit exceeded. Please try again later.',
      details: { retryAfter: error.headers?.['retry-after'] },
      statusCode: 429,
    };
  }

  // Invalid API key
  if (status === 401) {
    return {
      error: 'OPENAI_AUTH_ERROR',
      message: 'OpenAI API authentication failed',
      statusCode: 500, // Don't expose auth issues to client
    };
  }

  // Server errors
  if (status >= 500) {
    return {
      error: 'OPENAI_SERVER_ERROR',
      message: 'OpenAI API is temporarily unavailable',
      statusCode: 502,
    };
  }

  // Client errors
  return {
    error: 'OPENAI_ERROR',
    message,
    details: error.type,
    statusCode: status,
  };
}

/**
 * Check if error is from Prisma
 */
function isPrismaError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as any).code === 'string' &&
    (error as any).code.startsWith('P')
  );
}

/**
 * Handle Prisma database errors
 */
function handlePrismaError(error: any): APIError {
  const code = error.code;

  // Record not found (P2025)
  if (code === 'P2025') {
    return {
      error: 'NOT_FOUND',
      message: 'The requested resource was not found',
      statusCode: 404,
    };
  }

  // Unique constraint violation (P2002)
  if (code === 'P2002') {
    const target = error.meta?.target || 'field';
    return {
      error: 'DUPLICATE_ENTRY',
      message: `A record with this ${target} already exists`,
      details: { field: target },
      statusCode: 409,
    };
  }

  // Foreign key constraint violation (P2003)
  if (code === 'P2003') {
    return {
      error: 'INVALID_REFERENCE',
      message: 'Referenced record does not exist',
      details: { field: error.meta?.field_name },
      statusCode: 400,
    };
  }

  // Connection timeout (P1008)
  if (code === 'P1008') {
    return {
      error: 'DATABASE_TIMEOUT',
      message: 'Database operation timed out',
      statusCode: 504,
    };
  }

  // Generic Prisma error
  return {
    error: 'DATABASE_ERROR',
    message: 'A database error occurred',
    details: { code },
    statusCode: 500,
  };
}

/**
 * Check if error is from Zod validation
 */
function isZodError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray((error as any).issues)
  );
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: any): APIError {
  const issues = error.issues.map((issue: any) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return {
    error: 'VALIDATION_ERROR',
    message: 'Input validation failed',
    details: { issues },
    statusCode: 400,
  };
}

/**
 * Log error with appropriate level
 *
 * In production, this should integrate with a proper logging service
 * (e.g., Sentry, LogRocket, Datadog).
 *
 * @param {Error | APIError} error - Error to log
 */
function logError(error: Error | APIError): void {
  const timestamp = new Date().toISOString();

  if (error instanceof Error) {
    console.error(`[${timestamp}] ${error.name}: ${error.message}`, {
      stack: error.stack,
    });
  } else {
    console.error(`[${timestamp}] ${error.error}: ${error.message}`, {
      statusCode: error.statusCode,
      details: error.details,
    });
  }
}

/**
 * Predefined error factory functions for common errors
 */
export const Errors = {
  /**
   * File validation errors
   */
  invalidFile: (message: string, details?: any) =>
    new ServiceError('INVALID_FILE', message, details, 400),

  fileTooLarge: (maxSize: number, actualSize: number) =>
    new ServiceError(
      'FILE_TOO_LARGE',
      `File size exceeds maximum of ${maxSize / 1024 / 1024}MB`,
      { maxSize, actualSize },
      400
    ),

  unsupportedFormat: (format: string, supported: string[]) =>
    new ServiceError(
      'UNSUPPORTED_FORMAT',
      `Format '${format}' is not supported. Supported formats: ${supported.join(', ')}`,
      { format, supported },
      400
    ),

  /**
   * Resource errors
   */
  notFound: (resource: string, id?: string) =>
    new ServiceError(
      'NOT_FOUND',
      `${resource}${id ? ` with ID '${id}'` : ''} not found`,
      { resource, id },
      404
    ),

  alreadyExists: (resource: string, field: string, value: any) =>
    new ServiceError(
      'ALREADY_EXISTS',
      `${resource} with ${field} '${value}' already exists`,
      { resource, field, value },
      409
    ),

  /**
   * Processing errors
   */
  processingFailed: (operation: string, reason?: string) =>
    new ServiceError(
      'PROCESSING_FAILED',
      `${operation} failed${reason ? `: ${reason}` : ''}`,
      { operation, reason },
      500
    ),

  invalidInput: (field: string, reason: string) =>
    new ServiceError(
      'INVALID_INPUT',
      `Invalid ${field}: ${reason}`,
      { field, reason },
      400
    ),

  /**
   * Authentication/Authorization errors
   */
  unauthorized: (message: string = 'Authentication required') =>
    new ServiceError('UNAUTHORIZED', message, undefined, 401),

  forbidden: (message: string = 'Access denied') =>
    new ServiceError('FORBIDDEN', message, undefined, 403),

  /**
   * Rate limiting errors
   */
  rateLimitExceeded: (retryAfter?: number) =>
    new ServiceError(
      'RATE_LIMIT_EXCEEDED',
      'Rate limit exceeded. Please try again later.',
      { retryAfter },
      429
    ),

  /**
   * External service errors
   */
  externalServiceError: (service: string, message?: string) =>
    new ServiceError(
      'EXTERNAL_SERVICE_ERROR',
      `${service} is temporarily unavailable${message ? `: ${message}` : ''}`,
      { service },
      502
    ),
};

/**
 * Wrap an async function with error handling
 *
 * Automatically catches and formats errors for API responses.
 *
 * @template T The return type of the function
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 *
 * @example
 * ```typescript
 * const safeFn = withErrorHandling(async (id: string) => {
 *   return await someOperation(id);
 * });
 *
 * const result = await safeFn('123'); // Errors automatically handled
 * ```
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleServiceError(error);
    }
  };
}
