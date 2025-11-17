/**
 * Whisper API Integration
 *
 * Provides audio transcription capabilities using OpenAI's Whisper model.
 * Handles chunking for large files, retry logic, and progress tracking.
 *
 * ## Timeout Configuration
 *
 * Whisper API calls use a 5-minute timeout to accommodate large audio files.
 * This is configured per-request to override the client's default 2-minute timeout.
 */

import OpenAI from 'openai';
import { openai } from './client';
import {
  TranscriptionError,
  RateLimitError,
  ServiceUnavailableError,
  ContextLengthExceededError,
} from './errors';
import { retryWithBackoff, estimateTokens, logAPICall } from './utils';
import { circuitBreakers } from '@/lib/utils/circuitBreaker';
import { logger } from '@/lib/logging';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Whisper API response with detailed transcription data
 */
export interface WhisperResponse {
  text: string;
  language: string;
  duration: number;
  segments: TranscriptSegment[];
}

/**
 * Individual segment of transcribed audio with timestamp
 */
export interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number;
}

/**
 * Options for audio transcription
 */
export interface TranscribeOptions {
  language?: string;
  prompt?: string;
  temperature?: number;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

/**
 * Progress callback for long-running operations
 */
export type ProgressCallback = (progress: {
  current: number;
  total: number;
  message: string;
}) => void;

/**
 * Maximum file size for Whisper API (25 MB)
 */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Transcribe audio file with Whisper API
 *
 * @param audioBuffer Audio file buffer
 * @param options Transcription options
 * @returns Transcription result with segments
 * @throws TranscriptionError if transcription fails
 *
 * @example
 * ```typescript
 * const buffer = fs.readFileSync('audio.mp3');
 * const result = await transcribeAudio(buffer, {
 *   language: 'en',
 *   prompt: 'Fire department radio communications'
 * });
 * console.log(result.text);
 * ```
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  options: TranscribeOptions = {}
): Promise<WhisperResponse> {
  try {
    // Check file size
    if (audioBuffer.length > MAX_FILE_SIZE) {
      throw new TranscriptionError(
        `Audio file exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB. Use chunkAndTranscribe for larger files.`
      );
    }

    // Create a File object from the buffer
    // Convert Buffer to Uint8Array for compatibility
    const uint8Array = new Uint8Array(audioBuffer);
    const audioFile = new File([uint8Array], 'audio.mp3', {
      type: 'audio/mpeg',
    });

    // Call Whisper API with circuit breaker, retry logic, and extended timeout
    const result = await circuitBreakers.openaiWhisper.execute(async () => {
      return await retryWithBackoff(async () => {
        return await openai.audio.transcriptions.create(
          {
            file: audioFile,
            model: 'whisper-1',
            language: options.language,
            prompt: options.prompt,
            temperature: options.temperature ?? 0,
            response_format: 'verbose_json',
            timestamp_granularities: ['segment'],
          },
          {
            timeout: 5 * 60 * 1000, // 5 minutes for large audio files
          }
        );
      });
    });

    // Log API call
    logAPICall('whisper-transcribe', 'whisper-1', undefined, estimateTokens(result.text));

    // Transform response to our format
    const response: WhisperResponse = {
      text: result.text,
      language: result.language || options.language || 'en',
      duration: result.duration || 0,
      segments:
        result.segments?.map((seg, idx) => ({
          id: `seg-${idx}`,
          startTime: seg.start,
          endTime: seg.end,
          text: seg.text,
          confidence: (seg as any).confidence,
        })) || [],
    };

    return response;
  } catch (error) {
    // Handle OpenAI APIError specifically
    if (error instanceof OpenAI.APIError) {
      logger.error('OpenAI Whisper API error', {
        component: 'openai-whisper',
        status: error.status,
        code: error.code,
        type: error.type,
        requestId: error.request_id,
        message: error.message,
      });

      // Handle specific error types
      if (error.status === 429) {
        throw new RateLimitError(
          'OpenAI Whisper API rate limit exceeded',
          undefined,
          error.request_id,
          error
        );
      }

      if (error.status === 503) {
        throw new ServiceUnavailableError(
          'OpenAI Whisper API temporarily unavailable',
          undefined,
          error
        );
      }

      if (error.code === 'context_length_exceeded') {
        throw new ContextLengthExceededError(
          'Audio file exceeds Whisper model context limit',
          undefined,
          undefined,
          error
        );
      }

      // Generic APIError
      throw new TranscriptionError(
        `OpenAI Whisper API error: ${error.message}`,
        undefined,
        error
      );
    }

    // Handle other errors
    throw new TranscriptionError(
      `Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      error
    );
  }
}

/**
 * Chunk and transcribe large audio files
 *
 * For audio files larger than 25MB, this function splits the file
 * into chunks and transcribes each chunk separately.
 *
 * @param audioPath Path to audio file
 * @param options Transcription options
 * @param onProgress Progress callback
 * @returns Combined transcription result
 * @throws TranscriptionError if chunking or transcription fails
 *
 * @example
 * ```typescript
 * const result = await chunkAndTranscribe(
 *   '/path/to/large-audio.mp3',
 *   { language: 'en' },
 *   (progress) => console.log(`${progress.current}/${progress.total}`)
 * );
 * ```
 */
export async function chunkAndTranscribe(
  audioPath: string,
  options: TranscribeOptions = {},
  onProgress?: ProgressCallback
): Promise<WhisperResponse> {
  try {
    // Check if file exists
    if (!fs.existsSync(audioPath)) {
      throw new TranscriptionError(`Audio file not found: ${audioPath}`, audioPath);
    }

    // Get file size
    const stats = fs.statSync(audioPath);
    const fileSize = stats.size;

    // If file is small enough, transcribe directly
    if (fileSize <= MAX_FILE_SIZE) {
      const buffer = fs.readFileSync(audioPath);
      return await transcribeAudio(buffer, options);
    }

    // For large files, we need to use external chunking tool (ffmpeg)
    // This is a placeholder - actual implementation would use ffmpeg
    throw new TranscriptionError(
      `Audio file exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB. ` +
        `Chunking requires ffmpeg integration which is not yet implemented. ` +
        `Please pre-process the file into smaller chunks.`,
      audioPath
    );

    /*
    // Future implementation with ffmpeg:
    const chunks = await splitAudioFile(audioPath, MAX_FILE_SIZE * 0.9);
    const totalChunks = chunks.length;

    const allSegments: TranscriptSegment[] = [];
    let combinedText = '';
    let totalDuration = 0;
    let detectedLanguage = options.language || 'en';

    for (let i = 0; i < chunks.length; i++) {
      onProgress?.({
        current: i + 1,
        total: totalChunks,
        message: `Transcribing chunk ${i + 1} of ${totalChunks}`,
      });

      const chunkBuffer = fs.readFileSync(chunks[i].path);
      const result = await transcribeAudio(chunkBuffer, {
        ...options,
        prompt: i === 0 ? options.prompt : combinedText.slice(-200), // Use previous text as context
      });

      // Adjust segment timestamps for chunk offset
      const adjustedSegments = result.segments.map((seg) => ({
        ...seg,
        id: `seg-${allSegments.length + parseInt(seg.id.split('-')[1])}`,
        startTime: seg.startTime + chunks[i].offset,
        endTime: seg.endTime + chunks[i].offset,
      }));

      allSegments.push(...adjustedSegments);
      combinedText += result.text + ' ';
      totalDuration += result.duration;
      detectedLanguage = result.language;

      // Clean up chunk file
      fs.unlinkSync(chunks[i].path);
    }

    return {
      text: combinedText.trim(),
      language: detectedLanguage,
      duration: totalDuration,
      segments: allSegments,
    };
    */
  } catch (error) {
    throw new TranscriptionError(
      `Failed to chunk and transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
      audioPath,
      error
    );
  }
}

/**
 * Format timestamp in MM:SS or HH:MM:SS format
 *
 * @param seconds Timestamp in seconds
 * @returns Formatted timestamp string
 */
export function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert segments to SRT format
 *
 * @param segments Transcript segments
 * @returns SRT formatted string
 */
export function convertToSRT(segments: TranscriptSegment[]): string {
  return segments
    .map((seg, idx) => {
      const start = formatSRTTimestamp(seg.startTime);
      const end = formatSRTTimestamp(seg.endTime);
      return `${idx + 1}\n${start} --> ${end}\n${seg.text.trim()}\n`;
    })
    .join('\n');
}

/**
 * Format timestamp for SRT format (HH:MM:SS,mmm)
 */
function formatSRTTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}
