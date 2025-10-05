/**
 * MaydayAlert Component
 *
 * Critical alert component for mayday situations. Displays with maximum
 * visibility and accessibility for life-threatening emergencies.
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Radio, MapPin, Users, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MaydayAlertProps {
  unit: string;
  location: string;
  timestamp: string;
  personnel?: number;
  situation?: string;
  response?: 'acknowledged' | 'rit-deployed' | 'resolved' | 'pending';
  onAcknowledge?: () => void;
  onDeployRIT?: () => void;
  className?: string;
}

const responseStyles = {
  acknowledged: 'bg-attention text-secondary-foreground',
  'rit-deployed': 'bg-info text-accent-foreground',
  resolved: 'bg-safe text-success-foreground',
  pending: 'bg-critical text-primary-foreground pulse-critical',
};

export function MaydayAlert({
  unit,
  location,
  timestamp,
  personnel,
  situation,
  response = 'pending',
  onAcknowledge,
  onDeployRIT,
  className,
}: MaydayAlertProps) {
  return (
    <Alert
      className={cn(
        'border-4 border-mayday bg-mayday/10',
        'touch-target-lg',
        response === 'pending' && 'pulse-critical',
        className
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex items-start gap-4">
        <AlertTriangle
          className="h-8 w-8 text-mayday flex-shrink-0 mt-1"
          aria-hidden="true"
        />
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <AlertTitle className="text-emergency-xl font-extrabold text-mayday m-0">
              MAYDAY! MAYDAY! MAYDAY!
            </AlertTitle>
            <Badge className={responseStyles[response]}>
              {response.toUpperCase().replace('-', ' ')}
            </Badge>
          </div>

          <AlertDescription className="space-y-2 text-emergency-base">
            {/* Unit Information */}
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Radio className="h-5 w-5" aria-hidden="true" />
              <span>Unit: {unit}</span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-critical" aria-hidden="true" />
              <span className="font-semibold">Location: {location}</span>
            </div>

            {/* Time */}
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" aria-hidden="true" />
              <span>Time: {timestamp}</span>
            </div>

            {/* Personnel */}
            {personnel !== undefined && (
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-critical" aria-hidden="true" />
                <span className="font-bold text-critical">
                  {personnel} Personnel in Immediate Danger
                </span>
              </div>
            )}

            {/* Situation */}
            {situation && (
              <div className="bg-card p-3 rounded-md border-2 border-critical/20">
                <p className="font-semibold text-foreground">{situation}</p>
              </div>
            )}
          </AlertDescription>

          {/* Action Buttons */}
          {response === 'pending' && (
            <div className="flex gap-2 flex-wrap pt-2">
              {onAcknowledge && (
                <Button
                  onClick={onAcknowledge}
                  className="touch-target-lg bg-attention hover:bg-attention/90"
                  aria-label="Acknowledge mayday"
                >
                  <Radio className="mr-2 h-5 w-5" />
                  Acknowledge
                </Button>
              )}
              {onDeployRIT && (
                <Button
                  onClick={onDeployRIT}
                  className="touch-target-lg bg-critical hover:bg-critical/90"
                  aria-label="Deploy Rapid Intervention Team"
                >
                  <Users className="mr-2 h-5 w-5" />
                  Deploy RIT
                </Button>
              )}
            </div>
          )}

          {response === 'acknowledged' && (
            <div className="bg-attention/20 border-2 border-attention p-3 rounded-md">
              <p className="font-semibold text-attention">
                Mayday acknowledged. Standing by for further instructions.
              </p>
            </div>
          )}

          {response === 'rit-deployed' && (
            <div className="bg-info/20 border-2 border-info p-3 rounded-md">
              <p className="font-semibold text-info">
                Rapid Intervention Team deployed. Rescue in progress.
              </p>
            </div>
          )}

          {response === 'resolved' && (
            <div className="bg-safe/20 border-2 border-safe p-3 rounded-md">
              <p className="font-semibold text-safe">
                Mayday resolved. All personnel accounted for.
              </p>
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}
