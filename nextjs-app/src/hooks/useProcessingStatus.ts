/**
 * useProcessingStatus Hook
 *
 * Custom React hook for polling incident processing status in real-time.
 * Automatically polls the /api/incidents/[id]/status endpoint at a configurable interval.
 * Stops polling when processing is complete or encounters an error.
 *
 * @example
 * ```tsx
 * const { data, error, isLoading, refetch } = useProcessingStatus(incidentId);
 *
 * if (isLoading && !data) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 * if (data) return <ProcessingStatus data={data} />;
 * ```
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProcessingStatusResponse } from '@/types/incident';

/**
 * Hook configuration options
 */
export interface UseProcessingStatusOptions {
  /** Polling interval in milliseconds (default: 2500ms / 2.5 seconds) */
  pollInterval?: number;
  /** Maximum number of retry attempts on error (default: 3) */
  maxRetries?: number;
  /** Enable automatic polling (default: true) */
  enabled?: boolean;
}

/**
 * Hook return value
 */
export interface UseProcessingStatusResult {
  /** Latest processing status data from API */
  data: ProcessingStatusResponse | null;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether initial fetch is in progress */
  isLoading: boolean;
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Manually trigger a status refetch */
  refetch: () => Promise<void>;
}

const DEFAULT_POLL_INTERVAL = 2500; // 2.5 seconds
const DEFAULT_MAX_RETRIES = 3;

/**
 * Custom hook for polling incident processing status
 *
 * @param incidentId - The CUID of the incident to poll
 * @param options - Configuration options
 * @returns Processing status data, error state, and refetch function
 */
export function useProcessingStatus(
  incidentId: string,
  options: UseProcessingStatusOptions = {}
): UseProcessingStatusResult {
  const {
    pollInterval = DEFAULT_POLL_INTERVAL,
    maxRetries = DEFAULT_MAX_RETRIES,
    enabled = true,
  } = options;

  // State
  const [data, setData] = useState<ProcessingStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  // Refs for cleanup and retry tracking
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  /**
   * Fetch processing status from API
   */
  const fetchStatus = useCallback(async (): Promise<void> => {
    // Don't fetch if hook is disabled or component unmounted
    if (!enabled || !isMountedRef.current) {
      return;
    }

    try {
      const response = await fetch(`/api/incidents/${incidentId}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Disable caching to always get fresh status
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: { message: 'Failed to fetch processing status' },
        }));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();

      // Only update state if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      // Successful fetch - reset retry count and error state
      retryCountRef.current = 0;
      setError(null);
      setData(result.data as ProcessingStatusResponse);
      setIsLoading(false);

      // Determine if we should continue polling
      const shouldContinuePolling =
        result.data.phase !== 'complete' && result.data.phase !== 'error';

      setIsPolling(shouldContinuePolling);

      // Schedule next poll if needed
      if (shouldContinuePolling && enabled) {
        pollingTimeoutRef.current = setTimeout(() => {
          fetchStatus();
        }, pollInterval);
      }
    } catch (err) {
      // Only update state if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // Increment retry count
      retryCountRef.current += 1;

      if (retryCountRef.current <= maxRetries) {
        // Retry with exponential backoff
        const backoffDelay = Math.min(
          pollInterval * Math.pow(2, retryCountRef.current - 1),
          10000 // Max 10 seconds
        );

        console.warn(
          `Processing status fetch failed (attempt ${retryCountRef.current}/${maxRetries}). Retrying in ${backoffDelay}ms...`,
          errorMessage
        );

        pollingTimeoutRef.current = setTimeout(() => {
          fetchStatus();
        }, backoffDelay);
      } else {
        // Max retries exceeded - stop polling and set error state
        console.error('Processing status fetch failed after max retries:', errorMessage);
        setError(errorMessage);
        setIsLoading(false);
        setIsPolling(false);
      }
    }
  }, [incidentId, enabled, pollInterval, maxRetries]);

  /**
   * Manual refetch function (resets retry count)
   */
  const refetch = useCallback(async (): Promise<void> => {
    // Clear any pending timeout
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    // Reset retry count and error state
    retryCountRef.current = 0;
    setError(null);
    setIsLoading(true);

    // Fetch immediately
    await fetchStatus();
  }, [fetchStatus]);

  /**
   * Start polling on mount or when incidentId/enabled changes
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Reset state on incidentId change
    setIsLoading(true);
    setError(null);
    setData(null);
    retryCountRef.current = 0;

    // Start initial fetch
    fetchStatus();

    // Cleanup function
    return () => {
      // Clear polling timeout
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, [incidentId, enabled, fetchStatus]);

  /**
   * Set mounted flag for cleanup
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    error,
    isLoading,
    isPolling,
    refetch,
  };
}
