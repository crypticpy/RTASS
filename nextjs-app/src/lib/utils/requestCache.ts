/**
 * Request Cache for Deduplication
 * Fire Department Radio Transcription System
 *
 * Simple in-memory request cache for deduplication of expensive operations.
 * Prevents duplicate audit requests while operations are in-progress and
 * provides short-term caching of completed results.
 *
 * **Production Considerations**:
 * - For distributed deployments, replace with Redis or similar distributed cache
 * - For serverless deployments, consider external cache like Upstash Redis
 * - Current implementation is single-instance only (does not share across processes)
 *
 * @example
 * ```typescript
 * import { requestCache } from '@/lib/utils/requestCache';
 *
 * // Check for duplicate request
 * const existing = requestCache.get<AuditResult>('audit:transcript-123:template-456');
 * if (existing) {
 *   return existing; // Return cached result
 * }
 *
 * // Mark as in-progress
 * requestCache.set('audit:transcript-123:template-456', { status: 'in-progress' }, 10);
 *
 * // ... perform operation ...
 *
 * // Cache completed result
 * requestCache.set('audit:transcript-123:template-456', result, 60);
 * ```
 */

/**
 * Cache entry with automatic expiration
 */
interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Unix timestamp (milliseconds) when entry expires */
  expiresAt: number;
}

/**
 * Request cache for deduplication with automatic expiration
 */
class RequestCache {
  /** In-memory cache storage */
  private cache = new Map<string, CacheEntry<any>>();

  /** Cleanup timer IDs for automatic expiration */
  private cleanupTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Get cached value if it exists and hasn't expired
   *
   * @param {string} key - Cache key
   * @returns {T | null} Cached value or null if not found or expired
   *
   * @example
   * ```typescript
   * const result = requestCache.get<AuditResult>('audit:123:456');
   * if (result) {
   *   console.log('Cache hit:', result);
   * }
   * ```
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached value with TTL (time-to-live) in seconds
   *
   * Automatically schedules cleanup after TTL expires.
   *
   * @param {string} key - Cache key
   * @param {T} data - Data to cache
   * @param {number} ttlSeconds - Time-to-live in seconds
   *
   * @example
   * ```typescript
   * // Cache for 60 seconds
   * requestCache.set('audit:123:456', auditResult, 60);
   *
   * // Mark as in-progress for 10 seconds
   * requestCache.set('audit:123:456', { status: 'in-progress' }, 10);
   * ```
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data, expiresAt });

    // Clear existing cleanup timer if present
    const existingTimer = this.cleanupTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule automatic cleanup after TTL
    const cleanupTimer = setTimeout(() => {
      this.delete(key);
    }, ttlSeconds * 1000);

    this.cleanupTimers.set(key, cleanupTimer);
  }

  /**
   * Delete cached value and cancel cleanup timer
   *
   * @param {string} key - Cache key to delete
   *
   * @example
   * ```typescript
   * // Clear cache on error so request can be retried
   * requestCache.delete('audit:123:456');
   * ```
   */
  delete(key: string): void {
    this.cache.delete(key);

    // Cancel cleanup timer
    const timer = this.cleanupTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(key);
    }
  }

  /**
   * Clear all cached values and cancel all cleanup timers
   *
   * **WARNING**: This clears the entire cache. Use with caution.
   *
   * @example
   * ```typescript
   * // Clear cache during testing or maintenance
   * requestCache.clear();
   * ```
   */
  clear(): void {
    // Cancel all cleanup timers
    const timers = Array.from(this.cleanupTimers.values());
    for (const timer of timers) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.cleanupTimers.clear();
  }

  /**
   * Get current cache size (number of entries)
   *
   * Useful for monitoring and debugging.
   *
   * @returns {number} Number of cached entries
   *
   * @example
   * ```typescript
   * console.log('Cache size:', requestCache.size());
   * ```
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists in cache (regardless of expiration)
   *
   * @param {string} key - Cache key to check
   * @returns {boolean} True if key exists in cache
   *
   * @example
   * ```typescript
   * if (requestCache.has('audit:123:456')) {
   *   console.log('Key exists in cache');
   * }
   * ```
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get all cache keys
   *
   * Useful for debugging and monitoring.
   *
   * @returns {string[]} Array of all cache keys
   *
   * @example
   * ```typescript
   * console.log('Cached keys:', requestCache.keys());
   * ```
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Remove expired entries from cache
   *
   * Called automatically on a schedule, but can be invoked manually
   * for immediate cleanup.
   *
   * @returns {number} Number of entries removed
   *
   * @example
   * ```typescript
   * const removed = requestCache.cleanup();
   * console.log(`Removed ${removed} expired entries`);
   * ```
   */
  cleanup(): number {
    let removed = 0;
    const now = Date.now();

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

/**
 * Singleton request cache instance
 *
 * **Important**: This is a single-instance in-memory cache.
 * For distributed deployments, replace with Redis or similar.
 *
 * @example
 * ```typescript
 * import { requestCache } from '@/lib/utils/requestCache';
 *
 * // Check cache
 * const cached = requestCache.get('my-key');
 *
 * // Set cache with 60 second TTL
 * requestCache.set('my-key', myData, 60);
 * ```
 */
export const requestCache = new RequestCache();

/**
 * Periodic cleanup interval (runs every 5 minutes)
 *
 * Removes expired entries to prevent memory leaks.
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Schedule periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const removed = requestCache.cleanup();
    if (removed > 0) {
      // Only log if entries were removed
      console.debug(
        `[RequestCache] Periodic cleanup removed ${removed} expired entries`
      );
    }
  }, CLEANUP_INTERVAL_MS);
}
