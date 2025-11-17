/**
 * Validation Utilities
 * Fire Department Radio Transcription System
 *
 * Comprehensive validation functions for file uploads, data integrity,
 * and input sanitization.
 */

import { AudioFormat, DocumentFormat } from '../types';
import { Errors } from '../services/utils/errorHandlers';

// ============================================================================
// FILE VALIDATION
// ============================================================================

/**
 * Supported audio MIME types for Whisper API
 *
 * OpenAI Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
 * We validate against a conservative list to ensure compatibility.
 */
const AUDIO_MIME_TYPES = [
  'audio/mpeg', // mp3
  'audio/mp4', // mp4, m4a
  'video/mp4', // mp4 containers commonly reported as video
  'audio/x-m4a', // m4a
  'audio/wav', // wav
  'audio/wave', // wav
  'audio/webm', // webm
  'audio/x-wav', // wav
] as const;

/**
 * Maximum audio file size for Whisper API (25MB hard limit)
 */
const MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024; // 25MB

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

  // Determine appropriate size limit based on file type
  const maxSize = type === 'audio' ? MAX_AUDIO_FILE_SIZE : MAX_FILE_SIZE;

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    const actualSizeMB = (file.size / 1024 / 1024).toFixed(2);

    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSizeMB}MB (received ${actualSizeMB}MB)`,
      details: {
        maxSize,
        actualSize: file.size,
        mimeType: file.type,
      },
    };
  }

  // Check file type
  const isValidType =
    type === 'audio' ? isValidAudioFile(file) : isValidDocumentFile(file);

  if (!isValidType) {
    const supportedFormats = type === 'audio'
      ? 'MP3, MP4, M4A, WAV, WEBM'
      : 'PDF, DOCX, XLSX, PPTX, TXT, MD';

    return {
      valid: false,
      error: `Invalid ${type} file format: ${file.type}. Supported formats: ${supportedFormats}`,
      details: {
        maxSize,
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
  if (
    extension === 'mp4' ||
    mimeType === 'audio/mp4' ||
    mimeType === 'video/mp4'
  )
    return 'mp4';
  if (extension === 'm4a' || mimeType === 'audio/x-m4a') return 'm4a';
  if (extension === 'wav' || mimeType.includes('wav')) return 'wav';
  if (extension === 'webm' || mimeType === 'audio/webm') return 'webm';
  if (extension === 'mov' || mimeType === 'video/quicktime') return 'mp4';

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

// ============================================================================
// CONTENT VALIDATION
// ============================================================================

/**
 * Validates that content is not empty or null
 *
 * Ensures content exists and contains meaningful text.
 * Throws structured ServiceError for consistent API responses.
 *
 * @param {string | null | undefined} content - Content to validate
 * @param {string} fieldName - Name of field for error messages
 * @returns {string} Trimmed, validated content
 * @throws {ServiceError} if content is empty
 *
 * @example
 * ```typescript
 * const text = validateContentNotEmpty(policyDoc.text, 'policyDocument.text');
 * // Returns trimmed text or throws ServiceError
 * ```
 */
export function validateContentNotEmpty(
  content: string | null | undefined,
  fieldName: string
): string {
  if (!content || content.trim().length === 0) {
    throw Errors.invalidInput(fieldName, 'Content cannot be empty');
  }
  return content.trim();
}

/**
 * Validates content meets minimum length requirement
 *
 * Ensures content has sufficient length for meaningful processing.
 * Particularly important before expensive GPT-4.1 API calls.
 *
 * @param {string} content - Content to validate
 * @param {number} minLength - Minimum required length in characters
 * @param {string} fieldName - Name of field for error messages
 * @returns {string} Validated content (unchanged)
 * @throws {ServiceError} if content is too short
 *
 * @example
 * ```typescript
 * validateMinLength(policyText, 100, 'policyDocument.text');
 * // Ensures policy text has at least 100 characters
 * ```
 */
export function validateMinLength(
  content: string,
  minLength: number,
  fieldName: string
): string {
  if (content.length < minLength) {
    throw Errors.invalidInput(
      fieldName,
      `Must be at least ${minLength} characters (got ${content.length})`
    );
  }
  return content;
}

/**
 * Combined validation: not empty AND meets minimum length
 *
 * Provides comprehensive content validation in a single call.
 * Recommended for all user-provided content before processing.
 *
 * @param {string | null | undefined} content - Content to validate
 * @param {number} minLength - Minimum required length in characters
 * @param {string} fieldName - Name of field for error messages
 * @returns {string} Trimmed, validated content
 * @throws {ServiceError} if content is empty or too short
 *
 * @example
 * ```typescript
 * // Validate policy document has meaningful content
 * const validText = validateContent(
 *   policyDoc.text,
 *   100,
 *   'policyDocument.text'
 * );
 * // Proceeds only with valid content, otherwise throws structured error
 * ```
 */
export function validateContent(
  content: string | null | undefined,
  minLength: number,
  fieldName: string
): string {
  const validated = validateContentNotEmpty(content, fieldName);
  return validateMinLength(validated, minLength, fieldName);
}
