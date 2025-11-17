/**
 * Transcription Process API Route
 * POST /api/transcription/process
 *
 * Starts transcription job for uploaded audio file.
 * Automatically triggers compliance audits after successful transcription
 * if the incident has selected templates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { File as NodeFile } from 'node:buffer';
import { transcriptionService } from '@/lib/services/transcription';
import { storageService } from '@/lib/services/storage';
import { incidentService } from '@/lib/services/incidentService';
import { handleServiceError, Errors } from '@/lib/services/utils/errorHandlers';
import { logger } from '@/lib/logging/logger';
import { prisma } from '@/lib/db';
import { z } from 'zod';

/**
 * Request validation schema
 */
const ProcessRequestSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  incidentId: z.string().cuid('Invalid incident ID'),
  language: z.string().default('en'),
  detectMayday: z.boolean().default(true),
});

const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  wave: 'audio/wav',
  webm: 'audio/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  aac: 'audio/aac',
  flac: 'audio/flac',
};

/**
 * POST /api/transcription/process
 *
 * Process audio file for transcription using OpenAI Whisper API.
 * Automatically triggers compliance audits after successful transcription
 * if the incident has selected templates (runs in background).
 *
 * Request Body:
 * ```json
 * {
 *   "fileName": "1234567890-uuid-audio.mp3",
 *   "incidentId": "cxxxxxxxxxxxxxxxxxx",
 *   "language": "en",
 *   "detectMayday": true
 * }
 * ```
 *
 * Response (200 OK):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "id": "transcript-id",
 *     "incidentId": "incident-id",
 *     "audioUrl": "https://...",
 *     "text": "Full transcript text...",
 *     "segments": [...],
 *     "detections": {
 *       "mayday": [...],
 *       "emergency": [...]
 *     },
 *     "metadata": {...}
 *   }
 * }
 * ```
 *
 * **Note**: Response returns immediately after transcription completes.
 * Compliance audits are triggered asynchronously in the background.
 * Use the incident's audits relationship to poll for audit completion.
 *
 * Error Responses:
 * - 400: Invalid request or file not found
 * - 500: Transcription failed
 * - 502: OpenAI API error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = ProcessRequestSchema.parse(body);

    // Verify incident exists in database
    const incidentExists = await incidentService.incidentExists(
      validated.incidentId
    );

    if (!incidentExists) {
      throw Errors.notFound('Incident', validated.incidentId);
    }

    // Check if file exists in storage
    const fileExists = await storageService.fileExists(
      validated.fileName,
      'audio'
    );

    if (!fileExists) {
      throw Errors.notFound('Audio file', validated.fileName);
    }

    // Get file buffer for transcription
    const fileBuffer = await storageService.getFileBuffer(
      validated.fileName,
      'audio'
    );

    // Create File object from buffer
    // Note: In a real scenario, we'd use the actual file from storage
    // For now, we'll create a temporary File object
    const extension = validated.fileName.split('.').pop()?.toLowerCase() ?? '';
    const mimeType = AUDIO_MIME_BY_EXTENSION[extension] ?? 'audio/mpeg';
    if (typeof globalThis.File === 'undefined') {
      (globalThis as any).File = NodeFile;
    }
    const audioFile = new NodeFile([fileBuffer], validated.fileName, {
      type: mimeType,
    }) as unknown as File;

    // Start transcription
    const result = await transcriptionService.transcribeAudio(
      audioFile,
      validated.incidentId,
      {
        language: validated.language,
        detectMayday: validated.detectMayday,
      }
    );

    // Trigger compliance audits asynchronously after successful transcription
    const incident = await incidentService.getIncidentById(validated.incidentId);

    if (incident.selectedTemplateIds && incident.selectedTemplateIds.length > 0) {
      logger.info('Triggering compliance audits after transcription', {
        component: 'transcription-api',
        operation: 'post-transcription-audits',
        transcriptId: result.id,
        incidentId: validated.incidentId,
        templateCount: incident.selectedTemplateIds.length,
        templateIds: incident.selectedTemplateIds,
      });

      // Trigger audits asynchronously with timeout (don't await - let them run in background)
      const AUDIT_TRIGGER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

      Promise.race([
        triggerComplianceAudits(result.id, incident.selectedTemplateIds),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Audit trigger timeout')),
            AUDIT_TRIGGER_TIMEOUT
          )
        ),
      ]).catch((error) => {
        logger.error('Failed to trigger compliance audits', {
          component: 'transcription-api',
          operation: 'post-transcription-audits',
          transcriptId: result.id,
          incidentId: validated.incidentId,
          error,
          timeout: error.message === 'Audit trigger timeout',
        });
      });
    } else {
      logger.debug('No templates selected for incident, skipping auto-audit', {
        component: 'transcription-api',
        operation: 'post-transcription-audits',
        incidentId: validated.incidentId,
        transcriptId: result.id,
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
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
 * Triggers compliance audits asynchronously for a transcript
 *
 * Calls the compliance audit endpoint for each selected template.
 * Runs in background - does not block transcription response.
 *
 * @param transcriptId - ID of the completed transcript
 * @param templateIds - Array of template IDs to audit against
 *
 * @example
 * ```typescript
 * // Trigger audits in background (fire-and-forget)
 * triggerComplianceAudits(transcriptId, ['tmpl-1', 'tmpl-2']).catch(logger.error);
 * ```
 */
async function triggerComplianceAudits(
  transcriptId: string,
  templateIds: string[]
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const auditEndpoint = `${baseUrl}/api/compliance/audit`;

  logger.debug('Starting compliance audit triggers', {
    component: 'transcription-api',
    operation: 'trigger-audits',
    transcriptId,
    templateCount: templateIds.length,
  });

  // Validate all templates exist and are active up-front
  const templates = await prisma.template.findMany({
    where: {
      id: { in: templateIds },
      isActive: true,
    },
    select: { id: true },
  });

  const validTemplateIds = templates.map((t) => t.id);
  const invalidIds = templateIds.filter((id) => !validTemplateIds.includes(id));

  if (invalidIds.length > 0) {
    logger.warn('Skipping invalid/inactive templates', {
      component: 'transcription-api',
      operation: 'trigger-audits',
      transcriptId,
      invalidTemplateIds: invalidIds,
    });
  }

  for (const templateId of validTemplateIds) {
    try {
      logger.debug('Triggering audit for template', {
        component: 'transcription-api',
        operation: 'trigger-audit',
        transcriptId,
        templateId,
        endpoint: auditEndpoint,
      });

      // Call compliance audit endpoint with modular mode for better progress tracking
      const response = await fetch(auditEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptId,
          templateId,
          mode: 'modular', // Use modular mode for category-by-category processing
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Audit API returned ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();

      logger.info('Compliance audit triggered successfully', {
        component: 'transcription-api',
        operation: 'trigger-audit',
        transcriptId,
        templateId,
        auditId: responseData.data?.id,
        success: responseData.success,
      });
    } catch (error) {
      // Log error but continue with other templates
      logger.error('Failed to trigger audit for template', {
        component: 'transcription-api',
        operation: 'trigger-audit',
        transcriptId,
        templateId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      // Don't throw - continue processing other templates
    }
  }

  logger.info('Completed triggering compliance audits', {
    component: 'transcription-api',
    operation: 'trigger-audits',
    transcriptId,
    templateCount: validTemplateIds.length,
    skippedCount: invalidIds.length,
  });
}
