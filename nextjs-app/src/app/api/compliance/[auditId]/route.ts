/**
 * Compliance Audit Retrieval API Route
 * GET /api/compliance/[auditId]
 *
 * Retrieves audit results by ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { complianceService } from '@/lib/services/complianceService';
import { handleServiceError, Errors } from '@/lib/services/utils/errorHandlers';
import { isValidCuid } from '@/lib/utils/validators';

/**
 * GET /api/compliance/[auditId]
 *
 * Retrieve audit results by ID.
 *
 * Path Parameters:
 * - auditId: string - Audit CUID
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
 *     "categories": [...],
 *     "findings": [...],
 *     "recommendations": [...],
 *     "metadata": {...},
 *     "createdAt": "2025-10-04T..."
 *   }
 * }
 * ```
 *
 * Error Responses:
 * - 400: Invalid audit ID format
 * - 404: Audit not found
 * - 500: Database error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;

    // Validate CUID format
    if (!isValidCuid(auditId)) {
      throw Errors.invalidInput('auditId', 'Must be a valid CUID format');
    }

    // Retrieve audit from database
    const audit = await complianceService.getAudit(auditId);

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
