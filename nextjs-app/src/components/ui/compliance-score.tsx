"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText
} from "lucide-react"

export type ComplianceStatus = 'PASS' | 'NEEDS_IMPROVEMENT' | 'FAIL'

export interface ComplianceCategory {
  id: string
  name: string
  score: number // 0-100
  status: ComplianceStatus
  weight: number // 0-1 (percentage)
  criteriaCount: number
  passCount: number
}

export interface ComplianceScoreProps {
  /** Overall metrics */
  overallScore: number // 0-100
  overallStatus: ComplianceStatus
  totalCitations: number

  /** Category breakdown */
  categories: ComplianceCategory[]

  /** Display options */
  variant?: 'compact' | 'detailed'
  showCategories?: boolean
  className?: string
}

/**
 * ComplianceScore Component
 *
 * Visual display of compliance audit scores with category breakdown.
 * Designed for fire department protocol compliance auditing.
 *
 * @example
 * ```tsx
 * <ComplianceScore
 *   overallScore={87}
 *   overallStatus="PASS"
 *   totalCitations={12}
 *   categories={[
 *     {
 *       id: 'radio-report',
 *       name: 'Initial Radio Report',
 *       score: 92,
 *       status: 'PASS',
 *       weight: 0.25,
 *       criteriaCount: 4,
 *       passCount: 4
 *     }
 *   ]}
 * />
 * ```
 */
export const ComplianceScore = React.memo(function ComplianceScore({
  overallScore,
  overallStatus,
  totalCitations,
  categories,
  variant = 'detailed',
  showCategories = true,
  className,
}: ComplianceScoreProps) {
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(
    new Set()
  )

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  // Status configuration
  const statusConfig = {
    PASS: {
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-200 dark:border-green-800',
      icon: CheckCircle2,
      label: 'PASS',
      badgeVariant: 'default' as const,
    },
    NEEDS_IMPROVEMENT: {
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      borderColor: 'border-amber-200 dark:border-amber-800',
      icon: AlertTriangle,
      label: 'NEEDS IMPROVEMENT',
      badgeVariant: 'secondary' as const,
    },
    FAIL: {
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-200 dark:border-red-800',
      icon: XCircle,
      label: 'FAIL',
      badgeVariant: 'destructive' as const,
    },
  }

  const overallConfig = statusConfig[overallStatus]
  const OverallIcon = overallConfig.icon

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                {/* Circular progress indicator */}
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    className={cn("transition-all duration-500", overallConfig.color.replace('text-', 'stroke-'))}
                    strokeWidth="3"
                    strokeDasharray={`${overallScore} ${100 - overallScore}`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{Math.round(overallScore)}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <Badge variant={overallConfig.badgeVariant} className="mt-1">
                  {overallConfig.label}
                </Badge>
              </div>
            </div>

            <div className="text-right">
              <p className="text-3xl font-bold">{totalCitations}</p>
              <p className="text-sm text-muted-foreground">Citations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Detailed variant
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-center">Compliance Audit Results</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score Display */}
        <div className={cn("p-6 rounded-lg border-2", overallConfig.bgColor, overallConfig.borderColor)}>
          <div className="flex flex-col items-center gap-4">
            {/* Large circular score */}
            <div className="relative">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  className="stroke-muted opacity-20"
                  strokeWidth="2"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  className={cn(
                    "transition-all duration-1000 ease-out",
                    overallConfig.color.replace('text-', 'stroke-')
                  )}
                  strokeWidth="2"
                  strokeDasharray={`${overallScore * 0.97} ${(100 - overallScore) * 0.97}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-5xl font-bold"
                  aria-label={`Overall score: ${Math.round(overallScore)} percent`}
                >
                  {Math.round(overallScore)}
                </span>
              </div>
            </div>

            {/* Status badge and info */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <OverallIcon className={cn("h-6 w-6", overallConfig.color)} aria-hidden="true" />
                <span className={cn("text-xl font-bold uppercase tracking-wide", overallConfig.color)}>
                  {overallConfig.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Overall Compliance Score • {totalCitations} Citation{totalCitations !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {showCategories && categories.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Category Breakdown
            </h3>

            <div className="space-y-2">
              {categories.map((category) => {
                const isExpanded = expandedCategories.has(category.id)
                const categoryConfig = statusConfig[category.status]
                const CategoryIcon = categoryConfig.icon

                return (
                  <div
                    key={category.id}
                    className={cn(
                      "rounded-lg border transition-colors",
                      categoryConfig.borderColor
                    )}
                  >
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full p-4 text-left hover:bg-accent/50 transition-colors rounded-lg"
                      aria-expanded={isExpanded}
                      aria-controls={`category-${category.id}`}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category.name} category details`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <CategoryIcon
                            className={cn("h-5 w-5 shrink-0", categoryConfig.color)}
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{category.name}</h4>
                              <span className="text-sm text-muted-foreground shrink-0">
                                {Math.round(category.weight * 100)}% weight
                              </span>
                            </div>
                            <Progress
                              value={category.score}
                              className="h-2"
                              aria-label={`${category.name} score: ${category.score}%`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-2xl font-bold">{Math.round(category.score)}%</p>
                            <p className="text-xs text-muted-foreground">
                              {category.passCount}/{category.criteriaCount} passed
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div
                        id={`category-${category.id}`}
                        className={cn("px-4 pb-4 space-y-2", categoryConfig.bgColor)}
                      >
                        <div className="flex items-center justify-between text-sm pt-3 border-t">
                          <span className="text-muted-foreground">Criteria evaluated:</span>
                          <span className="font-medium">{category.criteriaCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Criteria passed:</span>
                          <span className={cn("font-medium", categoryConfig.color)}>
                            {category.passCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Criteria failed:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            {category.criteriaCount - category.passCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Category weight:</span>
                          <span className="font-medium">{Math.round(category.weight * 100)}%</span>
                        </div>
                        <Badge variant={categoryConfig.badgeVariant} className="mt-2">
                          {categoryConfig.label}
                        </Badge>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {showCategories && categories.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p className="text-sm">No category data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

// Export types for documentation
export type { ComplianceScoreProps, ComplianceCategory }
