'use client';

import React from 'react';
import { Check, Loader2, Clock, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TemplateGenerationProgress } from '@/types/policy';

interface GenerationProgressProps {
  progress: TemplateGenerationProgress;
}

export function GenerationProgress({ progress }: GenerationProgressProps) {
  const getStageIcon = (stage: TemplateGenerationProgress['stage']) => {
    if (progress.stage === 'error') {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    if (stage === progress.stage) {
      return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    }
    const stages: TemplateGenerationProgress['stage'][] = [
      'parsing',
      'extracting',
      'rubrics',
      'prompts',
      'complete',
    ];
    const currentIndex = stages.indexOf(progress.stage);
    const stageIndex = stages.indexOf(stage);
    if (stageIndex < currentIndex) {
      return <Check className="h-5 w-5 text-green-600" />;
    }
    return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
  };

  const getStageLabel = (stage: TemplateGenerationProgress['stage']) => {
    switch (stage) {
      case 'parsing':
        return 'Document parsing';
      case 'extracting':
        return 'Policy sections identified';
      case 'rubrics':
        return 'Generating scoring rubrics';
      case 'prompts':
        return 'Creating audit prompts';
      case 'complete':
        return 'Template generation complete';
      case 'error':
        return 'Error occurred';
    }
  };

  const getStageDescription = (stage: TemplateGenerationProgress['stage']) => {
    switch (stage) {
      case 'parsing':
        return progress.documentsProcessed && progress.totalDocuments
          ? `${progress.documentsProcessed} of ${progress.totalDocuments} documents processed`
          : 'Extracting text from policy documents...';
      case 'extracting':
        return progress.sectionsIdentified
          ? `${progress.sectionsIdentified} sections identified`
          : 'Analyzing policy structure...';
      case 'rubrics':
        return progress.criteriaExtracted
          ? `${progress.criteriaExtracted} criteria extracted`
          : 'Creating compliance criteria...';
      case 'prompts':
        return 'Generating AI analysis prompts...';
      case 'complete':
        return 'Template is ready for review';
      case 'error':
        return progress.message || 'An error occurred during generation';
    }
  };

  const stages: Array<{ stage: TemplateGenerationProgress['stage']; label: string }> = [
    { stage: 'parsing', label: 'Parsing Documents' },
    { stage: 'extracting', label: 'Extracting Criteria' },
    { stage: 'rubrics', label: 'Generating Rubrics' },
    { stage: 'prompts', label: 'Creating Prompts' },
  ];

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {progress.stage === 'complete'
              ? 'Template Generation Complete'
              : progress.stage === 'error'
                ? 'Generation Failed'
                : 'AI Template Generation in Progress'}
          </h3>
          <p className="text-sm text-muted-foreground">{progress.message}</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress.progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.progress}% Complete</span>
            {progress.estimatedTimeRemaining !== undefined && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {formatTime(progress.estimatedTimeRemaining)} remaining
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Current Task */}
        {progress.currentTask && progress.stage !== 'complete' && (
          <div className="text-sm">
            <span className="font-medium">Current Task: </span>
            <span className="text-muted-foreground">{progress.currentTask}</span>
          </div>
        )}

        {/* Stages */}
        <div className="space-y-3">
          {stages.map(({ stage, label }) => (
            <div key={stage} className="flex items-start gap-3">
              <div className="mt-0.5">{getStageIcon(stage)}</div>
              <div className="flex-1 space-y-1">
                <p
                  className={`text-sm font-medium ${
                    progress.stage === stage
                      ? 'text-foreground'
                      : stages.findIndex((s) => s.stage === progress.stage) >
                          stages.findIndex((s) => s.stage === stage)
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/60'
                  }`}
                >
                  {getStageLabel(stage)}
                </p>
                {progress.stage === stage && (
                  <p className="text-xs text-muted-foreground">
                    {getStageDescription(stage)}
                  </p>
                )}
                {stages.findIndex((s) => s.stage === progress.stage) >
                  stages.findIndex((s) => s.stage === stage) && (
                  <p className="text-xs text-green-600">
                    {getStageDescription(stage)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Error State */}
        {progress.stage === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-900">
                  Template Generation Failed
                </p>
                <p className="text-sm text-red-700">{progress.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {progress.stage === 'complete' && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex gap-3">
              <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-900">
                  Template Generated Successfully
                </p>
                <p className="text-sm text-green-700">
                  {progress.message || 'You can now review and edit the generated template'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
