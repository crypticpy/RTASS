'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TemplateEditor } from '@/components/policy/TemplateEditor';
import { Template } from '@/types/policy';
import { toast } from 'sonner';

// Mock template data - in production, this would be fetched from API
const mockTemplate: Template = {
  id: '2',
  name: 'Incident Safety Protocol',
  description:
    'AI-generated template from department SOPs covering engine operations, mayday protocols, and general incident safety',
  status: 'ACTIVE',
  version: 1,
  createdAt: new Date('2024-12-15'),
  updatedAt: new Date('2024-12-15'),
  aiGenerated: true,
  aiConfidence: 0.94,
  aiGeneratedAt: new Date('2024-12-15'),
  policyDocuments: [
    {
      id: 'doc2',
      filename: 'Engine Operations Manual.pdf',
      originalFilename: 'Engine Operations Manual.pdf',
      url: '/documents/engine-ops.pdf',
      pages: 45,
      size: 2345678,
      uploadedAt: new Date('2024-12-15'),
    },
    {
      id: 'doc3',
      filename: 'Mayday Protocol.docx',
      originalFilename: 'Mayday Protocol.docx',
      url: '/documents/mayday.docx',
      pages: 12,
      size: 456789,
      uploadedAt: new Date('2024-12-15'),
    },
    {
      id: 'doc4',
      filename: 'Safety SOP v2.1.pdf',
      originalFilename: 'Safety SOP v2.1.pdf',
      url: '/documents/safety-sop.pdf',
      pages: 23,
      size: 1123456,
      uploadedAt: new Date('2024-12-15'),
    },
  ],
  categories: [
    {
      id: 'cat1',
      name: 'Communication Protocols',
      description: 'Radio discipline and clear communication standards',
      weight: 0.25,
      sortOrder: 1,
      criteria: [
        {
          id: 'crit1',
          description: 'Clear radio discipline maintained',
          scoringGuidance:
            'PASS if units wait for clear channel, FAIL if overlapping transmissions occur',
          sourcePageNumber: 12,
          sourceText: 'Units shall wait for clear channel before transmitting',
          sortOrder: 1,
        },
        {
          id: 'crit2',
          description: 'Proper unit identification used',
          scoringGuidance:
            'PASS if all units identify themselves clearly, FAIL if unit IDs are missing or unclear',
          sourcePageNumber: 14,
          sourceText: 'All radio transmissions must begin with unit identifier',
          sortOrder: 2,
        },
        {
          id: 'crit3',
          description: 'Concise message transmission',
          scoringGuidance:
            'PASS if messages are brief and clear, FAIL if excessive or rambling communications',
          sourcePageNumber: 15,
          sortOrder: 3,
        },
      ],
      analysisPrompt:
        'Analyze the radio transcript for adherence to communication protocols. Score each criterion on a PASS/FAIL/NOT_APPLICABLE basis. Provide specific timestamp citations for violations and compliant examples.',
    },
    {
      id: 'cat2',
      name: 'Mayday Procedures',
      description: 'Emergency distress call protocols and LUNAR format',
      weight: 0.2,
      sortOrder: 2,
      criteria: [
        {
          id: 'crit4',
          description: 'Mayday transmitted using proper format',
          scoringGuidance:
            'PASS if "MAYDAY MAYDAY MAYDAY" transmitted 3 times, FAIL if incorrect format',
          sourcePageNumber: 3,
          sourceText: 'Mayday shall be transmitted three times',
          examplePass: '"MAYDAY MAYDAY MAYDAY, Engine 2..."',
          exampleFail: '"Mayday, Engine 2..."',
          sortOrder: 1,
        },
        {
          id: 'crit5',
          description: 'LUNAR information provided',
          scoringGuidance:
            'PASS if Location, Unit, Name, Assignment, Resources all stated, FAIL if any missing',
          sourcePageNumber: 4,
          sourceText:
            'LUNAR (Location, Unit, Name, Assignment, Resources) must be stated after mayday call',
          sortOrder: 2,
        },
        {
          id: 'crit6',
          description: 'Command acknowledged mayday immediately',
          scoringGuidance: 'PASS if acknowledged within 10 seconds, FAIL if delayed or no acknowledgment',
          sourcePageNumber: 6,
          sortOrder: 3,
        },
      ],
      analysisPrompt:
        'Analyze mayday calls for compliance with protocol. Check for proper format, LUNAR information, and command response.',
    },
  ],
  usageCount: 8,
  averageScore: 0.85,
  lastUsedAt: new Date('2024-12-18'),
};

export default function TemplateEditPage() {
  const router = useRouter();
  const params = useParams();
  const [template, setTemplate] = useState<Template>(mockTemplate);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (status: 'DRAFT' | 'ACTIVE') => {
    // Validate weights
    const totalWeight = template.categories.reduce((sum, cat) => sum + cat.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      toast.error('Total category weights must equal 100%');
      return;
    }

    // Validate at least one category with criteria
    if (template.categories.length === 0) {
      toast.error('Template must have at least one category');
      return;
    }

    const hasEmptyCategory = template.categories.some((cat) => cat.criteria.length === 0);
    if (hasEmptyCategory) {
      toast.error('All categories must have at least one criterion');
      return;
    }

    setIsSaving(true);
    try {
      // In production, this would call an API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updatedTemplate = {
        ...template,
        status,
        updatedAt: new Date(),
      };

      setTemplate(updatedTemplate);
      toast.success(
        status === 'ACTIVE'
          ? 'Template activated successfully'
          : 'Template saved as draft'
      );

      // Redirect back to template details or library
      router.push(`/policy/templates/${params.id}`);
    } catch (error) {
      toast.error('Failed to save template');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      ACTIVE: { label: 'Active', variant: 'default' as const },
      DRAFT: { label: 'Draft', variant: 'secondary' as const },
      ARCHIVED: { label: 'Archived', variant: 'outline' as const },
    };
    const config = statusConfig[template.status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/policy/templates/${params.id}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Template
        </Button>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Edit Template</h1>
              {getStatusBadge()}
              {template.aiGenerated && template.aiConfidence && (
                <Badge variant="outline" className="gap-1">
                  AI Confidence: {Math.round(template.aiConfidence * 100)}%
                </Badge>
              )}
            </div>
            {template.usageCount > 0 && (
              <p className="text-sm text-muted-foreground">
                This template has been used in {template.usageCount} analyses. Changes
                will only affect future analyses.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Source Documents */}
      {template.policyDocuments && template.policyDocuments.length > 0 && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Source Documents:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {template.policyDocuments.map((doc) => (
              <li key={doc.id}>
                • {doc.filename} ({doc.pages} pages)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Editor */}
      <div className="mb-6">
        <TemplateEditor template={template} onChange={setTemplate} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 py-6 border-t sticky bottom-0 bg-background">
        <Button variant="outline" onClick={() => router.push('/policy/templates')}>
          Cancel
        </Button>
        <div className="flex items-center gap-4">
          {template.status === 'ACTIVE' && (
            <p className="text-sm text-muted-foreground">
              Saving will update the active template
            </p>
          )}
          <Button
            variant="outline"
            onClick={() => handleSave('DRAFT')}
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSave('ACTIVE')}
            disabled={isSaving}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            {template.status === 'ACTIVE' ? 'Save Changes' : 'Activate Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}
