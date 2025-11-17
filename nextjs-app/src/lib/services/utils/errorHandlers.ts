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

    // Maintains proper stack trace for where error was thrown
    // Fallback for non-V8 environments (e.g., Safari, older Node.js)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error().stack;
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
  const errorCode = error.code;

  // Parse OpenAI-specific error codes
  // https://platform.openai.com/docs/guides/error-codes

  // Quota exceeded error
  if (errorCode === 'insufficient_quota') {
    return {
      error: 'OPENAI_QUOTA_EXCEEDED',
      message: 'OpenAI API quota exceeded. Please check your billing settings.',
      details: { code: errorCode },
      statusCode: 429,
    };
  }

  // Context length exceeded error
  if (errorCode === 'context_length_exceeded') {
    return {
      error: 'CONTEXT_LIMIT_EXCEEDED',
      message: 'Content exceeds model context limit. Please reduce input size.',
      details: { code: errorCode },
      statusCode: 400,
    };
  }

  // Invalid request error (e.g., invalid parameters)
  if (errorCode === 'invalid_request_error') {
    return {
      error: 'OPENAI_INVALID_REQUEST',
      message: message || 'Invalid request to OpenAI API',
      details: { code: errorCode },
      statusCode: 400,
    };
  }

  // Model not found or unavailable
  if (errorCode === 'model_not_found') {
    return {
      error: 'OPENAI_MODEL_UNAVAILABLE',
      message: 'The requested model is not available',
      details: { code: errorCode },
      statusCode: 400,
    };
  }

  // Rate limit errors (fallback to status code)
  if (status === 429 || errorCode === 'rate_limit_exceeded') {
    return {
      error: 'OPENAI_RATE_LIMIT',
      message: 'OpenAI API rate limit exceeded. Please try again later.',
      details: { retryAfter: error.headers?.['retry-after'], code: errorCode },
      statusCode: 429,
    };
  }

  // Invalid API key
  if (status === 401 || errorCode === 'invalid_api_key') {
    return {
      error: 'OPENAI_AUTH_ERROR',
      message: 'OpenAI API authentication failed',
      details: { code: errorCode },
      statusCode: 500, // Don't expose auth issues to client
    };
  }

  // Server errors
  if (status >= 500 || errorCode === 'server_error') {
    return {
      error: 'OPENAI_SERVER_ERROR',
      message: 'OpenAI API is temporarily unavailable',
      details: { code: errorCode },
      statusCode: 502,
    };
  }

  // Client errors
  return {
    error: 'OPENAI_ERROR',
    message,
    details: { type: error.type, code: errorCode },
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
 *
 * Enhanced to include received and expected values for better debugging
 */
function handleZodError(error: any): APIError {
  const issues = error.issues.map((issue: any) => {
    const issueDetails: {
      path: string;
      message: string;
      code: string;
      received?: string;
      expected?: string;
    } = {
      path: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code,
    };

    // Add received value if available (for debugging)
    // Note: Avoid logging sensitive data in production
    if (issue.received !== undefined) {
      try {
        issueDetails.received = JSON.stringify(issue.received);
      } catch {
        issueDetails.received = String(issue.received);
      }
    }

    // Add expected value/type if available
    if (issue.expected !== undefined) {
      issueDetails.expected = String(issue.expected);
    } else if (issue.code === 'invalid_type') {
      // For type errors, extract expected type from validation
      issueDetails.expected = issue.expectedType || issue.options?.join(' | ');
    }

    return issueDetails;
  });

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
   * OpenAI API rate limit error (429)
   */
  rateLimited: (resource: string = 'OpenAI API') =>
    new ServiceError(
      'OPENAI_RATE_LIMITED',
      `${resource} rate limit exceeded. Please try again later.`,
      { resource },
      429
    ),

  /**
   * Service temporarily unavailable error (503)
   */
  serviceUnavailable: (service: string) =>
    new ServiceError(
      'SERVICE_UNAVAILABLE',
      `${service} is temporarily unavailable. Please try again.`,
      { service },
      503
    ),

  /**
   * Context length exceeded error
   */
  contextLimitExceeded: (limit?: number, actual?: number) =>
    new ServiceError(
      'CONTEXT_LIMIT_EXCEEDED',
      'Content exceeds model context limit. Please reduce input size.',
      { limit, actual },
      400
    ),

  /**
   * OpenAI quota exceeded error
   */
  quotaExceeded: (message: string = 'OpenAI API quota exceeded') =>
    new ServiceError(
      'OPENAI_QUOTA_EXCEEDED',
      message,
      undefined,
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

  /**
   * Storage errors
   */
  storageError: (message: string, details?: any) =>
    new ServiceError(
      'STORAGE_ERROR',
      message,
      details,
      500
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
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleServiceError(error);
    }
  };
}
