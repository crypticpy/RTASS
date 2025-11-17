"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileAudio,
  X,
  AlertCircle
} from "lucide-react"

export interface TranscriptionProgressProps {
  /** File information */
  fileName: string
  fileSize: number

  /** Progress tracking */
  status: 'uploading' | 'uploaded' | 'processing' | 'analyzing' | 'complete' | 'error'
  uploadProgress?: number // 0-100
  processingProgress?: number // 0-100

  /** Results */
  maydayDetected?: boolean
  emergencyCount?: number
  duration?: number // seconds

  /** Error handling */
  error?: string
  onRetry?: () => void
  onCancel?: () => void

  /** Display options */
  className?: string
}

/**
 * TranscriptionProgress Component
 *
 * Real-time progress display for audio transcription operations.
 * Designed for fire department radio transcription with emergency detection indicators.
 *
 * @example
 * ```tsx
 * <TranscriptionProgress
 *   fileName="radio-traffic-2024-10-04.mp3"
 *   fileSize={15728640}
 *   status="processing"
 *   processingProgress={45}
 *   maydayDetected={true}
 *   emergencyCount={2}
 * />
 * ```
 */
export const TranscriptionProgress = React.memo(function TranscriptionProgress({
  fileName,
  fileSize,
  status,
  uploadProgress = 0,
  processingProgress = 0,
  maydayDetected = false,
  emergencyCount = 0,
  duration,
  error,
  onRetry,
  onCancel,
  className,
}: TranscriptionProgressProps) {
  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Format duration for display
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'Calculating...'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate estimated time remaining based on status
  const getEstimatedTime = (): string | null => {
    if (status === 'uploaded' || status === 'complete' || status === 'error') return null

    if (status === 'uploading' && uploadProgress > 0) {
      const remaining = Math.ceil((100 - uploadProgress) * 0.3) // ~0.3s per %
      return `~${remaining}s remaining`
    }

    if (status === 'processing' && processingProgress > 0) {
      const remaining = Math.ceil((100 - processingProgress) * 0.5) // ~0.5s per %
      return `~${remaining}s remaining`
    }

    if (status === 'analyzing') {
      return '~5s remaining'
    }

    return null
  }

  // Get current progress value based on status
  const getCurrentProgress = (): number => {
    switch (status) {
      case 'uploading':
        return uploadProgress
      case 'uploaded':
        return 100
      case 'processing':
        return processingProgress
      case 'analyzing':
        return 95
      case 'complete':
        return 100
      default:
        return 0
    }
  }

  // Status display configuration
  const statusConfig = {
    uploading: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      label: 'Uploading audio file',
      color: 'text-ems-blue',
    },
    uploaded: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      label: 'Upload complete — ready to analyze',
      color: 'text-emergency-green',
    },
    processing: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      label: 'Processing audio',
      color: 'text-safety-orange',
    },
    analyzing: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      label: 'Analyzing for emergencies',
      color: 'text-tactical-yellow',
    },
    complete: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      label: 'Transcription complete',
      color: 'text-emergency-green',
    },
    error: {
      icon: <AlertTriangle className="h-5 w-5" />,
      label: 'Transcription failed',
      color: 'text-fire-red',
    },
  }

  const currentStatus = statusConfig[status]
  const estimatedTime = getEstimatedTime()
  const progress = getCurrentProgress()

  return (
    <Card
      className={cn(
        "w-full transition-all duration-300",
        status === 'error' && "border-red-500 dark:border-red-900",
        className
      )}
      role="region"
      aria-label="Transcription progress"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={cn(
                "p-2 rounded-lg shrink-0",
                status === 'error'
                  ? "bg-red-100 dark:bg-red-950"
                  : "bg-blue-100 dark:bg-blue-950"
              )}
              aria-hidden="true"
            >
              <FileAudio className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="flex-1 min-w-0">
              <h3
                className="font-semibold text-base truncate"
                title={fileName}
              >
                {fileName}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {formatFileSize(fileSize)}
                {duration && (
                  <>
                    <span className="mx-1.5">•</span>
                    <span>Duration {formatDuration(duration)}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {onCancel && status !== 'complete' && status !== 'error' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0 shrink-0"
              aria-label="Cancel transcription"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Live region for screen reader announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {status === 'uploading' && uploadProgress !== undefined &&
            `Uploading ${uploadProgress}% complete`}
          {status === 'uploaded' && 'Upload complete. Ready for analysis.'}
          {status === 'processing' && processingProgress !== undefined &&
            `Processing ${processingProgress}% complete`}
          {status === 'analyzing' && 'Analyzing transcript for emergencies'}
          {status === 'complete' && 'Transcription complete'}
          {status === 'error' && error && `Error: ${error}`}
          {maydayDetected && ` Emergency detected: ${emergencyCount} mayday ${emergencyCount === 1 ? 'call' : 'calls'}`}
        </div>

        {/* Progress Bar */}
        {status !== 'error' && (
          <div className="space-y-2">
            <Progress
              value={progress}
              className={cn(
                "h-2.5",
                status === 'complete' && "bg-green-100 dark:bg-green-950"
              )}
              aria-label={`Progress: ${progress}%`}
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{progress}%</span>
              {estimatedTime && (
                <span className="text-muted-foreground">{estimatedTime}</span>
              )}
            </div>
          </div>
        )}

        {/* Status Message */}
        <div className={cn("flex items-center gap-2", currentStatus.color)}>
          {currentStatus.icon}
          <span className="font-medium">{currentStatus.label}</span>
        </div>

        {/* Error Message */}
        {status === 'error' && error && (
          <div
            className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
            role="alert"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-3 w-full border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900"
              >
                Retry Transcription
              </Button>
            )}
          </div>
        )}

        {/* Emergency Detection Alert */}
        {maydayDetected && status === 'complete' && (
          <div
            className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border-2 border-amber-400 dark:border-amber-600 animate-pulse"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-100 uppercase tracking-wide">
                  Emergency Detected
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  {emergencyCount > 0
                    ? `${emergencyCount} mayday call${emergencyCount > 1 ? 's' : ''} detected in audio`
                    : 'Emergency keywords detected in audio'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Summary */}
        {status === 'complete' && !maydayDetected && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-800 dark:text-green-200">
              Audio successfully transcribed and analyzed
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

// Export prop types for documentation
