/**
 * IncidentCard Component
 *
 * Displays incident information with severity indicators and real-time status.
 * Designed for high-visibility and touch-friendly interaction in emergency operations.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Flame, Users, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'active' | 'resolved' | 'pending' | 'monitoring';

export interface IncidentCardProps {
  id: string;
  type: string;
  address: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  startTime: string;
  units?: string[];
  hasMayday?: boolean;
  injuries?: number;
  className?: string;
  onClick?: () => void;
}

const severityStyles: Record<IncidentSeverity, string> = {
  critical: 'border-critical bg-critical/10 hover:bg-critical/20',
  high: 'border-attention bg-attention/10 hover:bg-attention/20',
  medium: 'border-warning bg-warning/10 hover:bg-warning/20',
  low: 'border-safe bg-safe/10 hover:bg-safe/20',
};

const severityIcons: Record<IncidentSeverity, React.ReactNode> = {
  critical: <AlertTriangle className="h-5 w-5 text-critical" aria-label="Critical severity" />,
  high: <Flame className="h-5 w-5 text-attention" aria-label="High severity" />,
  medium: <Flame className="h-5 w-5 text-warning" aria-label="Medium severity" />,
  low: <Flame className="h-5 w-5 text-safe" aria-label="Low severity" />,
};

const statusStyles: Record<IncidentStatus, string> = {
  active: 'bg-critical text-primary-foreground px-3 py-1 rounded-full font-semibold text-sm',
  resolved: 'bg-safe text-success-foreground px-3 py-1 rounded-full font-semibold text-sm',
  pending: 'bg-attention text-secondary-foreground px-3 py-1 rounded-full font-semibold text-sm',
  monitoring: 'bg-info text-accent-foreground px-3 py-1 rounded-full font-semibold text-sm',
};

export function IncidentCard({
  id,
  type,
  address,
  severity,
  status,
  startTime,
  units = [],
  hasMayday = false,
  injuries = 0,
  className,
  onClick,
}: IncidentCardProps) {
  return (
    <Card
      className={cn(
        'touch-target transition-all duration-200 cursor-pointer',
        'border-2',
        severityStyles[severity],
        hasMayday && 'pulse-critical',
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${type} incident at ${address}, severity ${severity}, status ${status}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {severityIcons[severity]}
            <CardTitle className="text-lg md:text-xl truncate">{type}</CardTitle>
          </div>
          <Badge className={statusStyles[status]} aria-label={`Status: ${status}`}>
            {status.toUpperCase()}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2 text-emergency-sm mt-1">
          <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="truncate">{address}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Mayday Alert */}
        {hasMayday && (
          <div
            className="bg-mayday text-mayday-foreground px-3 py-2 rounded-md font-bold text-sm flex items-center gap-2"
            role="alert"
            aria-live="assertive"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            MAYDAY DECLARED
          </div>
        )}

        {/* Time and Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Started:</span>
            <span className="font-medium">{startTime}</span>
          </div>

          {injuries > 0 && (
            <div className="flex items-center gap-2" role="status">
              <AlertTriangle className="h-4 w-4 text-critical" aria-hidden="true" />
              <span className="text-critical font-semibold">
                {injuries} injured
              </span>
            </div>
          )}
        </div>

        {/* Units */}
        {units.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>Units on Scene:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {units.map((unit) => (
                <Badge key={unit} variant="outline" className="text-xs">
                  {unit}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
