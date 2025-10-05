"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Download,
  Share2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import type { ComplianceStatus } from "@/types/incident"

export interface ReportHeaderProps {
  /** Incident information */
  incidentId: string;
  incidentName: string;
  incidentDate?: Date;

  /** Overall compliance metrics */
  overallScore: number;
  overallStatus: ComplianceStatus;

  /** Action handlers */
  onBack?: () => void;
  onExportPDF?: () => Promise<void>;
  onShare?: () => void;

  /** Display options */
  className?: string;
}

/**
 * ReportHeader Component
 *
 * Header section for incident report page showing incident details,
 * overall compliance score, and action buttons.
 *
 * @example
 * ```tsx
 * <ReportHeader
 *   incidentId="inc-001"
 *   incidentName="Structure Fire - 123 Main Street"
 *   incidentDate={new Date()}
 *   overallScore={85}
 *   overallStatus="PASS"
 *   onBack={() => router.push('/incidents')}
 * />
 * ```
 */
export function ReportHeader({
  incidentId,
  incidentName,
  incidentDate,
  overallScore,
  overallStatus,
  onBack,
  onExportPDF,
  onShare,
  className,
}: ReportHeaderProps) {
  const [isExporting, setIsExporting] = React.useState(false);

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
  };

  const config = statusConfig[overallStatus];
  const StatusIcon = config.icon;

  // Format date
  const formatDate = (date?: Date): string => {
    if (!date) return 'No date specified';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Handle export
  const handleExport = async () => {
    if (!onExportPDF) {
      toast.error('Export functionality not configured');
      return;
    }

    setIsExporting(true);
    try {
      await onExportPDF();
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle share
  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      // Default share behavior - copy link to clipboard
      const shareUrl = `${window.location.origin}/incidents/${incidentId}/report`;
      navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard');
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Top section: Back button and actions */}
      <div className="flex items-center justify-between gap-4">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Incidents
          </Button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Main header section */}
      <div className={cn(
        "rounded-lg border-2 p-6",
        config.bgColor,
        config.borderColor
      )}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Incident info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-2 break-words">
              {incidentName}
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {formatDate(incidentDate)}
            </p>
            <div className="flex items-center gap-3">
              <StatusIcon className={cn("h-6 w-6", config.color)} aria-hidden="true" />
              <Badge variant={config.badgeVariant} className="text-sm px-3 py-1">
                {config.label}
              </Badge>
            </div>
          </div>

          {/* Right: Overall score ring */}
          <div className="flex-shrink-0">
            <div className="relative">
              {/* Circular progress indicator */}
              <svg
                className="h-32 w-32 -rotate-90"
                viewBox="0 0 36 36"
                aria-hidden="true"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  className="stroke-muted opacity-20"
                  strokeWidth="2.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  className={cn(
                    "transition-all duration-1000 ease-out",
                    config.color.replace('text-', 'stroke-')
                  )}
                  strokeWidth="2.5"
                  strokeDasharray={`${overallScore * 0.97} ${(100 - overallScore) * 0.97}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-4xl font-bold"
                  aria-label={`Overall score: ${Math.round(overallScore)} percent`}
                >
                  {Math.round(overallScore)}
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Score
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
