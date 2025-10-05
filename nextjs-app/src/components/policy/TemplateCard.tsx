'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  MoreVertical,
  Eye,
  Edit,
  Copy,
  Archive,
  Trash2,
  Sparkles,
  Calendar,
  BarChart3,
  Layers,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Template } from '@/types/policy';

interface TemplateCardProps {
  template: Template;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TemplateCard({
  template,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: TemplateCardProps) {
  const router = useRouter();

  const getStatusVariant = (status: Template['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'DRAFT':
        return 'secondary';
      case 'ARCHIVED':
        return 'outline';
    }
  };

  const getStatusLabel = (status: Template['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'DRAFT':
        return 'Draft';
      case 'ARCHIVED':
        return 'Archived';
    }
  };

  const formatDate = (date: Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatScore = (score: number): string => {
    return `${Math.round(score * 100)}%`;
  };

  const totalCriteria = template.categories.reduce(
    (sum, cat) => sum + cat.criteria.length,
    0
  );

  return (
    <Card className="p-6 hover:shadow-md transition-all duration-200">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold truncate">{template.name}</h3>
              {template.aiGenerated && (
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI-Generated
                </Badge>
              )}
            </div>
            {template.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {template.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Template actions menu">
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView?.(template.id)}>
                <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(template.id)}>
                <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                Edit Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate?.(template.id)}>
                <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {template.status === 'ACTIVE' && (
                <DropdownMenuItem onClick={() => onArchive?.(template.id)}>
                  <Archive className="h-4 w-4 mr-2" aria-hidden="true" />
                  Archive
                </DropdownMenuItem>
              )}
              {template.status === 'DRAFT' && (
                <DropdownMenuItem
                  onClick={() => onDelete?.(template.id)}
                  className="text-destructive dark:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(template.status)}>
            {getStatusLabel(template.status)}
          </Badge>
          {template.aiGenerated && template.aiConfidence && (
            <span className="text-xs text-muted-foreground">
              AI Confidence: {Math.round(template.aiConfidence * 100)}%
            </span>
          )}
        </div>

        {/* Source Documents */}
        {template.policyDocuments && template.policyDocuments.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Source Documents:</p>
            <ul className="space-y-0.5">
              {template.policyDocuments.slice(0, 2).map((doc) => (
                <li key={doc.id} className="truncate">
                  • {doc.filename} ({doc.pages} pages)
                </li>
              ))}
              {template.policyDocuments.length > 2 && (
                <li>+{template.policyDocuments.length - 2} more...</li>
              )}
            </ul>
          </div>
        )}

        {/* Template Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{template.categories.length}</p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{totalCriteria}</p>
              <p className="text-xs text-muted-foreground">Criteria</p>
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Created {formatDate(template.createdAt)}</span>
            </div>
            {template.usageCount > 0 && (
              <span>Used {template.usageCount} times</span>
            )}
          </div>
          {template.averageScore !== undefined && template.usageCount > 0 && (
            <div className="text-xs">
              <span className="text-muted-foreground">Average Score: </span>
              <span
                className={`font-medium ${
                  template.averageScore >= 0.85
                    ? 'text-green-600 dark:text-green-400'
                    : template.averageScore >= 0.7
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-destructive'
                }`}
              >
                {formatScore(template.averageScore)}
              </span>
            </div>
          )}
          {template.lastUsedAt && (
            <div className="text-xs text-muted-foreground">
              Last used {formatDate(template.lastUsedAt)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView?.(template.id)}
            className="flex-1"
          >
            View Details
          </Button>
          <Button
            size="sm"
            onClick={() => onEdit?.(template.id)}
            className="flex-1"
          >
            Edit Template
          </Button>
        </div>
      </div>
    </Card>
  );
}
