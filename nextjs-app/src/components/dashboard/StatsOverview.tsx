'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Radio,
  FileText,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatsOverviewProps {
  stats: {
    incidents: {
      total: number;
      active: number;
      resolved: number;
      withMayday: number;
    };
    templates: {
      total: number;
      active: number;
      aiGenerated: number;
    };
    transcriptions: {
      total: number;
      averageDuration: number;
      totalDuration: number;
    };
    audits: {
      total: number;
      averageScore: number;
      passCount: number;
      failCount: number;
      needsImprovementCount: number;
    };
  };
  className?: string;
}

/**
 * StatsOverview Component
 *
 * Display key metrics and statistics for the dashboard.
 * Shows incidents, templates, transcriptions, and audit statistics.
 */
export function StatsOverview({ stats, className }: StatsOverviewProps) {
  // Format duration in seconds to hours and minutes
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Calculate pass rate
  const passRate = stats.audits.total > 0
    ? Math.round((stats.audits.passCount / stats.audits.total) * 100)
    : 0;

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {/* Incidents Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
          <Radio className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.incidents.total}</div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>{stats.incidents.active} active</span>
            <span>•</span>
            <span>{stats.incidents.resolved} resolved</span>
          </div>
          {stats.incidents.withMayday > 0 && (
            <Badge variant="destructive" className="mt-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {stats.incidents.withMayday} with MAYDAY
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Templates Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.templates.active}</div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>{stats.templates.total} total</span>
            {stats.templates.aiGenerated > 0 && (
              <>
                <span>•</span>
                <span>{stats.templates.aiGenerated} AI-generated</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcriptions Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transcriptions</CardTitle>
          <Radio className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.transcriptions.total}</div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>Avg: {formatDuration(stats.transcriptions.averageDuration)}</span>
            <span>•</span>
            <span>Total: {formatDuration(stats.transcriptions.totalDuration)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Score Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Compliance</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', getScoreColor(stats.audits.averageScore))}>
            {Math.round(stats.audits.averageScore)}%
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-muted-foreground">Pass rate: {passRate}%</span>
            {passRate >= 80 ? (
              <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
