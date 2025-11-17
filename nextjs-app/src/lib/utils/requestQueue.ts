/**
 * Request Queue with Concurrency Control and Rate Limiting
 *
 * Provides centralized request queueing with:
 * - Concurrency limiting (max simultaneous requests)
 * - Rate limiting (max requests per time window)
 * - Priority-based ordering (higher priority processed first)
 * - Automatic request tracking and metrics
 * - Integration with logging system
 *
 * Use this to prevent overwhelming external APIs (like OpenAI) with
 * too many concurrent or rapid requests. Works alongside retry logic:
 * - Queue controls request admission (when requests can start)
 * - Retry logic handles individual request failures
 *
 * @module lib/utils/requestQueue
 */

import { logger } from '@/lib/logging/logger';

/**
 * Request queue item with priority and timing information
 *
 * @template T - Return type of the queued function
 */
interface QueueItem<T> {
  /** Function to execute when request can proceed */
  fn: () => Promise<T>;
  /** Promise resolve callback */
  resolve: (value: T) => void;
  /** Promise reject callback */
  reject: (error: any) => void;
  /** Priority level (higher = more important, processed first) */
  priority: number;
  /** Timestamp when request was enqueued (for wait time tracking) */
  enqueueTime: number;
}

/**
 * Request queue configuration
 */
export interface RequestQueueConfig {
  /** Maximum number of requests that can run concurrently */
  maxConcurrent: number;
  /** Maximum number of requests allowed per time window */
  maxRequestsPerWindow: number;
  /** Time window in milliseconds for rate limiting */
  windowMs: number;
  /** Queue name for logging and identification */
  name: string;
}

/**
 * Request queue metrics for monitoring
 */
export interface RequestQueueMetrics {
  /** Number of requests waiting in queue */
  queueLength: number;
  /** Number of requests currently running */
  running: number;
  /** Number of requests made in current time window */
  requestsInWindow: number;
  /** Maximum concurrent requests allowed */
  maxConcurrent: number;
  /** Maximum requests per window allowed */
  maxRequestsPerWindow: number;
  /** Wait time of oldest queued request in milliseconds (0 if queue empty) */
  oldestWaitMs: number;
}

/**
 * Request queue with concurrency control and rate limiting
 *
 * Manages request execution to prevent overwhelming external services.
 * Requests are queued when limits are reached and processed as capacity
 * becomes available.
 *
 * Features:
 * - **Concurrency Control**: Limits simultaneous requests to prevent resource exhaustion
 * - **Rate Limiting**: Enforces requests-per-window limits using rolling window
 * - **Priority Queue**: Higher priority requests processed before lower priority
 * - **Automatic Tracking**: Timestamps all requests for rate limit enforcement
 * - **Metrics**: Exposes queue depth, running count, wait times for monitoring
 * - **Logging**: Integrates with structured logging system
 *
 * @example Basic Usage
 * ```typescript
 * const queue = new RequestQueue({
 *   maxConcurrent: 5,
 *   maxRequestsPerWindow: 50,
 *   windowMs: 60000, // 1 minute
 *   name: 'openai-api'
 * });
 *
 * // Enqueue a request with default priority
 * const result = await queue.enqueue(
 *   async () => await openai.responses.create({...})
 * );
 * ```
 *
 * @example Priority-Based Queueing
 * ```typescript
 * // High priority user request
 * const userResult = await queue.enqueue(
 *   async () => await processUserRequest(),
 *   2 // higher priority
 * );
 *
 * // Low priority background task
 * const bgResult = await queue.enqueue(
 *   async () => await processBackgroundTask(),
 *   0 // lower priority
 * );
 * ```
 *
 * @example Monitoring Queue Metrics
 * ```typescript
 * const metrics = queue.getMetrics();
 * console.log(`Queue depth: ${metrics.queueLength}`);
 * console.log(`Running: ${metrics.running}/${metrics.maxConcurrent}`);
 * console.log(`Rate: ${metrics.requestsInWindow}/${metrics.maxRequestsPerWindow} per minute`);
 * ```
 */
export class RequestQueue {
  /** Internal queue of pending requests (sorted by priority) */
  private queue: QueueItem<any>[] = [];

  /** Count of currently executing requests */
  private running = 0;

  /** Timestamps of requests in current rolling window */
  private requestTimestamps: number[] = [];

  /** Queue configuration */
  private readonly config: RequestQueueConfig;

  /** Interval handle for timestamp cleanup */
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Creates a new request queue
   *
   * @param config - Queue configuration
   */
  constructor(config: RequestQueueConfig) {
    this.config = config;

    logger.info('Request queue initialized', {
      component: 'request-queue',
      name: config.name,
      maxConcurrent: config.maxConcurrent,
      maxRequestsPerWindow: config.maxRequestsPerWindow,
      windowMs: config.windowMs,
    });

    // Set up automatic timestamp cleanup every minute
    // This prevents memory leaks from timestamp accumulation
    this.cleanupInterval = setInterval(() => this.cleanupTimestamps(), 60000);
  }

  /**
   * Enqueue a request with optional priority
   *
   * Higher priority requests are processed before lower priority requests.
   * The request will be executed when:
   * 1. Concurrency limit allows (running < maxConcurrent)
   * 2. Rate limit allows (requests in window < maxRequestsPerWindow)
   *
   * Priority levels (suggested convention):
   * - 0: Background/batch processing
   * - 1: Normal user-initiated requests (default)
   * - 2: High-priority user requests
   * - 3: Critical/emergency operations
   *
   * @template T - Return type of the queued function
   * @param fn - Async function to execute
   * @param priority - Priority level (default: 0, higher = more important)
   * @returns Promise that resolves with function result
   *
   * @example
   * ```typescript
   * // Normal priority request
   * const result = await queue.enqueue(
   *   async () => await apiCall()
   * );
   *
   * // High priority request
   * const urgentResult = await queue.enqueue(
   *   async () => await urgentApiCall(),
   *   2
   * );
   * ```
   */
  async enqueue<T>(fn: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      const item: QueueItem<T> = {
        fn,
        resolve,
        reject,
        priority,
        enqueueTime: Date.now(),
      };

      // Insert by priority (higher priority first)
      // Find first item with lower priority and insert before it
      const index = this.queue.findIndex((q) => q.priority < priority);
      if (index === -1) {
        // No lower priority items, add to end
        this.queue.push(item);
      } else {
        // Insert before first lower priority item
        this.queue.splice(index, 0, item);
      }

      // Try to process queue immediately
      this.processQueue();
    });
  }

  /**
   * Process queued requests respecting concurrency and rate limits
   *
   * Called automatically when:
   * - New request is enqueued
   * - Running request completes
   * - Timestamp cleanup occurs
   *
   * Processes as many requests as limits allow, then waits for
   * capacity to free up.
   *
   * @private
   */
  private processQueue(): void {
    // Process requests while we have capacity and requests waiting
    while (
      this.queue.length > 0 &&
      this.running < this.config.maxConcurrent &&
      this.canMakeRequest()
    ) {
      const item = this.queue.shift()!;
      this.running++;

      // Track request timestamp for rate limiting
      const now = Date.now();
      this.requestTimestamps.push(now);

      // Calculate and log wait time if significant
      const waitTime = now - item.enqueueTime;
      if (waitTime > 1000) {
        logger.warn('Request delayed in queue', {
          component: 'request-queue',
          name: this.config.name,
          waitTimeMs: waitTime,
          queueLength: this.queue.length,
          running: this.running,
        });
      }

      // Execute request (don't await - process concurrently)
      this.executeRequest(item);
    }

    // Log queue status if requests are waiting
    if (this.queue.length > 0) {
      logger.debug('Requests waiting in queue', {
        component: 'request-queue',
        name: this.config.name,
        queueLength: this.queue.length,
        running: this.running,
        requestsInWindow: this.requestTimestamps.length,
        oldestWaitMs: Date.now() - this.queue[0].enqueueTime,
      });
    }
  }

  /**
   * Execute a single queued request
   *
   * Handles request execution, promise resolution/rejection,
   * and queue processing continuation.
   *
   * @template T - Return type of the request
   * @param item - Queue item to execute
   * @private
   */
  private async executeRequest<T>(item: QueueItem<T>): Promise<void> {
    try {
      // Execute the queued function
      const result = await item.fn();

      // Resolve the promise returned by enqueue()
      item.resolve(result);
    } catch (error) {
      // Reject the promise returned by enqueue()
      item.reject(error);
    } finally {
      // Decrement running count
      this.running--;

      // Try to process more requests now that we have capacity
      this.processQueue();
    }
  }

  /**
   * Check if we can make another request based on rate limits
   *
   * Uses rolling window: counts requests in the last `windowMs` milliseconds.
   * Old timestamps are automatically removed before counting.
   *
   * @returns True if request can proceed, false if rate limit reached
   * @private
   */
  private canMakeRequest(): boolean {
    // Clean up old timestamps outside the window
    this.cleanupTimestamps();

    // Check if we're under the rate limit
    return this.requestTimestamps.length < this.config.maxRequestsPerWindow;
  }

  /**
   * Remove timestamps outside the current time window
   *
   * Called automatically:
   * - Before each rate limit check
   * - Every 60 seconds via interval
   *
   * Prevents memory leaks from timestamp accumulation.
   *
   * @private
   */
  private cleanupTimestamps(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > cutoff);
  }

  /**
   * Get current queue metrics for monitoring
   *
   * Returns real-time statistics about queue state, useful for:
   * - Monitoring dashboards
   * - Alerting on queue depth
   * - Performance analysis
   * - Capacity planning
   *
   * @returns Current queue metrics
   *
   * @example
   * ```typescript
   * const metrics = queue.getMetrics();
   *
   * // Check for concerning queue depth
   * if (metrics.queueLength > 50) {
   *   console.warn('Queue backing up!', metrics);
   * }
   *
   * // Log current capacity utilization
   * console.log(`Running: ${metrics.running}/${metrics.maxConcurrent}`);
   * console.log(`Rate: ${metrics.requestsInWindow}/${metrics.maxRequestsPerWindow}`);
   * ```
   */
  getMetrics(): RequestQueueMetrics {
    return {
      queueLength: this.queue.length,
      running: this.running,
      requestsInWindow: this.requestTimestamps.length,
      maxConcurrent: this.config.maxConcurrent,
      maxRequestsPerWindow: this.config.maxRequestsPerWindow,
      oldestWaitMs: this.queue.length > 0 ? Date.now() - this.queue[0].enqueueTime : 0,
    };
  }

  /**
   * Clear the queue and reset all state
   *
   * Removes all pending requests, resets counters, and clears timestamps.
   * Use with caution - pending requests will not be executed or rejected.
   *
   * Primarily useful for:
   * - Testing/cleanup
   * - Emergency queue drain
   * - Shutdown procedures
   *
   * @example
   * ```typescript
   * // Clear queue during shutdown
   * process.on('SIGTERM', () => {
   *   queue.clear();
   *   process.exit(0);
   * });
   * ```
   */
  clear(): void {
    this.queue = [];
    this.running = 0;
    this.requestTimestamps = [];

    logger.info('Request queue cleared', {
      component: 'request-queue',
      name: this.config.name,
    });
  }

  /**
   * Cleanup resources when queue is no longer needed
   *
   * Stops the automatic timestamp cleanup interval to prevent memory leaks.
   * Call this when shutting down the application.
   *
   * @example
   * ```typescript
   * process.on('SIGTERM', () => {
   *   queue.destroy();
   * });
   * ```
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    logger.debug('Request queue destroyed', {
      component: 'request-queue',
      name: this.config.name,
    });
  }
}

/**
 * Singleton request queues for different services
 *
 * Pre-configured queue instances for common use cases.
 * Import and use directly throughout the application.
 *
 * @example
 * ```typescript
 * import { requestQueues } from '@/lib/utils/requestQueue';
 *
 * const result = await requestQueues.openaiAPI.enqueue(
 *   async () => await openai.responses.create({...}),
 *   1 // normal priority
 * );
 * ```
 */
export const requestQueues = {
  /**
   * OpenAI API request queue
   *
   * Configuration:
   * - Max 10 concurrent requests (prevents overwhelming API)
   * - Max 50 requests per minute (safe default, well below typical limits)
   * - 60-second rolling window
   *
   * Adjust these limits based on your OpenAI tier:
   * - Free tier: ~3 requests/min, ~60k tokens/min
   * - Tier 1: ~500 requests/min, ~10M tokens/min
   * - Tier 5: ~10k requests/min, ~800M tokens/min
   */
  openaiAPI: new RequestQueue({
    name: 'openai-api',
    maxConcurrent: 10,
    maxRequestsPerWindow: 50,
    windowMs: 60000, // 1 minute
  }),
};
