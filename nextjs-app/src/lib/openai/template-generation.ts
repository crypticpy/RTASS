/**
 * Template Generation Integration
 *
 * Uses GPT-4 to analyze policy documents and generate audit templates
 * with structured categories and criteria.
 */

import { openai } from './client';
import { AnalysisError } from './errors';
import {
  retryWithBackoff,
  parseJSONResponse,
  validateResponseFields,
  estimateTokens,
  logAPICall,
} from './utils';

/**
 * Generated audit template with categories and criteria
 */
export interface GeneratedTemplate {
  categories: TemplateCategory[];
  confidence: number;
  notes: string[];
}

/**
 * Template category with criteria and analysis guidance
 */
export interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  weight: number;
  criteria: TemplateCriterion[];
  analysisPrompt: string;
}

/**
 * Individual criterion within a category
 */
export interface TemplateCriterion {
  id: string;
  description: string;
  scoringGuidance: string;
  sourcePageNumber?: number;
  sourceText?: string;
  examplePass?: string;
  exampleFail?: string;
}

/**
 * Options for template generation
 */
export interface TemplateGenerationOptions {
  templateName?: string;
  focusAreas?: string[];
  model?: string;
}

/**
 * Default GPT-4 model for template generation
 */
const DEFAULT_MODEL = 'gpt-4-turbo-preview';

/**
 * System prompt for template generation
 */
const TEMPLATE_GENERATION_SYSTEM_PROMPT = `You are a fire service compliance expert analyzing department policies.

Your task is to extract compliance criteria that can be objectively scored from radio communications transcripts.

IMPORTANT GUIDELINES:
- Only extract criteria that can be scored from radio communications
- Avoid subjective criteria that require in-person observation
- Include specific policy references with page numbers when available
- Provide clear PASS/FAIL definitions for each criterion
- Ensure category weights sum to exactly 1.0
- Generate unique IDs for all categories and criteria
- Include analysis prompts that will guide AI evaluation of transcripts`;

/**
 * Create user prompt for template generation
 */
function createTemplateGenerationPrompt(
  policyTexts: string[],
  options: TemplateGenerationOptions
): string {
  const policyText = policyTexts.join('\n\n---\n\n');

  let prompt = `POLICY DOCUMENTS:\n${policyText}\n\n`;

  if (options.templateName) {
    prompt += `TEMPLATE NAME: ${options.templateName}\n\n`;
  }

  if (options.focusAreas && options.focusAreas.length > 0) {
    prompt += `FOCUS AREAS: ${options.focusAreas.join(', ')}\n\n`;
  }

  prompt += `TASK: Extract compliance criteria from the above policy documents.

OUTPUT FORMAT (JSON):
{
  "categories": [
    {
      "id": "unique-category-id",
      "name": "Category name (e.g., Communication Protocols)",
      "description": "Brief description of this category",
      "weight": 0.25,
      "criteria": [
        {
          "id": "unique-criterion-id",
          "description": "What will be scored",
          "scoringGuidance": "How to determine PASS/FAIL",
          "sourcePageNumber": 12,
          "sourceText": "Exact quote from policy",
          "examplePass": "Example of compliant behavior",
          "exampleFail": "Example of violation"
        }
      ],
      "analysisPrompt": "Detailed prompt for AI to analyze transcripts for this category"
    }
  ],
  "confidence": 0.94,
  "notes": ["Any ambiguities or clarifications needed"]
}

CONSTRAINTS:
- Category weights must sum to exactly 1.0
- Each category should have 3-8 criteria
- IDs must be unique and kebab-case (e.g., "comm-protocols")
- Source page numbers should reference the policy document
- Examples should be specific and realistic for fire service operations
- Analysis prompts should guide objective evaluation of radio communications`;

  return prompt;
}

/**
 * Generate audit template from policy documents
 *
 * Analyzes policy documents using GPT-4 and generates a structured
 * audit template with categories, criteria, and scoring guidance.
 *
 * @param policyTexts Array of policy document texts
 * @param options Template generation options
 * @returns Generated template with categories and criteria
 * @throws AnalysisError if generation fails
 *
 * @example
 * ```typescript
 * const policies = [policyDoc1, policyDoc2];
 * const template = await generateTemplateFromPolicies(policies, {
 *   templateName: 'NFPA 1561 Communications',
 *   focusAreas: ['Radio Discipline', 'Mayday Procedures']
 * });
 *
 * console.log(`Generated ${template.categories.length} categories`);
 * console.log(`Confidence: ${template.confidence}`);
 * ```
 */
export async function generateTemplateFromPolicies(
  policyTexts: string[],
  options: TemplateGenerationOptions = {}
): Promise<GeneratedTemplate> {
  try {
    // Validate input
    if (!policyTexts || policyTexts.length === 0) {
      throw new AnalysisError('No policy texts provided');
    }

    // Create prompt
    const userPrompt = createTemplateGenerationPrompt(policyTexts, options);
    const model = options.model || DEFAULT_MODEL;

    // Estimate tokens for logging
    const inputTokens = estimateTokens(
      TEMPLATE_GENERATION_SYSTEM_PROMPT + userPrompt
    );

    // Call GPT-4 with retry logic
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: TEMPLATE_GENERATION_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.3, // Low temperature for consistency
        response_format: { type: 'json_object' },
      });
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new AnalysisError('Empty response from GPT-4');
    }

    // Parse JSON response
    const parsed = parseJSONResponse<{
      categories: any[];
      confidence: number;
      notes: string[];
    }>(responseText);

    // Validate required fields
    validateResponseFields(parsed, ['categories', 'confidence']);

    // Validate and transform categories
    const template = validateAndTransformTemplate(parsed);

    // Log API call
    const outputTokens = estimateTokens(responseText);
    logAPICall('template-generation', model, inputTokens, outputTokens);

    return template;
  } catch (error) {
    throw new AnalysisError(
      `Failed to generate template: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'template-generation',
      error
    );
  }
}

/**
 * Validate and transform raw template response
 */
function validateAndTransformTemplate(parsed: any): GeneratedTemplate {
  const { categories, confidence, notes } = parsed;

  // Validate categories
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new AnalysisError('Template must have at least one category');
  }

  // Validate confidence
  if (
    typeof confidence !== 'number' ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw new AnalysisError('Confidence must be a number between 0 and 1');
  }

  // Transform categories
  const transformedCategories: TemplateCategory[] = categories.map((cat, idx) => {
    // Validate required fields
    if (!cat.name || !cat.weight) {
      throw new AnalysisError(
        `Category ${idx} missing required fields (name, weight)`
      );
    }

    // Generate ID if missing
    const id = cat.id || generateCategoryId(cat.name, idx);

    // Validate criteria
    if (!Array.isArray(cat.criteria) || cat.criteria.length === 0) {
      throw new AnalysisError(`Category "${cat.name}" must have at least one criterion`);
    }

    // Transform criteria
    const transformedCriteria: TemplateCriterion[] = cat.criteria.map(
      (crit: any, critIdx: number) => {
        if (!crit.description || !crit.scoringGuidance) {
          throw new AnalysisError(
            `Criterion ${critIdx} in category "${cat.name}" missing required fields`
          );
        }

        return {
          id: crit.id || generateCriterionId(id, critIdx),
          description: crit.description,
          scoringGuidance: crit.scoringGuidance,
          sourcePageNumber: crit.sourcePageNumber,
          sourceText: crit.sourceText,
          examplePass: crit.examplePass,
          exampleFail: crit.exampleFail,
        };
      }
    );

    return {
      id,
      name: cat.name,
      description: cat.description,
      weight: cat.weight,
      criteria: transformedCriteria,
      analysisPrompt: cat.analysisPrompt || generateDefaultAnalysisPrompt(cat.name),
    };
  });

  // Validate weights sum to 1.0 (with small tolerance for floating point)
  const totalWeight = transformedCategories.reduce((sum, cat) => sum + cat.weight, 0);
  if (Math.abs(totalWeight - 1.0) > 0.01) {
    throw new AnalysisError(
      `Category weights must sum to 1.0, got ${totalWeight.toFixed(2)}`
    );
  }

  return {
    categories: transformedCategories,
    confidence,
    notes: notes || [],
  };
}

/**
 * Generate category ID from name
 */
function generateCategoryId(name: string, index: number): string {
  const kebab = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${kebab}-${index}`;
}

/**
 * Generate criterion ID from category ID
 */
function generateCriterionId(categoryId: string, index: number): string {
  return `${categoryId}-crit-${index}`;
}

/**
 * Generate default analysis prompt for a category
 */
function generateDefaultAnalysisPrompt(categoryName: string): string {
  return `Analyze the radio communications transcript for compliance with ${categoryName} criteria. ` +
    `Examine each criterion carefully and provide specific evidence from the transcript.`;
}

/**
 * Normalize category weights to sum to 1.0
 *
 * Useful when manually adjusting weights and need to renormalize.
 *
 * @param categories Categories with weights
 * @returns Categories with normalized weights
 */
export function normalizeWeights(
  categories: TemplateCategory[]
): TemplateCategory[] {
  const total = categories.reduce((sum, cat) => sum + cat.weight, 0);

  if (total === 0) {
    // Distribute evenly if all weights are 0
    const evenWeight = 1.0 / categories.length;
    return categories.map((cat) => ({ ...cat, weight: evenWeight }));
  }

  // Normalize to sum to 1.0
  return categories.map((cat) => ({
    ...cat,
    weight: cat.weight / total,
  }));
}
