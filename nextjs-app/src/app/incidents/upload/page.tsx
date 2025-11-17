'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AudioUploader } from '@/components/incidents/AudioUploader';
import { IncidentMetadataForm } from '@/components/incidents/IncidentMetadataForm';
import { TemplateSelector } from '@/components/incidents/TemplateSelector';
import { TranscriptionProgress } from '@/components/ui/transcription-progress';
import { ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';
import type { AudioMetadata, IncidentMetadata } from '@/types/incident';
import type { Template } from '@/types/policy';

type FileUploadResult = {
  fileName: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
};

/**
 * Incident Upload Page
 *
 * Workflow: Audio Upload → Incident Metadata → Template Selection → Start Analysis
 * Creates incident in database before starting transcription to ensure foreign key integrity.
 */

export default function IncidentUploadPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);
  const [incidentMetadata, setIncidentMetadata] = useState<IncidentMetadata | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload progress UI state
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'complete' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<FileUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Processing UI state
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processError, setProcessError] = useState<string | null>(null);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);

  // Mock templates for development fallback
  const fallbackTemplates: Template[] = [
    {
      id: '1',
      name: 'NFPA 1561: Incident Command System',
      description: 'Standard template for incident command procedures and protocols',
      status: 'ACTIVE',
      version: 1,
      createdAt: new Date('2024-11-01'),
      updatedAt: new Date('2024-11-01'),
      aiGenerated: false,
      policyDocuments: [],
      categories: [
        {
          id: 'cat-1',
          name: 'Communication Protocols',
          weight: 0.25,
          sortOrder: 1,
          criteria: [
            {
              id: 'crit-1',
              description: 'Clear radio discipline maintained',
              scoringGuidance: 'PASS if units wait for clear channel',
              sortOrder: 1,
            },
            {
              id: 'crit-2',
              description: 'Proper unit identification used',
              scoringGuidance: 'PASS if all transmissions include unit ID',
              sortOrder: 2,
            },
          ],
          analysisPrompt: 'Analyze communication protocols...',
        },
        {
          id: 'cat-2',
          name: 'Mayday Procedures',
          weight: 0.25,
          sortOrder: 2,
          criteria: [
            {
              id: 'crit-3',
              description: 'Mayday transmitted in proper format',
              scoringGuidance: 'PASS if LUNAR format used',
              sortOrder: 1,
            },
          ],
          analysisPrompt: 'Analyze mayday procedures...',
        },
      ],
      usageCount: 45,
      averageScore: 87,
    },
    {
      id: '2',
      name: 'Incident Safety Protocol',
      description: 'AI-generated template from department SOPs',
      status: 'ACTIVE',
      version: 1,
      createdAt: new Date('2024-12-01'),
      updatedAt: new Date('2024-12-01'),
      aiGenerated: true,
      aiConfidence: 0.94,
      policyDocuments: [],
      categories: [
        {
          id: 'cat-3',
          name: 'Safety Officer Procedures',
          weight: 0.3,
          sortOrder: 1,
          criteria: [
            {
              id: 'crit-4',
              description: 'Safety officer assigned',
              scoringGuidance: 'PASS if assigned within 5 minutes',
              sortOrder: 1,
            },
          ],
          analysisPrompt: 'Analyze safety procedures...',
        },
      ],
      usageCount: 8,
      averageScore: 85,
    },
  ];

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const normalizeTemplate = (template: Record<string, any>): Template | null => {
      if (!template) {
        return null;
      }

      let categoriesRaw = template.categories;
      if (typeof categoriesRaw === 'string') {
        try {
          categoriesRaw = JSON.parse(categoriesRaw);
        } catch {
          categoriesRaw = [];
        }
      }

      const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];

      return {
        id: template.id,
        name: template.name,
        description: template.description ?? undefined,
        status: template.isActive ? 'ACTIVE' : 'DRAFT',
        version:
          typeof template.version === 'number'
            ? template.version
            : Number(template.version ?? 1),
        createdAt: template.createdAt ? new Date(template.createdAt) : new Date(),
        updatedAt: template.updatedAt ? new Date(template.updatedAt) : new Date(),
        createdBy: template.createdBy ?? undefined,
        aiGenerated: Boolean(template.isAIGenerated),
        aiConfidence: template.aiConfidence ?? undefined,
        aiGeneratedAt: template.generation?.generatedAt
          ? new Date(template.generation.generatedAt)
          : undefined,
        policyDocuments: Array.isArray(template.sourceDocuments)
          ? template.sourceDocuments.map((doc: any) => ({
              id: doc.id,
              filename: doc.fileName || doc.filename || '',
              originalFilename: doc.originalName || doc.originalFilename || '',
              url: doc.fileUrl || doc.url || '',
              pages: doc.pages ?? 0,
              size: doc.fileSize ?? doc.size ?? 0,
              uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : new Date(),
            }))
          : [],
        categories,
        usageCount: template.usageCount ?? 0,
        averageScore: template.averageScore ?? undefined,
        lastUsedAt: template.lastUsedAt ? new Date(template.lastUsedAt) : undefined,
      };
    };

    const fetchTemplates = async () => {
      setIsLoadingTemplates(true);
      setTemplatesError(null);

      try {
        const response = await fetch('/api/policy/templates?status=active');
        if (!response.ok) {
          throw new Error(`Failed to load templates (status ${response.status})`);
        }

        const data = await response.json();
        const fetched = Array.isArray(data?.templates)
          ? data.templates
              .map(normalizeTemplate)
              .filter((template: Template | null): template is Template => template !== null)
          : [];

        if (!isMounted) {
          return;
        }

        if (fetched.length > 0) {
          setTemplates(fetched);
        } else {
          setTemplates(fallbackTemplates);
        }
      } catch (error) {
        console.error('Failed to load templates', error);
        if (isMounted) {
          setTemplatesError(
            error instanceof Error ? error.message : 'Failed to load templates'
          );
          setTemplates(fallbackTemplates);
        }
      } finally {
        if (isMounted) {
          setIsLoadingTemplates(false);
        }
      }
    };

    fetchTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setSelectedTemplateIds((prev) =>
      prev.filter((id) => templates.some((template) => template.id === id))
    );
  }, [templates]);

  // Handle file selection
  const handleFileSelect = (file: File, metadata: AudioMetadata) => {
    setAudioFile(file);
    setAudioMetadata(metadata);

    // Start upload with progress feedback
    setUploadError(null);
    setUploadResult(null);
    setUploadProgress(0);
    setUploadStatus('uploading');
    void uploadAudio(file).catch((err) => {
      console.error('Audio upload failed:', err);
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setUploadStatus('error');
    });
  };

  // Handle metadata submission
  const handleMetadataSubmit = (metadata: IncidentMetadata) => {
    setIncidentMetadata(metadata);
  };

  // Upload audio with progress using XMLHttpRequest
  const uploadAudio = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/transcription/upload');
        xhr.responseType = 'json';

        // Progress events
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        // Error handling
        xhr.onerror = () => {
          setUploadError('Network error during upload');
          setUploadStatus('error');
          reject(new Error('Network error during upload'));
        };

        // Completion
        xhr.onload = () => {
          const status = xhr.status;
          const resp = xhr.response as
            | { success: true; data: FileUploadResult }
            | { success: false; error?: { message?: string } }
            | null;

          if (status >= 200 && status < 300 && resp && (resp as any).success) {
            const data = (resp as any).data as FileUploadResult;
            setUploadResult(data);
            setUploadStatus('complete');
            setUploadProgress(100);
            resolve();
          } else {
            const message =
              (resp as any)?.error?.message ||
              `Upload failed with status ${status}`;
            setUploadError(message);
            setUploadStatus('error');
            reject(new Error(message));
          }
        };

        const formData = new FormData();
        formData.append('file', file);
        xhr.send(formData);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Unknown upload error'));
      }
    });
  };

   // Handle start analysis
  const handleStartAnalysis = async () => {
    if (!audioFile || !audioMetadata || selectedTemplateIds.length === 0 || !uploadResult) {
      return;
    }

    setIsSubmitting(true);
    setProcessError(null);
    setProcessingStatus('processing');
    setProcessingProgress(0);

    try {
      // Step 1: Create incident in database first
      const incidentResponse = await fetch('/api/incidents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: incidentMetadata?.type || 'OTHER',
          severity: 'MEDIUM', // Default severity - not collected in form
          address: incidentMetadata?.location || 'Unknown Location',
          number: incidentMetadata?.name,
          startTime: incidentMetadata?.incidentDate || new Date().toISOString(),
          status: 'MONITORING', // Default status - not collected in form
          summary: incidentMetadata?.description || null,
          selectedTemplateIds,
        }),
      });

      const incidentJson = await incidentResponse.json();

      if (!incidentResponse.ok || !incidentJson?.success) {
        const message = incidentJson?.error?.message || `Incident creation failed with status ${incidentResponse.status}`;
        throw new Error(`Failed to create incident: ${message}`);
      }

      const incidentId = incidentJson.data.id;

      // Step 2: Start transcription processing with the real incident ID
      const response = await fetch('/api/transcription/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadResult.fileName,
          incidentId,
          language: 'en',
          detectMayday: true,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json?.success) {
        const message = json?.error?.message || `Processing failed with status ${response.status}`;
        throw new Error(message);
      }

      // Mark processing complete
      setProcessingProgress(100);
      setTranscriptId(json.data.id as string);
      setProcessingStatus('complete');

      // Navigate to processing page
      router.push(`/incidents/${incidentId}/processing`);
    } catch (error) {
      console.error('Failed to start analysis:', error);
      setProcessError(error instanceof Error ? error.message : 'Processing failed');
      setProcessingStatus('error');
      setIsSubmitting(false);
    }
  };

  // Check if ready to submit
  const canSubmit =
    audioFile !== null &&
    audioMetadata !== null &&
    selectedTemplateIds.length > 0 &&
    uploadStatus === 'complete';

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link href="/incidents">
          <Button variant="ghost" size="sm" className="mb-4" aria-label="Back to Incidents">
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back to Incidents
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Upload & Analyze Radio Traffic</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Upload an audio file, add incident details, and select templates for analysis
        </p>
      </div>

      {/* Workflow Steps */}
      <div className="space-y-8">
        {/* Step 1: Audio Upload */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </span>
              Upload Radio Traffic Audio
            </h2>
          </div>
          <AudioUploader onFileSelect={handleFileSelect} disabled={isSubmitting} />
          {audioFile && (uploadStatus !== 'idle' || processingStatus !== 'idle') && (
            <div className="mt-4">
              <TranscriptionProgress
                fileName={audioFile.name}
                fileSize={audioFile.size}
                status={
                  processingStatus === 'error' ? 'error' :
                  processingStatus === 'processing' ? 'processing' :
                  processingStatus === 'complete' ? 'complete' :
                  uploadStatus === 'error' ? 'error' :
                  uploadStatus === 'complete' ? 'uploaded' :
                  'uploading'
                }
                uploadProgress={uploadProgress}
                processingProgress={processingProgress}
                error={(processError || uploadError) ?? undefined}
              />
            </div>
          )}
        </div>

        {/* Step 2: Incident Metadata (only show if audio uploaded) */}
        {audioFile && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </span>
                Incident Information
              </h2>
              <p className="text-sm text-muted-foreground mt-1 ml-10">
                Optional - These details will help the AI provide more context-aware analysis
              </p>
            </div>
            <IncidentMetadataForm
              onSubmit={handleMetadataSubmit}
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Step 3: Template Selection (only show if audio uploaded) */}
        {audioFile && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </span>
                Select Analysis Templates
              </h2>
              <p className="text-sm text-muted-foreground mt-1 ml-10">
                Choose up to 2 templates to analyze this incident against
              </p>
            </div>
            {templatesError && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                Unable to load templates from the server. Showing sample templates for now.
              </div>
            )}
            {isLoadingTemplates ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
                Loading templates…
              </div>
            ) : (
              <TemplateSelector
                templates={templates}
                selectedIds={selectedTemplateIds}
                onSelectionChange={setSelectedTemplateIds}
                maxSelection={2}
                disabled={isSubmitting}
              />
            )}
          </div>
        )}

        {/* Submit Button */}
        {audioFile && (
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <Link href="/incidents">
              <Button variant="secondary" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button
              variant="success"
              onClick={handleStartAnalysis}
              disabled={!canSubmit || isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  Starting Analysis...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Start Analysis
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
