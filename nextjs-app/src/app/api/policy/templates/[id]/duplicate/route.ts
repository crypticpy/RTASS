/**
 * POST /api/policy/templates/[id]/duplicate
 * Fire Department Radio Transcription System
 *
 * Duplicate an existing template, creating an independent copy.
 * The duplicated template will have:
 * - New unique ID
 * - Name appended with " (Copy)"
 * - Reset usage statistics (usageCount = 0)
 * - Marked as draft (isActive = false)
 * - Same categories and structure as original
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleServiceError } from '@/lib/services/utils/errorHandlers';

/**
 * POST /api/policy/templates/[id]/duplicate
 *
 * Duplicate a template.
 *
 * Response: New duplicated template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the original template
    const originalTemplate = await prisma.template.findUnique({
      where: { id },
      include: {
        sourceDocuments: true,
        generation: true,
      },
    });

    if (!originalTemplate) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Template with ID '${id}' not found`,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Create duplicate with modified properties
    const duplicatedTemplate = await prisma.template.create({
      data: {
        name: `${originalTemplate.name} (Copy)`,
        description: originalTemplate.description,
        version: originalTemplate.version,
        isActive: false, // Duplicates start as drafts
        isAIGenerated: originalTemplate.isAIGenerated,
        aiConfidence: originalTemplate.aiConfidence,
        source: originalTemplate.source,
        categories: originalTemplate.categories as any,
        // Note: sourceDocuments are linked via many-to-many, we don't duplicate the relationship
      },
      include: {
        sourceDocuments: true,
        generation: true,
        _count: {
          select: {
            audits: true,
          },
        },
      },
    });

    // Format response
    const response = {
      id: duplicatedTemplate.id,
      name: duplicatedTemplate.name,
      description: duplicatedTemplate.description,
      version: duplicatedTemplate.version,
      isActive: duplicatedTemplate.isActive,
      isAIGenerated: duplicatedTemplate.isAIGenerated,
      aiConfidence: duplicatedTemplate.aiConfidence,
      source: duplicatedTemplate.source,
      categories: duplicatedTemplate.categories,
      sourceDocuments: duplicatedTemplate.sourceDocuments,
      generation: duplicatedTemplate.generation,
      usageCount: duplicatedTemplate._count.audits,
      createdAt: duplicatedTemplate.createdAt,
      updatedAt: duplicatedTemplate.updatedAt,
      originalTemplateId: id,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const apiError = handleServiceError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}
