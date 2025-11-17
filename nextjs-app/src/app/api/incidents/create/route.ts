/**
 * Incident Creation API Route
 * POST /api/incidents/create
 *
 * Creates a new incident record in the database.
 * Auto-generates missing optional fields (number, startTime, status).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  incidentService,
  CreateIncidentSchema,
} from '@/lib/services/incidentService';
import { handleServiceError } from '@/lib/services/utils/errorHandlers';

/**
 * POST /api/incidents/create
 *
 * Create a new incident record with optional auto-generation of fields.
 * Supports associating compliance templates via selectedTemplateIds for automated auditing.
 *
 * @param {JSON} request - Incident data (including optional selectedTemplateIds)
 * @returns {Response} Created incident with ID and associated template IDs
 *
 * Request Body (JSON):
 * ```json
 * {
 *   "number": "2024-0001",                                // Optional - auto-generated if not provided
 *   "type": "Structure Fire",                             // Required
 *   "severity": "HIGH",                                   // Required - CRITICAL, HIGH, MEDIUM, LOW
 *   "address": "123 Main St",                             // Required
 *   "startTime": "2024-01-01T...",                        // Optional - defaults to current time
 *   "endTime": null,                                      // Optional
 *   "status": "ACTIVE",                                   // Optional - defaults to MONITORING
 *   "summary": "...",                                     // Optional
 *   "unitIds": ["unit-id-1", ...],                        // Optional - units to assign
 *   "selectedTemplateIds": ["template-id-1", "template-id-2"]  // Optional - compliance templates for auditing
 * }
 * ```
 *
 * Response (201 Created):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "id": "cm1234abcd...",
 *     "number": "2024-0001",
 *     "type": "Structure Fire",
 *     "severity": "HIGH",
 *     "address": "123 Main St",
 *     "startTime": "2024-01-01T...",
 *     "endTime": null,
 *     "status": "ACTIVE",
 *     "summary": "...",
 *     "selectedTemplateIds": ["template-id-1", "template-id-2"],
 *     "units": [...],
 *     "createdAt": "2024-01-01T...",
 *     "updatedAt": "2024-01-01T..."
 *   },
 *   "timestamp": "2024-01-01T..."
 * }
 * ```
 *
 * Error Responses:
 * - 400: Invalid input (missing required fields, invalid enum values)
 * - 409: Duplicate incident number
 * - 500: Database error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse JSON request body
    const body = await request.json();

    // Validate request body at API layer
    const validated = CreateIncidentSchema.parse(body);

    // Create incident using service (validates input and generates defaults)
    const incident = await incidentService.createIncident(validated);

    return NextResponse.json(
      {
        success: true,
        data: incident,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
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
