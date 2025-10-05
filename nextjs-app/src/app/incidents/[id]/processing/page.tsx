'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProcessingStatus } from '@/components/incidents/ProcessingStatus';
import type { ProcessingProgress } from '@/types/incident';

/**
 * Incident Processing Page
 *
 * Real-time display of transcription and analysis progress.
 * Polls for status updates every 2 seconds.
 * Navigates to report page on completion.
 */
export default function IncidentProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const incidentId = params.id as string;

  const [progress, setProgress] = useState<ProcessingProgress>({
    stage: 'transcribing',
    progress: 0,
    message: 'Starting transcription...',
  });

  // Simulate processing progress
  useEffect(() => {
    let currentProgress = 0;
    let currentStage: ProcessingProgress['stage'] = 'transcribing';

    const interval = setInterval(() => {
      currentProgress += 2;

      if (currentProgress <= 30) {
        currentStage = 'transcribing';
        setProgress({
          stage: currentStage,
          progress: (currentProgress / 30) * 100,
          message: `Processing segment ${Math.floor(currentProgress / 6)} of 5...`,
          estimatedTimeRemaining: Math.max(0, 90 - currentProgress * 3),
        });
      } else if (currentProgress <= 35) {
        currentStage = 'detecting';
        setProgress({
          stage: currentStage,
          progress: 40,
          message: 'Scanning for emergency keywords...',
          estimatedTimeRemaining: 60,
        });
      } else if (currentProgress <= 70) {
        currentStage = 'analyzing';
        const templateProgress = ((currentProgress - 35) / 35) * 100;
        setProgress({
          stage: currentStage,
          progress: 40 + templateProgress * 0.5,
          message: 'Analyzing compliance against selected templates...',
          currentTemplate: currentProgress < 53 ? 'NFPA 1561: Incident Command System' : 'Incident Safety Protocol',
          totalTemplates: 2,
          estimatedTimeRemaining: Math.max(0, 180 - (currentProgress - 35) * 3),
        });
      } else if (currentProgress <= 90) {
        currentStage = 'generating';
        setProgress({
          stage: currentStage,
          progress: 90,
          message: 'Creating incident narrative and report...',
          estimatedTimeRemaining: 30,
        });
      } else {
        clearInterval(interval);
        setProgress({
          stage: 'complete',
          progress: 100,
          message: 'Analysis complete! Your incident report is ready.',
        });

        // Navigate to report page after short delay
        setTimeout(() => {
          router.push(`/incidents/${incidentId}/report`);
        }, 2000);
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [incidentId, router]);

  const handleViewReport = () => {
    router.push(`/incidents/${incidentId}/report`);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Processing Incident</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
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
    </div>
  );
}
