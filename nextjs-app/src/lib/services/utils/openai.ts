/**
 * OpenAI Client Utility
 * Fire Department Radio Transcription System
 *
 * Provides a singleton OpenAI client instance with cost tracking,
 * error handling, and rate limiting capabilities.
 */

import OpenAI from 'openai';
import { prisma } from '@/lib/db';

/**
 * Token usage information from OpenAI API
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Singleton OpenAI client instance
 */
let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client singleton
 *
 * @returns {OpenAI} OpenAI client instance
 * @throws {Error} If OPENAI_API_KEY is not set
 *
 * @example
 * ```typescript
 * const client = getOpenAIClient();
 * const completion = await client.chat.completions.create({...});
 * ```
 */
export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

/**
 * Track token usage in the database for cost monitoring
 *
 * Saves token usage metrics to the SystemMetrics table for analysis
 * and budget tracking.
 *
 * @param {string} model - OpenAI model used (e.g., 'whisper-1', 'gpt-4o')
 * @param {TokenUsage} usage - Token usage information
 * @param {string} operationType - Type of operation (e.g., 'transcription', 'compliance_audit')
 *
 * @example
 * ```typescript
 * await trackTokenUsage('gpt-4o', {
 *   promptTokens: 500,
 *   completionTokens: 1000,
 *   totalTokens: 1500
 * }, 'compliance_audit');
 * ```
 */
export async function trackTokenUsage(
  model: string,
  usage: TokenUsage,
  operationType: string
): Promise<void> {
  try {
    await prisma.systemMetrics.create({
      data: {
        metricName: 'openai_token_usage',
        metricValue: usage.totalTokens,
        metadata: {
          model,
          operationType,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    // Log error but don't fail the operation
    console.error('Failed to track token usage:', error);
  }
}

/**
 * Calculate estimated cost for token usage
 *
 * Pricing as of January 2025 (approximate):
 * - Whisper: $0.006 per minute
 * - GPT-4o: $0.005 per 1K input tokens, $0.015 per 1K output tokens
 * - GPT-4o-mini: $0.00015 per 1K input tokens, $0.0006 per 1K output tokens
 *
 * @param {string} model - OpenAI model name
 * @param {TokenUsage} usage - Token usage information
 * @returns {number} Estimated cost in USD
 *
 * @example
 * ```typescript
 * const cost = calculateEstimatedCost('gpt-4o', {
 *   promptTokens: 500,
 *   completionTokens: 1000,
 *   totalTokens: 1500
 * });
 * console.log(`Estimated cost: $${cost.toFixed(4)}`);
 * ```
 */
export function calculateEstimatedCost(
  model: string,
  usage: TokenUsage
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.005 / 1000, output: 0.015 / 1000 },
    'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 },
    'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
  };

  const modelPricing = pricing[model] || pricing['gpt-4o'];

  const inputCost = usage.promptTokens * modelPricing.input;
  const outputCost = usage.completionTokens * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * Simple rate limiter for OpenAI API calls
 *
 * Tracks request timestamps and enforces a maximum requests per minute limit.
 * This is a simple in-memory implementation suitable for single-instance deployments.
 * For production multi-instance deployments, use Redis-backed rate limiting.
 */
class RateLimiter {
  private requestTimestamps: number[] = [];
  private readonly maxRequestsPerMinute: number;

  /**
   * Number of slots reserved by concurrent async operations
   *
   * Prevents race conditions where multiple async waitForSlot() calls
   * check availability simultaneously before any records a timestamp.
   * This ensures atomic slot reservation.
   */
  private pendingSlots: number = 0;

  constructor(maxRequestsPerMinute: number = 60) {
    this.maxRequestsPerMinute = maxRequestsPerMinute;
  }

  /**
   * Clean up old timestamps (removes entries older than 1 minute)
   * This is a private helper to avoid duplication
   */
  private cleanOldTimestamps(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => timestamp > oneMinuteAgo
    );

    // Ensure pending slots never exceed actual capacity
    if (this.pendingSlots > this.maxRequestsPerMinute) {
      this.pendingSlots = 0;
    }
  }

  /**
   * Check if a request can be made without exceeding rate limit
   *
   * @returns {boolean} True if request is allowed
   */
  canMakeRequest(): boolean {
    this.cleanOldTimestamps();
    return this.requestTimestamps.length < this.maxRequestsPerMinute;
  }

  /**
   * Record a request timestamp
   */
  recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Wait until a request can be made
   *
   * Atomically checks for available slot and records the request.
   * This prevents race conditions where multiple concurrent calls
   * could both pass the canMakeRequest() check before either records.
   *
   * @returns {Promise<void>} Resolves when request can proceed
   */
  async waitForSlot(): Promise<void> {
    while (true) {
      this.cleanOldTimestamps();

      // Atomic check with pending slot tracking
      const availableSlots = this.maxRequestsPerMinute -
        this.requestTimestamps.length - this.pendingSlots;

      if (availableSlots > 0) {
        this.pendingSlots++; // Reserve slot immediately
        this.recordRequest();
        this.pendingSlots--; // Release reservation
        return;
      }

      // Wait 1 second before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /**
   * Get current request count in the last minute
   *
   * @returns {number} Number of requests in last minute
   */
  getCurrentCount(): number {
    this.cleanOldTimestamps();
    return this.requestTimestamps.length;
  }
}

/**
 * Global rate limiter instance
 */
const rateLimiterPerMinute =
  parseInt(process.env.RATE_LIMIT_PER_MINUTE || '100', 10);
export const openaiRateLimiter = new RateLimiter(rateLimiterPerMinute);

/**
 * Make a rate-limited request to OpenAI API
 *
 * Automatically waits if rate limit is exceeded before making the request.
 *
 * @template T The return type of the API call
 * @param {Function} apiCall - Function that makes the OpenAI API call
 * @returns {Promise<T>} The result of the API call
 *
 * @example
 * ```typescript
 * const result = await withRateLimit(async () => {
 *   return await client.chat.completions.create({...});
 * });
 * ```
 */
export async function withRateLimit<T>(
  apiCall: () => Promise<T>
): Promise<T> {
  await openaiRateLimiter.waitForSlot();
  return await apiCall();
}

/**
 * Get current rate limit status
 *
 * @returns {object} Rate limit status information
 */
export function getRateLimitStatus() {
  return {
    currentCount: openaiRateLimiter.getCurrentCount(),
    maxPerMinute: rateLimiterPerMinute,
    available: rateLimiterPerMinute - openaiRateLimiter.getCurrentCount(),
  };
}
