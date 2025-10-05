'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Copy,
  Archive,
  Trash2,
  Calendar,
  BarChart3,
  Layers,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TemplateEditor } from '@/components/policy/TemplateEditor';
import { Template } from '@/types/policy';
import { toast } from 'sonner';

// Mock template data - same as editor page
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
          scoringGuidance:
            'PASS if acknowledged within 10 seconds, FAIL if delayed or no acknowledgment',
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

export default function TemplateDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatScore = (score: number): string => {
    return `${Math.round(score * 100)}%`;
  };

  const totalCriteria = mockTemplate.categories.reduce(
    (sum, cat) => sum + cat.criteria.length,
    0
  );

  const handleDuplicate = () => {
    toast.success('Template duplicated successfully');
    router.push('/policy/templates');
  };

  const handleArchive = () => {
    if (mockTemplate.usageCount > 0) {
      toast.warning(
        'This template has been used in analyses. Archiving will preserve historical data.'
      );
    }
    toast.success('Template archived successfully');
    router.push('/policy/templates');
  };

  const handleDelete = () => {
    if (mockTemplate.usageCount > 0) {
      toast.error('Cannot delete template that has been used in analyses. Archive instead.');
      return;
    }
    toast.success('Template deleted successfully');
    router.push('/policy/templates');
  };

  const getStatusBadge = () => {
    const statusConfig = {
      ACTIVE: { label: 'Active', variant: 'default' as const },
      DRAFT: { label: 'Draft', variant: 'secondary' as const },
      ARCHIVED: { label: 'Archived', variant: 'outline' as const },
    };
    const config = statusConfig[mockTemplate.status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/policy/templates')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{mockTemplate.name}</h1>
              {getStatusBadge()}
              {mockTemplate.aiGenerated && (
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI-Generated
                </Badge>
              )}
              {mockTemplate.aiConfidence && (
                <Badge variant="outline">
                  {Math.round(mockTemplate.aiConfidence * 100)}% Confidence
                </Badge>
              )}
            </div>
            {mockTemplate.description && (
              <p className="text-muted-foreground">{mockTemplate.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/policy/templates/${params.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            {mockTemplate.status === 'ACTIVE' && (
              <Button variant="outline" size="sm" onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            )}
            {mockTemplate.status === 'DRAFT' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Layers className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{mockTemplate.categories.length}</p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalCriteria}</p>
              <p className="text-sm text-muted-foreground">Criteria</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{mockTemplate.usageCount}</p>
              <p className="text-sm text-muted-foreground">Times Used</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <p
                className={`text-2xl font-bold ${
                  mockTemplate.averageScore
                    ? mockTemplate.averageScore >= 0.85
                      ? 'text-green-600'
                      : mockTemplate.averageScore >= 0.7
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    : ''
                }`}
              >
                {mockTemplate.averageScore ? formatScore(mockTemplate.averageScore) : 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">Avg Score</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Source Documents */}
      {mockTemplate.policyDocuments && mockTemplate.policyDocuments.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Source Documents</h2>
          <div className="space-y-2">
            {mockTemplate.policyDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{doc.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.pages} pages • {(doc.size / 1024 / 1024).toFixed(1)} MB •
                      Uploaded {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Usage Statistics */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Usage Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">{formatDate(mockTemplate.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Updated</p>
            <p className="font-medium">{formatDate(mockTemplate.updatedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Used</p>
            <p className="font-medium">
              {mockTemplate.lastUsedAt
                ? formatDate(mockTemplate.lastUsedAt)
                : 'Never'}
            </p>
          </div>
        </div>
        {mockTemplate.usageCount > 0 && (
          <>
            <Separator className="my-4" />
            <p className="text-sm text-muted-foreground">
              This template has been used in {mockTemplate.usageCount} incident{' '}
              {mockTemplate.usageCount === 1 ? 'analysis' : 'analyses'}.
              {mockTemplate.averageScore &&
                ` The average compliance score is ${formatScore(mockTemplate.averageScore)}.`}
            </p>
          </>
        )}
      </Card>

      {/* Template Content (Read-Only) */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Template Structure</h2>
        <TemplateEditor template={mockTemplate} onChange={() => {}} readOnly />
      </div>
    </div>
  );
}
