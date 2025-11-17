/**
 * Request context management using AsyncLocalStorage.
 *
 * Provides correlation ID generation and propagation across async
 * boundaries, enabling distributed tracing and request tracking
 * throughout the application lifecycle.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';
import type { RequestContext } from './types';

/**
 * Singleton AsyncLocalStorage instance for request context.
 * Automatically propagates context through async operations.
 */
const context_storage = new AsyncLocalStorage<RequestContext>();

/**
 * Generates a cryptographically random correlation ID.
 * Uses Node.js crypto module for high-quality randomness.
 *
 * @returns Correlation ID in format: cor_<16-char-hex>
 *
 * @example
 * ```typescript
 * const id = generateCorrelationId();
 * // Returns: "cor_a3f5d8c9e2b1f4a7"
 * ```
 */
export function generateCorrelationId(): string {
  return `cor_${randomBytes(8).toString('hex')}`;
}

/**
 * Generates a job ID for tracking multi-turn workflows.
 * Uses same format as correlation IDs but with job_ prefix.
 *
 * @returns Job ID in format: job_<16-char-hex>
 *
 * @example
 * ```typescript
 * const jobId = generateJobId();
 * // Returns: "job_7b2e9f1c4d8a3e6b"
 * ```
 */
export function generateJobId(): string {
  return `job_${randomBytes(8).toString('hex')}`;
}

/**
 * Retrieves the current request context from AsyncLocalStorage.
 * Returns undefined if no context is active.
 *
 * @returns Current request context or undefined
 *
 * @example
 * ```typescript
 * const ctx = getContext();
 * if (ctx) {
 *   console.log('Correlation ID:', ctx.correlationId);
 * }
 * ```
 */
export function getContext(): RequestContext | undefined {
  return context_storage.getStore();
}

/**
 * Retrieves the correlation ID from the current context.
 * Returns undefined if no context is active.
 *
 * @returns Correlation ID or undefined
 *
 * @example
 * ```typescript
 * const correlationId = getCorrelationId();
 * // Returns: "cor_a3f5d8c9e2b1f4a7" or undefined
 * ```
 */
export function getCorrelationId(): string | undefined {
  return context_storage.getStore()?.correlationId;
}

/**
 * Retrieves the job ID from the current context.
 * Returns undefined if no context or job ID is set.
 *
 * @returns Job ID or undefined
 *
 * @example
 * ```typescript
 * const jobId = getJobId();
 * // Returns: "job_7b2e9f1c4d8a3e6b" or undefined
 * ```
 */
export function getJobId(): string | undefined {
  return context_storage.getStore()?.jobId;
}

/**
 * Sets the job ID in the current context.
 * Throws if no context is active.
 *
 * @param jobId - Job ID to set
 * @throws Error if no active context
 *
 * @example
 * ```typescript
 * runWithContext(() => {
 *   setJobId('job_7b2e9f1c4d8a3e6b');
 * });
 * ```
 */
export function setJobId(jobId: string): void {
  const ctx = context_storage.getStore();
  if (!ctx) {
    throw new Error('Cannot set job ID: no active context');
  }
  ctx.jobId = jobId;
}

/**
 * Updates metadata in the current context.
 * Merges new metadata with existing metadata.
 *
 * @param metadata - Metadata to merge into context
 * @throws Error if no active context
 *
 * @example
 * ```typescript
 * runWithContext(() => {
 *   updateContextMetadata({ userId: 'user-123', action: 'upload' });
 * });
 * ```
 */
export function updateContextMetadata(metadata: Record<string, unknown>): void {
  const ctx = context_storage.getStore();
  if (!ctx) {
    throw new Error('Cannot update metadata: no active context');
  }
  ctx.metadata = { ...ctx.metadata, ...metadata };
}

/**
 * Executes a function within a new request context.
 * Context automatically propagates through all async operations.
 *
 * @param callback - Function to execute with context
 * @param options - Optional context configuration
 * @returns Result of callback execution
 *
 * @example
 * ```typescript
 * const result = await runWithContext(async () => {
 *   const data = await fetchData();
 *   return processData(data);
 * });
 * ```
 */
export function runWithContext<T>(
  callback: () => T,
  options?: {
    correlationId?: string;
    jobId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }
): T {
  const ctx: RequestContext = {
    correlationId: options?.correlationId ?? generateCorrelationId(),
    jobId: options?.jobId,
    userId: options?.userId,
    startTime: Date.now(),
    metadata: options?.metadata,
  };

  return context_storage.run(ctx, callback);
}

/**
 * Executes an async function within a new request context.
 * Convenience wrapper for async operations.
 *
 * @param callback - Async function to execute with context
 * @param options - Optional context configuration
 * @returns Promise resolving to callback result
 *
 * @example
 * ```typescript
 * await runWithContextAsync(async () => {
 *   await logger.info('Processing request');
 *   return await processRequest();
 * }, { userId: 'user-123' });
 * ```
 */
export async function runWithContextAsync<T>(
  callback: () => Promise<T>,
  options?: {
    correlationId?: string;
    jobId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<T> {
  return runWithContext(callback, options);
}

/**
 * Wraps a Next.js API route handler with automatic context management.
 * Extracts correlation ID from headers and creates request context.
 *
 * @param handler - Next.js route handler function
 * @returns Wrapped handler with context management
 *
 * @example
 * ```typescript
 * export const POST = withRequestContext(async (request) => {
 *   logger.info('Request received');
 *   // Context automatically available in logs
 *   return Response.json({ success: true });
 * });
 * ```
 */
export function withRequestContext<T extends (...args: any[]) => any>(
  handler: T
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    // Extract correlation ID from request headers if available
    let correlationId: string | undefined;

    if (args[0] && typeof args[0] === 'object' && 'headers' in args[0]) {
      const request = args[0] as { headers: Headers };
      correlationId = request.headers.get('x-correlation-id') || undefined;
    }

    return runWithContext(() => handler(...args), { correlationId });
  };
}

/**
 * Calculates request duration from context start time.
 * Returns duration in milliseconds.
 *
 * @returns Duration in milliseconds or undefined if no context
 *
 * @example
 * ```typescript
 * runWithContext(() => {
 *   // ... perform work ...
 *   const duration = getRequestDuration();
 *   logger.info('Request complete', { duration });
 * });
 * ```
 */
export function getRequestDuration(): number | undefined {
  const ctx = context_storage.getStore();
  if (!ctx) {
    return undefined;
  }
  return Date.now() - ctx.startTime;
}
