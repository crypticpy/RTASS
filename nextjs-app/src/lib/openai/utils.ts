/**
 * Utility functions for OpenAI integration
 *
 * Provides retry logic, token estimation, rate limit handling,
 * and response parsing utilities.
 */

import { RateLimitError, InvalidResponseError, OpenAIError } from './errors';

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn Function to retry
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @param initialDelayMs Initial delay in milliseconds (default: 1000)
 * @returns Result of the function
 * @throws Last error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await openai.chat.completions.create({...}),
 *   3
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if it's a retryable error
      const isRetryable = isRetryableError(error);
      if (!isRetryable) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = initialDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 0.1 * delay; // Add 0-10% jitter
      const totalDelay = delay + jitter;

      console.warn(
        `Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${Math.round(totalDelay)}ms...`,
        error
      );

      await sleep(totalDelay);
    }
  }

  throw lastError;
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  // Rate limit errors are retryable
  if (error instanceof RateLimitError) {
    return true;
  }

  // Check for OpenAI SDK error types
  const err = error as any;

  // Network errors are retryable
  if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
    return true;
  }

  // OpenAI rate limit (429) and server errors (500+) are retryable
  if (err.status === 429 || (err.status >= 500 && err.status < 600)) {
    return true;
  }

  return false;
}

/**
 * Estimate token count for a text string
 *
 * Uses a simple heuristic: ~4 characters per token for English text.
 * This is an approximation - for exact counts, use tiktoken library.
 *
 * @param text Text to estimate tokens for
 * @returns Estimated token count
 *
 * @example
 * ```typescript
 * const tokens = estimateTokens("Hello, world!");
 * console.log(tokens); // ~3
 * ```
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Rough estimate: 4 characters per token for English
  // Add extra for whitespace and punctuation
  const charCount = text.length;
  const wordCount = text.split(/\s+/).length;

  // Use weighted average: characters/4 + words/0.75
  const estimate = Math.ceil(charCount / 4 + wordCount * 0.33);

  return estimate;
}

/**
 * Handle OpenAI rate limit errors
 *
 * @param error Error from OpenAI API
 * @returns Delay in milliseconds before retry
 * @throws RateLimitError if rate limit detected
 */
export async function handleRateLimit(error: any): Promise<number> {
  // Check if it's a rate limit error
  if (error?.status === 429) {
    // Try to extract retry-after header
    const retryAfter = error?.headers?.['retry-after'];
    const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000; // Default to 60s

    throw new RateLimitError(
      `OpenAI API rate limit exceeded. Retry after ${retryAfterMs}ms`,
      retryAfterMs,
      error
    );
  }

  return 0;
}

/**
 * Parse and validate JSON response from OpenAI
 *
 * @param response JSON string response
 * @returns Parsed and validated object
 * @throws InvalidResponseError if parsing fails or validation fails
 *
 * @example
 * ```typescript
 * interface MyResponse {
 *   result: string;
 * }
 *
 * const parsed = parseJSONResponse<MyResponse>(
 *   '{"result": "success"}'
 * );
 * ```
 */
export function parseJSONResponse<T>(response: string): T {
  if (!response || typeof response !== 'string') {
    throw new InvalidResponseError(
      'Response is empty or not a string',
      response
    );
  }

  try {
    // Remove any markdown code fences if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned) as T;
    return parsed;
  } catch (error) {
    throw new InvalidResponseError(
      `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      response,
      error
    );
  }
}

/**
 * Validate that a parsed response has required fields
 *
 * @param obj Parsed object
 * @param requiredFields Array of required field names
 * @throws InvalidResponseError if any required field is missing
 */
export function validateResponseFields(
  obj: any,
  requiredFields: string[]
): void {
  if (!obj || typeof obj !== 'object') {
    throw new InvalidResponseError('Response is not an object', obj);
  }

  const missing = requiredFields.filter((field) => !(field in obj));

  if (missing.length > 0) {
    throw new InvalidResponseError(
      `Response missing required fields: ${missing.join(', ')}`,
      obj
    );
  }
}

/**
 * Extract error message from various error types
 *
 * @param error Unknown error object
 * @returns Human-readable error message
 */
export function extractErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }

  return JSON.stringify(error);
}

/**
 * Log API call for debugging and cost tracking
 *
 * @param operation Operation name (e.g., 'transcribe', 'analyze')
 * @param model Model used
 * @param inputTokens Estimated input tokens
 * @param outputTokens Estimated output tokens
 */
export function logAPICall(
  operation: string,
  model: string,
  inputTokens?: number,
  outputTokens?: number
): void {
  const timestamp = new Date().toISOString();
  const totalTokens = (inputTokens || 0) + (outputTokens || 0);

  console.log(
    JSON.stringify({
      timestamp,
      operation,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
    })
  );
}
