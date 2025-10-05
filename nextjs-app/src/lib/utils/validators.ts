/**
 * Validation Utilities
 * Fire Department Radio Transcription System
 *
 * Comprehensive validation functions for file uploads, data integrity,
 * and input sanitization.
 */

import { AudioFormat, DocumentFormat } from '../types';

// ============================================================================
// FILE VALIDATION
// ============================================================================

/**
 * Supported audio MIME types
 */
const AUDIO_MIME_TYPES = [
  'audio/mpeg', // mp3
  'audio/mp4', // mp4, m4a
  'audio/x-m4a', // m4a
  'audio/wav', // wav
  'audio/wave', // wav
  'audio/webm', // webm
  'audio/x-wav', // wav
] as const;

/**
 * Supported document MIME types
 */
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'text/plain',
  'text/markdown',
] as const;

/**
 * Maximum file size in bytes (50MB default)
 */
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10) * 1024 * 1024;

/**
 * Validates if a file is a supported audio format
 *
 * @param file - File to validate
 * @returns {boolean} True if valid audio file
 *
 * @example
 * ```typescript
 * if (!isValidAudioFile(uploadedFile)) {
 *   throw new Error('Invalid audio file format');
 * }
 * ```
 */
export function isValidAudioFile(file: File): boolean {
  return AUDIO_MIME_TYPES.includes(file.type as any);
}

/**
 * Validates if a file is a supported document format
 *
 * @param file - File to validate
 * @returns {boolean} True if valid document file
 */
export function isValidDocumentFile(file: File): boolean {
  return DOCUMENT_MIME_TYPES.includes(file.type as any);
}

/**
 * Validates file size against maximum allowed size
 *
 * @param file - File to validate
 * @param maxSize - Maximum size in bytes (optional, uses env var if not provided)
 * @returns {boolean} True if file size is within limits
 */
export function isValidFileSize(file: File, maxSize: number = MAX_FILE_SIZE): boolean {
  return file.size <= maxSize;
}

/**
 * Comprehensive file validation
 *
 * @param file - File to validate
 * @param type - Expected file type ('audio' or 'document')
 * @returns {ValidationResult} Validation result with error details
 *
 * @example
 * ```typescript
 * const result = validateFile(uploadedFile, 'audio');
 * if (!result.valid) {
 *   return res.status(400).json({ error: result.error });
 * }
 * ```
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    maxSize: number;
    actualSize: number;
    mimeType: string;
  };
}

export function validateFile(
  file: File,
  type: 'audio' | 'document'
): ValidationResult {
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: 'No file provided',
    };
  }

  // Check file size
  if (!isValidFileSize(file)) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      details: {
        maxSize: MAX_FILE_SIZE,
        actualSize: file.size,
        mimeType: file.type,
      },
    };
  }

  // Check file type
  const isValidType =
    type === 'audio' ? isValidAudioFile(file) : isValidDocumentFile(file);

  if (!isValidType) {
    return {
      valid: false,
      error: `Invalid ${type} file format: ${file.type}`,
      details: {
        maxSize: MAX_FILE_SIZE,
        actualSize: file.size,
        mimeType: file.type,
      },
    };
  }

  return { valid: true };
}

/**
 * Detects audio format from file extension or MIME type
 *
 * @param fileName - File name with extension
 * @param mimeType - MIME type of the file
 * @returns {AudioFormat | null} Detected audio format or null if unknown
 */
export function detectAudioFormat(
  fileName: string,
  mimeType: string
): AudioFormat | null {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'mp3' || mimeType === 'audio/mpeg') return 'mp3';
  if (extension === 'mp4' || mimeType === 'audio/mp4') return 'mp4';
  if (extension === 'm4a' || mimeType === 'audio/x-m4a') return 'm4a';
  if (extension === 'wav' || mimeType.includes('wav')) return 'wav';
  if (extension === 'webm' || mimeType === 'audio/webm') return 'webm';

  return null;
}

/**
 * Detects document format from file extension or MIME type
 *
 * @param fileName - File name with extension
 * @param mimeType - MIME type of the file
 * @returns {DocumentFormat | null} Detected document format or null if unknown
 */
export function detectDocumentFormat(
  fileName: string,
  mimeType: string
): DocumentFormat | null {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (
    extension === 'docx' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'docx';
  if (
    extension === 'xlsx' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
    return 'xlsx';
  if (
    extension === 'pptx' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  )
    return 'pptx';
  if (extension === 'txt' || mimeType === 'text/plain') return 'txt';
  if (extension === 'md' || mimeType === 'text/markdown') return 'md';

  return null;
}

// ============================================================================
// DATA VALIDATION
// ============================================================================

/**
 * Validates incident number format
 * Expected format: YYYY-NNNNNN (e.g., 2024-001234)
 *
 * @param incidentNumber - Incident number to validate
 * @returns {boolean} True if valid format
 */
export function isValidIncidentNumber(incidentNumber: string): boolean {
  const pattern = /^\d{4}-\d{6}$/;
  return pattern.test(incidentNumber);
}

/**
 * Validates date/time string
 *
 * @param dateTime - ISO 8601 date-time string
 * @returns {boolean} True if valid date-time
 */
export function isValidDateTime(dateTime: string): boolean {
  const date = new Date(dateTime);
  return !isNaN(date.getTime());
}

/**
 * Validates score value (0-100)
 *
 * @param score - Score value to validate
 * @returns {boolean} True if score is between 0 and 100
 */
export function isValidScore(score: number): boolean {
  return score >= 0 && score <= 100 && !isNaN(score);
}

/**
 * Validates confidence value (0-1)
 *
 * @param confidence - Confidence value to validate
 * @returns {boolean} True if confidence is between 0 and 1
 */
export function isValidConfidence(confidence: number): boolean {
  return confidence >= 0 && confidence <= 1 && !isNaN(confidence);
}

// ============================================================================
// STRING SANITIZATION
// ============================================================================

/**
 * Sanitizes user input by removing potentially dangerous characters
 *
 * @param input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['"]/g, '') // Remove quotes
    .trim();
}

/**
 * Sanitizes filename by removing special characters and limiting length
 *
 * @param fileName - Original filename
 * @param maxLength - Maximum filename length (default: 255)
 * @returns {string} Sanitized filename
 */
export function sanitizeFileName(fileName: string, maxLength: number = 255): string {
  const extension = fileName.split('.').pop();
  const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));

  const sanitized = nameWithoutExtension
    .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace special chars with underscore
    .substring(0, maxLength - (extension?.length || 0) - 1);

  return extension ? `${sanitized}.${extension}` : sanitized;
}

// ============================================================================
// ID VALIDATION
// ============================================================================

/**
 * Validates CUID (Collision-resistant Unique Identifier)
 * Used by Prisma for @id @default(cuid())
 *
 * @param id - ID string to validate
 * @returns {boolean} True if valid CUID format
 */
export function isValidCuid(id: string): boolean {
  const pattern = /^c[a-z0-9]{24}$/;
  return pattern.test(id);
}

/**
 * Validates array of IDs
 *
 * @param ids - Array of ID strings
 * @returns {boolean} True if all IDs are valid CUIDs
 */
export function areValidIds(ids: string[]): boolean {
  return ids.every((id) => isValidCuid(id));
}
