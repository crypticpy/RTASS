/**
 * Transcription Upload API Route
 * POST /api/transcription/upload
 *
 * Uploads audio file for transcription processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/lib/services/storage';
import { handleServiceError } from '@/lib/services/utils/errorHandlers';

/**
 * POST /api/transcription/upload
 *
 * Upload audio file to storage for later transcription.
 *
 * @param {FormData} request - Multipart form data with audio file
 * @returns {Response} Upload result with file details
 *
 * Request Body (FormData):
 * - file: File (required) - Audio file
 * - incidentId: string (optional) - Associated incident ID
 *
 * Response (200 OK):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "fileName": "1234567890-uuid-audio.mp3",
 *     "originalName": "audio.mp3",
 *     "url": "http://localhost:3000/uploads/audio/...",
 *     "size": 1234567,
 *     "mimeType": "audio/mpeg",
 *     "uploadedAt": "2025-10-04T..."
 *   }
 * }
 * ```
 *
 * Error Responses:
 * - 400: Invalid file format or size
 * - 500: Upload failed
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const incidentId = formData.get('incidentId') as string | null;

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'INVALID_INPUT',
            message: 'No file provided',
            statusCode: 400,
          },
        },
        { status: 400 }
      );
    }

    // Upload file to storage
    const result = await storageService.uploadAudio(
      file,
      incidentId || undefined
    );

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
