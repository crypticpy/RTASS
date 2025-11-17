"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react"
import type { Finding } from "@/types/incident"

export interface FindingsListProps {
  /** List of findings (critical issues or strengths) */
  findings: Finding[];

  /** Type of findings */
  variant: 'critical' | 'strengths';

  /** Callback when timestamp is clicked (for navigation) */
  onTimestampClick?: (timestamp: number) => void;

  /** Display options */
  className?: string;
}

/**
 * FindingsList Component
 *
 * Displays a list of critical findings or strengths from compliance audit.
 * Each finding is expandable to show full details.
 *
 * @example
 * ```tsx
 * <FindingsList
 *   findings={criticalFindings}
 *   variant="critical"
 *   onTimestampClick={(ts) => jumpToTimeline(ts)}
 * />
 * ```
 */
export function FindingsList({
  findings,
  variant,
  onTimestampClick,
  className,
}: FindingsListProps) {
  const [expandedFindings, setExpandedFindings] = React.useState<Set<string>>(
    new Set()
  );

  // Toggle finding expansion
  const toggleFinding = (findingId: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return next;
    });
  };

  // Format timestamp as MM:SS or HH:MM:SS
  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Severity configuration
  const severityConfig = {
    CRITICAL: {
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-300 dark:border-red-700',
      icon: AlertCircle,
      label: 'CRITICAL',
      badgeVariant: 'destructive' as const,
    },
    HIGH: {
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      borderColor: 'border-orange-300 dark:border-orange-700',
      icon: AlertTriangle,
      label: 'HIGH',
      badgeVariant: 'destructive' as const,
    },
    MEDIUM: {
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      borderColor: 'border-amber-300 dark:border-amber-700',
      icon: Info,
      label: 'MEDIUM',
      badgeVariant: 'secondary' as const,
    },
    LOW: {
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-300 dark:border-blue-700',
      icon: Info,
      label: 'LOW',
      badgeVariant: 'secondary' as const,
    },
  };

  // Configuration for variant
  const variantConfig = {
    critical: {
      emptyTitle: 'No critical issues identified',
      emptyIcon: CheckCircle2,
      emptyColor: 'text-green-600 dark:text-green-400',
      emptyMessage: 'All compliance criteria met or only minor issues found.',
    },
    strengths: {
      emptyTitle: 'No strengths identified',
      emptyIcon: Info,
      emptyColor: 'text-muted-foreground',
      emptyMessage: 'No exceptional performance areas were noted in this audit.',
    },
  };

  const config = variantConfig[variant];

  // Empty state
  if (findings.length === 0) {
    const EmptyIcon = config.emptyIcon;
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="text-center">
            <EmptyIcon
              className={cn("h-16 w-16 mx-auto mb-4", config.emptyColor)}
              aria-hidden="true"
            />
            <h3 className={cn("text-lg font-semibold mb-2", config.emptyColor)}>
              {config.emptyTitle}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {config.emptyMessage}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {findings.map((finding) => {
        const isExpanded = expandedFindings.has(finding.id);
        const severityInfo = finding.severity
          ? severityConfig[finding.severity]
          : null;
        const SeverityIcon = severityInfo?.icon || CheckCircle2;

        // For strengths, use green styling
        const isStrength = variant === 'strengths';
        const borderColor = isStrength
          ? 'border-green-300 dark:border-green-700'
          : severityInfo?.borderColor || 'border-border';
        const bgColor = isStrength
          ? 'bg-green-50 dark:bg-green-950'
          : severityInfo?.bgColor || 'bg-background';

        return (
          <Card
            key={finding.id}
            className={cn("border-2 transition-all", borderColor)}
          >
            <CardContent className="p-0">
              {/* Header - always visible */}
              <button
                onClick={() => toggleFinding(finding.id)}
                className={cn(
                  "w-full p-4 text-left hover:bg-accent/50 transition-colors",
                  isExpanded && "border-b",
                  bgColor
                )}
                aria-expanded={isExpanded}
                aria-controls={`finding-${finding.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <SeverityIcon
                      className={cn(
                        "h-5 w-5 mt-0.5 flex-shrink-0",
                        isStrength
                          ? 'text-green-600 dark:text-green-400'
                          : severityInfo?.color
                      )}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {finding.severity && !isStrength && (
                          <Badge
                            variant={severityInfo!.badgeVariant}
                            className="shrink-0"
                          >
                            {severityInfo!.label}
                          </Badge>
                        )}
                        {isStrength && (
                          <Badge
                            variant="default"
                            className="shrink-0 bg-green-600 dark:bg-green-700"
                          >
                            STRENGTH
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {finding.category}
                        </span>
                      </div>
                      <h3 className="font-semibold mb-2 break-words">
                        {finding.criterion}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onTimestampClick) {
                              onTimestampClick(finding.timestamp);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (onTimestampClick) {
                                onTimestampClick(finding.timestamp);
                              }
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className="text-xs text-muted-foreground hover:text-primary hover:underline font-mono cursor-pointer"
                        >
                          {formatTimestamp(finding.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                  )}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div id={`finding-${finding.id}`} className="p-4 space-y-4">
                  {/* Evidence */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Evidence</h4>
                    <div className="bg-muted/50 rounded-lg p-3 border-l-4 border-muted-foreground/30">
                      <p className="text-sm italic break-words">
                        &ldquo;{finding.evidence}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Reasoning (for critical findings) */}
                  {finding.reasoning && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Analysis</h4>
                      <p className="text-sm text-muted-foreground break-words">
                        {finding.reasoning}
                      </p>
                    </div>
                  )}

                  {/* Impact (for critical findings) */}
                  {finding.impact && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">
                        Impact
                      </h4>
                      <p className="text-sm text-muted-foreground break-words">
                        {finding.impact}
                      </p>
                    </div>
                  )}

                  {/* Recommendation (for critical findings) */}
                  {finding.recommendation && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Recommendation</h4>
                      <p className="text-sm text-muted-foreground break-words">
                        {finding.recommendation}
                      </p>
                    </div>
                  )}

                  {/* Note (for strengths) */}
                  {finding.note && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-green-600 dark:text-green-400">
                        Commendation
                      </h4>
                      <p className="text-sm text-muted-foreground break-words">
                        {finding.note}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
