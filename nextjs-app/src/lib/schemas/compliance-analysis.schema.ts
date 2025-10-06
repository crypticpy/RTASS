/**
 * Compliance Analysis Zod Schemas
 *
 * Comprehensive schemas for modular compliance analysis system where AI scores
 * each category individually, then generates a final narrative. Designed for
 * OpenAI Structured Outputs compatibility (strict mode).
 *
 * @module compliance-analysis.schema
 */

import { z } from 'zod';

/**
 * Evidence relevance types for criterion scoring
 */
export const EvidenceRelevanceSchema = z.enum([
  'SUPPORTING',      // Evidence supports compliance
  'CONTRADICTING',   // Evidence shows non-compliance
  'CONTEXTUAL'       // Provides context but doesn't directly prove/disprove
]);

/**
 * Individual evidence item from transcript
 */
export const EvidenceItemSchema = z.object({
  /** Timestamp in transcript (e.g., "00:03:45" or "03:45") */
  timestamp: z.string(),

  /** Actual verbatim transcript excerpt */
  text: z.string(),

  /** How this evidence relates to the criterion */
  relevance: EvidenceRelevanceSchema
}).strict();

/**
 * Score values for individual criteria
 */
export const CriterionScoreValueSchema = z.enum([
  'PASS',            // Fully compliant
  'FAIL',            // Non-compliant
  'PARTIAL',         // Partially compliant
  'NOT_APPLICABLE'   // Criterion doesn't apply to this incident
]);

/**
 * Score for a single compliance criterion within a category
 */
export const CriterionScoreSchema = z.object({
  /** Unique identifier matching the criterion ID from the template */
  criterionId: z.string(),

  /** Categorical score result */
  score: CriterionScoreValueSchema,

  /** Numeric score 0-100, or null if not applicable */
  numericScore: z.number().min(0).max(100).nullable(),

  /** AI's confidence in this assessment (0.0 = no confidence, 1.0 = certain) */
  confidence: z.number().min(0).max(1),

  /** Detailed explanation of why this score was assigned */
  reasoning: z.string(),

  /** Supporting evidence from the transcript */
  evidence: z.array(EvidenceItemSchema),

  /** Specific improvement suggestions for this criterion, or null if none needed */
  recommendation: z.string().nullable()
}).strict();

/**
 * Category status after scoring all criteria
 */
export const CategoryStatusSchema = z.enum([
  'PASS',                // All criteria passed or mostly compliant
  'FAIL',                // Critical failures present
  'NEEDS_IMPROVEMENT'    // Some issues but no critical failures
]);

/**
 * Complete scoring results for a single compliance category
 * (e.g., "Radio Communication Protocols", "Safety Procedures")
 */
export const CategoryScoreSchema = z.object({
  /** Name of the category being scored */
  categoryName: z.string(),

  /** Description of what this category evaluates */
  categoryDescription: z.string(),

  /** Individual scores for each criterion in this category */
  criteriaScores: z.array(CriterionScoreSchema),

  /** Weighted average score across all criteria (0-100) */
  overallCategoryScore: z.number().min(0).max(100),

  /** Overall category compliance status */
  categoryStatus: CategoryStatusSchema,

  /** Brief summary of category performance (2-4 sentences) */
  summary: z.string(),

  /** Critical issues found in this category requiring immediate attention */
  criticalFindings: z.array(z.string()),

  /** ISO 8601 timestamp when this category was analyzed */
  timestamp: z.string()
}).strict();

/**
 * Recommendation priority levels
 */
export const RecommendationPrioritySchema = z.enum([
  'HIGH',    // Immediate attention required (safety/critical)
  'MEDIUM',  // Should be addressed soon
  'LOW'      // Nice to have, general improvement
]);

/**
 * Individual recommendation with action items
 */
export const RecommendationSchema = z.object({
  /** Priority level for this recommendation */
  priority: RecommendationPrioritySchema,

  /** Category this recommendation relates to */
  category: z.string(),

  /** The recommendation itself */
  recommendation: z.string(),

  /** Specific actionable steps to address this recommendation */
  actionItems: z.array(z.string())
}).strict();

/**
 * Overall audit status
 */
export const AuditStatusSchema = z.enum([
  'PASS',                // Fully compliant, no critical issues
  'FAIL',                // Critical failures present, requires immediate action
  'NEEDS_IMPROVEMENT'    // Generally compliant but improvements needed
]);

/**
 * Final narrative generated after all categories are scored
 * Provides executive summary, trends, and actionable recommendations
 */
export const AuditNarrativeSchema = z.object({
  /** 2-3 paragraph executive summary of overall audit findings */
  executiveSummary: z.string(),

  /** Overall compliance score across all categories (0-100) */
  overallScore: z.number().min(0).max(100),

  /** Overall audit status */
  overallStatus: AuditStatusSchema,

  /** Positive compliance behaviors observed during the incident */
  strengths: z.array(z.string()),

  /** Areas for improvement (non-critical) */
  areasForImprovement: z.array(z.string()),

  /** Critical issues requiring immediate attention */
  criticalIssues: z.array(z.string()),

  /** Prioritized recommendations with action items */
  recommendations: z.array(RecommendationSchema),

  /** Noteworthy positive actions that exceeded baseline compliance */
  complianceHighlights: z.array(z.string())
}).strict();

/**
 * Audit metadata for tracking and debugging
 */
export const AuditMetadataSchema = z.object({
  /** Total OpenAI tokens consumed during analysis */
  totalTokensUsed: z.number(),

  /** Total processing time in milliseconds */
  processingTimeMs: z.number(),

  /** OpenAI model version used (e.g., "gpt-4.1-2024-08-06") */
  modelVersion: z.string(),

  /** Number of categories analyzed */
  categoriesAnalyzed: z.number(),

  /** ISO 8601 timestamp when analysis was performed */
  analysisDate: z.string()
}).strict();

/**
 * Complete compliance audit result
 * Includes all category scores, narrative, and metadata
 */
export const ComplianceAuditSchema = z.object({
  /** Unique audit identifier */
  auditId: z.string(),

  /** Incident being audited */
  incidentId: z.string(),

  /** Compliance template used for evaluation */
  templateId: z.string(),

  /** Scores for each category analyzed */
  categoryScores: z.array(CategoryScoreSchema),

  /** Final narrative summary and recommendations */
  narrative: AuditNarrativeSchema,

  /** Processing metadata */
  metadata: AuditMetadataSchema
}).strict();

// ============================================================================
// TypeScript Types (exported for use throughout application)
// ============================================================================

export type EvidenceRelevance = z.infer<typeof EvidenceRelevanceSchema>;
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type CriterionScoreValue = z.infer<typeof CriterionScoreValueSchema>;
export type CriterionScore = z.infer<typeof CriterionScoreSchema>;
export type CategoryStatus = z.infer<typeof CategoryStatusSchema>;
export type CategoryScore = z.infer<typeof CategoryScoreSchema>;
export type RecommendationPriority = z.infer<typeof RecommendationPrioritySchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type AuditStatus = z.infer<typeof AuditStatusSchema>;
export type AuditNarrative = z.infer<typeof AuditNarrativeSchema>;
export type AuditMetadata = z.infer<typeof AuditMetadataSchema>;
export type ComplianceAudit = z.infer<typeof ComplianceAuditSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates a criterion score and returns detailed validation result
 *
 * @param data - Data to validate
 * @returns Validation result with parsed data or error details
 */
export function validateCriterionScore(data: unknown) {
  return CriterionScoreSchema.safeParse(data);
}

/**
 * Validates a category score and returns detailed validation result
 *
 * @param data - Data to validate
 * @returns Validation result with parsed data or error details
 */
export function validateCategoryScore(data: unknown) {
  return CategoryScoreSchema.safeParse(data);
}

/**
 * Validates an audit narrative and returns detailed validation result
 *
 * @param data - Data to validate
 * @returns Validation result with parsed data or error details
 */
export function validateAuditNarrative(data: unknown) {
  return AuditNarrativeSchema.safeParse(data);
}

/**
 * Validates a complete compliance audit and returns detailed validation result
 *
 * @param data - Data to validate
 * @returns Validation result with parsed data or error details
 */
export function validateComplianceAudit(data: unknown) {
  return ComplianceAuditSchema.safeParse(data);
}

/**
 * Validates evidence item and returns detailed validation result
 *
 * @param data - Data to validate
 * @returns Validation result with parsed data or error details
 */
export function validateEvidenceItem(data: unknown) {
  return EvidenceItemSchema.safeParse(data);
}

/**
 * Validates a recommendation and returns detailed validation result
 *
 * @param data - Data to validate
 * @returns Validation result with parsed data or error details
 */
export function validateRecommendation(data: unknown) {
  return RecommendationSchema.safeParse(data);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculates weighted category score from individual criterion scores
 * Filters out NOT_APPLICABLE scores from calculation
 *
 * @param criteriaScores - Array of criterion scores
 * @returns Weighted average score (0-100)
 */
export function calculateCategoryScore(criteriaScores: CriterionScore[]): number {
  const applicableScores = criteriaScores.filter(
    (score) => score.score !== 'NOT_APPLICABLE' && score.numericScore !== null
  );

  if (applicableScores.length === 0) {
    return 0;
  }

  const sum = applicableScores.reduce(
    (acc, score) => acc + (score.numericScore ?? 0),
    0
  );

  return Math.round(sum / applicableScores.length);
}

/**
 * Determines category status based on criterion scores
 *
 * @param criteriaScores - Array of criterion scores
 * @returns Category status
 */
export function determineCategoryStatus(
  criteriaScores: CriterionScore[]
): CategoryStatus {
  const hasCriticalFailure = criteriaScores.some(
    (score) => score.score === 'FAIL' && score.confidence >= 0.8
  );

  if (hasCriticalFailure) {
    return 'FAIL';
  }

  const averageScore = calculateCategoryScore(criteriaScores);

  if (averageScore >= 85) {
    return 'PASS';
  }

  return 'NEEDS_IMPROVEMENT';
}

/**
 * Calculates overall audit score from category scores
 *
 * @param categoryScores - Array of category scores
 * @returns Overall audit score (0-100)
 */
export function calculateOverallScore(categoryScores: CategoryScore[]): number {
  if (categoryScores.length === 0) {
    return 0;
  }

  const sum = categoryScores.reduce(
    (acc, category) => acc + category.overallCategoryScore,
    0
  );

  return Math.round(sum / categoryScores.length);
}

/**
 * Determines overall audit status based on category scores
 *
 * @param categoryScores - Array of category scores
 * @returns Overall audit status
 */
export function determineOverallStatus(
  categoryScores: CategoryScore[]
): AuditStatus {
  const hasFailedCategory = categoryScores.some(
    (category) => category.categoryStatus === 'FAIL'
  );

  if (hasFailedCategory) {
    return 'FAIL';
  }

  const overallScore = calculateOverallScore(categoryScores);

  if (overallScore >= 85) {
    return 'PASS';
  }

  return 'NEEDS_IMPROVEMENT';
}
