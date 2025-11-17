/**
 * Circuit Breaker Pattern Implementation for OpenAI API Calls
 *
 * Provides production-grade circuit breaker pattern to prevent cascading failures
 * when external APIs (OpenAI) are degraded or unavailable. Implements the classic
 * three-state circuit breaker: CLOSED, OPEN, and HALF_OPEN.
 *
 * Circuit breaker states:
 * - **CLOSED**: Normal operation, requests pass through to the protected function
 * - **OPEN**: Too many failures detected, reject requests immediately without calling the function
 * - **HALF_OPEN**: Testing if the service has recovered, allow limited requests through
 *
 * State transitions:
 * 1. CLOSED → OPEN: After `failureThreshold` consecutive failures
 * 2. OPEN → HALF_OPEN: After `timeout` milliseconds have elapsed
 * 3. HALF_OPEN → CLOSED: After `successThreshold` consecutive successes
 * 4. HALF_OPEN → OPEN: If any failure occurs in half-open state
 *
 * @module lib/utils/circuitBreaker
 */

import { logger } from '@/lib/logging/logger';

/**
 * Circuit breaker states
 *
 * - **CLOSED**: Normal operation, requests pass through
 * - **OPEN**: Circuit is open, requests are rejected immediately
 * - **HALF_OPEN**: Testing recovery, limited requests allowed
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker configuration options
 *
 * @property failureThreshold - Number of consecutive failures before opening circuit
 * @property successThreshold - Number of consecutive successes in half-open state before closing circuit
 * @property timeout - Time in milliseconds to wait before attempting recovery (OPEN → HALF_OPEN)
 * @property name - Name for logging and identification purposes
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit (default: 5) */
  failureThreshold: number;

  /** Number of consecutive successes in half-open state before closing circuit (default: 2) */
  successThreshold: number;

  /** Time in milliseconds to wait before attempting recovery (default: 60000ms / 1 minute) */
  timeout: number;

  /** Name for logging and identification (e.g., 'openai-gpt4', 'openai-whisper') */
  name: string;
}

/**
 * Circuit breaker for protecting against cascading failures
 *
 * Wraps asynchronous operations (typically external API calls) and monitors their
 * success/failure rate. When too many failures occur, the circuit "opens" and
 * subsequent calls fail fast without attempting the operation. After a timeout
 * period, the circuit enters "half-open" state to test if the service has recovered.
 *
 * **Benefits:**
 * - Prevents cascading failures when dependencies are down
 * - Reduces load on failing services, giving them time to recover
 * - Provides fast failure responses instead of waiting for timeouts
 * - Automatic recovery testing without manual intervention
 * - Comprehensive logging for monitoring and debugging
 *
 * **Usage:**
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   successThreshold: 2,
 *   timeout: 60000, // 1 minute
 *   name: 'openai-gpt4'
 * });
 *
 * try {
 *   const result = await breaker.execute(async () => {
 *     return await openai.responses.create({...});
 *   });
 * } catch (error) {
 *   // Handle circuit open or execution failure
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Create circuit breaker for OpenAI GPT-4.1
 * const gptBreaker = new CircuitBreaker({
 *   name: 'openai-gpt4',
 *   failureThreshold: 5,
 *   successThreshold: 2,
 *   timeout: 60000,
 * });
 *
 * // Use in API call
 * const result = await gptBreaker.execute(async () => {
 *   return await client.responses.create({
 *     model: 'gpt-4.1',
 *     input: [...]
 *   });
 * });
 * ```
 */
export class CircuitBreaker {
  /** Current circuit state */
  private state: CircuitState = 'CLOSED';

  /** Count of consecutive failures in current state */
  private failureCount = 0;

  /** Count of consecutive successes in half-open state */
  private successCount = 0;

  /** Timestamp when circuit can transition from OPEN to HALF_OPEN */
  private nextAttempt: number = Date.now();

  /** Circuit breaker configuration */
  private readonly config: CircuitBreakerConfig;

  /**
   * Creates a new circuit breaker instance
   *
   * @param config - Circuit breaker configuration
   *
   * @example
   * ```typescript
   * const breaker = new CircuitBreaker({
   *   name: 'openai-whisper',
   *   failureThreshold: 5,
   *   successThreshold: 2,
   *   timeout: 60000,
   * });
   * ```
   */
  constructor(config: CircuitBreakerConfig) {
    this.config = config;

    logger.info('Circuit breaker initialized', {
      component: 'circuit-breaker',
      name: config.name,
      failureThreshold: config.failureThreshold,
      successThreshold: config.successThreshold,
      timeout: config.timeout,
    });
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * Wraps the provided asynchronous function with circuit breaker logic.
   * If the circuit is OPEN, rejects immediately without calling the function.
   * If the circuit is CLOSED or HALF_OPEN, executes the function and updates
   * circuit state based on success/failure.
   *
   * @template T - Return type of the protected function
   * @param fn - Async function to execute with circuit protection
   * @returns Promise resolving to the function's result
   * @throws Error if circuit is open or if the function throws
   *
   * @example
   * ```typescript
   * const result = await breaker.execute(async () => {
   *   return await someApiCall();
   * });
   * ```
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      // Check if timeout has elapsed
      if (Date.now() < this.nextAttempt) {
        // Circuit is still open, reject request immediately
        logger.warn('Circuit breaker open, rejecting request', {
          component: 'circuit-breaker',
          name: this.config.name,
          state: this.state,
          nextAttempt: new Date(this.nextAttempt).toISOString(),
        });

        throw new Error(`Circuit breaker open for ${this.config.name}`);
      }

      // Timeout has elapsed, transition to half-open
      this.state = 'HALF_OPEN';
      this.successCount = 0;

      logger.info('Circuit breaker transitioning to half-open', {
        component: 'circuit-breaker',
        name: this.config.name,
        state: this.state,
      });
    }

    // Execute the protected function
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   *
   * Updates circuit state based on current state and success count:
   * - In CLOSED state: Resets failure count
   * - In HALF_OPEN state: Increments success count, closes circuit if threshold reached
   *
   * @private
   */
  private onSuccess(): void {
    // Reset failure count on any success
    this.failureCount = 0;

    // Handle half-open state
    if (this.state === 'HALF_OPEN') {
      this.successCount++;

      // Check if we've had enough successes to close the circuit
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;

        logger.info('Circuit breaker closed after recovery', {
          component: 'circuit-breaker',
          name: this.config.name,
          state: this.state,
        });
      }
    }
  }

  /**
   * Handle failed execution
   *
   * Updates circuit state based on current state and failure count:
   * - In CLOSED state: Increments failure count, opens circuit if threshold reached
   * - In HALF_OPEN state: Immediately opens circuit again
   *
   * @private
   */
  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    // Check if we need to open the circuit
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.timeout;

      logger.error('Circuit breaker opened due to failures', {
        component: 'circuit-breaker',
        name: this.config.name,
        state: this.state,
        failureCount: this.failureCount,
        nextAttempt: new Date(this.nextAttempt).toISOString(),
      });
    }
  }

  /**
   * Get current circuit state
   *
   * @returns Current state: 'CLOSED', 'OPEN', or 'HALF_OPEN'
   *
   * @example
   * ```typescript
   * const state = breaker.getState();
   * console.log(`Circuit is ${state}`);
   * ```
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker metrics for monitoring and debugging
   *
   * Returns comprehensive metrics about the current circuit state,
   * useful for dashboards, alerting, and debugging.
   *
   * @returns Object containing circuit metrics
   *
   * @example
   * ```typescript
   * const metrics = breaker.getMetrics();
   * console.log(metrics);
   * // {
   * //   state: 'CLOSED',
   * //   failureCount: 2,
   * //   successCount: 0,
   * //   nextAttempt: null
   * // }
   * ```
   */
  getMetrics() {
    return {
      /** Current circuit state */
      state: this.state,

      /** Number of consecutive failures */
      failureCount: this.failureCount,

      /** Number of consecutive successes in half-open state */
      successCount: this.successCount,

      /** ISO timestamp when circuit will attempt half-open (null if not in OPEN state) */
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null,
    };
  }

  /**
   * Manually reset circuit breaker to CLOSED state
   *
   * Resets all counters and returns circuit to normal operation.
   * Primarily used for testing, but can also be used for manual
   * recovery in production if needed.
   *
   * **Warning:** Use with caution in production. Resetting the circuit
   * bypasses the protection mechanism and may expose the system to
   * cascading failures if the underlying service is still degraded.
   *
   * @example
   * ```typescript
   * // In tests
   * breaker.reset();
   * expect(breaker.getState()).toBe('CLOSED');
   *
   * // In production (emergency only)
   * if (adminConfirmsServiceRecovered) {
   *   breaker.reset();
   * }
   * ```
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();

    logger.info('Circuit breaker manually reset', {
      component: 'circuit-breaker',
      name: this.config.name,
    });
  }
}

/**
 * Pre-configured circuit breaker instances for different OpenAI services
 *
 * These singleton instances provide service-level isolation - failures in
 * one service (e.g., Whisper) won't affect another (e.g., GPT-4.1).
 *
 * **Configuration:**
 * - **failureThreshold**: 5 consecutive failures before opening
 * - **successThreshold**: 2 consecutive successes before closing from half-open
 * - **timeout**: 60 seconds (60000ms) before attempting recovery
 *
 * @example
 * ```typescript
 * import { circuitBreakers } from '@/lib/utils/circuitBreaker';
 *
 * // Use in GPT-4.1 calls
 * const result = await circuitBreakers.openaiGPT4.execute(async () => {
 *   return await client.responses.create({...});
 * });
 *
 * // Use in Whisper calls
 * const transcript = await circuitBreakers.openaiWhisper.execute(async () => {
 *   return await client.audio.transcriptions.create({...});
 * });
 * ```
 */
export const circuitBreakers = {
  /**
   * Circuit breaker for OpenAI GPT-4.1 API calls
   *
   * Used by:
   * - `src/lib/openai/compliance-analysis-modular.ts` (category scoring, narrative generation)
   * - `src/lib/openai/template-generation.ts` (policy template generation)
   */
  openaiGPT4: new CircuitBreaker({
    name: 'openai-gpt4',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
  }),

  /**
   * Circuit breaker for OpenAI Whisper API calls
   *
   * Used by:
   * - `src/lib/openai/whisper.ts` (audio transcription)
   *
   * Separate from GPT-4.1 circuit breaker to provide service-level isolation.
   * Whisper failures won't affect GPT-4.1 operations and vice versa.
   */
  openaiWhisper: new CircuitBreaker({
    name: 'openai-whisper',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
  }),
};
