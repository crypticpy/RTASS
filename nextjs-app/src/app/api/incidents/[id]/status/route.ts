/**
 * Incident Processing Status API Route
 * GET /api/incidents/[id]/status
 *
 * Returns the processing status of an incident including transcription and audit progress.
 * This endpoint is designed for real-time status polling during incident processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { incidentService } from '@/lib/services/incidentService';
import { handleServiceError, Errors } from '@/lib/services/utils/errorHandlers';
import { isValidCuid } from '@/lib/utils/validators';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging';
import type { Incident, Transcript, Audit } from '@prisma/client';

/**
 * Poll frequency tracking
 * Tracks number of status polls per incident to detect excessive polling
 */
interface PollTracker {
  count: number;
  firstPollTime: number;
  lastPollTime: number;
}

// In-memory map to track poll counts per incident
// Key: incidentId, Value: PollTracker
const pollFrequencyMap = new Map<string, PollTracker>();

// Threshold for excessive polling warning (600 requests = 10 req/min for 60min)
const EXCESSIVE_POLL_THRESHOLD = 600;

// Cleanup interval: Remove old entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

// Auto-reset time: Reset counter after 1 hour of inactivity
const AUTO_RESET_TIME_MS = 60 * 60 * 1000;

// Start cleanup interval
let cleanupIntervalId: NodeJS.Timeout | null = null;

function startCleanupInterval() {
  if (!cleanupIntervalId) {
    cleanupIntervalId = setInterval(() => {
      const now = Date.now();
      for (const [incidentId, tracker] of pollFrequencyMap.entries()) {
        // Remove entries older than 1 hour of inactivity
        if (now - tracker.lastPollTime > AUTO_RESET_TIME_MS) {
          pollFrequencyMap.delete(incidentId);
        }
      }
    }, CLEANUP_INTERVAL_MS);
  }
}

// Start cleanup on module load
startCleanupInterval();

/**
 * Track status poll for an incident and warn on excessive polling
 */
function trackStatusPoll(incidentId: string): void {
  const now = Date.now();
  const tracker = pollFrequencyMap.get(incidentId);

  if (!tracker) {
    // First poll for this incident
    pollFrequencyMap.set(incidentId, {
      count: 1,
      firstPollTime: now,
      lastPollTime: now,
    });
  } else {
    // Increment poll count
    tracker.count++;
    tracker.lastPollTime = now;

    // Check for excessive polling
    if (tracker.count === EXCESSIVE_POLL_THRESHOLD) {
      const durationMinutes = (now - tracker.firstPollTime) / (1000 * 60);
      const avgPollsPerMinute = tracker.count / durationMinutes;

      logger.warn('Excessive status polling detected', {
        component: 'incident-status-api',
        operation: 'poll-frequency-check',
        incidentId,
        pollCount: tracker.count,
        durationMinutes: Math.round(durationMinutes),
        avgPollsPerMinute: Math.round(avgPollsPerMinute * 10) / 10,
        threshold: EXCESSIVE_POLL_THRESHOLD,
      });
    } else if (tracker.count > EXCESSIVE_POLL_THRESHOLD && tracker.count % 100 === 0) {
      // Log every 100 polls after threshold
      const durationMinutes = (now - tracker.firstPollTime) / (1000 * 60);
      const avgPollsPerMinute = tracker.count / durationMinutes;

      logger.warn('Continued excessive status polling', {
        component: 'incident-status-api',
        operation: 'poll-frequency-check',
        incidentId,
        pollCount: tracker.count,
        durationMinutes: Math.round(durationMinutes),
        avgPollsPerMinute: Math.round(avgPollsPerMinute * 10) / 10,
      });
    }
  }
}

/**
 * Type for incident with transcripts and audits relations
 */
type IncidentWithRelations = Incident & {
  transcripts?: Transcript[];
  audits?: Audit[];
};

/**
 * Processing status types
 */
type TranscriptionStatus = 'pending' | 'processing' | 'complete' | 'failed';
type AuditStatus = 'pending' | 'processing' | 'complete' | 'failed';
type ProcessingPhase = 'transcribing' | 'analyzing' | 'complete' | 'error';

/**
 * Response data structures
 */
interface IncidentInfo {
  id: string;
  number: string;
  type: string;
  severity: string;
  status: string;
}

interface TranscriptionInfo {
  status: TranscriptionStatus;
  transcriptId?: string;
  duration?: number;
  segments?: number;
}

interface AuditInfo {
  templateId: string;
  templateName: string;
  status: AuditStatus;
  auditId?: string;
  overallScore?: number;
  overallStatus?: 'PASS' | 'FAIL' | 'NEEDS_IMPROVEMENT';
}

interface StatusResponse {
  incident: IncidentInfo;
  transcription: TranscriptionInfo;
  audits: AuditInfo[];
  phase: ProcessingPhase;
}

/**
 * GET /api/incidents/[id]/status
 *
 * Retrieves the current processing status of an incident.
 * Checks transcription status and audit status for each selected template.
 *
 * Path Parameters:
 * - id: string - Incident CUID
 *
 * Response (200 OK):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "incident": {
 *       "id": "cm1234abcd...",
 *       "number": "2024-0001",
 *       "type": "Structure Fire",
 *       "severity": "HIGH",
 *       "status": "ACTIVE"
 *     },
 *     "transcription": {
 *       "status": "complete",
 *       "transcriptId": "cm5678efgh...",
 *       "duration": 3600,
 *       "segments": 45
 *     },
 *     "audits": [
 *       {
 *         "templateId": "cm9012ijkl...",
 *         "templateName": "NFPA 1561 Compliance",
 *         "status": "complete",
 *         "auditId": "cm3456mnop...",
 *         "overallScore": 85.5,
 *         "overallStatus": "PASS"
 *       }
 *     ],
 *     "phase": "complete"
 *   },
 *   "timestamp": "2024-01-01T12:00:00.000Z"
 * }
 * ```
 *
 * Error Responses:
 * - 400: Invalid incident ID format
 * - 404: Incident not found
 * - 500: Database error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;

    // Validate CUID format
    if (!isValidCuid(incidentId)) {
      throw Errors.invalidInput('incidentId', 'Must be a valid CUID format');
    }

    // Track status poll frequency
    trackStatusPoll(incidentId);

    // Fetch incident with processing status (includes transcripts and audits)
    const incident =
      await incidentService.getIncidentWithProcessingStatus(incidentId);

    // Extract basic incident information
    const incidentInfo: IncidentInfo = {
      id: incident.id,
      number: incident.number,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
    };

    // Determine transcription status
    const transcriptionInfo: TranscriptionInfo = await getTranscriptionStatus(
      incident
    );

    // Determine audit status for each selected template
    const auditsInfo: AuditInfo[] = await getAuditsStatus(incident);

    // Determine overall processing phase
    const phase: ProcessingPhase = determineProcessingPhase(
      transcriptionInfo,
      auditsInfo
    );

    // Build response
    const statusResponse: StatusResponse = {
      incident: incidentInfo,
      transcription: transcriptionInfo,
      audits: auditsInfo,
      phase,
    };

    return NextResponse.json(
      {
        success: true,
        data: statusResponse,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const apiError = handleServiceError(error);
    return NextResponse.json(
      {
        success: false,
        error: apiError,
      },
      { status: apiError.statusCode }
    );
  }
}

/**
 * Determines transcription status for an incident
 *
 * @param incident - Incident with transcripts relation
 * @returns Transcription status information
 */
async function getTranscriptionStatus(
  incident: IncidentWithRelations
): Promise<TranscriptionInfo> {
  // Check if transcripts exist and is valid array
  if (
    !incident.transcripts ||
    !Array.isArray(incident.transcripts) ||
    incident.transcripts.length === 0
  ) {
    return { status: 'pending' };
  }

  // Find first complete transcript (has text and segments)
  const transcript = incident.transcripts.find((t) => t.text && t.segments);

  if (!transcript) {
    // Transcript exists but incomplete - processing
    return {
      status: 'processing',
      transcriptId: incident.transcripts[0]?.id,
    };
  }

  return {
    status: 'complete',
    transcriptId: transcript.id,
    duration: transcript.duration,
    segments: Array.isArray(transcript.segments) ? transcript.segments.length : 0,
  };
}

/**
 * Determines audit status for each selected template
 *
 * @param incident - Incident with audits and selectedTemplateIds
 * @returns Array of audit status information
 */
async function getAuditsStatus(
  incident: IncidentWithRelations
): Promise<AuditInfo[]> {
  // Get selected template IDs from incident
  const selectedTemplateIds = incident.selectedTemplateIds;

  if (selectedTemplateIds.length === 0) {
    return [];
  }

  // Don't check audit status if transcription not complete
  const hasCompleteTranscript = incident.transcripts?.some(
    (t) => t.text && t.segments
  );

  if (!hasCompleteTranscript) {
    // Fetch template names for pending audits
    const templates = await prisma.template.findMany({
      where: { id: { in: selectedTemplateIds } },
      select: { id: true, name: true },
    });

    return selectedTemplateIds.map((templateId) => ({
      templateId,
      templateName:
        templates.find((t) => t.id === templateId)?.name || 'Unknown Template',
      status: 'pending' as const,
    }));
  }

  // Fetch template information for all selected templates
  const templates = await prisma.template.findMany({
    where: {
      id: { in: selectedTemplateIds },
    },
    select: {
      id: true,
      name: true,
    },
  });

  // Create a map of templateId -> template name for quick lookup
  const templateMap = new Map(templates.map((t) => [t.id, t.name]));

  // Build audit status for each selected template
  const auditsInfo: AuditInfo[] = [];

  for (const templateId of selectedTemplateIds) {
    const templateName = templateMap.get(templateId) || 'Unknown Template';

    // Check if audit exists for this incident + template combination
    const existingAudit = incident.audits?.find(
      (audit) => audit.templateId === templateId
    );

    if (!existingAudit) {
      // No audit exists yet - pending
      auditsInfo.push({
        templateId,
        templateName,
        status: 'pending',
      });
      continue;
    }

    // Audit exists - check if it's complete
    if (
      existingAudit.overallScore !== null &&
      existingAudit.overallScore !== undefined &&
      existingAudit.findings
    ) {
      // Audit is complete
      auditsInfo.push({
        templateId,
        templateName,
        status: 'complete',
        auditId: existingAudit.id,
        overallScore: existingAudit.overallScore,
        overallStatus: existingAudit.overallStatus as 'PASS' | 'FAIL' | 'NEEDS_IMPROVEMENT',
      });
    } else {
      // Audit exists but incomplete - processing
      auditsInfo.push({
        templateId,
        templateName,
        status: 'processing',
        auditId: existingAudit.id,
      });
    }
  }

  return auditsInfo;
}

/**
 * Determines the overall processing phase based on transcription and audit statuses
 *
 * Phase Logic:
 * - 'transcribing': Transcription is pending or processing
 * - 'analyzing': Transcription complete, audits pending or processing
 * - 'complete': All processing complete
 * - 'error': Any component has failed status
 *
 * @param transcription - Transcription status
 * @param audits - Array of audit statuses
 * @returns Overall processing phase
 */
function determineProcessingPhase(
  transcription: TranscriptionInfo,
  audits: AuditInfo[]
): ProcessingPhase {
  // Check for errors first
  if (transcription.status === 'failed') {
    return 'error';
  }

  const hasFailedAudits = audits.some((audit) => audit.status === 'failed');
  if (hasFailedAudits) {
    return 'error';
  }

  // Check if transcription is still in progress
  if (
    transcription.status === 'pending' ||
    transcription.status === 'processing'
  ) {
    return 'transcribing';
  }

  // Transcription complete - check audit statuses
  if (audits.length === 0) {
    // No audits selected - processing complete
    return 'complete';
  }

  const allAuditsComplete = audits.every((audit) => audit.status === 'complete');
  const anyAuditInProgress = audits.some(
    (audit) => audit.status === 'pending' || audit.status === 'processing'
  );

  if (allAuditsComplete) {
    return 'complete';
  }

  if (anyAuditInProgress) {
    return 'analyzing';
  }

  // Default to complete if we can't determine state
  return 'complete';
}
