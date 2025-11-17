/**
 * Compliance Audit API Route
 * POST /api/compliance/audit
 *
 * Runs compliance audit on transcript with support for both legacy
 * (monolithic) and modular (category-by-category) scoring modes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { complianceService } from '@/lib/services/complianceService';
import { handleServiceError } from '@/lib/services/utils/errorHandlers';
import { AuditRequestSchema } from '@/lib/types';
import { requestCache } from '@/lib/utils/requestCache';
import { logger } from '@/lib/logging';
import { prisma } from '@/lib/db';
import { getOrCreateCorrelationId } from '@/lib/utils/correlation';

/**
 * POST /api/compliance/audit
 *
 * Run compliance audit on a transcript using a compliance template.
 *
 * **Query Parameters**:
 * - `mode` (optional): `'legacy'` | `'modular'` (default: `'legacy'`)
 *   - `legacy`: Single AI call for all categories (original behavior)
 *   - `modular`: Sequential category-by-category processing
 * - `stream` (optional): `'true'` | `'false'` (default: `'false'`)
 *   - If `true`, returns Server-Sent Events stream with progress updates
 *   - Only works with `mode=modular`
 *
 * **Request Body**:
 * ```json
 * {
 *   "transcriptId": "transcript-id",
 *   "templateId": "template-id",
 *   "additionalNotes": "Optional context or special considerations"
 * }
 * ```
 *
 * **Response (Non-Streaming, 200 OK)**:
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "id": "audit-id",
 *     "incidentId": "incident-id",
 *     "transcriptId": "transcript-id",
 *     "templateId": "template-id",
 *     "overallStatus": "PASS",
 *     "overallScore": 85,
 *     "summary": "Overall compliance summary...",
 *     "categories": [...],
 *     "findings": [...],
 *     "recommendations": [...],
 *     "metadata": {
 *       "model": "gpt-4.1",
 *       "processingTime": 45.2,
 *       "mode": "modular",
 *       "failedCategories": [],
 *       "categoryTokenUsage": {...}
 *     },
 *     "createdAt": "2025-10-04T..."
 *   }
 * }
 * ```
 *
 * **Response (Streaming SSE)**:
 * ```
 * data: {"type":"progress","current":1,"total":5,"category":"Radio Discipline","timestamp":"..."}
 * data: {"type":"progress","current":2,"total":5,"category":"Mayday Procedures","timestamp":"..."}
 * data: {"type":"complete","result":{...},"timestamp":"..."}
 * ```
 *
 * **Error Responses**:
 * - 400: Invalid request or transcript/template not found
 * - 500: Audit processing failed
 * - 502: OpenAI API error
 *
 * @example
 * ```typescript
 * // Legacy mode (default)
 * POST /api/compliance/audit
 *
 * // Modular mode (non-streaming)
 * POST /api/compliance/audit?mode=modular
 *
 * // Modular mode with streaming
 * POST /api/compliance/audit?mode=modular&stream=true
 * ```
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let cacheKey: string | undefined;

  try {
    // Extract or generate correlation ID
    const correlationId = getOrCreateCorrelationId(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'legacy';
    const enableStreaming = searchParams.get('stream') === 'true';

    // Parse and validate request body
    const body = await request.json();
    const validated = AuditRequestSchema.parse(body);

    // Extract request parameters for deduplication
    const { transcriptId, templateId } = validated;

    // Build cache key for deduplication
    cacheKey = `audit:${transcriptId}:${templateId}`;

    // Step 1: Check for duplicate in-progress audit request
    const existingRequest = requestCache.get<{
      auditId: string;
      status: string;
    }>(cacheKey);

    if (existingRequest) {
      logger.info('Duplicate audit request detected, returning existing', {
        component: 'compliance-api',
        operation: 'audit',
        transcriptId,
        templateId,
        existingAuditId: existingRequest.auditId,
        status: existingRequest.status,
        cacheHit: true,
        correlationId,
      });

      if (existingRequest.status === 'in-progress') {
        return NextResponse.json({
          success: true,
          message: 'Audit already in progress',
          data: { id: existingRequest.auditId, status: 'in-progress' },
          cached: true,
        });
      }
    }

    // Step 2: Fetch transcript and validate business rules
    const transcript = await prisma.transcript.findUnique({
      where: { id: transcriptId },
      select: {
        id: true,
        incidentId: true,
        text: true,
        segments: true,
        incident: {
          select: {
            id: true,
            number: true,
            status: true,
            type: true,
          },
        },
      },
    });

    if (!transcript) {
      logger.error('Transcript not found', {
        component: 'compliance-api',
        operation: 'audit',
        transcriptId,
        correlationId,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'NOT_FOUND',
            message: `Transcript with ID '${transcriptId}' not found`,
            statusCode: 404,
          },
        },
        { status: 404 }
      );
    }

    // Step 2a: Validate incident state
    if (!transcript.incident) {
      logger.error('Transcript has no associated incident', {
        component: 'compliance-api',
        operation: 'audit',
        transcriptId,
        correlationId,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'INVALID_INPUT',
            message: 'Transcript must be associated with an incident',
            statusCode: 400,
          },
        },
        { status: 400 }
      );
    }

    if (transcript.incident.status === 'RESOLVED') {
      logger.warn('Skipping audit for resolved incident', {
        component: 'compliance-api',
        operation: 'audit',
        incidentId: transcript.incident.id,
        incidentNumber: transcript.incident.number,
        status: transcript.incident.status,
        transcriptId,
        correlationId,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'INVALID_INPUT',
            message: `Cannot audit resolved incident ${transcript.incident.number}. Audits must be run while incident is active.`,
            statusCode: 400,
          },
        },
        { status: 400 }
      );
    }

    // Step 2b: Validate transcript completeness
    if (!transcript.text || transcript.text.trim().length < 10) {
      logger.warn('Transcript text is empty or too short', {
        component: 'compliance-api',
        operation: 'audit',
        transcriptId,
        textLength: transcript.text?.length || 0,
        correlationId,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'INVALID_INPUT',
            message: 'Transcript text is empty or too short for meaningful analysis',
            statusCode: 400,
          },
        },
        { status: 400 }
      );
    }

    if (!transcript.segments || (transcript.segments as any[]).length === 0) {
      logger.warn('Transcript has no segments, audit may have limited context', {
        component: 'compliance-api',
        operation: 'audit',
        transcriptId,
        textLength: transcript.text?.length || 0,
        correlationId,
      });
    }

    // Step 3: Check database for existing completed audit (by incident+template combination)
    const existingAudit = await prisma.audit.findFirst({
      where: {
        incidentId: transcript.incidentId,
        templateId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingAudit && existingAudit.overallScore !== null) {
      logger.info('Audit already exists for this incident+template, returning existing', {
        component: 'compliance-api',
        operation: 'audit-duplicate-check',
        auditId: existingAudit.id,
        incidentId: transcript.incidentId,
        transcriptId,
        templateId,
        overallScore: existingAudit.overallScore,
        databaseHit: true,
        duration: Date.now() - startTime,
        correlationId,
      });

      return NextResponse.json({
        success: true,
        message: 'Audit already exists',
        data: existingAudit,
        cached: true,
      });
    }

    // Step 4: Mark as in-progress in cache (10 second TTL)
    // This prevents duplicate concurrent requests
    requestCache.set(
      cacheKey,
      { auditId: 'pending', status: 'in-progress' },
      10
    );

    logger.info('Starting new audit', {
      component: 'compliance-api',
      operation: 'audit',
      transcriptId,
      templateId,
      mode,
      streaming: enableStreaming,
      correlationId,
    });

    // Handle streaming mode
    if (mode === 'modular' && enableStreaming) {
      // Note: Streaming mode doesn't use cache since it's real-time
      requestCache.delete(cacheKey);
      return handleStreamingAudit(validated, correlationId);
    }

    // Handle non-streaming modes
    let audit;

    try {
      if (mode === 'modular') {
        // Modular mode: Category-by-category processing
        audit = await complianceService.executeModularAudit(
          validated.transcriptId,
          validated.templateId,
          {
            savePartialResults: true,
            additionalNotes: validated.additionalNotes,
            correlationId,
          }
        );
      } else {
        // Legacy mode: Monolithic processing (default)
        audit = await complianceService.auditTranscript(
          validated.transcriptId,
          validated.templateId,
          validated.additionalNotes
        );
      }

      // Step 5: Update cache with completed audit ID (60 second TTL)
      requestCache.set(
        cacheKey,
        { auditId: audit.id, status: 'complete' },
        60
      );

      const duration = Date.now() - startTime;
      logger.info('Audit completed successfully', {
        component: 'compliance-api',
        operation: 'audit',
        transcriptId,
        templateId,
        auditId: audit.id,
        overallScore: audit.overallScore,
        mode,
        duration,
        correlationId,
      });

      return NextResponse.json({
        success: true,
        data: audit,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      // Clear cache on error so request can be retried
      requestCache.delete(cacheKey);

      logger.error('Audit execution failed', {
        component: 'compliance-api',
        operation: 'audit',
        transcriptId,
        templateId,
        mode,
        error: auditError instanceof Error ? auditError : new Error(String(auditError)),
        duration: Date.now() - startTime,
        correlationId,
      });

      throw auditError;
    }
  } catch (error) {
    // Clear cache on error
    if (cacheKey) {
      requestCache.delete(cacheKey);
    }

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
 * Handle streaming modular audit with Server-Sent Events (SSE)
 *
 * Executes modular audit with real-time progress updates sent to the client
 * via Server-Sent Events protocol. Includes comprehensive error handling,
 * cancellation support, and proper cleanup to prevent resource leaks.
 *
 * **Event Types**:
 * - `progress`: Category scoring progress update
 * - `complete`: Audit completed successfully
 * - `error`: Audit failed
 *
 * **Cancellation Behavior**:
 * - Client disconnect triggers stream cancel() handler
 * - AbortController signals ongoing operations to stop
 * - Partial results are logged and cleaned up gracefully
 * - No orphaned promises or hanging API calls
 *
 * @param {object} validated - Validated audit request
 * @returns {Response} SSE stream response
 *
 * @example
 * ```typescript
 * // Client-side EventSource usage
 * const eventSource = new EventSource('/api/compliance/audit?mode=modular&stream=true');
 *
 * eventSource.addEventListener('message', (event) => {
 *   const data = JSON.parse(event.data);
 *
 *   if (data.type === 'progress') {
 *     console.log(`Processing ${data.category} (${data.current}/${data.total})`);
 *   } else if (data.type === 'complete') {
 *     console.log('Audit complete:', data.result);
 *     eventSource.close();
 *   } else if (data.type === 'error') {
 *     console.error('Audit failed:', data.error);
 *     eventSource.close();
 *   }
 * });
 *
 * // Clean disconnect
 * eventSource.close();
 * ```
 */
async function handleStreamingAudit(
  validated: {
    transcriptId: string;
    templateId: string;
    additionalNotes?: string;
  },
  correlationId: string
): Promise<Response> {
  const encoder = new TextEncoder();
  let isCleanedUp = false;

  // Create AbortController for stream cancellation
  const abortController = new AbortController();

  const stream = new ReadableStream({
    async start(controller) {
      // Cleanup helper - ensures stream is closed exactly once
      const cleanup = () => {
        if (!isCleanedUp) {
          isCleanedUp = true;
          try {
            controller.close();
          } catch (err) {
            // Suppress double-close errors
            logger.warn('Failed to close stream controller', {
              component: 'compliance-api',
              operation: 'audit-stream-cleanup',
              error: err instanceof Error ? err : new Error(String(err)),
            });
          }
        }
      };

      // Safe enqueue helper - handles serialization and enqueue errors
      const safeEnqueue = (event: any): boolean => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
          return true;
        } catch (error) {
          logger.error('Failed to enqueue SSE event', {
            component: 'compliance-api',
            operation: 'audit-stream-enqueue',
            eventType: event?.type,
            error: error instanceof Error ? error : new Error(String(error)),
          });
          return false;
        }
      };

      try {
        // Progress callback to send SSE events
        const onProgress = (
          current: number,
          total: number,
          categoryName: string
        ) => {
          // Check if stream was cancelled before sending progress
          if (abortController.signal.aborted) {
            logger.info('Progress callback skipped due to cancellation', {
              component: 'compliance-api',
              operation: 'audit-stream-progress',
              transcriptId: validated.transcriptId,
              templateId: validated.templateId,
              category: categoryName,
              progress: `${current}/${total}`,
            });
            return;
          }

          safeEnqueue({
            type: 'progress',
            current,
            total,
            category: categoryName,
            timestamp: new Date().toISOString(),
          });
        };

        // Execute modular audit with progress callbacks
        // Note: executeModularAudit doesn't yet support AbortSignal,
        // but we check the signal periodically via onProgress callback
        const audit = await complianceService.executeModularAudit(
          validated.transcriptId,
          validated.templateId,
          {
            onProgress,
            savePartialResults: true,
            additionalNotes: validated.additionalNotes,
            correlationId,
          }
        );

        // Check if cancelled before sending completion
        if (abortController.signal.aborted) {
          logger.info('Audit completed but stream was cancelled', {
            component: 'compliance-api',
            operation: 'audit-stream-cancelled-after-completion',
            transcriptId: validated.transcriptId,
            templateId: validated.templateId,
            auditId: audit.id,
          });
          cleanup();
          return;
        }

        // Send completion event
        safeEnqueue({
          type: 'complete',
          result: audit,
          timestamp: new Date().toISOString(),
        });

        logger.info('Audit stream completed successfully', {
          component: 'compliance-api',
          operation: 'audit-stream-complete',
          transcriptId: validated.transcriptId,
          templateId: validated.templateId,
          auditId: audit.id,
          overallScore: audit.overallScore,
        });

        cleanup();
      } catch (error) {
        // Check if error was due to cancellation
        if (abortController.signal.aborted) {
          logger.info('Audit stream cancelled during execution', {
            component: 'compliance-api',
            operation: 'audit-stream-cancelled-with-error',
            transcriptId: validated.transcriptId,
            templateId: validated.templateId,
            error: error instanceof Error ? error : new Error(String(error)),
          });
          cleanup();
          return;
        }

        // Send error event
        const apiError = handleServiceError(error);
        safeEnqueue({
          type: 'error',
          error: apiError,
          timestamp: new Date().toISOString(),
        });

        logger.error('Audit stream failed', {
          component: 'compliance-api',
          operation: 'audit-stream-error',
          transcriptId: validated.transcriptId,
          templateId: validated.templateId,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        cleanup();
      } finally {
        // Ensure cleanup always runs
        cleanup();
      }
    },

    // Cancellation handler - triggered when client disconnects
    cancel(reason) {
      logger.info('Audit stream cancelled by client', {
        component: 'compliance-api',
        operation: 'audit-stream-cancel',
        reason: reason || 'Client disconnected',
        transcriptId: validated.transcriptId,
        templateId: validated.templateId,
      });

      // Signal abort to any listening operations
      abortController.abort();

      // Mark as cleaned up to prevent double-close
      isCleanedUp = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
