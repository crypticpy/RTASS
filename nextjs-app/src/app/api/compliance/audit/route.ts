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
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'legacy';
    const enableStreaming = searchParams.get('stream') === 'true';

    // Parse and validate request body
    const body = await request.json();
    const validated = AuditRequestSchema.parse(body);

    // Handle streaming mode
    if (mode === 'modular' && enableStreaming) {
      return handleStreamingAudit(validated);
    }

    // Handle non-streaming modes
    let audit;

    if (mode === 'modular') {
      // Modular mode: Category-by-category processing
      audit = await complianceService.executeModularAudit(
        validated.transcriptId,
        validated.templateId,
        {
          savePartialResults: true,
          additionalNotes: validated.additionalNotes,
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

    return NextResponse.json({
      success: true,
      data: audit,
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
 * Handle streaming modular audit with Server-Sent Events (SSE)
 *
 * Executes modular audit with real-time progress updates sent to the client
 * via Server-Sent Events protocol. Includes comprehensive error handling
 * to prevent client hangs.
 *
 * **Event Types**:
 * - `progress`: Category scoring progress update
 * - `complete`: Audit completed successfully
 * - `error`: Audit failed
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
 * ```
 */
async function handleStreamingAudit(validated: {
  transcriptId: string;
  templateId: string;
  additionalNotes?: string;
}): Promise<Response> {
  const encoder = new TextEncoder();
  let isCleanedUp = false;

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
            console.error('Failed to close stream controller:', err);
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
          console.error('Failed to enqueue event:', error);
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
          safeEnqueue({
            type: 'progress',
            current,
            total,
            category: categoryName,
            timestamp: new Date().toISOString(),
          });
        };

        // Execute modular audit with progress callbacks
        const audit = await complianceService.executeModularAudit(
          validated.transcriptId,
          validated.templateId,
          {
            onProgress,
            savePartialResults: true,
            additionalNotes: validated.additionalNotes,
          }
        );

        // Send completion event
        safeEnqueue({
          type: 'complete',
          result: audit,
          timestamp: new Date().toISOString(),
        });

        cleanup();
      } catch (error) {
        // Send error event
        const apiError = handleServiceError(error);
        safeEnqueue({
          type: 'error',
          error: apiError,
          timestamp: new Date().toISOString(),
        });

        cleanup();
      }
    },

    // Add cancellation handler for client disconnects
    cancel(reason) {
      console.log('Stream cancelled by client:', reason);
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
