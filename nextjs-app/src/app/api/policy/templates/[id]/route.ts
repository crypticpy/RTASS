/**
 * Template CRUD Operations
 * Fire Department Radio Transcription System
 *
 * GET /api/policy/templates/[id] - Get template details
 * PUT /api/policy/templates/[id] - Update template
 * DELETE /api/policy/templates/[id] - Delete or archive template
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleServiceError, Errors } from '@/lib/services/utils/errorHandlers';
import { z } from 'zod';

/**
 * Template update schema
 */
const TemplateUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  isActive: z.boolean().optional(),
  source: z.string().optional(),
  categories: z.any().optional(), // JSON validation happens at service layer
});

/**
 * GET /api/policy/templates/[id]
 *
 * Retrieve a single template by ID with full details.
 *
 * Response: Template with sourceDocuments, generation metadata, and usage statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        sourceDocuments: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            fileType: true,
            fileSize: true,
            fileUrl: true,
            uploadedAt: true,
          },
        },
        generation: {
          select: {
            id: true,
            confidence: true,
            aiModel: true,
            generatedAt: true,
            generationLog: true,
            suggestions: true,
          },
        },
        _count: {
          select: {
            audits: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Template with ID '${id}' not found`,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Format response
    const response = {
      id: template.id,
      name: template.name,
      description: template.description,
      version: template.version,
      isActive: template.isActive,
      isAIGenerated: template.isAIGenerated,
      aiConfidence: template.aiConfidence,
      source: template.source,
      categories: template.categories,
      sourceDocuments: template.sourceDocuments,
      generation: template.generation,
      usageCount: template._count.audits,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const apiError = handleServiceError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}

/**
 * PUT /api/policy/templates/[id]
 *
 * Update an existing template.
 *
 * Request Body: {
 *   name?: string,
 *   description?: string,
 *   version?: string,
 *   isActive?: boolean,
 *   source?: string,
 *   categories?: any
 * }
 *
 * Response: Updated template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if template exists
    const existingTemplate = await prisma.template.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Template with ID '${id}' not found`,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = TemplateUpdateSchema.parse(body);

    // Validate category weights if categories are being updated
    if (validated.categories) {
      const categories = validated.categories;
      if (Array.isArray(categories)) {
        const totalWeight = categories.reduce(
          (sum: number, cat: any) => sum + (cat.weight || 0),
          0
        );

        // Allow small floating point differences
        if (Math.abs(totalWeight - 1.0) > 0.001) {
          return NextResponse.json(
            {
              error: 'VALIDATION_ERROR',
              message: `Category weights must sum to 1.0 (current sum: ${totalWeight})`,
              statusCode: 400,
            },
            { status: 400 }
          );
        }
      }
    }

    // Update template
    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: validated,
      include: {
        sourceDocuments: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            fileType: true,
          },
        },
        generation: {
          select: {
            id: true,
            confidence: true,
            aiModel: true,
            generatedAt: true,
          },
        },
        _count: {
          select: {
            audits: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        version: updatedTemplate.version,
        isActive: updatedTemplate.isActive,
        isAIGenerated: updatedTemplate.isAIGenerated,
        aiConfidence: updatedTemplate.aiConfidence,
        source: updatedTemplate.source,
        categories: updatedTemplate.categories,
        sourceDocuments: updatedTemplate.sourceDocuments,
        generation: updatedTemplate.generation,
        usageCount: updatedTemplate._count.audits,
        createdAt: updatedTemplate.createdAt,
        updatedAt: updatedTemplate.updatedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: { issues: error.issues },
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const apiError = handleServiceError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}

/**
 * DELETE /api/policy/templates/[id]
 *
 * Delete or archive a template.
 * - If template is in use (has audits), it will be archived (isActive = false) instead
 * - If template is not in use, it will be permanently deleted
 *
 * Response: {
 *   deleted: boolean,
 *   archived: boolean,
 *   message: string
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if template exists and count audits
    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            audits: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Template with ID '${id}' not found`,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // If template is in use, archive it instead of deleting
    if (template._count.audits > 0) {
      await prisma.template.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json(
        {
          deleted: false,
          archived: true,
          message: `Template '${template.name}' has been archived because it is used in ${template._count.audits} audit(s). It cannot be permanently deleted.`,
          usageCount: template._count.audits,
        },
        { status: 200 }
      );
    }

    // Template is not in use, safe to delete
    await prisma.template.delete({
      where: { id },
    });

    return NextResponse.json(
      {
        deleted: true,
        archived: false,
        message: `Template '${template.name}' has been permanently deleted.`,
      },
      { status: 200 }
    );
  } catch (error) {
    const apiError = handleServiceError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}
