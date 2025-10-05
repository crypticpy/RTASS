/**
 * POST /api/policy/generate-template
 * Fire Department Radio Transcription System
 *
 * Generate compliance template from policy document using GPT-4o analysis.
 * Returns template JSON for review (not saved to database yet).
 */

import { NextRequest, NextResponse } from 'next/server';
import { templateGenerationService } from '@/lib/services/templateGeneration';
import { policyExtractionService } from '@/lib/services/policyExtraction';
import { prisma } from '@/lib/db';
import { handleServiceError } from '@/lib/services/utils/errorHandlers';
import type { TemplateGenerationOptions } from '@/lib/types';
import { z } from 'zod';

/**
 * Request schema validation
 */
const GenerateTemplateSchema = z.object({
  policyDocumentId: z.string().cuid(),
  options: z
    .object({
      templateName: z.string().optional(),
      documentType: z.string().optional(),
      autoDetectSections: z.boolean().optional(),
      extractCriteria: z.boolean().optional(),
      generateRubrics: z.boolean().optional(),
      includeReferences: z.boolean().optional(),
      additionalInstructions: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/policy/generate-template
 *
 * Generate template from uploaded policy document.
 *
 * Request: {
 *   policyDocumentId: string,
 *   options?: TemplateGenerationOptions
 * }
 *
 * Response: GeneratedTemplate
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = GenerateTemplateSchema.parse(body);

    // Fetch policy document from database
    const policyDocument = await prisma.policyDocument.findUnique({
      where: { id: validated.policyDocumentId },
    });

    if (!policyDocument) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Policy document with ID '${validated.policyDocumentId}' not found`,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Reconstruct extracted content from stored data
    const extractedContent = {
      text: policyDocument.content,
      sections: [], // TODO: Parse from stored metadata if needed
      metadata: policyDocument.metadata as any,
    };

    // Generate template from content
    const generatedTemplate = await templateGenerationService.generateFromContent(
      extractedContent,
      validated.options || {}
    );

    // Return generated template for review
    return NextResponse.json(generatedTemplate, { status: 200 });
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
