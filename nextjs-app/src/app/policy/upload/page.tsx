'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PolicyUploader } from '@/components/policy/PolicyUploader';
import { TemplateConfigForm } from '@/components/policy/TemplateConfigForm';
import { GenerationProgress } from '@/components/policy/GenerationProgress';
import {
  UploadedFile,
  TemplateGenerationProgress,
  TemplateConfig,
} from '@/types/policy';
import { toast } from 'sonner';

type PageState = 'upload' | 'generating' | 'error';

export default function PolicyUploadPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [generationProgress, setGenerationProgress] =
    useState<TemplateGenerationProgress | null>(null);
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig | null>(null);

  const handleFilesChange = (files: UploadedFile[]) => {
    setUploadedFiles(files);
  };

  const handleGenerateTemplate = async (config: any) => {
    // Validate files are uploaded
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one policy document');
      return;
    }

    try {
      setPageState('generating');

      // Simulate progress updates (in real implementation, this would be WebSocket or polling)
      setGenerationProgress({
        stage: 'parsing',
        progress: 0,
        message: `Analyzing ${uploadedFiles.length} policy documents (${uploadedFiles.reduce((sum, f) => sum + (f.file.size / 1024 / 1024), 0).toFixed(1)}MB total)...`,
        documentsProcessed: 0,
        totalDocuments: uploadedFiles.length,
      });

      // In real implementation, this would be an API call
      // For now, we'll simulate the progress
      await simulateTemplateGeneration(config);
    } catch (error) {
      console.error('Template generation failed:', error);
      setGenerationProgress({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
      setPageState('error');
      toast.error('Template generation failed');
    }
  };

  const simulateTemplateGeneration = async (config: TemplateConfig) => {
    // This is a simulation - in real implementation, you'd call your API
    const stages: Array<{
      stage: TemplateGenerationProgress['stage'];
      duration: number;
    }> = [
      { stage: 'parsing', duration: 2000 },
      { stage: 'extracting', duration: 2000 },
      { stage: 'rubrics', duration: 3000 },
      { stage: 'prompts', duration: 2000 },
      { stage: 'complete', duration: 0 },
    ];

    let totalProgress = 0;
    const progressIncrement = 100 / stages.length;

    for (const { stage, duration } of stages) {
      await new Promise((resolve) => setTimeout(resolve, duration));
      totalProgress += progressIncrement;

      if (stage === 'parsing') {
        setGenerationProgress({
          stage,
          progress: Math.min(totalProgress, 100),
          message: 'Parsing policy documents...',
          documentsProcessed: uploadedFiles.length,
          totalDocuments: uploadedFiles.length,
          estimatedTimeRemaining: 7,
        });
      } else if (stage === 'extracting') {
        setGenerationProgress({
          stage,
          progress: Math.min(totalProgress, 100),
          message: 'Extracting compliance criteria...',
          sectionsIdentified: 12,
          estimatedTimeRemaining: 5,
        });
      } else if (stage === 'rubrics') {
        setGenerationProgress({
          stage,
          progress: Math.min(totalProgress, 100),
          message: 'Generating scoring rubrics...',
          criteriaExtracted: 38,
          estimatedTimeRemaining: 3,
        });
      } else if (stage === 'prompts') {
        setGenerationProgress({
          stage,
          progress: Math.min(totalProgress, 100),
          message: 'Creating AI analysis prompts...',
          estimatedTimeRemaining: 1,
        });
      } else if (stage === 'complete') {
        setGenerationProgress({
          stage,
          progress: 100,
          message: 'Template generated successfully! Redirecting to editor...',
        });

        // Wait a moment then redirect to template editor
        setTimeout(() => {
          // In real implementation, use the actual template ID from the API response
          router.push('/policy/templates/new-template-id/edit');
        }, 2000);
      }
    }
  };

  const handleConfigChange = (config: TemplateConfig) => {
    setTemplateConfig(config);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/policy/templates')}
          className="mb-4"
          aria-label="Back to Templates"
        >
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Back to Templates
        </Button>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Upload Policy & Generate Template</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Upload your department policy documents and let AI generate a compliance
            audit template
          </p>
        </div>
      </div>

      {pageState === 'upload' && (
        <div className="space-y-6">
          {/* Step 1: Upload Documents */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Step 1: Upload Policy Documents</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload department SOPs, NFPA standards, training materials, or other
                  policy documents
                </p>
              </div>
              <PolicyUploader
                files={uploadedFiles}
                onFilesChange={handleFilesChange}
                disabled={false}
              />
            </div>
          </Card>

          {/* Step 2: Configure Template */}
          <TemplateConfigForm
            onSubmit={handleGenerateTemplate}
            disabled={uploadedFiles.length === 0}
          />

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => router.push('/policy/templates')}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {pageState === 'generating' && generationProgress && (
        <GenerationProgress progress={generationProgress} />
      )}

      {pageState === 'error' && generationProgress && (
        <div className="space-y-6">
          <GenerationProgress progress={generationProgress} />
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setPageState('upload');
                setGenerationProgress(null);
              }}
            >
              Try Again
            </Button>
            <Button onClick={() => router.push('/policy/templates')}>
              Back to Templates
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
