/**
 * Processing Phase Mapping Utilities
 *
 * Maps API processing status responses to UI-friendly ProcessingProgress format.
 * Converts phase-based status into user-facing messages and progress states.
 */

import type {
  ProcessingStatusResponse,
  ProcessingProgress,
  ProcessingPhase,
  AuditProgress,
} from '@/types/incident';

/**
 * Phase-specific message templates
 */
const PHASE_MESSAGES: Record<ProcessingPhase, string> = {
  transcribing: 'Transcribing audio with OpenAI Whisper...',
  analyzing: 'Analyzing compliance against selected templates...',
  complete: 'Complete! Preparing your report...',
  error: 'An error occurred during processing',
};

/**
 * Maps processing phase to corresponding ProcessingStage
 * (for compatibility with ProcessingStatus component)
 */
function mapPhaseToStage(phase: ProcessingPhase): ProcessingProgress['stage'] {
  switch (phase) {
    case 'transcribing':
      return 'transcribing';
    case 'analyzing':
      return 'analyzing';
    case 'complete':
      return 'complete';
    case 'error':
      return 'error';
    default:
      return 'transcribing';
  }
}

/**
 * Generates a detailed message for the transcribing phase
 */
function getTranscribingMessage(response: ProcessingStatusResponse): string {
  const { transcription } = response;

  if (transcription.status === 'pending') {
    return 'Preparing audio for transcription...';
  }

  if (transcription.status === 'processing') {
    if (transcription.duration) {
      const minutes = Math.floor(transcription.duration / 60);
      return `Transcribing ${minutes} minute${minutes !== 1 ? 's' : ''} of audio...`;
    }
    return 'Transcribing audio with OpenAI Whisper...';
  }

  return PHASE_MESSAGES.transcribing;
}

/**
 * Generates a detailed message for the analyzing phase
 */
function getAnalyzingMessage(response: ProcessingStatusResponse): string {
  const { audits } = response;

  if (audits.length === 0) {
    return 'Preparing compliance analysis...';
  }

  const completedAudits = audits.filter((audit) => audit.status === 'complete').length;
  const totalAudits = audits.length;

  if (completedAudits === 0) {
    return `Analyzing compliance against ${totalAudits} template${totalAudits !== 1 ? 's' : ''}...`;
  }

  return `Analyzing compliance... (${completedAudits}/${totalAudits} templates complete)`;
}

/**
 * Determines which template is currently being analyzed
 */
function getCurrentTemplate(audits: AuditProgress[]): string | undefined {
  // Find the first audit that is processing
  const processingAudit = audits.find((audit) => audit.status === 'processing');
  if (processingAudit) {
    return processingAudit.templateName;
  }

  // If no processing audit, find the first pending audit
  const pendingAudit = audits.find((audit) => audit.status === 'pending');
  if (pendingAudit) {
    return pendingAudit.templateName;
  }

  return undefined;
}

/**
 * Maps API processing status response to ProcessingProgress format
 *
 * @param response - Processing status response from /api/incidents/[id]/status
 * @returns ProcessingProgress object for use with ProcessingStatus component
 *
 * @example
 * ```tsx
 * const { data } = useProcessingStatus(incidentId);
 * if (data) {
 *   const progress = mapPhaseToProgress(data);
 *   return <ProcessingStatus progress={progress} />;
 * }
 * ```
 */
export function mapPhaseToProgress(
  response: ProcessingStatusResponse
): ProcessingProgress {
  const { phase, audits } = response;

  // Base progress object
  const progress: ProcessingProgress = {
    stage: mapPhaseToStage(phase),
    progress: 0, // No accurate progress tracking (per user preference - spinner only)
    message: PHASE_MESSAGES[phase],
  };

  // Phase-specific enhancements
  switch (phase) {
    case 'transcribing':
      progress.message = getTranscribingMessage(response);
      break;

    case 'analyzing':
      progress.message = getAnalyzingMessage(response);
      progress.currentTemplate = getCurrentTemplate(audits);
      progress.totalTemplates = audits.length;
      break;

    case 'complete':
      progress.progress = 100;
      break;

    case 'error':
      // Try to extract error details from transcription or audits
      if (response.transcription.status === 'failed') {
        progress.message = 'Transcription failed. Please try again.';
      } else {
        const failedAudit = audits.find((audit) => audit.status === 'failed');
        if (failedAudit) {
          progress.message = `Compliance analysis failed for ${failedAudit.templateName}`;
        }
      }
      break;
  }

  return progress;
}

/**
 * Checks if processing is complete (phase is 'complete' or 'error')
 *
 * @param response - Processing status response
 * @returns True if processing is finished (either successfully or with error)
 */
export function isProcessingComplete(response: ProcessingStatusResponse): boolean {
  return response.phase === 'complete' || response.phase === 'error';
}

/**
 * Checks if processing encountered an error
 *
 * @param response - Processing status response
 * @returns True if processing failed
 */
export function hasProcessingError(response: ProcessingStatusResponse): boolean {
  return response.phase === 'error';
}

/**
 * Gets a list of all templates being analyzed with their current status
 *
 * @param response - Processing status response
 * @returns Array of template names and statuses for display
 */
export function getTemplateProgress(
  response: ProcessingStatusResponse
): Array<{ name: string; status: string; isComplete: boolean; isCurrent: boolean }> {
  return response.audits.map((audit) => ({
    name: audit.templateName,
    status: audit.status,
    isComplete: audit.status === 'complete',
    isCurrent: audit.status === 'processing',
  }));
}
