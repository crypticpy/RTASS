/**
 * Transcription Retrieval API Route
 * GET /api/transcription/[id]
 *
 * Retrieves transcript by ID from database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { transcriptionService } from '@/lib/services/transcription';
import { handleServiceError, Errors } from '@/lib/services/utils/errorHandlers';
import { isValidCuid } from '@/lib/utils/validators';

/**
 * GET /api/transcription/[id]
 *
 * Retrieve transcript by ID.
 *
 * Path Parameters:
 * - id: string - Transcript CUID
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
 *     "detections": {...},
 *     "metadata": {...},
 *     "createdAt": "2025-10-04T..."
 *   }
 * }
 * ```
 *
 * Error Responses:
 * - 400: Invalid transcript ID format
 * - 404: Transcript not found
 * - 500: Database error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transcriptId = params.id;

    // Validate CUID format
    if (!isValidCuid(transcriptId)) {
      throw Errors.invalidInput(
        'transcriptId',
        'Must be a valid CUID format'
      );
    }

    // Retrieve transcript from database
    const transcript = await transcriptionService.getTranscript(transcriptId);

    return NextResponse.json({
      success: true,
      data: transcript,
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
