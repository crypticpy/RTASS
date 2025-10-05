'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Radio,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Trash2,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Incident, IncidentStatus } from '@/types/incident';
import { STATUS_LABELS, INCIDENT_TYPE_LABELS } from '@/types/incident';

export interface IncidentCardProps {
  incident: Incident;
  onView: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

/**
 * IncidentCard Component
 *
 * Display card for incident in list view.
 * Shows status, scores, mayday indicator, and action buttons.
 */
export function IncidentCard({ incident, onView, onDelete, className }: IncidentCardProps) {
  // Format date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Status configuration
  const statusConfig: Record<
    IncidentStatus,
    { color: string; bgColor: string; icon: React.ElementType }
  > = {
    UPLOADED: {
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-950',
      icon: FileText,
    },
    TRANSCRIBING: {
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-950',
      icon: Radio,
    },
    ANALYZING: {
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-950',
      icon: Clock,
    },
    COMPLETE: {
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-950',
      icon: CheckCircle2,
    },
    ERROR: {
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-950',
      icon: AlertTriangle,
    },
  };

  const config = statusConfig[incident.status];
  const StatusIcon = config.icon;

  // Score color
  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card
      className={cn(
        'hover:shadow-md transition-all duration-200',
        incident.maydayDetected && 'border-destructive/50 dark:border-destructive',
        className
      )}
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3
                  className="font-semibold text-lg truncate"
                  title={incident.name}
                >
                  {incident.name}
                </h3>
                {incident.maydayDetected && (
                  <Badge
                    variant="destructive"
                    className="shrink-0 animate-pulse"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    MAYDAY
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{formatDate(incident.createdAt)}</span>
                {incident.type && (
                  <>
                    <span>•</span>
                    <span>{INCIDENT_TYPE_LABELS[incident.type]}</span>
                  </>
                )}
                {incident.location && (
                  <>
                    <span>•</span>
                    <span className="truncate">{incident.location}</span>
                  </>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <Badge className={cn(config.bgColor, config.color, 'shrink-0')}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {STATUS_LABELS[incident.status]}
            </Badge>
          </div>

          {/* Score Display (if complete) */}
          {incident.status === 'COMPLETE' && incident.overallScore !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overall Score</span>
                <span className={cn('text-2xl font-bold', getScoreColor(incident.overallScore))}>
                  {Math.round(incident.overallScore)}%
                </span>
              </div>
              <Progress value={incident.overallScore} className="h-2" />
            </div>
          )}

          {/* File Info */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {formatDuration(incident.audioFile.duration)}
            </Badge>
            <Badge variant="outline">
              {formatFileSize(incident.audioFile.size)}
            </Badge>
            {incident.auditIds.length > 0 && (
              <Badge variant="outline">
                {incident.auditIds.length} template{incident.auditIds.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              variant="default"
              size="sm"
              onClick={() => onView(incident.id)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              {incident.status === 'COMPLETE' ? 'View Report' : 'View Status'}
            </Button>
            {onDelete && incident.status !== 'TRANSCRIBING' && incident.status !== 'ANALYZING' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(incident.id)}
                className="text-destructive dark:text-destructive hover:bg-destructive/10"
                aria-label={`Delete incident ${incident.name}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
