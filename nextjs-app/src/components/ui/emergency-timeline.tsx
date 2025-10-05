"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  AlertCircle,
  Radio,
  CheckCircle2,
  Flame,
  Info
} from "lucide-react"

export type EmergencyEventType = 'mayday' | 'emergency' | 'evacuation' | 'all_clear' | 'info'
export type EmergencySeverity = 'critical' | 'high' | 'medium' | 'low'

export interface EmergencyEvent {
  id: string
  timestamp: number // seconds from start
  type: EmergencyEventType
  confidence: number // 0-1
  severity: EmergencySeverity
  text: string // Segment text
  context?: string // Surrounding context
}

export interface EmergencyTimelineProps {
  /** List of emergency events */
  events: EmergencyEvent[]

  /** Display options */
  maxHeight?: number // px, for scrolling
  showConfidence?: boolean
  variant?: 'compact' | 'detailed'
  className?: string
}

/**
 * EmergencyTimeline Component
 *
 * Visual timeline of emergency events (mayday detections) during incident.
 * Designed for chronological display of critical fire department communications.
 *
 * @example
 * ```tsx
 * <EmergencyTimeline
 *   events={[
 *     {
 *       id: '1',
 *       timestamp: 45,
 *       type: 'mayday',
 *       confidence: 0.98,
 *       severity: 'critical',
 *       text: 'Mayday mayday mayday, firefighter down on second floor',
 *       context: 'Engine 2 reporting emergency situation'
 *     }
 *   ]}
 *   showConfidence={true}
 * />
 * ```
 */
export const EmergencyTimeline = React.memo(function EmergencyTimeline({
  events,
  maxHeight = 500,
  showConfidence = true,
  variant = 'detailed',
  className,
}: EmergencyTimelineProps) {
  // Format timestamp as MM:SS
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Event type configuration
  const eventTypeConfig = {
    mayday: {
      icon: AlertTriangle,
      label: 'MAYDAY',
      color: 'text-fire-red',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-300 dark:border-red-700',
      dotColor: 'bg-fire-red',
    },
    emergency: {
      icon: AlertCircle,
      label: 'EMERGENCY',
      color: 'text-safety-orange',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      borderColor: 'border-orange-300 dark:border-orange-700',
      dotColor: 'bg-safety-orange',
    },
    evacuation: {
      icon: Flame,
      label: 'EVACUATION',
      color: 'text-tactical-yellow',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      borderColor: 'border-amber-300 dark:border-amber-700',
      dotColor: 'bg-tactical-yellow',
    },
    all_clear: {
      icon: CheckCircle2,
      label: 'ALL CLEAR',
      color: 'text-emergency-green',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-300 dark:border-green-700',
      dotColor: 'bg-emergency-green',
    },
    info: {
      icon: Info,
      label: 'INFO',
      color: 'text-ems-blue',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-300 dark:border-blue-700',
      dotColor: 'bg-ems-blue',
    },
  }

  // Severity configuration
  const severityConfig = {
    critical: {
      label: 'Critical',
      color: 'text-red-600 dark:text-red-400',
      pulse: true,
    },
    high: {
      label: 'High',
      color: 'text-orange-600 dark:text-orange-400',
      pulse: false,
    },
    medium: {
      label: 'Medium',
      color: 'text-amber-600 dark:text-amber-400',
      pulse: false,
    },
    low: {
      label: 'Low',
      color: 'text-blue-600 dark:text-blue-400',
      pulse: false,
    },
  }

  // Empty state
  if (events.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" aria-hidden="true" />
            Emergency Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckCircle2
              className="h-16 w-16 mx-auto mb-4 text-green-600 dark:text-green-400"
              aria-hidden="true"
            />
            <p className="text-lg font-medium text-green-600 dark:text-green-400">
              No emergency events detected
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              All communications within normal parameters
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort events by timestamp (memoized to avoid re-sorting on every render)
  const sortedEvents = React.useMemo(
    () => [...events].sort((a, b) => a.timestamp - b.timestamp),
    [events]
  )

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5" aria-hidden="true" />
            Emergency Events ({events.length})
          </div>
          <Badge variant="destructive" className="shrink-0">
            {events.filter(e => e.severity === 'critical').length} Critical
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <ScrollArea style={{ maxHeight: `${maxHeight}px` }} className="pr-4 overflow-x-hidden">
          <div className="relative min-w-0">
            {/* Timeline vertical line */}
            <div
              className="absolute left-16 top-0 bottom-0 w-0.5 bg-border"
              aria-hidden="true"
            />

            {/* Events */}
            <div className="space-y-6">
              {sortedEvents.map((event, index) => {
                const typeConfig = eventTypeConfig[event.type]
                const severityInfo = severityConfig[event.severity]
                const EventIcon = typeConfig.icon
                const isLastEvent = index === sortedEvents.length - 1

                return (
                  <div
                    key={event.id}
                    className="relative flex gap-4 min-w-0"
                    role="article"
                    aria-label={`${typeConfig.label} event at ${formatTimestamp(event.timestamp)}`}
                  >
                    {/* Timestamp */}
                    <div className="w-12 flex-shrink-0 text-right">
                      <time
                        className="text-sm font-mono font-medium text-muted-foreground"
                        dateTime={`PT${event.timestamp}S`}
                      >
                        {formatTimestamp(event.timestamp)}
                      </time>
                    </div>

                    {/* Timeline dot */}
                    <div className="relative flex-shrink-0 z-10">
                      <div
                        className={cn(
                          "h-3 w-3 rounded-full ring-4 ring-background",
                          typeConfig.dotColor,
                          severityInfo.pulse && "animate-pulse"
                        )}
                        aria-hidden="true"
                      />
                    </div>

                    {/* Event card */}
                    <div className={cn("flex-1 min-w-0", !isLastEvent && "pb-2")}>
                      <div
                        className={cn(
                          "rounded-lg border p-4 transition-all hover:shadow-md min-w-0",
                          typeConfig.borderColor,
                          typeConfig.bgColor
                        )}
                      >
                        {/* Event header */}
                        <div className="flex items-start justify-between gap-3 mb-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 flex-shrink">
                            <EventIcon
                              className={cn("h-5 w-5 flex-shrink-0", typeConfig.color)}
                              aria-hidden="true"
                            />
                            <span
                              className={cn("font-bold uppercase text-sm tracking-wide", typeConfig.color)}
                            >
                              {typeConfig.label}
                            </span>
                          </div>

                          {variant === 'detailed' && (
                            <Badge
                              variant={event.severity === 'critical' ? 'destructive' : 'secondary'}
                              className="shrink-0"
                            >
                              {severityInfo.label}
                            </Badge>
                          )}
                        </div>

                        {/* Event text */}
                        <p className="text-sm leading-relaxed mb-3 break-words overflow-wrap-anywhere">
                          "{event.text}"
                        </p>

                        {/* Context (if available) */}
                        {variant === 'detailed' && event.context && (
                          <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-3 mb-3 break-words overflow-wrap-anywhere">
                            Context: {event.context}
                          </p>
                        )}

                        {/* Confidence meter */}
                        {showConfidence && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Confidence:</span>
                            <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden max-w-32">
                              <div
                                className={cn(
                                  "h-full transition-all duration-500",
                                  event.confidence >= 0.8
                                    ? "bg-green-600 dark:bg-green-400"
                                    : event.confidence >= 0.6
                                    ? "bg-amber-600 dark:bg-amber-400"
                                    : "bg-red-600 dark:bg-red-400"
                                )}
                                style={{ width: `${event.confidence * 100}%` }}
                                role="meter"
                                aria-valuenow={event.confidence * 100}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`Confidence: ${Math.round(event.confidence * 100)}%`}
                              />
                            </div>
                            <span className="text-xs font-medium tabular-nums">
                              {Math.round(event.confidence * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
})

// Export types for documentation
