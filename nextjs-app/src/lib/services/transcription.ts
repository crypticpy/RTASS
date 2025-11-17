/**
 * Transcription Service
 * Fire Department Radio Transcription System
 *
 * Handles audio transcription using OpenAI Whisper API with:
 * - Timestamped segment extraction
 * - Emergency detection integration
 * - Database persistence
 * - Token usage tracking
 */

import { getOpenAIClient, withRateLimit, trackTokenUsage } from './utils/openai';
import { storageService } from './storage';
import { emergencyDetectionService } from './emergencyDetection';
import { prisma } from '@/lib/db';
import { Errors } from './utils/errorHandlers';
import type {
  TranscriptionResult,
  TranscriptionSegment,
  TranscriptionMetadata,
  AudioFormat,
} from '@/lib/types';
import { createReadStream } from 'fs';
import fs from 'fs';
import { validateContent } from '@/lib/utils/validators';
import { logger } from '@/lib/logging';

// Prisma JSON type helper
type PrismaJson = Record<string, unknown> | unknown[];

/**
 * Options for transcription request
 */
export interface TranscriptionOptions {
  language?: string;
  detectMayday?: boolean;
}

/**
 * Whisper API response structure (verbose_json format)
 */
interface WhisperResponse {
  text: string;
  language: string;
  duration: number;
  segments: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
}

/**
 * Transcription Service
 *
 * Provides audio transcription with emergency detection and database persistence.
 *
 * @example
 * ```typescript
 * const transcriptionService = new TranscriptionService();
 *
 * // Transcribe audio file
 * const result = await transcriptionService.transcribeAudio(
 *   audioFile,
 *   incidentId,
 *   { language: 'en', detectMayday: true }
 * );
 *
 * console.log('Transcript:', result.text);
 * console.log('Mayday detections:', result.detections?.mayday.length);
 * ```
 */
export class TranscriptionService {
  /**
   * Transcribe audio file using OpenAI Whisper API
   *
   * Performs the following steps:
   * 1. Upload audio file to storage
   * 2. Call Whisper API for transcription
   * 3. Process segments with timestamps
   * 4. Run emergency detection (optional)
   * 5. Save transcript to database
   * 6. Track token usage
   *
   * @param {File} audioFile - Audio file to transcribe
   * @param {string} incidentId - Associated incident ID
   * @param {TranscriptionOptions} options - Transcription options
   * @returns {Promise<TranscriptionResult>} Transcription result with detections
   * @throws {ServiceError} If transcription fails
   *
   * @example
   * ```typescript
   * const result = await transcriptionService.transcribeAudio(
   *   file,
   *   'incident-123',
   *   { language: 'en', detectMayday: true }
   * );
   * ```
   */
  async transcribeAudio(
    audioFile: File,
    incidentId: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const { language = 'en', detectMayday = true } = options;
    const startTime = Date.now();

    try {
      // Step 1: Upload audio file to storage
      const uploadResult = await storageService.uploadAudio(audioFile, incidentId);

      // Step 2: Get file path for Whisper API
      const filePath = storageService.getFilePath(uploadResult.fileName, 'audio');

      // Step 2b: Verify file still exists (could be deleted during processing)
      const fileExists = fs.existsSync(filePath);
      if (!fileExists) {
        throw Errors.notFound('Audio file', uploadResult.fileName);
      }

      // Step 3: Call Whisper API
      const whisperResponse = await this.callWhisperAPI(filePath, language);

      // Step 3b: Validate transcription is not empty (likely silence or error)
      const validatedText = validateContent(
        whisperResponse.text,
        10,
        'transcript.text'
      );

      // Step 4: Process segments
      const segments = this.processSegments(whisperResponse.segments);

      // Step 5: Calculate processing metrics
      const processingTime = (Date.now() - startTime) / 1000;
      const averageConfidence = this.calculateAverageConfidence(
        whisperResponse.segments
      );

      // Step 6: Run emergency detection if requested
      let detections;
      if (detectMayday) {
        // Only run emergency detection if we have valid segments
        if (segments && segments.length > 0) {
          const maydayDetections = emergencyDetectionService.detectMayday(
            validatedText,
            segments
          );
          const emergencyTerms = emergencyDetectionService.detectEmergencyTerms(
            validatedText,
            segments
          );

          detections = {
            mayday: maydayDetections,
            emergency: emergencyTerms,
          };

          logger.info('Emergency detection completed', {
            component: 'transcription-service',
            operation: 'emergency-detection',
            incidentId,
            segmentCount: segments.length,
            maydayCount: maydayDetections.length,
            emergencyTermCount: emergencyTerms.length,
          });
        } else {
          // Log warning when segments are missing or empty
          logger.warn('Skipping emergency detection: no segments available', {
            component: 'transcription-service',
            operation: 'transcribe-audio',
            incidentId,
            hasSegments: !!segments,
            segmentCount: segments?.length || 0,
            transcriptLength: validatedText.length,
          });
        }
      }

      // Step 7: Prepare metadata
      const metadata: TranscriptionMetadata = {
        model: 'whisper-1',
        language: whisperResponse.language,
        processingTime,
        averageConfidence,
      };

      // Step 8: Save to database
      const transcript = await this.saveTranscript({
        incidentId,
        audioUrl: uploadResult.url,
        originalName: uploadResult.originalName,
        duration: Math.round(whisperResponse.duration),
        fileSize: uploadResult.size,
        format: this.detectAudioFormat(uploadResult.originalName),
        text: validatedText,
        segments,
        metadata,
        detections,
      });

      // Step 9: Return formatted result
      return {
        id: transcript.id,
        incidentId: transcript.incidentId,
        audioUrl: transcript.audioUrl,
        originalName: transcript.originalName,
        duration: transcript.duration,
        fileSize: transcript.fileSize,
        format: transcript.format as AudioFormat,
        text: transcript.text,
        segments: segments,
        metadata,
        detections,
        createdAt: transcript.createdAt,
      };
    } catch (error) {
      // Clean up uploaded file on error
      // (Note: In production, you may want to keep failed files for debugging)
      throw error;
    }
  }

  /**
   * Call OpenAI Whisper API for transcription
   *
   * Uses verbose_json format to get detailed segment information with timestamps.
   *
   * @private
   * @param {string} filePath - Path to audio file
   * @param {string} language - Language code (default: 'en')
   * @returns {Promise<WhisperResponse>} Whisper API response
   * @throws {ServiceError} If API call fails
   */
  private async callWhisperAPI(
    filePath: string,
    language: string
  ): Promise<WhisperResponse> {
    try {
      const client = getOpenAIClient();

      // Create file stream for upload
      const fileStream = createReadStream(filePath);

      // Call Whisper API with rate limiting
      const response = await withRateLimit(async () => {
        return await client.audio.transcriptions.create({
          file: fileStream,
          model: 'whisper-1',
          language,
          response_format: 'verbose_json',
          temperature: 0.0, // More deterministic
        }, {
          timeout: 5 * 60 * 1000, // 5 minutes for large audio files
        });
      });

      // Whisper doesn't return token usage in the same way as chat completions
      // We'll track it as a metric instead
      await trackTokenUsage(
        'whisper-1',
        {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        'audio_transcription'
      );

      return response as unknown as WhisperResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw Errors.externalServiceError(
          'OpenAI Whisper API',
          error.message
        );
      }
      throw Errors.processingFailed('Audio transcription', 'Unknown error');
    }
  }

  /**
   * Process Whisper segments into standardized format
   *
   * Extracts segment data and calculates confidence scores.
   *
   * @private
   * @param {Array} whisperSegments - Raw segments from Whisper API
   * @returns {TranscriptionSegment[]} Processed segments
   */
  private processSegments(
    whisperSegments: WhisperResponse['segments']
  ): TranscriptionSegment[] {
    return whisperSegments.map((segment) => ({
      id: segment.id,
      start: segment.start,
      end: segment.end,
      text: segment.text.trim(),
      confidence: this.calculateSegmentConfidence(segment),
    }));
  }

  /**
   * Calculate confidence score for a segment
   *
   * Uses Whisper's avg_logprob and no_speech_prob to estimate confidence.
   *
   * @private
   * @param {object} segment - Whisper segment
   * @returns {number} Confidence score (0-1)
   */
  private calculateSegmentConfidence(
    segment: WhisperResponse['segments'][0]
  ): number {
    // Whisper's avg_logprob is typically between -1 and 0
    // Higher (closer to 0) means more confident
    // no_speech_prob indicates probability that segment contains no speech
    // Lower no_speech_prob is better

    const logprobConfidence = Math.exp(segment.avg_logprob); // Convert log prob to probability
    const speechConfidence = 1 - segment.no_speech_prob;

    // Weighted average (favor speech confidence)
    return logprobConfidence * 0.4 + speechConfidence * 0.6;
  }

  /**
   * Calculate average confidence across all segments
   *
   * @private
   * @param {Array} segments - Whisper segments
   * @returns {number} Average confidence (0-1)
   */
  private calculateAverageConfidence(
    segments: WhisperResponse['segments']
  ): number {
    if (segments.length === 0) return 0;

    const total = segments.reduce((sum, segment) => {
      return sum + this.calculateSegmentConfidence(segment);
    }, 0);

    return total / segments.length;
  }

  /**
   * Detect audio format from filename
   *
   * @private
   * @param {string} filename - Audio filename
   * @returns {AudioFormat} Detected audio format
   */
  private detectAudioFormat(filename: string): AudioFormat {
    const extension = filename.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'mp3':
        return 'mp3';
      case 'mp4':
        return 'mp4';
      case 'm4a':
        return 'm4a';
      case 'wav':
        return 'wav';
      case 'webm':
        return 'webm';
      default:
        return 'mp3'; // Default fallback
    }
  }

  /**
   * Save transcript to database
   *
   * Persists transcript with all associated data and relationships.
   *
   * **Transaction Decision**: This method does NOT use a database transaction because:
   * - It performs a single atomic `create()` operation (already atomic)
   * - No multi-step database writes exist
   * - Adding transaction overhead provides no benefit
   *
   * **Future Consideration**: If this method is extended to include additional
   * operations (e.g., updating incident status, creating related records),
   * wrap the multi-step operations in `withTransaction()` from `@/lib/utils/database`.
   *
   * @private
   * @param {object} data - Transcript data to save
   * @returns {Promise} Saved transcript from database
   * @throws {ServiceError} If database operation fails
   */
  private async saveTranscript(data: {
    incidentId: string;
    audioUrl: string;
    originalName: string;
    duration: number;
    fileSize: number;
    format: AudioFormat;
    text: string;
    segments: TranscriptionSegment[];
    metadata: TranscriptionMetadata;
    detections?: {
      mayday: any[];
      emergency: any[];
    };
  }) {
    try {
      const transcript = await prisma.transcript.create({
        data: {
          incidentId: data.incidentId,
          audioUrl: data.audioUrl,
          originalName: data.originalName,
          duration: data.duration,
          fileSize: data.fileSize,
          format: data.format,
          text: data.text,
          segments: data.segments as any,
          metadata: data.metadata as any,
          detections: data.detections as any,
        },
        include: {
          incident: true,
        },
      });

      return transcript;
    } catch (error: any) {
      // Handle Prisma foreign key constraint violation (P2003)
      // This occurs when the referenced incident was deleted during processing
      if (error.code === 'P2003') {
        throw Errors.notFound('Incident', data.incidentId);
      }

      // Handle other database errors
      throw Errors.processingFailed(
        'Transcript save',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Retrieve transcript by ID
   *
   * Fetches a transcript from the database with all relationships.
   *
   * @param {string} transcriptId - Transcript ID
   * @returns {Promise<TranscriptionResult>} Transcript data
   * @throws {ServiceError} If transcript not found
   *
   * @example
   * ```typescript
   * const transcript = await transcriptionService.getTranscript('transcript-123');
   * ```
   */
  async getTranscript(transcriptId: string): Promise<TranscriptionResult> {
    try {
      const transcript = await prisma.transcript.findUnique({
        where: { id: transcriptId },
        include: {
          incident: true,
        },
      });

      if (!transcript) {
        throw Errors.notFound('Transcript', transcriptId);
      }

      return {
        id: transcript.id,
        incidentId: transcript.incidentId,
        audioUrl: transcript.audioUrl,
        originalName: transcript.originalName,
        duration: transcript.duration,
        fileSize: transcript.fileSize,
        format: transcript.format as AudioFormat,
        text: transcript.text,
        segments: transcript.segments as unknown as TranscriptionSegment[],
        metadata: transcript.metadata as unknown as TranscriptionMetadata,
        detections: transcript.detections as unknown as { mayday: any[]; emergency: any[] } | undefined,
        createdAt: transcript.createdAt,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw Errors.processingFailed(
        'Transcript retrieval',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get all transcripts for an incident
   *
   * @param {string} incidentId - Incident ID
   * @returns {Promise<TranscriptionResult[]>} Array of transcripts
   *
   * @example
   * ```typescript
   * const transcripts = await transcriptionService.getTranscriptsByIncident('incident-123');
   * ```
   */
  async getTranscriptsByIncident(
    incidentId: string
  ): Promise<TranscriptionResult[]> {
    try {
      const transcripts = await prisma.transcript.findMany({
        where: { incidentId },
        include: {
          incident: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return transcripts.map((transcript) => ({
        id: transcript.id,
        incidentId: transcript.incidentId,
        audioUrl: transcript.audioUrl,
        originalName: transcript.originalName,
        duration: transcript.duration,
        fileSize: transcript.fileSize,
        format: transcript.format as AudioFormat,
        text: transcript.text,
        segments: transcript.segments as unknown as TranscriptionSegment[],
        metadata: transcript.metadata as unknown as TranscriptionMetadata,
        detections: transcript.detections as unknown as { mayday: any[]; emergency: any[] } | undefined,
        createdAt: transcript.createdAt,
      }));
    } catch (error) {
      throw Errors.processingFailed(
        'Transcripts retrieval',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

/**
 * Singleton transcription service instance
 */
export const transcriptionService = new TranscriptionService();
