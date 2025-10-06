/**
 * Template Generation Zod Schemas
 * Fire Department Radio Transcription System
 *
 * Type-safe schemas for OpenAI Responses API with structured outputs.
 * These schemas define the expected response formats for AI-powered
 * template generation from policy documents.
 *
 * @module lib/openai/schemas/template-generation
 */

import { z } from 'zod';

// ============================================================================
// CORE TEMPLATE SCHEMAS
// ============================================================================

/**
 * Individual compliance criterion within a template category
 *
 * Represents a specific, measurable requirement that can be scored
 * from radio communications transcripts.
 */
export const TemplateCriterionSchema = z.object({
  /** Unique identifier (kebab-case) */
  id: z.string().min(1),

  /** Human-readable description of what will be scored */
  description: z.string().min(1),

  /** Detailed guidance on how to determine PASS/FAIL */
  scoringGuidance: z.string().min(1),

  /** Page number in source policy document */
  sourcePageNumber: z.number().int().positive().optional(),

  /** Exact quote from policy document */
  sourceText: z.string().optional(),

  /** Example of compliant behavior */
  examplePass: z.string().optional(),

  /** Example of non-compliant behavior */
  exampleFail: z.string().optional(),
});

/**
 * Template category with weighted criteria
 *
 * Groups related compliance criteria under a common theme
 * (e.g., "Communication Protocols", "Safety Procedures").
 */
export const TemplateCategorySchema = z.object({
  /** Unique identifier (kebab-case) */
  id: z.string().min(1),

  /** Category name */
  name: z.string().min(1),

  /** Brief description of this category */
  description: z.string().optional(),

  /** Relative weight in overall score (0-1) */
  weight: z.number().min(0).max(1),

  /** Array of compliance criteria */
  criteria: z.array(TemplateCriterionSchema).min(1),

  /** AI prompt to guide transcript analysis for this category */
  analysisPrompt: z.string().min(1),
});

/**
 * Complete generated audit template
 *
 * Result of AI analysis of policy documents with extracted
 * compliance categories, criteria, and metadata.
 */
export const GeneratedTemplateSchema = z.object({
  /** Array of compliance categories */
  categories: z.array(TemplateCategorySchema).min(1),

  /** AI confidence in the analysis (0-1) */
  confidence: z.number().min(0).max(1),

  /** Additional notes or clarifications */
  notes: z.array(z.string()),
}).refine(
  (data) => {
    // Validate that category weights sum to approximately 1.0 (tolerance for floating point)
    const totalWeight = data.categories.reduce((sum, cat) => sum + cat.weight, 0);
    return Math.abs(totalWeight - 1.0) <= 0.01;
  },
  {
    message: 'Category weights must sum to 1.0',
  }
);

// ============================================================================
// DOCUMENT ANALYSIS SCHEMAS
// ============================================================================

/**
 * Scoring method types for compliance criteria
 */
export const ScoringMethodSchema = z.enum([
  'PASS_FAIL',           // Binary pass/fail scoring
  'NUMERIC',             // Numeric score (0-100)
  'CRITICAL_PASS_FAIL',  // Critical safety criterion
]);

/**
 * Compliance criterion from document analysis
 *
 * Intermediate format during AI analysis, converted to TemplateCriterion.
 */
export const AnalysisCriterionSchema = z.object({
  /** Unique identifier */
  id: z.string().min(1),

  /** Criterion description */
  description: z.string().min(1),

  /** What evidence to look for in transcripts */
  evidenceRequired: z.string().min(1),

  /** Scoring method */
  scoringMethod: ScoringMethodSchema,

  /** Relative weight within category (0-1) */
  weight: z.number().min(0).max(1),

  /** Source reference (section, page number) */
  sourceReference: z.string().optional(),
});

/**
 * Compliance category from document analysis
 *
 * Intermediate format during AI analysis, converted to TemplateCategory.
 */
export const AnalysisCategorySchema = z.object({
  /** Category name */
  name: z.string().min(1),

  /** Category description */
  description: z.string().min(1),

  /** Relative weight in overall score (0-1) */
  weight: z.number().min(0).max(1),

  /** Regulatory references (NFPA, OSHA, etc.) */
  regulatoryReferences: z.array(z.string()),

  /** Array of criteria */
  criteria: z.array(AnalysisCriterionSchema).min(1),
});

/**
 * Document analysis result from GPT-4.1
 *
 * Complete analysis of policy documents including categories,
 * criteria, emergency procedures, and regulatory mappings.
 */
export const DocumentAnalysisSchema = z.object({
  /** Identified compliance categories */
  categories: z.array(AnalysisCategorySchema).min(1),

  /** Emergency procedures mentioned in document */
  emergencyProcedures: z.array(z.string()),

  /** Regulatory frameworks referenced (NFPA 1561, OSHA, etc.) */
  regulatoryFramework: z.array(z.string()),

  /** Document completeness assessment (0-1) */
  completeness: z.number().min(0).max(1),

  /** AI confidence in the analysis (0-1) */
  confidence: z.number().min(0).max(1),
});

// ============================================================================
// MULTI-TURN GENERATION SCHEMAS
// ============================================================================

/**
 * Category discovery response (multi-turn step 1)
 *
 * AI identifies primary compliance categories from policy documents.
 */
export const CategoryDiscoverySchema = z.object({
  /** Discovered categories (soft cap: 15) */
  categories: z.array(
    z.object({
      /** Category name */
      name: z.string().min(1),

      /** Brief description */
      description: z.string().min(1),

      /** Initial weight suggestion (0-1) */
      weight: z.number().min(0).max(1).optional(),

      /** Regulatory references */
      regulatoryReferences: z.array(z.string()).optional(),
    })
  ).min(1).max(20), // Hard cap at 20 to prevent runaway generation
});

/**
 * Criteria generation response (multi-turn step 2)
 *
 * AI generates specific criteria for a given category.
 */
export const CriteriaGenerationSchema = z.object({
  /** Category name (for validation) */
  category: z.string().optional(),

  /** Generated criteria (soft cap: 10) */
  criteria: z.array(
    z.object({
      /** Criterion description */
      description: z.string().min(1),

      /** Evidence required for scoring */
      evidenceRequired: z.string().min(1),

      /** Scoring method */
      scoringMethod: ScoringMethodSchema,

      /** Relative weight within category */
      weight: z.number().min(0).max(1),

      /** Source reference (optional) */
      sourceReference: z.string().optional(),
    })
  ).min(1).max(15), // Hard cap at 15
});

/**
 * Criteria enhancement response (optional enrichment step)
 *
 * AI provides detailed scoring guidance and examples for criteria.
 */
export const CriteriaEnhancementSchema = z.object({
  /** Detailed scoring guidance */
  scoringGuidance: z.string().min(1),

  /** Examples of compliant behavior */
  complianceExamples: z.array(z.string()),

  /** Examples of non-compliant behavior */
  nonComplianceExamples: z.array(z.string()),

  /** Improvement recommendations */
  improvementRecommendations: z.array(z.string()),

  /** Source references */
  sourceReferences: z.array(z.string()),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * TypeScript types derived from Zod schemas
 *
 * These provide compile-time type safety while maintaining a single
 * source of truth for validation logic.
 */
export type TemplateCriterion = z.infer<typeof TemplateCriterionSchema>;
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;
export type GeneratedTemplate = z.infer<typeof GeneratedTemplateSchema>;
export type ScoringMethod = z.infer<typeof ScoringMethodSchema>;
export type AnalysisCriterion = z.infer<typeof AnalysisCriterionSchema>;
export type AnalysisCategory = z.infer<typeof AnalysisCategorySchema>;
export type DocumentAnalysis = z.infer<typeof DocumentAnalysisSchema>;
export type CategoryDiscovery = z.infer<typeof CategoryDiscoverySchema>;
export type CriteriaGeneration = z.infer<typeof CriteriaGenerationSchema>;
export type CriteriaEnhancement = z.infer<typeof CriteriaEnhancementSchema>;

// ============================================================================
// SCHEMA METADATA
// ============================================================================

/**
 * Schema version for compatibility tracking
 */
export const SCHEMA_VERSION = '1.0.0';

/**
 * Schema registry for dynamic schema selection
 */
export const TEMPLATE_SCHEMAS = {
  generatedTemplate: GeneratedTemplateSchema,
  documentAnalysis: DocumentAnalysisSchema,
  categoryDiscovery: CategoryDiscoverySchema,
  criteriaGeneration: CriteriaGenerationSchema,
  criteriaEnhancement: CriteriaEnhancementSchema,
} as const;

// ============================================================================
// OPENAI JSON SCHEMA REPRESENTATIONS
// ============================================================================

/**
 * JSON Schema for DocumentAnalysis (for OpenAI responses.create() API)
 *
 * This is a JSON Schema representation of DocumentAnalysisSchema for use
 * with OpenAI's responses.create() text.format.json_schema parameter.
 */
export const DOCUMENT_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    categories: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'description', 'weight', 'regulatoryReferences', 'criteria'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          weight: { type: 'number' },
          regulatoryReferences: {
            type: 'array',
            items: { type: 'string' },
          },
          criteria: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'id',
                'description',
                'evidenceRequired',
                'scoringMethod',
                'weight',
              ],
              properties: {
                id: { type: 'string' },
                description: { type: 'string' },
                evidenceRequired: { type: 'string' },
                scoringMethod: {
                  type: 'string',
                  enum: ['PASS_FAIL', 'NUMERIC', 'CRITICAL_PASS_FAIL'],
                },
                weight: { type: 'number' },
                sourceReference: { type: 'string' },
              },
            },
          },
        },
      },
    },
    emergencyProcedures: {
      type: 'array',
      items: { type: 'string' },
    },
    regulatoryFramework: {
      type: 'array',
      items: { type: 'string' },
    },
    completeness: { type: 'number' },
    confidence: { type: 'number' },
  },
  required: [
    'categories',
    'emergencyProcedures',
    'regulatoryFramework',
    'completeness',
    'confidence',
  ],
  additionalProperties: false,
} as const;

/**
 * JSON Schema for CategoryDiscovery (for OpenAI responses.create() API)
 */
export const CATEGORY_DISCOVERY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    categories: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'description'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          weight: { type: 'number' },
          regulatoryReferences: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    },
  },
  required: ['categories'],
  additionalProperties: false,
} as const;

/**
 * JSON Schema for CriteriaGeneration (for OpenAI responses.create() API)
 */
export const CRITERIA_GENERATION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string' },
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'description',
          'evidenceRequired',
          'scoringMethod',
          'weight',
        ],
        properties: {
          description: { type: 'string' },
          evidenceRequired: { type: 'string' },
          scoringMethod: {
            type: 'string',
            enum: ['PASS_FAIL', 'NUMERIC', 'CRITICAL_PASS_FAIL'],
          },
          weight: { type: 'number' },
          sourceReference: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
  required: ['criteria'],
  additionalProperties: false,
} as const;
