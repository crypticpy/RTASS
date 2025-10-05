"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import {
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import type { ReportStats } from "@/types/incident"

export interface StatsCardsProps {
  /** Statistics to display */
  stats: ReportStats;
  overallScore: number;

  /** Display options */
  className?: string;
}

/**
 * StatsCards Component
 *
 * Quick statistics cards displaying key metrics from the incident report.
 * Shows overall score, critical issues, warnings, and strengths.
 *
 * @example
 * ```tsx
 * <StatsCards
 *   stats={{
 *     criticalIssues: 2,
 *     warnings: 5,
 *     strengths: 8,
 *     totalCriteria: 15
 *   }}
 *   overallScore={80}
 * />
 * ```
 */
export function StatsCards({
  stats,
  overallScore,
  className,
}: StatsCardsProps) {
  const cards = [
    {
      id: 'overall-score',
      label: 'Overall Score',
      value: `${Math.round(overallScore)}%`,
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800',
      description: `${stats.totalCriteria} criteria evaluated`,
    },
    {
      id: 'critical-issues',
      label: 'Critical Issues',
      value: stats.criticalIssues.toString(),
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-200 dark:border-red-800',
      description: stats.criticalIssues === 1 ? 'Requires immediate attention' : 'Require immediate attention',
    },
    {
      id: 'warnings',
      label: 'Warnings',
      value: stats.warnings.toString(),
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      borderColor: 'border-amber-200 dark:border-amber-800',
      description: stats.warnings === 1 ? 'Area for improvement' : 'Areas for improvement',
    },
    {
      id: 'strengths',
      label: 'Strengths',
      value: stats.strengths.toString(),
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-200 dark:border-green-800',
      description: stats.strengths === 1 ? 'Commendation earned' : 'Commendations earned',
    },
  ];

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card
            key={card.id}
            className={cn(
              "border-2 transition-all hover:shadow-md",
              card.borderColor
            )}
          >
            <CardContent className={cn("p-6", card.bgColor)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {card.label}
                  </p>
                  <p className="text-3xl font-bold tabular-nums">
                    {card.value}
                  </p>
                </div>
                <div className={cn(
                  "rounded-full p-2",
                  card.bgColor
                )}>
                  <Icon
                    className={cn("h-6 w-6", card.color)}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
