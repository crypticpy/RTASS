"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Truck,
  Users,
  MapPin,
  Clock,
  Radio,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Home,
  Wrench
} from "lucide-react"

export type UnitType = 'engine' | 'ladder' | 'rescue' | 'chief' | 'ems'
export type UnitStatusType = 'available' | 'dispatched' | 'on-scene' | 'returning' | 'out-of-service'

export interface Unit {
  id: string
  name: string // "Engine 1", "Ladder 2"
  type: UnitType
  status: UnitStatusType
  personnel: number
  lastUpdate: Date
  location?: string
}

export interface UnitStatusProps {
  /** List of units to display */
  units: Unit[]

  /** Display options */
  layout?: 'grid' | 'list'
  variant?: 'compact' | 'detailed'
  onUnitClick?: (unitId: string) => void
  className?: string
}

/**
 * UnitStatus Component
 *
 * Display fire apparatus/unit status indicators (available, dispatched, on-scene, etc.)
 * Designed for real-time fire department apparatus tracking.
 *
 * @example
 * ```tsx
 * <UnitStatus
 *   units={[
 *     {
 *       id: 'eng-1',
 *       name: 'Engine 1',
 *       type: 'engine',
 *       status: 'on-scene',
 *       personnel: 4,
 *       lastUpdate: new Date(),
 *       location: '123 Main St'
 *     }
 *   ]}
 *   layout="grid"
 * />
 * ```
 */
export const UnitStatus = React.memo(function UnitStatus({
  units,
  layout = 'grid',
  variant = 'detailed',
  onUnitClick,
  className,
}: UnitStatusProps) {
  // Track if component has mounted to avoid hydration mismatch
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // Format relative time (e.g., "2m ago")
  const formatRelativeTime = (date: Date): string => {
    // Validate date
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid time'
    }

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()

    // Handle future dates (clock skew or bad data)
    if (diffMs < 0) {
      return 'Just now'
    }

    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHr = Math.floor(diffMin / 60)

    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    return `${Math.floor(diffHr / 24)}d ago`
  }

  // Unit type configuration
  const unitTypeConfig = {
    engine: {
      icon: Truck,
      label: 'Engine',
      color: 'text-fire-red',
    },
    ladder: {
      icon: Truck,
      label: 'Ladder',
      color: 'text-safety-orange',
    },
    rescue: {
      icon: Radio,
      label: 'Rescue',
      color: 'text-ems-blue',
    },
    chief: {
      icon: Radio,
      label: 'Chief',
      color: 'text-purple-600 dark:text-purple-400',
    },
    ems: {
      icon: AlertCircle,
      label: 'EMS',
      color: 'text-emergency-green',
    },
  }

  // Status configuration
  const statusConfig = {
    available: {
      label: 'Available',
      color: 'text-emergency-green',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-300 dark:border-green-700',
      icon: CheckCircle2,
      glowColor: 'shadow-green-500/20',
    },
    dispatched: {
      label: 'Dispatched',
      color: 'text-ems-blue',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-300 dark:border-blue-700',
      icon: Navigation,
      glowColor: 'shadow-blue-500/20',
    },
    'on-scene': {
      label: 'On Scene',
      color: 'text-safety-orange',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      borderColor: 'border-orange-300 dark:border-orange-700',
      icon: MapPin,
      glowColor: 'shadow-orange-500/20',
    },
    returning: {
      label: 'Returning',
      color: 'text-tactical-yellow',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      borderColor: 'border-amber-300 dark:border-amber-700',
      icon: Home,
      glowColor: 'shadow-amber-500/20',
    },
    'out-of-service': {
      label: 'Out of Service',
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-950',
      borderColor: 'border-gray-300 dark:border-gray-700',
      icon: Wrench,
      glowColor: '',
    },
  }

  // Render individual unit card
  const renderUnitCard = (unit: Unit) => {
    const typeConfig = unitTypeConfig[unit.type]
    const statusInfo = statusConfig[unit.status]
    const TypeIcon = typeConfig.icon
    const StatusIcon = statusInfo.icon
    const isActive = unit.status === 'dispatched' || unit.status === 'on-scene'

    return (
      <Card
        key={unit.id}
        className={cn(
          "transition-all duration-300",
          statusInfo.borderColor,
          isActive && "border-2 shadow-lg",
          isActive && statusInfo.glowColor,
          onUnitClick && "cursor-pointer hover:shadow-lg hover:scale-105",
          layout === 'grid' && "min-h-[140px]"
        )}
        onClick={() => onUnitClick?.(unit.id)}
        role={onUnitClick ? "button" : undefined}
        tabIndex={onUnitClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onUnitClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onUnitClick(unit.id)
          }
        }}
      >
        <CardContent className={cn("p-4", layout === 'list' && "flex items-center gap-4")}>
          {/* Unit icon and name */}
          <div className={cn(
            "flex items-center gap-3",
            layout === 'grid' ? "mb-3" : "flex-1"
          )}>
            <div
              className={cn(
                "p-2.5 rounded-lg shrink-0",
                statusInfo.bgColor
              )}
              aria-hidden="true"
            >
              <TypeIcon className={cn("h-6 w-6", typeConfig.color)} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-lg truncate">{unit.name}</h3>
              <p className="text-xs text-muted-foreground capitalize">
                {typeConfig.label}
              </p>
            </div>

            {layout === 'grid' && isActive && (
              <div
                className={cn("h-2.5 w-2.5 rounded-full animate-pulse", statusInfo.borderColor.replace('border-', 'bg-'))}
                aria-label="Active"
              />
            )}
          </div>

          {/* Status section */}
          <div className={cn(
            "space-y-2",
            layout === 'list' && "flex items-center gap-4 flex-1"
          )}>
            {/* Status badge */}
            <div className={cn(
              "flex items-center gap-2",
              layout === 'list' && "min-w-[140px]"
            )}>
              <StatusIcon className={cn("h-4 w-4", statusInfo.color)} aria-hidden="true" />
              <span className={cn("font-semibold text-sm", statusInfo.color)}>
                {statusInfo.label}
              </span>
            </div>

            {/* Personnel count */}
            <div className={cn(
              "flex items-center gap-2 text-sm",
              layout === 'list' && "min-w-[80px]"
            )}>
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">
                {unit.personnel} <span className="text-muted-foreground">crew</span>
              </span>
            </div>

            {/* Location (if available) */}
            {variant === 'detailed' && unit.location && (
              <div className={cn(
                "flex items-center gap-2 text-sm",
                layout === 'list' && "flex-1 min-w-0"
              )}>
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="text-muted-foreground truncate">{unit.location}</span>
              </div>
            )}

            {/* Last update */}
            <div className={cn(
              "flex items-center gap-2 text-xs text-muted-foreground",
              layout === 'list' && "min-w-[100px] justify-end"
            )}>
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <time dateTime={unit.lastUpdate.toISOString()} suppressHydrationWarning>
                {isMounted ? formatRelativeTime(unit.lastUpdate) : 'Loading...'}
              </time>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Count units by status (memoized to avoid recalculating on every render)
  const statusCounts = React.useMemo(() => {
    return {
      total: units.length,
      available: units.filter(u => u.status === 'available').length,
      dispatched: units.filter(u => u.status === 'dispatched').length,
      'on-scene': units.filter(u => u.status === 'on-scene').length,
      returning: units.filter(u => u.status === 'returning').length,
      'out-of-service': units.filter(u => u.status === 'out-of-service').length,
      active: units.filter(u => u.status === 'on-scene' || u.status === 'dispatched').length,
    }
  }, [units])

  // Empty state
  if (units.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" aria-hidden="true" />
            Unit Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Truck className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" aria-hidden="true" />
            <p className="text-lg font-medium text-muted-foreground">
              No units available
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Unit status information will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Header with status summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" aria-hidden="true" />
              Unit Status ({units.length} total)
            </CardTitle>

            {/* Quick status counts */}
            <div className="flex items-center gap-2 flex-wrap">
              {statusCounts['available'] > 0 && (
                <Badge variant="default" className="bg-green-600">
                  {statusCounts['available']} Available
                </Badge>
              )}
              {statusCounts['dispatched'] > 0 && (
                <Badge variant="secondary" className="bg-blue-600 text-white">
                  {statusCounts['dispatched']} Dispatched
                </Badge>
              )}
              {statusCounts['on-scene'] > 0 && (
                <Badge variant="destructive" className="bg-orange-600">
                  {statusCounts['on-scene']} On Scene
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Units grid/list */}
      <div
        className={cn(
          layout === 'grid'
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-3"
        )}
      >
        {units.map(renderUnitCard)}
      </div>
    </div>
  )
})

// Export types for documentation
