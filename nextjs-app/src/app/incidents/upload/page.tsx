'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AudioUploader } from '@/components/incidents/AudioUploader';
import { IncidentMetadataForm } from '@/components/incidents/IncidentMetadataForm';
import { TemplateSelector } from '@/components/incidents/TemplateSelector';
import { ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';
import type { AudioMetadata, IncidentMetadata } from '@/types/incident';
import type { Template } from '@/types/policy';

/**
 * Incident Upload Page
 *
 * Workflow: Audio Upload → Incident Metadata → Template Selection → Start Analysis
 */
export default function IncidentUploadPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);
  const [incidentMetadata, setIncidentMetadata] = useState<IncidentMetadata | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock templates for development
  const mockTemplates: Template[] = [
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

  // Handle file selection
  const handleFileSelect = (file: File, metadata: AudioMetadata) => {
    setAudioFile(file);
    setAudioMetadata(metadata);
  };

  // Handle metadata submission
  const handleMetadataSubmit = (metadata: IncidentMetadata) => {
    setIncidentMetadata(metadata);
  };

  // Handle start analysis
  const handleStartAnalysis = async () => {
    if (!audioFile || !audioMetadata || selectedTemplateIds.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      // In production, this would upload the file and create the incident
      // For now, we'll simulate the process with a mock incident ID
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockIncidentId = 'incident-' + Date.now();

      // Navigate to processing page
      router.push(`/incidents/${mockIncidentId}/processing`);
    } catch (error) {
      console.error('Failed to start analysis:', error);
      setIsSubmitting(false);
    }
  };

  // Check if ready to submit
  const canSubmit =
    audioFile !== null && audioMetadata !== null && selectedTemplateIds.length > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/incidents">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Incidents
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Upload & Analyze Radio Traffic</h1>
        <p className="text-muted-foreground">
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
        </div>

        {/* Step 2: Incident Metadata (only show if audio uploaded) */}
        {audioFile && audioMetadata && (
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
        {audioFile && audioMetadata && (
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
            <TemplateSelector
              templates={mockTemplates}
              selectedIds={selectedTemplateIds}
              onSelectionChange={setSelectedTemplateIds}
              maxSelection={2}
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Submit Button */}
        {audioFile && audioMetadata && (
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <Link href="/incidents">
              <Button variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button
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
