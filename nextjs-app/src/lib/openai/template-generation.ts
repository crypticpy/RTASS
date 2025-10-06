/**
 * Template Generation Integration
 *
 * ⚠️ CRITICAL: This module MUST use the following:
 * - Model: gpt-4.1 (DO NOT change to gpt-4o, gpt-4-turbo, or any other model)
 * - API: client.responses.create() Responses API (DO NOT use chat.completions.create())
 *
 * These are project requirements. Do not substitute or change these values.
 * Any changes will cause production failures.
 *
 * Uses GPT-4.1 Responses API with structured outputs to analyze policy
 * documents and generate audit templates with typed, validated responses.
 *
 * @module lib/openai/template-generation
 */

import { zodResponseFormat } from 'openai/helpers/zod';
import { openai } from './client';
import { AnalysisError } from './errors';
import { retryWithBackoff, estimateTokens, logAPICall } from './utils';
import {
  GeneratedTemplateSchema,
  TemplateCategorySchema,
  TemplateCriterionSchema,
  type GeneratedTemplate,
  type TemplateCategory,
  type TemplateCriterion,
} from './schemas/template-generation';

/**
 * Options for template generation
 */
export interface TemplateGenerationOptions {
  /** Custom template name */
  templateName?: string;

  /** Specific areas to focus on during analysis */
  focusAreas?: string[];

  /** OpenAI model to use (defaults to gpt-4.1) */
  model?: string;
}

/**
 * Re-export schema types for convenience
 */
export type { GeneratedTemplate, TemplateCategory, TemplateCriterion };

/**
 * Default GPT model for template generation
 *
 * ⚠️ WARNING: DO NOT CHANGE THIS VALUE
 * This project requires gpt-4.1 specifically. Do not substitute with any other model.
 *
 * Changing this will cause production failures.
 */
const DEFAULT_MODEL = 'gpt-4.1';

/**
 * System prompt for template generation
 *
 * Provides AI with expert persona and clear instructions for
 * extracting compliance criteria from policy documents.
 */
const TEMPLATE_GENERATION_SYSTEM_PROMPT = `You are a fire service compliance expert analyzing department policies.

Your task is to extract compliance criteria that can be objectively scored from radio communications transcripts.

IMPORTANT GUIDELINES:
- Only extract criteria that can be scored from radio communications
- Avoid subjective criteria that require in-person observation
- Include specific policy references with page numbers when available
- Provide clear PASS/FAIL definitions for each criterion
- Ensure category weights sum to exactly 1.0
- Generate unique IDs for all categories and criteria (use kebab-case)
- Include analysis prompts that will guide AI evaluation of transcripts

QUALITY STANDARDS:
- Each category should have 3-8 criteria
- Criteria must be specific, measurable, and actionable
- Examples should be realistic for fire service operations
- Source references must be accurate and verifiable`;

/**
 * Create user prompt for template generation
 *
 * Constructs the user message with policy content and generation instructions.
 *
 * @param policyTexts Array of policy document texts
 * @param options Template generation options
 * @returns Formatted user prompt
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

REQUIREMENTS:
- Create 3-8 major compliance categories
- Each category should have 3-8 specific, measurable criteria
- Category weights must sum to exactly 1.0
- Criterion weights within each category should be distributed appropriately
- Use kebab-case for all IDs (e.g., "comm-protocols", "comm-protocols-crit-1")
- Include source page numbers when available
- Provide clear examples of compliant and non-compliant behavior
- Create detailed analysis prompts for each category

OUTPUT: You must return a valid JSON object matching the GeneratedTemplateSchema structure.`;

  return prompt;
}

/**
 * Generate audit template from policy documents
 *
 * Analyzes policy documents using GPT-4.1 with structured outputs and generates
 * a validated audit template with categories, criteria, and scoring guidance.
 *
 * This function uses the OpenAI Responses API with Zod schema validation for
 * type-safe, guaranteed-valid JSON responses.
 *
 * @param policyTexts Array of policy document texts
 * @param options Template generation options
 * @returns Generated template with categories and criteria
 * @throws AnalysisError if generation fails or AI refuses
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

    // Create prompts
    const systemPrompt = TEMPLATE_GENERATION_SYSTEM_PROMPT;
    const userPrompt = createTemplateGenerationPrompt(policyTexts, options);
    const model = options.model || DEFAULT_MODEL;

    // Estimate tokens for logging
    const inputTokens = estimateTokens(systemPrompt + userPrompt);

    // ⚠️ CRITICAL: Must use responses.create() API, NOT chat.completions.create()
    // Call GPT-4.1 with structured outputs using retry logic
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model,  // ⚠️ DO NOT change this model
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.3, // Low temperature for consistency
        response_format: zodResponseFormat(
          GeneratedTemplateSchema,
          'template_generation'
        ),
      });
    });

    // Check for refusal (AI declined to respond)
    const message = completion.choices[0]?.message;
    if (!message) {
      throw new AnalysisError('No response from GPT-4.1');
    }

    if (message.refusal) {
      throw new AnalysisError(
        `AI refused to generate template: ${message.refusal}`,
        'template-generation'
      );
    }

    // Extract and validate content
    const responseText = message.content;
    if (!responseText) {
      throw new AnalysisError(
        'Empty response from GPT-4.1',
        'template-generation'
      );
    }

    // Parse with Zod schema validation
    const parsed = GeneratedTemplateSchema.parse(JSON.parse(responseText));

    // Log API call for monitoring
    const outputTokens = estimateTokens(responseText);
    logAPICall('template-generation', model, inputTokens, outputTokens);

    return parsed;
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      throw new AnalysisError(
        `Invalid template structure from AI: ${error.message}`,
        'template-generation',
        error
      );
    }

    // Handle other errors
    throw new AnalysisError(
      `Failed to generate template: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'template-generation',
      error
    );
  }
}

/**
 * Normalize category weights to sum to 1.0
 *
 * Useful when manually adjusting weights and need to renormalize.
 * Handles edge cases like all weights being zero.
 *
 * @param categories Categories with weights
 * @returns Categories with normalized weights summing to 1.0
 *
 * @example
 * ```typescript
 * const categories = [
 *   { name: 'Cat1', weight: 0.5, ... },
 *   { name: 'Cat2', weight: 0.3, ... },
 * ];
 * const normalized = normalizeWeights(categories);
 * // weights will be adjusted to sum to 1.0
 * ```
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

/**
 * Normalize criterion weights within a category
 *
 * Ensures criterion weights sum to 1.0 within a category.
 *
 * @param criteria Array of criteria to normalize
 * @returns Criteria with normalized weights
 *
 * @example
 * ```typescript
 * const criteria = [
 *   { id: '1', weight: 0.6, ... },
 *   { id: '2', weight: 0.5, ... },
 * ];
 * const normalized = normalizeCriterionWeights(criteria);
 * // weights will sum to 1.0
 * ```
 */
export function normalizeCriterionWeights(
  criteria: TemplateCriterion[]
): TemplateCriterion[] {
  const total = criteria.reduce((sum, crit) => sum + crit.weight, 0);

  if (total === 0) {
    const evenWeight = 1.0 / criteria.length;
    return criteria.map((crit) => ({ ...crit, weight: evenWeight }));
  }

  return criteria.map((crit) => ({
    ...crit,
    weight: crit.weight / total,
  }));
}

/**
 * Validate template structure
 *
 * Performs comprehensive validation beyond Zod schema:
 * - Checks for unique category IDs
 * - Checks for unique criterion IDs
 * - Validates weight sums
 * - Checks for reasonable number of categories/criteria
 *
 * @param template Generated template to validate
 * @returns Validation result with errors array
 *
 * @example
 * ```typescript
 * const result = validateTemplateStructure(template);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateTemplateStructure(template: GeneratedTemplate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check category IDs are unique
  const categoryIds = new Set<string>();
  for (const category of template.categories) {
    if (categoryIds.has(category.id)) {
      errors.push(`Duplicate category ID: ${category.id}`);
    }
    categoryIds.add(category.id);

    // Check criterion IDs are unique within category
    const criterionIds = new Set<string>();
    for (const criterion of category.criteria) {
      if (criterionIds.has(criterion.id)) {
        errors.push(
          `Duplicate criterion ID in category ${category.id}: ${criterion.id}`
        );
      }
      criterionIds.add(criterion.id);
    }

    // Validate criterion weights sum to approximately 1.0
    const criterionWeightSum = category.criteria.reduce(
      (sum, c) => sum + c.weight,
      0
    );
    if (Math.abs(criterionWeightSum - 1.0) > 0.01) {
      errors.push(
        `Criterion weights in category ${category.id} sum to ${criterionWeightSum.toFixed(2)}, expected 1.0`
      );
    }
  }

  // Validate category weights sum to approximately 1.0
  const categoryWeightSum = template.categories.reduce(
    (sum, c) => sum + c.weight,
    0
  );
  if (Math.abs(categoryWeightSum - 1.0) > 0.01) {
    errors.push(
      `Category weights sum to ${categoryWeightSum.toFixed(2)}, expected 1.0`
    );
  }

  // Check reasonable bounds
  if (template.categories.length > 15) {
    errors.push(
      `Too many categories (${template.categories.length}), recommended maximum is 15`
    );
  }

  for (const category of template.categories) {
    if (category.criteria.length > 12) {
      errors.push(
        `Category ${category.id} has too many criteria (${category.criteria.length}), recommended maximum is 12`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
