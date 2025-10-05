'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { IncidentMetadata, IncidentType } from '@/types/incident';
import { INCIDENT_TYPE_LABELS } from '@/types/incident';

// Validation schema
const incidentMetadataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  incidentDate: z.string().optional(),
  incidentTime: z.string().optional(),
  type: z.enum([
    'STRUCTURE_FIRE',
    'VEHICLE_FIRE',
    'WILDFIRE',
    'MEDICAL',
    'RESCUE',
    'HAZMAT',
    'MVA',
    'OTHER',
  ] as const).optional(),
  location: z.string().optional(),
  unitsInvolved: z.string().optional(), // Comma-separated, will be split
  notes: z.string().optional(),
});

type FormData = z.infer<typeof incidentMetadataSchema>;

export interface IncidentMetadataFormProps {
  onSubmit: (data: IncidentMetadata) => void;
  disabled?: boolean;
  initialData?: Partial<IncidentMetadata>;
  className?: string;
}

/**
 * IncidentMetadataForm Component
 *
 * Form for capturing optional incident details to enhance AI analysis context.
 * All fields are optional. Auto-generates incident name from date if not provided.
 */
export function IncidentMetadataForm({
  onSubmit,
  disabled = false,
  initialData,
  className,
}: IncidentMetadataFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(incidentMetadataSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      incidentDate: initialData?.incidentDate
        ? new Date(initialData.incidentDate).toISOString().split('T')[0]
        : '',
      incidentTime: initialData?.incidentTime || '',
      type: initialData?.type,
      location: initialData?.location || '',
      unitsInvolved: initialData?.unitsInvolved?.join(', ') || '',
      notes: initialData?.notes || '',
    },
  });

  const selectedType = watch('type');

  const handleFormSubmit = (data: FormData) => {
    // Convert form data to IncidentMetadata
    const metadata: IncidentMetadata = {
      name: data.name || generateDefaultName(data.incidentDate),
      description: data.description,
      incidentDate: data.incidentDate ? new Date(data.incidentDate) : undefined,
      incidentTime: data.incidentTime,
      type: data.type,
      location: data.location,
      unitsInvolved: data.unitsInvolved
        ? data.unitsInvolved.split(',').map((u) => u.trim()).filter(Boolean)
        : undefined,
      notes: data.notes,
    };

    onSubmit(metadata);
  };

  // Generate default name from date
  const generateDefaultName = (dateString?: string): string => {
    const date = dateString ? new Date(dateString) : new Date();
    return `Incident - ${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Incident Information (Optional)</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Incident Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Incident Name/Description
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Auto-generated if left blank"
              disabled={disabled}
            />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incidentDate">Incident Date</Label>
              <Input
                id="incidentDate"
                type="date"
                {...register('incidentDate')}
                disabled={disabled}
              />
              {errors.incidentDate && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.incidentDate.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="incidentTime">Incident Time</Label>
              <Input
                id="incidentTime"
                type="time"
                {...register('incidentTime')}
                disabled={disabled}
              />
              {errors.incidentTime && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.incidentTime.message}
                </p>
              )}
            </div>
          </div>

          {/* Incident Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Incident Type</Label>
            <Select
              value={selectedType || ''}
              onValueChange={(value) => setValue('type', value as IncidentType)}
              disabled={disabled}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select incident type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.type.message}</p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="e.g., 123 Main Street"
              disabled={disabled}
            />
            {errors.location && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.location.message}</p>
            )}
          </div>

          {/* Units Involved */}
          <div className="space-y-2">
            <Label htmlFor="unitsInvolved">
              Units Involved
              <span className="text-sm text-muted-foreground ml-2">(comma-separated)</span>
            </Label>
            <Input
              id="unitsInvolved"
              {...register('unitsInvolved')}
              placeholder="e.g., Engine 1, Engine 2, Ladder 2"
              disabled={disabled}
            />
            {errors.unitsInvolved && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.unitsInvolved.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description of the incident"
              rows={2}
              disabled={disabled}
            />
            {errors.description && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Notes/Context */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes/Context
              <span className="text-sm text-muted-foreground ml-2">
                (will help AI analysis)
              </span>
            </Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional context that might help the AI understand the incident"
              rows={3}
              disabled={disabled}
            />
            {errors.notes && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.notes.message}</p>
            )}
          </div>

          {/* Hidden submit button - form will be submitted by parent component */}
          <button type="submit" className="sr-only" disabled={disabled}>
            Submit
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
