/**
 * GET /api/dashboard/stats
 * Fire Department Radio Transcription System
 *
 * Get comprehensive dashboard statistics including:
 * - Incident counts and statuses
 * - Template statistics
 * - Transcription metrics
 * - Audit scores and outcomes
 * - Recent activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/lib/services/dashboard';
import { handleServiceError } from '@/lib/services/utils/errorHandlers';

/**
 * GET /api/dashboard/stats
 *
 * Retrieve comprehensive dashboard statistics.
 *
 * Response: {
 *   incidents: { total, active, resolved, withMayday },
 *   templates: { total, active, aiGenerated },
 *   transcriptions: { total, averageDuration, totalDuration },
 *   audits: { total, averageScore, passCount, failCount, needsImprovementCount },
 *   recentActivity: { lastIncidentDate, lastTranscriptionDate, lastAuditDate }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await dashboardService.getStats();

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    const apiError = handleServiceError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}
