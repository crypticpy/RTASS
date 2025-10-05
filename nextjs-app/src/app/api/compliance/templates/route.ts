/**
 * Compliance Templates API Route
 * GET/POST /api/compliance/templates
 *
 * Manages compliance templates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { templateService } from '@/lib/services/templateService';
import { handleServiceError } from '@/lib/services/utils/errorHandlers';
import { TemplateCreateSchema } from '@/lib/types';

/**
 * GET /api/compliance/templates
 *
 * Retrieve compliance templates with optional filtering.
 *
 * Query Parameters:
 * - active: boolean (optional) - Filter by active status
 * - source: string (optional) - Filter by source (e.g., "NFPA 1561")
 * - aiGenerated: boolean (optional) - Filter by AI generation status
 *
 * Response (200 OK):
 * ```json
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "template-id",
 *       "name": "NFPA 1561 Radio Communications Compliance",
 *       "version": "1.0",
 *       "categories": [...],
 *       "isActive": true,
 *       "source": "NFPA 1561"
 *     }
 *   ]
 * }
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: any = {};

    const active = searchParams.get('active');
    if (active !== null) {
      filters.isActive = active === 'true';
    }

    const source = searchParams.get('source');
    if (source) {
      filters.source = source;
    }

    const aiGenerated = searchParams.get('aiGenerated');
    if (aiGenerated !== null) {
      filters.isAIGenerated = aiGenerated === 'true';
    }

    const templates = await templateService.getTemplates(filters);

    return NextResponse.json({
      success: true,
      data: templates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const apiError = handleServiceError(error);
    return NextResponse.json(
      {
        success: false,
        error: apiError,
      },
      { status: apiError.statusCode }
    );
  }
}

/**
 * POST /api/compliance/templates
 *
 * Create a new compliance template.
 *
 * Request Body:
 * ```json
 * {
 *   "name": "Custom SOP Template",
 *   "description": "Department-specific compliance template",
 *   "categories": [
 *     {
 *       "name": "Radio Discipline",
 *       "description": "...",
 *       "weight": 0.25,
 *       "criteria": [...]
 *     }
 *   ],
 *   "source": "Department SOP"
 * }
 * ```
 *
 * Response (200 OK):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "id": "template-id",
 *     ...
 *   }
 * }
 * ```
 *
 * Error Responses:
 * - 400: Invalid template structure or validation failed
 * - 500: Database error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod schema (basic validation)
    const validated = TemplateCreateSchema.parse(body);

    // Create template (service will perform detailed validation)
    const template = await templateService.createTemplate({
      name: validated.name,
      description: validated.description,
      categories: validated.categories as any,
      source: validated.source,
    });

    return NextResponse.json({
      success: true,
      data: template,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const apiError = handleServiceError(error);
    return NextResponse.json(
      {
        success: false,
        error: apiError,
      },
      { status: apiError.statusCode }
    );
  }
}
