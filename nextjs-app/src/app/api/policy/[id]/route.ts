/**
 * GET /api/policy/[id]
 * Fire Department Radio Transcription System
 *
 * Retrieve policy document by ID with related templates and metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleServiceError } from '@/lib/services/utils/errorHandlers';

/**
 * GET /api/policy/[id]
 *
 * Retrieve policy document with related templates.
 *
 * Response: {
 *   id: string,
 *   fileName: string,
 *   originalName: string,
 *   fileType: string,
 *   fileSize: number,
 *   fileUrl: string,
 *   content: string,
 *   metadata: object,
 *   uploadedAt: string,
 *   templates: Template[] (basic info only)
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch policy document with related templates
    const policyDocument = await prisma.policyDocument.findUnique({
      where: { id },
      include: {
        templates: {
          select: {
            id: true,
            name: true,
            description: true,
            version: true,
            isActive: true,
            isAIGenerated: true,
            aiConfidence: true,
            createdAt: true,
          },
        },
        generations: {
          include: {
            generation: {
              include: {
                template: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!policyDocument) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Policy document with ID '${id}' not found`,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Format response
    const response = {
      id: policyDocument.id,
      fileName: policyDocument.fileName,
      originalName: policyDocument.originalName,
      fileType: policyDocument.fileType,
      fileSize: policyDocument.fileSize,
      fileUrl: policyDocument.fileUrl,
      content: policyDocument.content,
      metadata: policyDocument.metadata,
      uploadedAt: policyDocument.uploadedAt.toISOString(),
      uploadedBy: policyDocument.uploadedBy,
      templates: policyDocument.templates,
      relatedGenerations: policyDocument.generations.map((gen) => ({
        generationId: gen.generation.id,
        templateId: gen.generation.template.id,
        templateName: gen.generation.template.name,
        generatedAt: gen.generation.generatedAt.toISOString(),
        confidence: gen.generation.confidence,
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const apiError = handleServiceError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}

/**
 * DELETE /api/policy/[id]
 *
 * Delete policy document (cascade deletes related generations).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if document exists
    const policyDocument = await prisma.policyDocument.findUnique({
      where: { id },
    });

    if (!policyDocument) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Policy document with ID '${id}' not found`,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Delete document (cascade will handle related records)
    await prisma.policyDocument.delete({
      where: { id },
    });

    return NextResponse.json(
      {
        message: 'Policy document deleted successfully',
        id,
      },
      { status: 200 }
    );
  } catch (error) {
    const apiError = handleServiceError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}
