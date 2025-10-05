/**
 * Compliance Audit API Route
 * POST /api/compliance/audit
 *
 * Runs compliance audit on transcript.
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
 * Request Body:
 * ```json
 * {
 *   "transcriptId": "transcript-id",
 *   "templateId": "template-id",
 *   "additionalNotes": "Optional context or special considerations"
 * }
 * ```
 *
 * Response (200 OK):
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
 *     "categories": [
 *       {
 *         "name": "Initial Radio Report",
 *         "score": 90,
 *         "status": "PASS",
 *         "criteria": [...]
 *       }
 *     ],
 *     "findings": [...],
 *     "recommendations": [...],
 *     "metadata": {...},
 *     "createdAt": "2025-10-04T..."
 *   }
 * }
 * ```
 *
 * Error Responses:
 * - 400: Invalid request or transcript/template not found
 * - 500: Audit processing failed
 * - 502: OpenAI API error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validated = AuditRequestSchema.parse(body);

    // Run compliance audit
    const audit = await complianceService.auditTranscript(
      validated.transcriptId,
      validated.templateId,
      validated.additionalNotes
    );

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
