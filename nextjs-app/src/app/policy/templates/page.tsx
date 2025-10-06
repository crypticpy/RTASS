'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TemplateCard } from '@/components/policy/TemplateCard';
import { TemplateFilters } from '@/components/policy/TemplateFilters';
import { Template, TemplateStatus } from '@/types/policy';
import { toast } from 'sonner';

// Mock data for demonstration - in production, this would come from API
const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'NFPA 1561: Incident Command System',
    description: 'Standard on Emergency Services Incident Management System and Command Safety',
    status: 'ACTIVE',
    version: 1,
    createdAt: new Date('2024-11-01'),
    updatedAt: new Date('2024-11-01'),
    aiGenerated: false,
    policyDocuments: [
      {
        id: 'doc1',
        filename: 'NFPA-1561-2020.pdf',
        originalFilename: 'NFPA-1561-2020.pdf',
        url: '/documents/nfpa-1561.pdf',
        pages: 87,
        size: 3458921,
        uploadedAt: new Date('2024-11-01'),
      },
    ],
    categories: [
      {
        id: 'cat1',
        name: 'Communication Protocols',
        weight: 0.25,
        sortOrder: 1,
        criteria: Array(8).fill(null).map((_, i) => ({
          id: `crit1-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze communication...',
      },
      {
        id: 'cat2',
        name: 'Incident Command',
        weight: 0.25,
        sortOrder: 2,
        criteria: Array(10).fill(null).map((_, i) => ({
          id: `crit2-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze command...',
      },
      {
        id: 'cat3',
        name: 'Safety Officer Procedures',
        weight: 0.2,
        sortOrder: 3,
        criteria: Array(12).fill(null).map((_, i) => ({
          id: `crit3-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze safety...',
      },
      {
        id: 'cat4',
        name: 'Mayday Procedures',
        weight: 0.15,
        sortOrder: 4,
        criteria: Array(6).fill(null).map((_, i) => ({
          id: `crit4-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze mayday...',
      },
      {
        id: 'cat5',
        name: 'Personnel Accountability',
        weight: 0.15,
        sortOrder: 5,
        criteria: Array(6).fill(null).map((_, i) => ({
          id: `crit5-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze accountability...',
      },
    ],
    usageCount: 45,
    averageScore: 0.92,
    lastUsedAt: new Date('2024-12-15'),
  },
  {
    id: '2',
    name: 'Incident Safety Protocol',
    description: 'AI-generated template from department SOPs covering engine operations, mayday protocols, and general incident safety',
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
        id: 'cat6',
        name: 'Communication Protocols',
        weight: 0.25,
        sortOrder: 1,
        criteria: Array(6).fill(null).map((_, i) => ({
          id: `crit6-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze communication...',
      },
      {
        id: 'cat7',
        name: 'Mayday Procedures',
        weight: 0.2,
        sortOrder: 2,
        criteria: Array(8).fill(null).map((_, i) => ({
          id: `crit7-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze mayday...',
      },
      {
        id: 'cat8',
        name: 'Safety Officer Procedures',
        weight: 0.15,
        sortOrder: 3,
        criteria: Array(7).fill(null).map((_, i) => ({
          id: `crit8-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze safety...',
      },
      {
        id: 'cat9',
        name: 'Personnel Accountability',
        weight: 0.2,
        sortOrder: 4,
        criteria: Array(9).fill(null).map((_, i) => ({
          id: `crit9-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze accountability...',
      },
      {
        id: 'cat10',
        name: 'Resource Management',
        weight: 0.1,
        sortOrder: 5,
        criteria: Array(4).fill(null).map((_, i) => ({
          id: `crit10-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze resources...',
      },
      {
        id: 'cat11',
        name: 'Incident Command Structure',
        weight: 0.1,
        sortOrder: 6,
        criteria: Array(4).fill(null).map((_, i) => ({
          id: `crit11-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze command...',
      },
    ],
    usageCount: 8,
    averageScore: 0.85,
    lastUsedAt: new Date('2024-12-18'),
  },
  {
    id: '3',
    name: 'Multi-Agency Operations',
    description: 'Template for multi-agency incident command and coordination',
    status: 'DRAFT',
    version: 1,
    createdAt: new Date('2024-12-10'),
    updatedAt: new Date('2024-12-10'),
    aiGenerated: true,
    aiConfidence: 0.89,
    aiGeneratedAt: new Date('2024-12-10'),
    policyDocuments: [
      {
        id: 'doc5',
        filename: 'ICS Manual.pdf',
        originalFilename: 'ICS Manual.pdf',
        url: '/documents/ics-manual.pdf',
        pages: 67,
        size: 3456789,
        uploadedAt: new Date('2024-12-10'),
      },
    ],
    categories: [
      {
        id: 'cat12',
        name: 'Unified Command',
        weight: 0.35,
        sortOrder: 1,
        criteria: Array(8).fill(null).map((_, i) => ({
          id: `crit12-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze command...',
      },
      {
        id: 'cat13',
        name: 'Inter-Agency Communication',
        weight: 0.3,
        sortOrder: 2,
        criteria: Array(10).fill(null).map((_, i) => ({
          id: `crit13-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze communication...',
      },
      {
        id: 'cat14',
        name: 'Resource Sharing',
        weight: 0.2,
        sortOrder: 3,
        criteria: Array(6).fill(null).map((_, i) => ({
          id: `crit14-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze resources...',
      },
      {
        id: 'cat15',
        name: 'Joint Operations',
        weight: 0.15,
        sortOrder: 4,
        criteria: Array(5).fill(null).map((_, i) => ({
          id: `crit15-${i}`,
          description: `Criterion ${i + 1}`,
          scoringGuidance: 'Guidance',
          sortOrder: i,
        })),
        analysisPrompt: 'Analyze operations...',
      },
    ],
    usageCount: 0,
  },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'usage'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = mockTemplates;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'usage':
          return b.usageCount - a.usageCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchQuery, statusFilter, sortBy]);

  const handleView = (id: string) => {
    router.push(`/policy/templates/${id}`);
  };

  const handleEdit = (id: string) => {
    router.push(`/policy/templates/${id}/edit`);
  };

  const handleDuplicate = (id: string) => {
    toast.success('Template duplicated successfully');
    // In production, this would call an API to duplicate the template
  };

  const handleArchive = (id: string) => {
    toast.success('Template archived successfully');
    // In production, this would call an API to archive the template
  };

  const handleDelete = (id: string) => {
    toast.success('Template deleted successfully');
    // In production, this would call an API to delete the template
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Audit Templates</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Manage compliance audit templates for incident analysis
            </p>
          </div>
          <Button variant="success" onClick={() => router.push('/policy/upload')} className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Upload Policy & Generate Template
          </Button>
        </div>

        {/* Filters */}
        <TemplateFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* Templates Grid/List */}
      {filteredTemplates.length > 0 ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onView={handleView}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        // Empty State
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No templates found</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters to see more templates'
                  : 'Get started by uploading a policy document to generate your first template'}
              </p>
            </div>
            {!(searchQuery || statusFilter !== 'all') && (
              <Button
                variant="success"
                onClick={() => router.push('/policy/upload')}
                className="gap-2 mt-4"
              >
                <Plus className="h-4 w-4" />
                Upload Policy & Generate Template
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
