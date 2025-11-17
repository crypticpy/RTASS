/**
 * Incident Detail API Route
 * GET /api/incidents/[id]
 *
 * Returns complete incident details including transcripts, audits, and units.
 * Used by the incident report page to display real audit results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleServiceError } from '@/lib/services/utils/errorHandlers';

/**
 * GET /api/incidents/[id]
 *
 * Fetch complete incident details with all related data.
 *
 * @param {string} id - Incident ID from URL params
 * @returns {Response} Complete incident details with transcripts, audits, and units
 *
 * Response (200 OK):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "id": "cm1234...",
 *     "number": "2024-0001",
 *     "type": "Structure Fire",
 *     "severity": "HIGH",
 *     "address": "123 Main St",
 *     "startTime": "2024-01-01T...",
 *     "endTime": null,
 *     "status": "ACTIVE",
 *     "summary": "...",
 *     "selectedTemplateIds": ["template-id-1"],
 *     "transcripts": [{
 *       "id": "trans-123",
 *       "text": "Full transcript...",
 *       "segments": [...],
 *       "detections": {...}
 *     }],
 *     "audits": [{
 *       "id": "audit-123",
 *       "templateId": "template-id-1",
 *       "overallScore": 85.5,
 *       "overallStatus": "PASS",
 *       "summary": "Executive summary...",
 *       "findings": {...},
 *       "recommendations": [...],
 *       "template": {
 *         "id": "template-id-1",
 *         "name": "NFPA 1561 Radio Communications Compliance",
 *         "categories": [...]
 *       }
 *     }],
 *     "units": [{
 *       "id": "unit-123",
 *       "number": "Engine 1",
 *       "type": "ENGINE"
 *     }]
 *   }
 * }
 * ```
 *
 * Error Responses:
 * - 404: Incident not found
 * - 500: Database error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const incidentId = params.id;

    // Fetch incident with all related data
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        transcripts: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            audioUrl: true,
            originalName: true,
            duration: true,
            fileSize: true,
            format: true,
            text: true,
            segments: true,
            metadata: true,
            detections: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        audits: {
          orderBy: { createdAt: 'desc' },
          include: {
            template: {
              select: {
                id: true,
                name: true,
                description: true,
                version: true,
                categories: true,
                source: true,
                isAIGenerated: true,
                aiConfidence: true,
              },
            },
          },
        },
        units: {
          select: {
            id: true,
            number: true,
            type: true,
            personnel: true,
            captain: true,
            station: true,
          },
        },
      },
    });

    // Return 404 if incident not found
    if (!incident) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Incident with ID "${incidentId}" not found`,
            statusCode: 404,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: incident,
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
