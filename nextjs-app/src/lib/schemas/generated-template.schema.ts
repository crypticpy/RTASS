/**
 * Zod Schema for AI-Generated Template
 * Fire Department Radio Transcription System
 *
 * This schema defines the structure for templates generated from policy documents
 * using OpenAI's Structured Outputs feature. It ensures type-safe validation
 * and seamless integration with GPT-4.1's json_schema response format.
 *
 * Key Design Principles:
 * - All fields are required (use .nullable() for optional fields per OpenAI spec)
 * - additionalProperties: false equivalent using .strict()
 * - Proper enum definitions for criterion types
 * - Nested object validation with confidence scores
 * - Compatible with zodTextFormat() helper
 *
 * @see https://platform.openai.com/docs/guides/structured-outputs
 */

import { z } from 'zod';

/**
 * Scoring method types for compliance criteria
 */
export const ScoringMethodSchema = z.enum([
  'PASS_FAIL',
  'NUMERIC',
  'CRITICAL_PASS_FAIL',
]);

/**
 * Compliance criterion schema
 *
 * Represents a single measurable requirement within a category.
 * All fields are required per OpenAI structured outputs spec.
 */
export const ComplianceCriterionSchema = z.object({
  id: z.string().describe('Unique identifier for the criterion (e.g., "comms-crit-1")'),
  description: z
    .string()
    .describe('Clear description of what this criterion evaluates'),
  evidenceRequired: z
    .string()
    .describe('What evidence to look for in radio transcripts'),
  scoringMethod: ScoringMethodSchema.describe(
    'How to score this criterion: PASS_FAIL, NUMERIC, or CRITICAL_PASS_FAIL'
  ),
  weight: z
    .number()
    .min(0)
    .max(1)
    .describe('Relative weight within category (0-1, normalized to sum to 1)'),
  sourceReference: z
    .string()
    .nullable()
    .describe('Reference to source document (e.g., "Section 3.2, Page 12" or null)'),
});

/**
 * Compliance category schema
 *
 * Groups related criteria together with category-level metadata.
 * Weights must sum to 1.0 across all categories.
 */
export const ComplianceCategorySchema = z.object({
  name: z.string().describe('Category name (e.g., "Communication Protocols")'),
  description: z
    .string()
    .describe('What this category evaluates and why it matters'),
  weight: z
    .number()
    .min(0)
    .max(1)
    .describe('Category weight in overall score (0-1, must sum to 1.0 across all categories)'),
  regulatoryReferences: z
    .array(z.string())
    .describe('NFPA standards, OSHA regulations, or department SOPs referenced'),
  criteria: z
    .array(ComplianceCriterionSchema)
    .min(1)
    .describe('Array of compliance criteria for this category (minimum 1)'),
});

/**
 * Document analysis result schema
 *
 * Contains the AI's analysis of the policy document(s).
 */
export const DocumentAnalysisSchema = z.object({
  categories: z
    .array(ComplianceCategorySchema)
    .describe('Identified compliance categories from policy analysis'),
  emergencyProcedures: z
    .array(z.string())
    .describe('Emergency procedures identified (e.g., "mayday", "evacuation")'),
  regulatoryFramework: z
    .array(z.string())
    .describe('Regulatory frameworks referenced (e.g., "NFPA 1561", "OSHA 1910.134")'),
  completeness: z
    .number()
    .min(0)
    .max(1)
    .describe('Document completeness score (0-1)'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('AI confidence in the analysis (0-1)'),
});

/**
 * Template generation metadata schema
 */
export const TemplateGenerationMetadataSchema = z.object({
  generatedAt: z.string().describe('ISO 8601 timestamp of generation'),
  aiModel: z.string().describe('AI model used (e.g., "gpt-4.1")'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Overall confidence score (0-1)'),
  sourceAnalysis: DocumentAnalysisSchema.describe('Original document analysis result'),
  customInstructions: z
    .string()
    .nullable()
    .describe('Custom instructions provided by user (or null)'),
});

/**
 * Template suggestion types
 */
export const TemplateSuggestionTypeSchema = z.enum(['ENHANCEMENT', 'ISSUE', 'REFERENCE']);

/**
 * Suggestion priority levels
 */
export const SuggestionPrioritySchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

/**
 * Template improvement suggestion schema
 */
export const TemplateSuggestionSchema = z.object({
  type: TemplateSuggestionTypeSchema.describe('Type of suggestion'),
  category: z
    .string()
    .nullable()
    .describe('Related category name (or null if general)'),
  description: z.string().describe('Detailed suggestion description'),
  priority: SuggestionPrioritySchema.describe('Suggestion priority level'),
  actionable: z.boolean().describe('Whether this suggestion is actionable'),
});

/**
 * Template structure schema
 *
 * The actual template content without metadata.
 */
export const TemplateStructureSchema = z.object({
  name: z.string().describe('Template name'),
  description: z.string().describe('Template description'),
  version: z.string().describe('Template version (e.g., "1.0")'),
  categories: z
    .array(ComplianceCategorySchema)
    .min(1)
    .describe('Compliance categories (minimum 1)'),
  metadata: TemplateGenerationMetadataSchema.describe('Generation metadata'),
});

/**
 * Complete AI-generated template schema
 *
 * This is the root schema for OpenAI structured outputs.
 * Use with zodTextFormat() for GPT-4.1 responses.create() calls.
 *
 * @example
 * ```typescript
 * import { zodTextFormat } from 'openai/helpers/zod';
 * import { GeneratedTemplateSchema } from '@/lib/schemas/generated-template.schema';
 *
 * const response = await openai.responses.create({
 *   model: 'gpt-4.1',
 *   input: [...],
 *   text: {
 *     format: zodTextFormat(GeneratedTemplateSchema, 'generated_template'),
 *   },
 * });
 *
 * const template = response.output_parsed;
 * ```
 */
export const GeneratedTemplateSchema = z
  .object({
    template: TemplateStructureSchema.describe('The generated template structure'),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .describe('Overall generation confidence (0-1)'),
    sourceDocuments: z
      .array(z.string())
      .min(1)
      .describe('Array of source document IDs (minimum 1)'),
    processingLog: z
      .array(z.string())
      .describe('Processing steps log for debugging'),
    suggestions: z
      .array(TemplateSuggestionSchema)
      .describe('Improvement suggestions from AI'),
  })
  .strict(); // Equivalent to additionalProperties: false

/**
 * Type inference from Zod schema
 *
 * Use these types for TypeScript type safety throughout the application.
 */
export type GeneratedTemplate = z.infer<typeof GeneratedTemplateSchema>;
export type TemplateStructure = z.infer<typeof TemplateStructureSchema>;
export type ComplianceCategory = z.infer<typeof ComplianceCategorySchema>;
export type ComplianceCriterion = z.infer<typeof ComplianceCriterionSchema>;
export type DocumentAnalysis = z.infer<typeof DocumentAnalysisSchema>;
export type TemplateGenerationMetadata = z.infer<typeof TemplateGenerationMetadataSchema>;
export type TemplateSuggestion = z.infer<typeof TemplateSuggestionSchema>;
export type ScoringMethod = z.infer<typeof ScoringMethodSchema>;
export type TemplateSuggestionType = z.infer<typeof TemplateSuggestionTypeSchema>;
export type SuggestionPriority = z.infer<typeof SuggestionPrioritySchema>;

/**
 * Validation helper function
 *
 * @param data - Unknown data to validate
 * @returns Validated GeneratedTemplate or throws ZodError
 */
export function validateGeneratedTemplate(data: unknown): GeneratedTemplate {
  return GeneratedTemplateSchema.parse(data);
}

/**
 * Safe validation helper (returns success/error object)
 *
 * @param data - Unknown data to validate
 * @returns Success with data or error with issues
 */
export function safeValidateGeneratedTemplate(data: unknown) {
  return GeneratedTemplateSchema.safeParse(data);
}
