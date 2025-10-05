/**
 * File Validation Utilities
 * Fire Department Radio Transcription System
 *
 * Provides comprehensive file validation including magic number verification,
 * MIME type validation, and filename sanitization to prevent security vulnerabilities.
 */

/**
 * Magic number signatures for supported file types
 *
 * Magic numbers are the first few bytes of a file that identify the file format.
 * This provides deeper validation than MIME type alone.
 */
const FILE_SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    [0x50, 0x4b, 0x03, 0x04], // PK (ZIP format)
    [0x50, 0x4b, 0x05, 0x06], // PK (empty ZIP)
    [0x50, 0x4b, 0x07, 0x08], // PK (spanned ZIP)
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    [0x50, 0x4b, 0x03, 0x04], // PK (ZIP format)
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    [0x50, 0x4b, 0x03, 0x04], // PK (ZIP format)
  ],
  'text/plain': [], // No signature check for text
  'text/markdown': [], // No signature check for markdown
};

/**
 * Verify file content matches claimed MIME type using magic numbers
 *
 * Prevents attackers from uploading malicious files disguised as valid documents
 * by checking the actual file content signature.
 *
 * @param {Buffer} buffer - File content buffer
 * @param {string} mimeType - Claimed MIME type
 * @returns {boolean} True if file content matches MIME type
 *
 * @example
 * ```typescript
 * const buffer = Buffer.from(fileContent);
 * const isValid = verifyFileType(buffer, 'application/pdf');
 * if (!isValid) {
 *   throw new Error('File content does not match claimed type');
 * }
 * ```
 */
export function verifyFileType(buffer: Buffer, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType];

  // Text files don't have magic numbers - allow them
  if (!signatures || signatures.length === 0) {
    return true;
  }

  // Check if buffer starts with any of the valid signatures
  return signatures.some((signature) => {
    if (buffer.length < signature.length) {
      return false;
    }

    return signature.every((byte, index) => buffer[index] === byte);
  });
}

/**
 * Sanitize filename to prevent path traversal attacks and malicious filenames
 *
 * Removes:
 * - Path components (../, ..\, etc.)
 * - Special characters that could cause issues
 * - Double extensions (e.g., malware.exe.pdf)
 *
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 *
 * @example
 * ```typescript
 * const safe = sanitizeFilename('../../../etc/passwd');
 * // Returns: 'passwd'
 *
 * const safe2 = sanitizeFilename('malware.exe.pdf');
 * // Returns: 'malware_exe.pdf'
 * ```
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components
  const baseName = filename.replace(/^.*[\\\/]/, '');

  // Remove non-alphanumeric characters except dots, hyphens, underscores
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Prevent double extensions (e.g., malware.exe.pdf)
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    const ext = parts.pop();
    const name = parts.join('_');
    return `${name}.${ext}`;
  }

  return sanitized;
}

/**
 * Allowed MIME types for policy document uploads
 *
 * This allowlist prevents upload of executable files, scripts, and other
 * potentially dangerous file types.
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
  'text/markdown',
] as const;

/**
 * Type for allowed MIME types
 */
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Check if MIME type is allowed
 *
 * @param {string} mimeType - MIME type to check
 * @returns {boolean} True if MIME type is in allowlist
 *
 * @example
 * ```typescript
 * if (!isAllowedMimeType(file.type)) {
 *   return res.status(400).json({ error: 'File type not allowed' });
 * }
 * ```
 */
export function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}
