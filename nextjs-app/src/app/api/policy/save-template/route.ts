/**
 * POST /api/policy/save-template
 * Fire Department Radio Transcription System
 *
 * Save AI-generated template to database with source policy document links.
 * Creates Template and TemplateGeneration records.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { templateService } from '@/lib/services/templateService';
import { handleServiceError } from '@/lib/services/utils/errorHandlers';
import type { ComplianceCategory } from '@/lib/types';
import { z } from 'zod';

/**
 * Request schema validation
 */
const SaveTemplateSchema = z.object({
  template: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    categories: z.array(z.any()), // Complex structure, validated by templateService
  }),
  sourcePolicyIds: z.array(z.string().cuid()),
  generationMetadata: z
    .object({
      confidence: z.number().min(0).max(1),
      aiModel: z.string().default('gpt-4.1'),  // ⚠️ DO NOT change this default model
      processingLog: z.array(z.string()).optional(),
      suggestions: z.array(z.any()).optional(),
    })
    .optional(),
});

/**
 * POST /api/policy/save-template
 *
 * Save generated template to database.
 *
 * Request: {
 *   template: {
 *     name: string,
 *     description?: string,
 *     categories: ComplianceCategory[]
 *   },
 *   sourcePolicyIds: string[],
 *   generationMetadata?: {
 *     confidence: number,
 *     aiModel: string,
 *     processingLog?: string[],
 *     suggestions?: TemplateSuggestion[]
 *   }
 * }
 *
 * Response: {
 *   templateId: string,
 *   generationId: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = SaveTemplateSchema.parse(body);

    // Validate template structure
    const validation = templateService.validateTemplateStructure(
      validated.template.categories as ComplianceCategory[]
    );

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'INVALID_TEMPLATE',
          message: 'Template validation failed',
          details: { errors: validation.errors },
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Verify source policy documents exist
    const policyDocs = await prisma.policyDocument.findMany({
      where: {
        id: {
          in: validated.sourcePolicyIds,
        },
      },
    });

    if (policyDocs.length !== validated.sourcePolicyIds.length) {
      return NextResponse.json(
        {
          error: 'INVALID_POLICY_DOCS',
          message: 'One or more source policy documents not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Create template and generation record in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create template
      const template = await tx.template.create({
        data: {
          name: validated.template.name,
          description: validated.template.description,
          version: '1.0',
          categories: validated.template.categories as any,
          isActive: true,
          source: 'AI-Generated from Policy Documents',
          isAIGenerated: true,
          aiConfidence: validated.generationMetadata?.confidence || 0.9,
        },
      });

      // Create generation metadata
      const generation = await tx.templateGeneration.create({
        data: {
          templateId: template.id,
          generationLog: {
            processingLog: validated.generationMetadata?.processingLog || [],
            timestamp: new Date().toISOString(),
          },
          confidence: validated.generationMetadata?.confidence || 0.9,
          suggestions: validated.generationMetadata?.suggestions || [],
          aiModel: validated.generationMetadata?.aiModel || 'gpt-4.1',  // ⚠️ DO NOT change this default model
        },
      });

      // Link to source policy documents
      for (const policyId of validated.sourcePolicyIds) {
        await tx.templateGeneration_PolicyDocument.create({
          data: {
            generationId: generation.id,
            documentId: policyId,
          },
        });
      }

      return { template, generation };
    });

    return NextResponse.json(
      {
        templateId: result.template.id,
        generationId: result.generation.id,
      },
      { status: 201 }
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
