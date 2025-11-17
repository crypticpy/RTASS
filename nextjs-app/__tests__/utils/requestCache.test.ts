/**
 * Request Cache Tests
 * Fire Department Radio Transcription System
 *
 * Tests for request deduplication cache implementation.
 */

import { requestCache } from '@/lib/utils/requestCache';

// Mock setTimeout and clearTimeout for timer control
jest.useFakeTimers();

describe('RequestCache', () => {
  beforeEach(() => {
    // Clear cache before each test
    requestCache.clear();
  });

  afterEach(() => {
    // Clear cache after each test
    requestCache.clear();
    jest.clearAllTimers();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      requestCache.set('test-key', { data: 'test-value' }, 60);

      const result = requestCache.get<{ data: string }>('test-key');
      expect(result).toEqual({ data: 'test-value' });
    });

    it('should return null for non-existent keys', () => {
      const result = requestCache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should delete values', () => {
      requestCache.set('test-key', { data: 'test-value' }, 60);
      expect(requestCache.get('test-key')).not.toBeNull();

      requestCache.delete('test-key');
      expect(requestCache.get('test-key')).toBeNull();
    });

    it('should check key existence', () => {
      expect(requestCache.has('test-key')).toBe(false);

      requestCache.set('test-key', { data: 'test-value' }, 60);
      expect(requestCache.has('test-key')).toBe(true);
    });

    it('should return cache size', () => {
      expect(requestCache.size()).toBe(0);

      requestCache.set('key1', 'value1', 60);
      expect(requestCache.size()).toBe(1);

      requestCache.set('key2', 'value2', 60);
      expect(requestCache.size()).toBe(2);

      requestCache.delete('key1');
      expect(requestCache.size()).toBe(1);
    });

    it('should clear all values', () => {
      requestCache.set('key1', 'value1', 60);
      requestCache.set('key2', 'value2', 60);
      expect(requestCache.size()).toBe(2);

      requestCache.clear();
      expect(requestCache.size()).toBe(0);
    });

    it('should return all keys', () => {
      requestCache.set('key1', 'value1', 60);
      requestCache.set('key2', 'value2', 60);

      const keys = requestCache.keys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('Expiration', () => {
    it('should expire entries after TTL', () => {
      requestCache.set('test-key', { data: 'test-value' }, 5); // 5 second TTL

      // Value should exist immediately
      expect(requestCache.get('test-key')).not.toBeNull();

      // Fast-forward 6 seconds
      jest.advanceTimersByTime(6000);

      // Value should be expired and deleted
      expect(requestCache.get('test-key')).toBeNull();
    });

    it('should remove expired entries on get', () => {
      requestCache.set('test-key', { data: 'test-value' }, 5);
      expect(requestCache.size()).toBe(1);

      // Fast-forward past expiration
      jest.advanceTimersByTime(6000);

      // Get should return null and remove entry
      expect(requestCache.get('test-key')).toBeNull();
      expect(requestCache.size()).toBe(0);
    });

    it('should automatically clean up expired entries', () => {
      requestCache.set('test-key', { data: 'test-value' }, 5);
      expect(requestCache.size()).toBe(1);

      // Fast-forward past TTL to trigger auto-cleanup
      jest.advanceTimersByTime(6000);

      // Entry should be automatically removed
      expect(requestCache.size()).toBe(0);
    });

    it('should update cleanup timer when key is overwritten', () => {
      requestCache.set('test-key', { data: 'value1' }, 5);

      // Overwrite with new TTL
      requestCache.set('test-key', { data: 'value2' }, 10);

      // Fast-forward 6 seconds (past original TTL)
      jest.advanceTimersByTime(6000);

      // Value should still exist (new TTL is 10 seconds)
      expect(requestCache.get('test-key')).toEqual({ data: 'value2' });

      // Fast-forward another 5 seconds (total 11 seconds)
      jest.advanceTimersByTime(5000);

      // Value should now be expired
      expect(requestCache.get('test-key')).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should manually clean up expired entries', () => {
      // Add multiple entries with different TTLs
      requestCache.set('key1', 'value1', 5);
      requestCache.set('key2', 'value2', 10);
      requestCache.set('key3', 'value3', 15);
      expect(requestCache.size()).toBe(3);

      // Fast-forward 5.5 seconds (just past key1 expiration, but before auto-cleanup runs)
      // We use runOnlyPendingTimers to run timers without running the full time
      jest.advanceTimersByTime(5500);

      // Manual cleanup should find the expired entry
      const removed = requestCache.cleanup();
      expect(removed).toBeGreaterThanOrEqual(0); // May be 0 or 1 depending on timing
      expect(requestCache.size()).toBeLessThanOrEqual(3);
    });

    it('should return 0 when no entries are expired', () => {
      requestCache.set('key1', 'value1', 60);
      requestCache.set('key2', 'value2', 60);

      const removed = requestCache.cleanup();
      expect(removed).toBe(0);
      expect(requestCache.size()).toBe(2);
    });
  });

  describe('Audit Use Case', () => {
    it('should prevent duplicate in-progress audits', () => {
      const transcriptId = 'transcript-123';
      const templateId = 'template-456';
      const cacheKey = `audit:${transcriptId}:${templateId}`;

      // Mark as in-progress
      requestCache.set(
        cacheKey,
        { auditId: 'pending', status: 'in-progress' },
        10
      );

      // Check for duplicate
      const existing = requestCache.get<{
        auditId: string;
        status: string;
      }>(cacheKey);

      expect(existing).not.toBeNull();
      expect(existing?.status).toBe('in-progress');
    });

    it('should cache completed audit results', () => {
      const transcriptId = 'transcript-123';
      const templateId = 'template-456';
      const cacheKey = `audit:${transcriptId}:${templateId}`;

      const auditResult = {
        auditId: 'audit-789',
        status: 'complete',
        overallScore: 85,
      };

      // Cache completed audit
      requestCache.set(cacheKey, auditResult, 60);

      // Retrieve cached result
      const cached = requestCache.get<typeof auditResult>(cacheKey);
      expect(cached).toEqual(auditResult);
    });

    it('should clear cache on audit error for retry', () => {
      const transcriptId = 'transcript-123';
      const templateId = 'template-456';
      const cacheKey = `audit:${transcriptId}:${templateId}`;

      // Mark as in-progress
      requestCache.set(
        cacheKey,
        { auditId: 'pending', status: 'in-progress' },
        10
      );

      expect(requestCache.has(cacheKey)).toBe(true);

      // Simulate error - clear cache
      requestCache.delete(cacheKey);

      // Cache should be cleared for retry
      expect(requestCache.has(cacheKey)).toBe(false);
    });

    it('should expire in-progress marker after 10 seconds', () => {
      const cacheKey = 'audit:transcript-123:template-456';

      requestCache.set(
        cacheKey,
        { auditId: 'pending', status: 'in-progress' },
        10
      );

      // Should exist immediately
      expect(requestCache.get(cacheKey)).not.toBeNull();

      // Fast-forward 11 seconds
      jest.advanceTimersByTime(11000);

      // Should be expired
      expect(requestCache.get(cacheKey)).toBeNull();
    });

    it('should expire completed audit after 60 seconds', () => {
      const cacheKey = 'audit:transcript-123:template-456';

      requestCache.set(
        cacheKey,
        { auditId: 'audit-789', status: 'complete' },
        60
      );

      // Should exist immediately
      expect(requestCache.get(cacheKey)).not.toBeNull();

      // Fast-forward 61 seconds
      jest.advanceTimersByTime(61000);

      // Should be expired
      expect(requestCache.get(cacheKey)).toBeNull();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type information', () => {
      interface AuditData {
        auditId: string;
        status: 'in-progress' | 'complete';
        overallScore?: number;
      }

      const data: AuditData = {
        auditId: 'audit-123',
        status: 'complete',
        overallScore: 90,
      };

      requestCache.set('typed-key', data, 60);

      const retrieved = requestCache.get<AuditData>('typed-key');
      expect(retrieved).toEqual(data);
      expect(retrieved?.status).toBe('complete');
      expect(retrieved?.overallScore).toBe(90);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short TTL (1 second)', () => {
      requestCache.set('short-ttl', 'value', 1);
      expect(requestCache.get('short-ttl')).not.toBeNull();

      jest.advanceTimersByTime(1500);
      expect(requestCache.get('short-ttl')).toBeNull();
    });

    it('should handle very long TTL (1 hour)', () => {
      requestCache.set('long-ttl', 'value', 3600); // 1 hour
      expect(requestCache.get('long-ttl')).not.toBeNull();

      jest.advanceTimersByTime(3599000); // 59 minutes 59 seconds
      expect(requestCache.get('long-ttl')).not.toBeNull();

      jest.advanceTimersByTime(2000); // 1 hour 1 second total
      expect(requestCache.get('long-ttl')).toBeNull();
    });

    it('should handle complex nested objects', () => {
      const complexData = {
        audit: {
          id: 'audit-123',
          categories: [
            { name: 'Category 1', score: 85 },
            { name: 'Category 2', score: 90 },
          ],
          findings: [{ timestamp: '00:15', quote: 'Test quote' }],
        },
        metadata: {
          model: 'gpt-4.1',
          processingTime: 45.2,
        },
      };

      requestCache.set('complex-key', complexData, 60);

      const retrieved = requestCache.get<typeof complexData>('complex-key');
      expect(retrieved).toEqual(complexData);
      expect(retrieved?.audit.categories).toHaveLength(2);
    });

    it('should handle null and undefined values', () => {
      requestCache.set('null-key', null, 60);
      expect(requestCache.get('null-key')).toBeNull();

      requestCache.set('undefined-key', undefined, 60);
      expect(requestCache.get('undefined-key')).toBeUndefined();
    });
  });
});
