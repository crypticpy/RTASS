'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Template } from '@/types/policy';

export interface TemplateSelectorProps {
  templates: Template[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  maxSelection?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * TemplateSelector Component
 *
 * Allows users to select audit templates to apply to incident analysis.
 * Displays template preview (categories count, criteria count).
 * Supports max selection limit (default: 2 templates).
 */
export function TemplateSelector({
  templates,
  selectedIds,
  onSelectionChange,
  maxSelection = 2,
  disabled = false,
  className,
}: TemplateSelectorProps) {
  // Calculate estimated analysis time (3-5 minutes per template)
  const estimatedTime = selectedIds.length * 4; // Average 4 minutes per template

  // Handle template selection
  const handleToggle = (templateId: string) => {
    if (selectedIds.includes(templateId)) {
      // Deselect
      onSelectionChange(selectedIds.filter((id) => id !== templateId));
    } else {
      // Select (if under limit)
      if (selectedIds.length < maxSelection) {
        onSelectionChange([...selectedIds, templateId]);
      }
    }
  };

  // Count total criteria in a template
  const countCriteria = (template: Template): number => {
    return template.categories.reduce((sum, cat) => sum + cat.criteria.length, 0);
  };

  // Filter only active templates
  const activeTemplates = templates.filter((t) => t.status === 'ACTIVE');

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Select Templates for Analysis</span>
          {selectedIds.length > 0 && (
            <Badge variant="secondary">
              {selectedIds.length} of {maxSelection} selected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selection limit warning */}
        {selectedIds.length >= maxSelection && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Maximum of {maxSelection} template{maxSelection > 1 ? 's' : ''} can be selected.
                Deselect a template to choose a different one.
              </p>
            </div>
          </div>
        )}

        {/* Template list */}
        {activeTemplates.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No active templates available. Please create a template first.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTemplates.map((template) => {
              const isSelected = selectedIds.includes(template.id);
              const isDisabled =
                disabled || (!isSelected && selectedIds.length >= maxSelection);
              const criteriaCount = countCriteria(template);

              return (
                <div
                  key={template.id}
                  className={cn(
                    'rounded-lg border p-4 transition-all',
                    isSelected && 'border-primary bg-primary/5',
                    isDisabled && 'opacity-50',
                    !isDisabled && 'hover:border-primary/50 cursor-pointer'
                  )}
                  onClick={() => !isDisabled && handleToggle(template.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <Checkbox
                      id={`template-${template.id}`}
                      checked={isSelected}
                      onCheckedChange={() => !isDisabled && handleToggle(template.id)}
                      disabled={isDisabled}
                      className="mt-1"
                    />

                    {/* Template info */}
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`template-${template.id}`}
                        className={cn(
                          'font-medium cursor-pointer block',
                          isDisabled && 'cursor-not-allowed'
                        )}
                      >
                        {template.name}
                      </label>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      )}

                      {/* Template stats */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline">
                          {template.categories.length} categor
                          {template.categories.length === 1 ? 'y' : 'ies'}
                        </Badge>
                        <Badge variant="outline">{criteriaCount} criteria</Badge>
                        {template.aiGenerated && (
                          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-950">
                            AI-Generated
                          </Badge>
                        )}
                        {template.usageCount > 0 && (
                          <Badge variant="secondary">
                            Used {template.usageCount} time{template.usageCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Estimated time */}
        {selectedIds.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Estimated analysis time: ~{estimatedTime} minute
                {estimatedTime !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* No templates selected message */}
        {selectedIds.length === 0 && activeTemplates.length > 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Select at least one template to begin analysis
          </div>
        )}
      </CardContent>
    </Card>
  );
}
