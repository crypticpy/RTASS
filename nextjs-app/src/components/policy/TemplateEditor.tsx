'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Template, TemplateCategory, TemplateCriterion } from '@/types/policy';

interface TemplateEditorProps {
  template: Template;
  onChange: (template: Template) => void;
  readOnly?: boolean;
}

export function TemplateEditor({
  template,
  onChange,
  readOnly = false,
}: TemplateEditorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(template.categories.map((c) => c.id))
  );
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

  const toggleCategory = (id: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const togglePrompt = (id: string) => {
    const newExpanded = new Set(expandedPrompts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPrompts(newExpanded);
  };

  const updateCategory = (categoryId: string, updates: Partial<TemplateCategory>) => {
    const newCategories = template.categories.map((cat) =>
      cat.id === categoryId ? { ...cat, ...updates } : cat
    );
    onChange({ ...template, categories: newCategories });
  };

  const updateCriterion = (
    categoryId: string,
    criterionId: string,
    updates: Partial<TemplateCriterion>
  ) => {
    const newCategories = template.categories.map((cat) =>
      cat.id === categoryId
        ? {
            ...cat,
            criteria: cat.criteria.map((crit) =>
              crit.id === criterionId ? { ...crit, ...updates } : crit
            ),
          }
        : cat
    );
    onChange({ ...template, categories: newCategories });
  };

  const addCategory = () => {
    const newCategory: TemplateCategory = {
      id: `cat-${Date.now()}`,
      name: 'New Category',
      weight: 0,
      sortOrder: template.categories.length,
      criteria: [],
      analysisPrompt: 'Analyze the transcript for this category...',
    };
    onChange({ ...template, categories: [...template.categories, newCategory] });
    setExpandedCategories(new Set([...expandedCategories, newCategory.id]));
  };

  const removeCategory = (categoryId: string) => {
    const newCategories = template.categories.filter((cat) => cat.id !== categoryId);
    onChange({ ...template, categories: newCategories });
  };

  const addCriterion = (categoryId: string) => {
    const category = template.categories.find((cat) => cat.id === categoryId);
    if (!category) return;

    const newCriterion: TemplateCriterion = {
      id: `crit-${Date.now()}`,
      description: 'New criterion',
      scoringGuidance: 'Scoring guidance...',
      sortOrder: category.criteria.length,
    };

    updateCategory(categoryId, {
      criteria: [...category.criteria, newCriterion],
    });
  };

  const removeCriterion = (categoryId: string, criterionId: string) => {
    const category = template.categories.find((cat) => cat.id === categoryId);
    if (!category) return;

    updateCategory(categoryId, {
      criteria: category.criteria.filter((crit) => crit.id !== criterionId),
    });
  };

  const updateWeight = (categoryId: string, weight: number) => {
    updateCategory(categoryId, { weight: weight / 100 });
  };

  // Calculate total weight
  const totalWeight = template.categories.reduce((sum, cat) => sum + cat.weight, 0);
  const weightError = Math.abs(totalWeight - 1.0) > 0.01;

  return (
    <div className="space-y-6">
      {/* Template Metadata */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={template.name}
              onChange={(e) => onChange({ ...template, name: e.target.value })}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={template.description || ''}
              onChange={(e) =>
                onChange({ ...template, description: e.target.value })
              }
              rows={2}
              disabled={readOnly}
            />
          </div>
        </div>
      </Card>

      {/* Weight Validation */}
      {weightError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Total category weights must equal 100%. Current total:{' '}
            {Math.round(totalWeight * 100)}%
          </AlertDescription>
        </Alert>
      )}

      {!weightError && template.categories.length > 0 && (
        <Alert>
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            Category weights are valid (Total: 100%)
          </AlertDescription>
        </Alert>
      )}

      {/* Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Categories ({template.categories.length})
          </h3>
          {!readOnly && (
            <Button onClick={addCategory} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          )}
        </div>

        {template.categories.map((category, index) => {
          const isExpanded = expandedCategories.has(category.id);
          const promptExpanded = expandedPrompts.has(category.id);

          return (
            <Card key={category.id} className="p-6">
              <div className="space-y-4">
                {/* Category Header */}
                <div className="flex items-start gap-3">
                  {!readOnly && (
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                  )}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Category Name</Label>
                          <Input
                            value={category.name}
                            onChange={(e) =>
                              updateCategory(category.id, { name: e.target.value })
                            }
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Weight: {Math.round(category.weight * 100)}%</Label>
                          <Slider
                            value={[category.weight * 100]}
                            onValueChange={([value]) =>
                              updateWeight(category.id, value)
                            }
                            min={0}
                            max={100}
                            step={1}
                            disabled={readOnly}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCategory(category.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        {!readOnly && template.categories.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Category Description */}
                    {isExpanded && (
                      <>
                        <div className="space-y-2">
                          <Label>Description (Optional)</Label>
                          <Textarea
                            value={category.description || ''}
                            onChange={(e) =>
                              updateCategory(category.id, {
                                description: e.target.value,
                              })
                            }
                            rows={2}
                            disabled={readOnly}
                          />
                        </div>

                        {/* Criteria */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-base">
                              Criteria ({category.criteria.length})
                            </Label>
                            {!readOnly && (
                              <Button
                                onClick={() => addCriterion(category.id)}
                                size="sm"
                                variant="outline"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Criterion
                              </Button>
                            )}
                          </div>

                          <div className="space-y-3 pl-4 border-l-2">
                            {category.criteria.map((criterion) => (
                              <Card key={criterion.id} className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-1 space-y-3">
                                      <div className="space-y-2">
                                        <Label className="text-sm">Description</Label>
                                        <Input
                                          value={criterion.description}
                                          onChange={(e) =>
                                            updateCriterion(
                                              category.id,
                                              criterion.id,
                                              { description: e.target.value }
                                            )
                                          }
                                          disabled={readOnly}
                                          placeholder="What will be scored?"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-sm">
                                          Scoring Guidance
                                        </Label>
                                        <Textarea
                                          value={criterion.scoringGuidance}
                                          onChange={(e) =>
                                            updateCriterion(
                                              category.id,
                                              criterion.id,
                                              { scoringGuidance: e.target.value }
                                            )
                                          }
                                          disabled={readOnly}
                                          rows={2}
                                          placeholder="How to determine PASS/FAIL?"
                                        />
                                      </div>
                                      {(criterion.sourcePageNumber ||
                                        criterion.sourceText) && (
                                        <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                                          <p className="font-medium mb-1">
                                            Source Reference:
                                          </p>
                                          {criterion.sourcePageNumber && (
                                            <p>Page {criterion.sourcePageNumber}</p>
                                          )}
                                          {criterion.sourceText && (
                                            <p className="italic mt-1">
                                              &ldquo;{criterion.sourceText}&rdquo;
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {!readOnly && category.criteria.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          removeCriterion(category.id, criterion.id)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            ))}

                            {category.criteria.length === 0 && (
                              <div className="text-sm text-muted-foreground text-center py-4">
                                No criteria yet. Click &ldquo;Add Criterion&rdquo; to get started.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* AI Analysis Prompt */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-base">AI Analysis Prompt</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePrompt(category.id)}
                            >
                              {promptExpanded ? (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-2" />
                                  Hide
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="h-4 w-4 mr-2" />
                                  Show
                                </>
                              )}
                            </Button>
                          </div>
                          {promptExpanded && (
                            <Textarea
                              value={category.analysisPrompt}
                              onChange={(e) =>
                                updateCategory(category.id, {
                                  analysisPrompt: e.target.value,
                                })
                              }
                              rows={6}
                              disabled={readOnly}
                              placeholder="Prompt for AI to analyze transcript for this category..."
                              className="font-mono text-sm"
                            />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {template.categories.length === 0 && (
          <Card className="p-12 text-center">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                No categories yet. Add your first category to get started.
              </p>
              {!readOnly && (
                <Button onClick={addCategory} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
