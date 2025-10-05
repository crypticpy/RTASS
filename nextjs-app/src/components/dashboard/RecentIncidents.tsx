'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface DashboardIncident {
  id: string;
  number: string;
  type: string;
  severity: string;
  address: string;
  startTime: Date;
  endTime: Date | null;
  status: string;
  hasMayday: boolean;
  transcriptCount: number;
  auditCount: number;
  averageScore: number | null;
  overallStatus: string | null;
  createdAt: Date;
}

export interface RecentIncidentsProps {
  incidents: DashboardIncident[];
  maxItems?: number;
  className?: string;
}

/**
 * RecentIncidents Component
 *
 * Display a list of recent incidents with key information.
 * Shows incident type, status, score, and mayday indicator.
 */
export function RecentIncidents({ incidents, maxItems = 5, className }: RecentIncidentsProps) {
  const displayIncidents = incidents.slice(0, maxItems);

  // Format date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Get status badge variant
  const getStatusVariant = (status: string): 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'RESOLVED':
        return 'secondary';
      case 'ACTIVE':
        return 'default';
      default:
        return 'outline';
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string): string => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'text-red-600 dark:text-red-400';
      case 'HIGH':
        return 'text-orange-600 dark:text-orange-400';
      case 'MEDIUM':
        return 'text-amber-600 dark:text-amber-400';
      case 'LOW':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Incidents</CardTitle>
          <Link href="/incidents">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {displayIncidents.length === 0 ? (
          <div className="text-center py-12">
            <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-4">
              No incidents yet
            </p>
            <Link href="/incidents/upload">
              <Button size="sm">Upload First Incident</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {displayIncidents.map((incident) => (
              <div
                key={incident.id}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 hover:bg-accent hover:shadow-sm',
                  incident.hasMayday && 'border-destructive/50 dark:border-destructive'
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'rounded-full p-2 shrink-0',
                  incident.hasMayday
                    ? 'bg-destructive/10 dark:bg-destructive/20'
                    : 'bg-primary/10 dark:bg-primary/20'
                )}>
                  {incident.hasMayday ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
                  ) : (
                    <Radio className="h-4 w-4 text-primary" aria-hidden="true" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Title and badges */}
                  <div className="flex items-start gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm truncate flex-1 min-w-0">
                      {incident.number}
                    </h4>
                    <Badge variant={getStatusVariant(incident.status)} className="shrink-0">
                      {incident.status}
                    </Badge>
                    {incident.hasMayday && (
                      <Badge variant="destructive" className="shrink-0 animate-pulse">
                        MAYDAY
                      </Badge>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className={getSeverityColor(incident.severity)}>
                      {incident.severity}
                    </span>
                    <span>•</span>
                    <span className="truncate">{incident.type}</span>
                    <span>•</span>
                    <span className="truncate">{incident.address}</span>
                  </div>

                  {/* Score and metadata */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-muted-foreground">{formatDate(incident.startTime)}</span>
                    </div>
                    {incident.averageScore !== null && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span className={getScoreColor(incident.averageScore)}>
                          {Math.round(incident.averageScore)}%
                        </span>
                      </div>
                    )}
                    {incident.transcriptCount > 0 && (
                      <span className="text-muted-foreground">
                        {incident.transcriptCount} transcript{incident.transcriptCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* View button */}
                <Link href={`/incidents/${incident.id}/report`}>
                  <Button variant="ghost" size="sm" className="shrink-0" aria-label={`View incident ${incident.number}`}>
                    View
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
