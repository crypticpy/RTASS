'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FOCUS_AREA_LABELS, FocusArea } from '@/types/policy';

type TemplateConfigFormData = {
  name: string;
  description: string;
  focusAreas: string[];
  extractCriteria: boolean;
  identifyWeights: boolean;
  generateExamples: boolean;
  createPrompts: boolean;
};

const templateConfigSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  description: z.string(),
  focusAreas: z.array(z.string()),
  extractCriteria: z.boolean(),
  identifyWeights: z.boolean(),
  generateExamples: z.boolean(),
  createPrompts: z.boolean(),
});

interface TemplateConfigFormProps {
  onSubmit: (data: TemplateConfigFormData) => void;
  disabled?: boolean;
}

export function TemplateConfigForm({
  onSubmit,
  disabled = false,
}: TemplateConfigFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TemplateConfigFormData>({
    resolver: zodResolver(templateConfigSchema),
    defaultValues: {
      name: '',
      description: '',
      focusAreas: [],
      extractCriteria: true,
      identifyWeights: true,
      generateExamples: true,
      createPrompts: true,
    },
  });

  const selectedFocusAreas = watch('focusAreas') || [];

  const toggleFocusArea = (area: FocusArea) => {
    const current = selectedFocusAreas;
    const updated = current.includes(area)
      ? current.filter((a) => a !== area)
      : [...current, area];
    setValue('focusAreas', updated);
  };

  const focusAreas: FocusArea[] = [
    'communication',
    'mayday',
    'safety_officer',
    'personnel_accountability',
    'resource_management',
    'command_structure',
  ];

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Template Configuration</h3>

          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="required">
              Template Name
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Incident Safety Protocol"
              disabled={disabled}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description of this template's purpose and scope"
              rows={3}
              disabled={disabled}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* AI Configuration */}
          <div className="space-y-3">
            <Label className="text-base">AI Configuration</Label>
            <div className="space-y-2 ml-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="extractCriteria"
                  checked={watch('extractCriteria')}
                  onCheckedChange={(checked) => setValue('extractCriteria', checked as boolean)}
                  disabled={disabled}
                />
                <Label htmlFor="extractCriteria" className="font-normal cursor-pointer">
                  Extract compliance criteria automatically
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="identifyWeights"
                  checked={watch('identifyWeights')}
                  onCheckedChange={(checked) => setValue('identifyWeights', checked as boolean)}
                  disabled={disabled}
                />
                <Label htmlFor="identifyWeights" className="font-normal cursor-pointer">
                  Identify scoring weights from policy emphasis
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generateExamples"
                  checked={watch('generateExamples')}
                  onCheckedChange={(checked) => setValue('generateExamples', checked as boolean)}
                  disabled={disabled}
                />
                <Label
                  htmlFor="generateExamples"
                  className="font-normal cursor-pointer"
                >
                  Generate example citations for each criterion
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createPrompts"
                  checked={watch('createPrompts')}
                  onCheckedChange={(checked) => setValue('createPrompts', checked as boolean)}
                  disabled={disabled}
                />
                <Label htmlFor="createPrompts" className="font-normal cursor-pointer">
                  Create audit narrative prompts
                </Label>
              </div>
            </div>
          </div>

          {/* Focus Areas */}
          <div className="space-y-3">
            <div>
              <Label className="text-base">Focus Areas (Optional)</Label>
              <p className="text-xs text-muted-foreground mt-1">
                AI will detect focus areas automatically if none are selected
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 ml-1">
              {focusAreas.map((area) => (
                <div key={area} className="flex items-center space-x-2">
                  <Checkbox
                    id={`focus-${area}`}
                    checked={selectedFocusAreas.includes(area)}
                    onCheckedChange={() => toggleFocusArea(area)}
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`focus-${area}`}
                    className="font-normal cursor-pointer"
                  >
                    {FOCUS_AREA_LABELS[area]}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end pt-4">
          <Button type="submit" variant="success" disabled={disabled} className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Generate Template (AI)</span>
          </Button>
        </div>
      </form>
    </Card>
  );
}
