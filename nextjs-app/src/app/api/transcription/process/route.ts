/**
 * Transcription Process API Route
 * POST /api/transcription/process
 *
 * Starts transcription job for uploaded audio file.
 */

import { NextRequest, NextResponse } from 'next/server';
import { transcriptionService } from '@/lib/services/transcription';
import { storageService } from '@/lib/services/storage';
import { handleServiceError, Errors } from '@/lib/services/utils/errorHandlers';
import { z } from 'zod';

/**
 * Request validation schema
 */
const ProcessRequestSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  incidentId: z.string().cuid('Invalid incident ID'),
  language: z.string().default('en'),
  detectMayday: z.boolean().default(true),
});

/**
 * POST /api/transcription/process
 *
 * Process audio file for transcription using OpenAI Whisper API.
 *
 * Request Body:
 * ```json
 * {
 *   "fileName": "1234567890-uuid-audio.mp3",
 *   "incidentId": "cxxxxxxxxxxxxxxxxxx",
 *   "language": "en",
 *   "detectMayday": true
 * }
 * ```
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
 *     "detections": {
 *       "mayday": [...],
 *       "emergency": [...]
 *     },
 *     "metadata": {...}
 *   }
 * }
 * ```
 *
 * Error Responses:
 * - 400: Invalid request or file not found
 * - 500: Transcription failed
 * - 502: OpenAI API error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = ProcessRequestSchema.parse(body);

    // Check if file exists in storage
    const fileExists = await storageService.fileExists(
      validated.fileName,
      'audio'
    );

    if (!fileExists) {
      throw Errors.notFound('Audio file', validated.fileName);
    }

    // Get file buffer for transcription
    const fileBuffer = await storageService.getFileBuffer(
      validated.fileName,
      'audio'
    );

    // Create File object from buffer
    // Note: In a real scenario, we'd use the actual file from storage
    // For now, we'll create a temporary File object
    const audioFile = new File([fileBuffer], validated.fileName, {
      type: 'audio/mpeg', // This should be determined from the actual file
    });

    // Start transcription
    const result = await transcriptionService.transcribeAudio(
      audioFile,
      validated.incidentId,
      {
        language: validated.language,
        detectMayday: validated.detectMayday,
      }
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
