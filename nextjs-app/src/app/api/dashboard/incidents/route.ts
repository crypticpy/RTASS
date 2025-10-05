/**
 * GET /api/dashboard/incidents
 * Fire Department Radio Transcription System
 *
 * Get recent incidents with compliance data for dashboard display.
 * Supports filtering, pagination, and date ranges.
 */

import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/lib/services/dashboard';
import { handleServiceError } from '@/lib/services/utils/errorHandlers';
import { z } from 'zod';

/**
 * Query parameters schema
 */
const IncidentQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(30),
  offset: z.coerce.number().min(0).optional().default(0),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['ACTIVE', 'RESOLVED', 'MONITORING']).optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
});

/**
 * GET /api/dashboard/incidents
 *
 * Query Parameters:
 * - limit?: number (1-100, default: 30) - Results per page
 * - offset?: number (default: 0) - Pagination offset
 * - startDate?: ISO date string - Filter incidents after this date
 * - endDate?: ISO date string - Filter incidents before this date
 * - status?: 'ACTIVE' | 'RESOLVED' | 'MONITORING' - Filter by status
 * - severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' - Filter by severity
 *
 * Response: {
 *   incidents: DashboardIncident[],
 *   limit: number,
 *   offset: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const query = {
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: searchParams.get('status') || undefined,
      severity: searchParams.get('severity') || undefined,
    };

    const validated = IncidentQuerySchema.parse(query);

    // Fetch incidents from dashboard service
    const incidents = await dashboardService.getRecentIncidents(validated);

    return NextResponse.json(
      {
        incidents,
        limit: validated.limit,
        offset: validated.offset,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: { issues: error.issues },
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const apiError = handleServiceError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}
