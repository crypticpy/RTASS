/**
 * POST /api/policy/extract
 * Fire Department Radio Transcription System
 *
 * Upload and extract content from policy documents (PDF, DOCX, XLSX, PPTX).
 * Saves extracted content to PolicyDocument table and returns preview.
 */

import { NextRequest, NextResponse } from 'next/server';
import { policyExtractionService } from '@/lib/services/policyExtraction';
import { prisma } from '@/lib/db';
import { handleServiceError } from '@/lib/services/utils/errorHandlers';
import {
  verifyFileType,
  sanitizeFilename,
  ALLOWED_MIME_TYPES,
  isAllowedMimeType,
} from '@/lib/utils/fileValidation';
import type { ExtractedContent } from '@/lib/types';

/**
 * POST /api/policy/extract
 *
 * Upload policy document and extract content.
 *
 * Request: multipart/form-data
 *  - file: File (PDF, DOCX, XLSX, PPTX, TXT, MD)
 *
 * Response: {
 *   id: string,
 *   fileName: string,
 *   fileType: string,
 *   extractedText: string (preview),
 *   metadata: DocumentMetadata,
 *   sections: DocumentSection[] (top-level only)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          error: 'MISSING_FILE',
          message: 'No file provided',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'FILE_TOO_LARGE',
          message: `File size exceeds maximum of 50MB`,
          details: { maxSize, actualSize: file.size },
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Security Layer 1: Validate MIME type against allowlist
    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json(
        {
          error: 'INVALID_FILE_TYPE',
          message: 'File type not supported',
          details: {
            receivedType: file.type,
            allowedTypes: ALLOWED_MIME_TYPES,
          },
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Security Layer 2: Verify file content matches MIME type (magic number check)
    if (!verifyFileType(buffer, file.type)) {
      return NextResponse.json(
        {
          error: 'FILE_CONTENT_MISMATCH',
          message: 'File content does not match the claimed file type',
          details: {
            claimedType: file.type,
            suggestion: 'Ensure you are uploading the correct file format',
          },
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Security Layer 3: Sanitize filename to prevent path traversal attacks
    const sanitizedFileName = sanitizeFilename(file.name);

    // Extract content
    const extracted: ExtractedContent = await policyExtractionService.extractContent(
      buffer,
      file.type,
      file.name
    );

    // Generate unique filename using sanitized name
    const timestamp = Date.now();
    const fileName = `policy-${timestamp}-${sanitizedFileName}`;

    // Save to database
    const policyDocument = await prisma.policyDocument.create({
      data: {
        fileName,
        originalName: file.name,
        fileType: extracted.metadata.format,
        fileSize: file.size,
        fileUrl: `#`, // TODO: Upload to storage service (Azure Blob, S3, etc.)
        content: extracted.text,
        metadata: extracted.metadata as any,
        uploadedBy: null, // TODO: Get from auth session
      },
    });

    // Return response with preview
    const previewLength = 500;
    const textPreview =
      extracted.text.length > previewLength
        ? extracted.text.substring(0, previewLength) + '...'
        : extracted.text;

    // Return only top-level sections for preview
    const topLevelSections = extracted.sections.filter((s) => s.level <= 2);

    return NextResponse.json(
      {
        id: policyDocument.id,
        fileName: policyDocument.fileName,
        originalName: policyDocument.originalName,
        fileType: policyDocument.fileType,
        fileSize: policyDocument.fileSize,
        extractedText: textPreview,
        metadata: extracted.metadata,
        sections: topLevelSections.map((s) => ({
          id: s.id,
          title: s.title,
          level: s.level,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    const apiError = handleServiceError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}
