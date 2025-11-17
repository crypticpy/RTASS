'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Search,
  BarChart3,
  FileText,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProcessingProgress, ProcessingStage } from '@/types/incident';

export interface ProcessingStatusProps {
  progress: ProcessingProgress;
  incidentId?: string;
  onViewReport?: () => void;
  className?: string;
}

/**
 * ProcessingStatus Component
 *
 * Real-time status display for incident processing workflow.
 * Shows transcription, keyword detection, compliance analysis, and report generation stages.
 */
export function ProcessingStatus({
  progress,
  incidentId,
  onViewReport,
  className,
}: ProcessingStatusProps) {
  // Format time remaining
  const formatTimeRemaining = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `~${mins}m ${secs}s remaining`;
    }
    return `~${secs}s remaining`;
  };

  // Stage configuration
  const stageConfig: Record<
    ProcessingStage,
    { icon: React.ElementType; label: string; color: string }
  > = {
    uploading: {
      icon: Loader2,
      label: 'Uploading audio file',
      color: 'text-blue-600 dark:text-blue-400',
    },
    transcribing: {
      icon: Radio,
      label: 'Transcribing audio',
      color: 'text-purple-600 dark:text-purple-400',
    },
    detecting: {
      icon: Search,
      label: 'Detecting emergency keywords',
      color: 'text-amber-600 dark:text-amber-400',
    },
    analyzing: {
      icon: BarChart3,
      label: 'Analyzing compliance',
      color: 'text-orange-600 dark:text-orange-400',
    },
    generating: {
      icon: FileText,
      label: 'Generating incident report',
      color: 'text-indigo-600 dark:text-indigo-400',
    },
    complete: {
      icon: CheckCircle2,
      label: 'Processing complete',
      color: 'text-green-600 dark:text-green-400',
    },
    error: {
      icon: AlertTriangle,
      label: 'Processing failed',
      color: 'text-red-600 dark:text-red-400',
    },
  };

  const config = stageConfig[progress.stage];
  const StageIcon = config.icon;
  const isProcessing = !['complete', 'error'].includes(progress.stage);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Processing Status</span>
          {progress.stage === 'complete' && (
            <Badge variant="default">Complete</Badge>
          )}
          {isProcessing && (
            <Badge variant="secondary">In Progress</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar - Only show for complete state */}
        {progress.stage === 'complete' && (
          <div className="space-y-2">
            <Progress
              value={100}
              className="h-3 bg-green-100 dark:bg-green-950"
              aria-label="Processing complete: 100%"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>100% complete</span>
            </div>
          </div>
        )}

        {/* Current Stage - Emphasized for phase-based display */}
        <div
          className={cn(
            'flex items-center gap-4 p-4 rounded-lg border-2',
            config.color,
            isProcessing && 'bg-muted/50 border-current/20',
            progress.stage === 'complete' && 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
          )}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <StageIcon
            className={cn(
              'h-8 w-8 shrink-0',
              isProcessing && 'animate-spin'
            )}
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="font-semibold text-lg">{config.label}</p>
            <p className="text-sm mt-1 opacity-90">{progress.message}</p>
          </div>
        </div>

        {/* Stage-specific details - Template progress during analyzing */}
        {progress.stage === 'analyzing' && progress.currentTemplate && (
          <div className="p-4 rounded-lg bg-muted border border-muted-foreground/20">
            <div className="text-sm space-y-2">
              <p className="text-muted-foreground font-medium">Current Template:</p>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-orange-600 dark:text-orange-400" />
                <p className="font-semibold">{progress.currentTemplate}</p>
              </div>
              {progress.totalTemplates && progress.totalTemplates > 1 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Analyzing {progress.totalTemplates} template{progress.totalTemplates !== 1 ? 's' : ''} in total
                </p>
              )}
            </div>
          </div>
        )}

        {/* Processing stages checklist */}
        {isProcessing && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Processing Stages:</p>
            <div className="space-y-1.5">
              {(['transcribing', 'detecting', 'analyzing', 'generating'] as const).map((stage) => {
                const stageIndex = ['transcribing', 'detecting', 'analyzing', 'generating'].indexOf(
                  stage
                );
                const currentIndex = [
                  'uploading',
                  'transcribing',
                  'detecting',
                  'analyzing',
                  'generating',
                  'complete',
                ].indexOf(progress.stage);
                const isCompleted = currentIndex > stageIndex;
                const isCurrent = progress.stage === stage;

                return (
                  <div
                    key={stage}
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      isCompleted && 'text-green-600 dark:text-green-400',
                      isCurrent && stageConfig[stage].color,
                      !isCompleted && !isCurrent && 'text-muted-foreground'
                    )}
                  >
                    {isCompleted && <CheckCircle2 className="h-4 w-4" />}
                    {isCurrent && <Loader2 className="h-4 w-4 animate-spin" />}
                    {!isCompleted && !isCurrent && (
                      <div className="h-4 w-4 rounded-full border-2 border-muted" />
                    )}
                    <span>{stageConfig[stage].label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Complete state */}
        {progress.stage === 'complete' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Analysis Complete
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your incident report is ready to view
                  </p>
                </div>
              </div>
            </div>

            {onViewReport && (
              <Button onClick={onViewReport} className="w-full" size="lg">
                <Eye className="h-4 w-4 mr-2" />
                View Report
              </Button>
            )}
          </div>
        )}

        {/* Error state */}
        {progress.stage === 'error' && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Processing Failed</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{progress.message}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
