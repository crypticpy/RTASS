/**
 * Storage Service
 * Fire Department Radio Transcription System
 *
 * Handles file upload, download, and cleanup for audio files and policy documents.
 * Supports local file system storage for development and is configured for
 * Azure Blob Storage in production.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { FileUploadResult } from '@/lib/types';
import { validateFile, detectAudioFormat, detectDocumentFormat, sanitizeFileName } from '@/lib/utils/validators';
import { ServiceError, Errors } from './utils/errorHandlers';

/**
 * Storage Service Configuration
 */
interface StorageConfig {
  uploadDir: string;
  maxFileSize: number;
  baseUrl: string;
}

/**
 * Get storage configuration from environment variables
 */
function getStorageConfig(): StorageConfig {
  return {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10) * 1024 * 1024,
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  };
}

/**
 * Storage Service for file management
 *
 * Provides file upload, retrieval, and cleanup functionality.
 * Uses local file system for development with configuration ready
 * for Azure Blob Storage in production.
 *
 * @example
 * ```typescript
 * const storageService = new StorageService();
 *
 * // Upload audio file
 * const result = await storageService.uploadAudio(audioFile, incidentId);
 * console.log('Audio URL:', result.url);
 *
 * // Clean up old files
 * await storageService.deleteAudio(result.fileName);
 * ```
 */
export class StorageService {
  private config: StorageConfig;

  constructor() {
    this.config = getStorageConfig();
  }

  /**
   * Ensure upload directory exists
   *
   * Creates the upload directory and subdirectories if they don't exist.
   */
  private async ensureUploadDirectory(): Promise<void> {
    const dirs = [
      this.config.uploadDir,
      path.join(this.config.uploadDir, 'audio'),
      path.join(this.config.uploadDir, 'documents'),
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if ((error as any).code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Generate a unique, secure filename
   *
   * Format: {timestamp}-{uuid}.{extension}
   *
   * @param {string} originalName - Original filename
   * @returns {string} Generated secure filename
   */
  private generateSecureFilename(originalName: string): string {
    const timestamp = Date.now();
    const uuid = randomUUID();
    const extension = path.extname(originalName).toLowerCase();
    const sanitized = sanitizeFileName(originalName);
    const nameWithoutExt = path.basename(sanitized, extension);

    // Limit filename length
    const maxNameLength = 50;
    const truncatedName = nameWithoutExt.substring(0, maxNameLength);

    return `${timestamp}-${uuid}-${truncatedName}${extension}`;
  }

  /**
   * Upload audio file to storage
   *
   * Validates the audio file, generates a secure filename, and saves it
   * to local storage or Azure Blob Storage.
   *
   * @param {File} file - Audio file to upload
   * @param {string} incidentId - Optional incident ID for organizing files
   * @returns {Promise<FileUploadResult>} Upload result with file URL
   * @throws {ServiceError} If validation fails or upload fails
   *
   * @example
   * ```typescript
   * const result = await storageService.uploadAudio(audioFile, incidentId);
   * ```
   */
  async uploadAudio(
    file: File,
    incidentId?: string
  ): Promise<FileUploadResult> {
    // Validate audio file (includes size and MIME type validation)
    const validation = validateFile(file, 'audio');
    if (!validation.valid) {
      // Log validation failure with details
      console.error('[UPLOAD_VALIDATION_FAILED]', {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        error: validation.error,
        details: validation.details,
      });
      throw Errors.invalidFile(validation.error!, validation.details);
    }

    // Detect audio format
    const format = detectAudioFormat(file.name, file.type);
    if (!format) {
      console.error('[AUDIO_FORMAT_DETECTION_FAILED]', {
        fileName: file.name,
        mimeType: file.type,
      });
      throw Errors.unsupportedFormat(file.type, [
        'mp3',
        'mp4',
        'm4a',
        'wav',
        'webm',
      ]);
    }

    // Ensure directory exists
    await this.ensureUploadDirectory();

    // Generate secure filename
    const fileName = this.generateSecureFilename(file.name);
    const filePath = path.join(this.config.uploadDir, 'audio', fileName);

    // Save file to disk
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      console.log('[AUDIO_UPLOAD_SUCCESS]', {
        fileName,
        originalName: file.name,
        size: file.size,
        format,
        incidentId,
      });
    } catch (error) {
      console.error('[AUDIO_UPLOAD_FAILED]', {
        fileName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw Errors.processingFailed(
        'File upload',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Generate file URL
    const url = `${this.config.baseUrl}/uploads/audio/${fileName}`;

    return {
      fileName,
      originalName: file.name,
      url,
      size: file.size,
      mimeType: file.type,
      uploadedAt: new Date(),
    };
  }

  /**
   * Upload policy document to storage
   *
   * Validates the document file, generates a secure filename, and saves it
   * to local storage or Azure Blob Storage.
   *
   * @param {File} file - Document file to upload
   * @returns {Promise<FileUploadResult>} Upload result with file URL
   * @throws {ServiceError} If validation fails or upload fails
   *
   * @example
   * ```typescript
   * const result = await storageService.uploadDocument(pdfFile);
   * ```
   */
  async uploadDocument(file: File): Promise<FileUploadResult> {
    // Validate document file (includes size and MIME type validation)
    const validation = validateFile(file, 'document');
    if (!validation.valid) {
      // Log validation failure with details
      console.error('[DOCUMENT_VALIDATION_FAILED]', {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        error: validation.error,
        details: validation.details,
      });
      throw Errors.invalidFile(validation.error!, validation.details);
    }

    // Detect document format
    const format = detectDocumentFormat(file.name, file.type);
    if (!format) {
      console.error('[DOCUMENT_FORMAT_DETECTION_FAILED]', {
        fileName: file.name,
        mimeType: file.type,
      });
      throw Errors.unsupportedFormat(file.type, [
        'pdf',
        'docx',
        'xlsx',
        'pptx',
        'txt',
        'md',
      ]);
    }

    // Ensure directory exists
    await this.ensureUploadDirectory();

    // Generate secure filename
    const fileName = this.generateSecureFilename(file.name);
    const filePath = path.join(this.config.uploadDir, 'documents', fileName);

    // Save file to disk
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      console.log('[DOCUMENT_UPLOAD_SUCCESS]', {
        fileName,
        originalName: file.name,
        size: file.size,
        format,
      });
    } catch (error) {
      console.error('[DOCUMENT_UPLOAD_FAILED]', {
        fileName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw Errors.processingFailed(
        'Document upload',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Generate file URL
    const url = `${this.config.baseUrl}/uploads/documents/${fileName}`;

    return {
      fileName,
      originalName: file.name,
      url,
      size: file.size,
      mimeType: file.type,
      uploadedAt: new Date(),
    };
  }

  /**
   * Get full file path for a stored file
   *
   * @param {string} fileName - Name of the stored file
   * @param {'audio' | 'document'} type - Type of file
   * @returns {string} Full file path
   */
  getFilePath(fileName: string, type: 'audio' | 'document'): string {
    return path.join(this.config.uploadDir, type, fileName);
  }

  /**
   * Get URL for accessing a stored file
   *
   * @param {string} fileName - Name of the stored file
   * @param {'audio' | 'document'} type - Type of file
   * @returns {string} File URL
   *
   * @example
   * ```typescript
   * const url = storageService.getFileUrl(fileName, 'audio');
   * ```
   */
  getFileUrl(fileName: string, type: 'audio' | 'document'): string {
    return `${this.config.baseUrl}/uploads/${type}/${fileName}`;
  }

  /**
   * Check if a file exists in storage
   *
   * @param {string} fileName - Name of the file to check
   * @param {'audio' | 'document'} type - Type of file
   * @returns {Promise<boolean>} True if file exists
   *
   * @example
   * ```typescript
   * const exists = await storageService.fileExists(fileName, 'audio');
   * ```
   */
  async fileExists(
    fileName: string,
    type: 'audio' | 'document'
  ): Promise<boolean> {
    try {
      const filePath = this.getFilePath(fileName, type);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file buffer for processing
   *
   * Retrieves the file from storage as a Buffer for processing
   * (e.g., sending to OpenAI API).
   *
   * @param {string} fileName - Name of the file to retrieve
   * @param {'audio' | 'document'} type - Type of file
   * @returns {Promise<Buffer>} File buffer
   * @throws {ServiceError} If file not found
   *
   * @example
   * ```typescript
   * const buffer = await storageService.getFileBuffer(fileName, 'audio');
   * ```
   */
  async getFileBuffer(
    fileName: string,
    type: 'audio' | 'document'
  ): Promise<Buffer> {
    const filePath = this.getFilePath(fileName, type);

    try {
      return await fs.readFile(filePath);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw Errors.notFound(`File '${fileName}'`);
      }
      throw Errors.processingFailed(
        'File retrieval',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Delete a file from storage
   *
   * Removes the file from local storage or Azure Blob Storage.
   *
   * @param {string} fileName - Name of the file to delete
   * @param {'audio' | 'document'} type - Type of file
   * @returns {Promise<void>}
   * @throws {ServiceError} If deletion fails
   *
   * @example
   * ```typescript
   * await storageService.deleteFile(fileName, 'audio');
   * ```
   */
  async deleteFile(
    fileName: string,
    type: 'audio' | 'document'
  ): Promise<void> {
    const filePath = this.getFilePath(fileName, type);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, consider it deleted
        return;
      }
      throw Errors.processingFailed(
        'File deletion',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Clean up old files from storage
   *
   * Deletes files older than the specified age.
   * Useful for periodic cleanup of temporary files.
   *
   * @param {'audio' | 'document'} type - Type of files to clean
   * @param {number} maxAgeInDays - Maximum age in days (default: 30)
   * @returns {Promise<number>} Number of files deleted
   *
   * @example
   * ```typescript
   * const deleted = await storageService.cleanupOldFiles('audio', 7);
   * console.log(`Deleted ${deleted} old audio files`);
   * ```
   */
  async cleanupOldFiles(
    type: 'audio' | 'document',
    maxAgeInDays: number = 30
  ): Promise<number> {
    const dirPath = path.join(this.config.uploadDir, type);
    const maxAgeMs = maxAgeInDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let deletedCount = 0;

    try {
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAgeMs) {
          try {
            await fs.unlink(filePath);
            deletedCount++;
          } catch (error) {
            console.error(`Failed to delete old file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to cleanup old ${type} files:`, error);
    }

    return deletedCount;
  }

  /**
   * Get storage statistics
   *
   * Returns information about storage usage.
   *
   * @returns {Promise<object>} Storage statistics
   *
   * @example
   * ```typescript
   * const stats = await storageService.getStorageStats();
   * console.log(`Total files: ${stats.totalFiles}`);
   * console.log(`Total size: ${stats.totalSizeBytes} bytes`);
   * ```
   */
  async getStorageStats(): Promise<{
    audioFiles: number;
    documentFiles: number;
    totalFiles: number;
    audioSizeBytes: number;
    documentSizeBytes: number;
    totalSizeBytes: number;
  }> {
    const getDirectoryStats = async (dirPath: string) => {
      let count = 0;
      let size = 0;

      try {
        const files = await fs.readdir(dirPath);

        for (const file of files) {
          try {
            const stats = await fs.stat(path.join(dirPath, file));
            if (stats.isFile()) {
              count++;
              size += stats.size;
            }
          } catch {
            // Skip files that can't be stat'd
          }
        }
      } catch {
        // Directory doesn't exist
      }

      return { count, size };
    };

    const audioStats = await getDirectoryStats(
      path.join(this.config.uploadDir, 'audio')
    );
    const documentStats = await getDirectoryStats(
      path.join(this.config.uploadDir, 'documents')
    );

    return {
      audioFiles: audioStats.count,
      documentFiles: documentStats.count,
      totalFiles: audioStats.count + documentStats.count,
      audioSizeBytes: audioStats.size,
      documentSizeBytes: documentStats.size,
      totalSizeBytes: audioStats.size + documentStats.size,
    };
  }
}

/**
 * Singleton storage service instance
 */
export const storageService = new StorageService();

/**
 * Azure Blob Storage configuration (for production)
 *
 * Uncomment and configure when deploying to production with Azure Blob Storage.
 */
/*
import { BlobServiceClient } from '@azure/storage-blob';

export class AzureStorageService extends StorageService {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;

  constructor() {
    super();
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING not configured');
    }

    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerName = process.env.AZURE_STORAGE_CONTAINER || 'fire-dept-uploads';
  }

  async uploadAudio(file: File, incidentId?: string): Promise<FileUploadResult> {
    // Validate file
    const validation = validateFile(file, 'audio');
    if (!validation.valid) {
      throw Errors.invalidFile(validation.error!, validation.details);
    }

    // Generate secure filename
    const fileName = this.generateSecureFilename(file.name);
    const blobName = `audio/${incidentId || 'unassigned'}/${fileName}`;

    // Upload to Azure Blob Storage
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    await containerClient.createIfNotExists();

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const buffer = Buffer.from(await file.arrayBuffer());

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: file.type,
      },
    });

    // Get URL
    const url = blockBlobClient.url;

    return {
      fileName,
      originalName: file.name,
      url,
      size: file.size,
      mimeType: file.type,
      uploadedAt: new Date(),
    };
  }

  async deleteFile(fileName: string, type: 'audio' | 'document'): Promise<void> {
    const blobName = `${type}/${fileName}`;
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.deleteIfExists();
  }
}
*/
