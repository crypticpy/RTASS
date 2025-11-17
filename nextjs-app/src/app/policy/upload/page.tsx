'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PolicyUploader } from '@/components/policy/PolicyUploader';
import { TemplateConfigForm } from '@/components/policy/TemplateConfigForm';
import { GenerationProgress } from '@/components/policy/GenerationProgress';
import {
  UploadedFile,
  TemplateGenerationProgress,
} from '@/types/policy';
import { toast } from 'sonner';

type PageState = 'upload' | 'generating' | 'error';

export default function PolicyUploadPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [generationProgress, setGenerationProgress] =
    useState<TemplateGenerationProgress | null>(null);

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

      // Step 1: Upload files and extract content
      setGenerationProgress({
        stage: 'parsing',
        progress: 0,
        message: `Uploading ${uploadedFiles.length} policy documents (${uploadedFiles.reduce((sum, f) => sum + (f.file.size / 1024 / 1024), 0).toFixed(1)}MB total)...`,
        documentsProcessed: 0,
        totalDocuments: uploadedFiles.length,
      });

      const uploadedDocIds: string[] = [];

      for (let i = 0; i < uploadedFiles.length; i++) {
        const uploadedFile = uploadedFiles[i];
        const formData = new FormData();
        formData.append('file', uploadedFile.file);

        setGenerationProgress({
          stage: 'parsing',
          progress: (i / uploadedFiles.length) * 20,
          message: `Uploading and extracting: ${uploadedFile.file.name}...`,
          documentsProcessed: i,
          totalDocuments: uploadedFiles.length,
        });

        const extractResponse = await fetch('/api/policy/extract', {
          method: 'POST',
          body: formData,
        });

        if (!extractResponse.ok) {
          const error = await extractResponse.json();
          throw new Error(error.message || 'Failed to upload policy document');
        }

        const extractResult = await extractResponse.json();
        uploadedDocIds.push(extractResult.id);
      }

      // Step 2: Generate template from first document (or combined if multiple)
      setGenerationProgress({
        stage: 'extracting',
        progress: 25,
        message: 'Analyzing policy document with GPT-4o...',
        sectionsIdentified: 0,
      });

      const generateResponse = await fetch('/api/policy/generate-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          policyDocumentId: uploadedDocIds[0],
          options: {
            templateName: config.name,
            documentType: config.documentType,
            autoDetectSections: config.autoDetectSections,
            extractCriteria: true,
            generateRubrics: config.generateRubrics,
            includeReferences: config.includeReferences,
            additionalInstructions: config.additionalInstructions,
          },
        }),
      });

      if (!generateResponse.ok) {
        const error = await generateResponse.json();
        throw new Error(error.message || 'Failed to generate template');
      }

      setGenerationProgress({
        stage: 'rubrics',
        progress: 60,
        message: 'Generating compliance categories and criteria...',
        criteriaExtracted: 0,
      });

      const generatedTemplate = await generateResponse.json();

      // Step 3: Save the generated template
      setGenerationProgress({
        stage: 'prompts',
        progress: 85,
        message: 'Saving template to database...',
      });

      const saveResponse = await fetch('/api/policy/save-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: generatedTemplate.template,
          sourcePolicyIds: uploadedDocIds,
          generationMetadata: {
            confidence: generatedTemplate.confidence,
            aiModel: generatedTemplate.template.metadata?.aiModel || 'gpt-4.1',
            processingLog: generatedTemplate.processingLog,
            suggestions: generatedTemplate.suggestions,
          },
        }),
      });

      if (!saveResponse.ok) {
        const error = await saveResponse.json();
        throw new Error(error.message || 'Failed to save template');
      }

      const savedTemplate = await saveResponse.json();

      // Complete!
      setGenerationProgress({
        stage: 'complete',
        progress: 100,
        message: `Template generated successfully! Found ${generatedTemplate.template.categories.length} categories with ${generatedTemplate.template.categories.reduce((sum: number, cat: any) => sum + cat.criteria.length, 0)} criteria. Redirecting to editor...`,
      });

      // Wait a moment then redirect to template editor
      setTimeout(() => {
        router.push(`/policy/templates/${savedTemplate.templateId}/edit`);
      }, 2000);
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
              variant="secondary"
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
              variant="warning"
              onClick={() => {
                setPageState('upload');
                setGenerationProgress(null);
              }}
            >
              Try Again
            </Button>
            <Button variant="secondary" onClick={() => router.push('/policy/templates')}>
              Back to Templates
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
