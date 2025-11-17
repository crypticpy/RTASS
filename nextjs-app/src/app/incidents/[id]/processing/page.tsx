'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProcessingStatus } from '@/components/incidents/ProcessingStatus';
import { useProcessingStatus } from '@/hooks/useProcessingStatus';
import { mapPhaseToProgress, isProcessingComplete } from '@/lib/utils/processingPhases';
import { Loader2 } from 'lucide-react';
import type { ProcessingProgress } from '@/types/incident';

/**
 * Incident Processing Page
 *
 * Real-time display of transcription and analysis progress.
 * Polls for status updates every 2.5 seconds using real API data.
 * Automatically navigates to report page on completion.
 */
export default function IncidentProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const incidentId = params.id as string;

  // Poll processing status from API
  const { data, error, isLoading, refetch } = useProcessingStatus(incidentId, {
    pollInterval: 2500, // Poll every 2.5 seconds
    maxRetries: 3,
  });

  // Map API response to progress object for UI
  const progress: ProcessingProgress | null = data
    ? mapPhaseToProgress(data)
    : null;

  // Auto-navigate to report page when processing completes successfully
  useEffect(() => {
    if (data && isProcessingComplete(data) && data.phase === 'complete') {
      // Short delay before navigation to show completion state
      const timeout = setTimeout(() => {
        router.push(`/incidents/${incidentId}/report`);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [data, incidentId, router]);

  const handleViewReport = () => {
    router.push(`/incidents/${incidentId}/report`);
  };

  const handleRetry = () => {
    refetch();
  };

  // Loading state - initial fetch in progress
  if (isLoading && !data) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading processing status...
          </p>
        </div>
      </div>
    );
  }

  // Error state - failed to fetch status
  if (error && !data) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Processing Incident</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Unable to load processing status
          </p>
        </div>

        <div className="p-6 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium text-red-800 dark:text-red-200">
                Connection Error
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error}
              </p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data available
  if (!progress) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-sm text-muted-foreground">
            No processing status available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Processing Incident</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {data?.incident.number && `Incident ${data.incident.number} - `}
          Transcribing audio and analyzing compliance. This may take 5-10 minutes.
        </p>
      </div>

      <ProcessingStatus
        progress={progress}
        incidentId={incidentId}
        onViewReport={progress.stage === 'complete' ? handleViewReport : undefined}
      />

      {/* Info Card */}
      <div className="mt-6 p-4 rounded-lg bg-muted text-sm text-muted-foreground">
        <p className="font-medium mb-2">Processing Steps:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Audio transcription with OpenAI Whisper (2-5 minutes)</li>
          <li>Emergency keyword detection (10-30 seconds)</li>
          <li>Compliance analysis per template (3-5 minutes each)</li>
          <li>Narrative report generation (30-60 seconds)</li>
        </ol>
      </div>

      {/* Error state overlay (when error occurs after initial load) */}
      {error && data && (
        <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Status Update Failed
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Unable to fetch latest status. Showing last known state.
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
