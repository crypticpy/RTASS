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
import { validateTokenLimit } from '@/lib/openai/utils';
import type { TemplateGenerationOptions } from '@/lib/types';
import { z } from 'zod';

/**
 * Request schema validation
 */
const GenerateTemplateSchema = z.object({
  // Backward compatible: allow single ID
  policyDocumentId: z.string().min(1).optional(),
  // New: allow multiple documents in one job
  policyDocumentIds: z.array(z.string().min(1)).min(1).optional(),
  jobId: z.string().optional(),
  options: z
    .object({
      templateName: z.string().optional(),
      documentType: z.string().optional(),
      autoDetectSections: z.boolean().optional(),
      extractCriteria: z.boolean().optional(),
      generateRubrics: z.boolean().optional(),
      includeReferences: z.boolean().optional(),
      additionalInstructions: z.string().optional(),
      // Soft caps per user guidance
      maxCategories: z.number().int().min(1).max(50).default(15),
      maxCriteriaPerCategory: z.number().int().min(1).max(50).default(10),
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

    // Resolve document IDs (single or multiple)
    const ids: string[] = validated.policyDocumentIds
      ? validated.policyDocumentIds
      : validated.policyDocumentId
      ? [validated.policyDocumentId]
      : [];

    if (ids.length === 0) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'At least one policyDocumentId is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Fetch policy documents from database
    const policyDocuments = await prisma.policyDocument.findMany({
      where: { id: { in: ids } },
      orderBy: { uploadedAt: 'asc' },
    });

    if (policyDocuments.length !== ids.length) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'One or more policy documents not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Reconstruct extracted content from stored data
    const combinedText = policyDocuments
      .map(
        (doc, idx) =>
          `\n\n==== POLICY DOCUMENT ${idx + 1}: ${doc.originalName} (${doc.fileType}) ====\n` +
          (doc.content || '')
      )
      .join('\n');

    // Validate combined content won't exceed GPT-4.1 context limit (120k tokens)
    // This prevents API failures and provides clear error messages to users
    validateTokenLimit(combinedText, 120000, 'policyDocuments');

    const extractedContent = {
      text: combinedText,
      sections: [],
      metadata: {
        sourceDocuments: policyDocuments.map((d) => ({
          id: d.id,
          originalName: d.originalName,
          fileType: d.fileType,
          uploadedAt: d.uploadedAt,
        })),
      } as any,
    };

    // Generate template from content
    const generatedTemplate = await templateGenerationService.generateFromContent(
      extractedContent,
      validated.options || {}
    );

    // Attach a simple job/session id in response for tracking
    const jobId =
      validated.jobId || `TPL-${Math.random().toString(36).slice(2, 6)}-${Date.now().toString().slice(-4)}`;

    // Return generated template for review
    return NextResponse.json({ jobId, ...generatedTemplate }, { status: 200 });
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
