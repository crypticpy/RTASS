/**
 * Compliance audit pipeline logging utilities
 * Fire Department Radio Transcription System
 *
 * Provides specialized logging for the modular compliance audit pipeline,
 * tracking category-by-category scoring, narrative generation, and partial
 * result saves for graceful degradation.
 *
 * @module lib/logging/compliance-logger
 */

import { logger } from './logger';
import type { LogMetadata } from './types';

/**
 * Compliance audit operation types
 */
export type ComplianceOperation =
  | 'audit-start'
  | 'score-category'
  | 'category-complete'
  | 'generate-narrative'
  | 'save-partial'
  | 'audit-complete'
  | 'audit-error';

/**
 * Category scoring status
 */
export type CategoryStatus = 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_APPLICABLE';

/**
 * Compliance audit metadata
 */
export interface ComplianceAuditMetadata extends LogMetadata {
  auditId: string;
  templateId?: string;
  transcriptId?: string;
  categoryName?: string;
  categoryScore?: number;
  categoryStatus?: CategoryStatus;
  progress?: string;
  overallScore?: number;
  duration?: number;
}

/**
 * Log audit start
 *
 * Logs the initiation of a compliance audit with template and transcript IDs.
 *
 * @param auditId - Unique audit ID for tracking
 * @param templateId - Template being used for audit
 * @param transcriptId - Transcript being audited
 * @param categoryCount - Total number of categories to audit
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logAuditStart('audit_abc123', 'template_456', 'transcript_789', 12, {
 *   incidentId: 'inc_101',
 *   incidentType: 'STRUCTURE_FIRE'
 * });
 * ```
 */
export function logAuditStart(
  auditId: string,
  templateId: string,
  transcriptId: string,
  categoryCount: number,
  metadata: LogMetadata = {}
): void {
  logger.info('Compliance audit started', {
    component: 'compliance-audit',
    operation: 'audit-start',
    auditId,
    templateId,
    transcriptId,
    categoryCount,
    ...metadata,
  });
}

/**
 * Log category scoring initiation
 *
 * Logs when a specific category begins scoring, including progress through
 * all categories.
 *
 * @param auditId - Audit ID for correlation
 * @param categoryName - Category being scored
 * @param progress - Progress indicator (e.g., "3/12 categories")
 * @param criteriaCount - Number of criteria in this category
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logCategoryScoring('audit_abc123', 'Communications', '3/12', 8, {
 *   categoryWeight: 0.35
 * });
 * ```
 */
export function logCategoryScoring(
  auditId: string,
  categoryName: string,
  progress: string,
  criteriaCount: number,
  metadata: LogMetadata = {}
): void {
  logger.info('Category scoring started', {
    component: 'compliance-audit',
    operation: 'score-category',
    auditId,
    categoryName,
    progress,
    criteriaCount,
    ...metadata,
  });
}

/**
 * Log category scoring completion
 *
 * Logs successful completion of category scoring with score and status.
 *
 * @param auditId - Audit ID for correlation
 * @param categoryName - Category that was scored
 * @param score - Category score (0-100)
 * @param status - Category status (PASS, PARTIAL, FAIL, NOT_APPLICABLE)
 * @param duration - Category scoring duration in milliseconds
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logCategoryScoringComplete('audit_abc123', 'Communications', 87, 'PASS', 4500, {
 *   criteriaScored: 8,
 *   criticalFindings: 0
 * });
 * ```
 */
export function logCategoryScoringComplete(
  auditId: string,
  categoryName: string,
  score: number,
  status: CategoryStatus,
  duration: number,
  metadata: LogMetadata = {}
): void {
  logger.info('Category scoring completed', {
    component: 'compliance-audit',
    operation: 'category-complete',
    auditId,
    categoryName,
    categoryScore: score,
    categoryStatus: status,
    duration,
    ...metadata,
  });
}

/**
 * Log category scoring error
 *
 * Logs when category scoring fails, enabling graceful degradation to continue
 * with other categories.
 *
 * @param auditId - Audit ID for correlation
 * @param categoryName - Category that failed
 * @param error - Error object or message
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logCategoryScoringError('audit_abc123', 'Communications', new Error('OpenAI timeout'), {
 *   retryAttempt: 3,
 *   criteriaAttempted: 8
 * });
 * ```
 */
export function logCategoryScoringError(
  auditId: string,
  categoryName: string,
  error: Error | string,
  metadata: LogMetadata = {}
): void {
  logger.error('Category scoring failed', {
    component: 'compliance-audit',
    operation: 'score-category',
    auditId,
    categoryName,
    error: error instanceof Error ? error : new Error(error),
    ...metadata,
  });
}

/**
 * Log narrative generation
 *
 * Logs the audit narrative generation phase where an executive summary
 * is created from all category scores.
 *
 * @param auditId - Audit ID for correlation
 * @param categoryCount - Number of categories included in narrative
 * @param narrativeLength - Length of generated narrative in characters
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logNarrativeGeneration('audit_abc123', 12, 4500, {
 *   recommendationCount: 8,
 *   criticalIssueCount: 2
 * });
 * ```
 */
export function logNarrativeGeneration(
  auditId: string,
  categoryCount: number,
  narrativeLength: number,
  metadata: LogMetadata = {}
): void {
  logger.info('Audit narrative generation started', {
    component: 'compliance-audit',
    operation: 'generate-narrative',
    auditId,
    categoryCount,
    narrativeLength,
    ...metadata,
  });
}

/**
 * Log narrative generation completion
 *
 * @param auditId - Audit ID for correlation
 * @param narrativeLength - Length of generated narrative
 * @param overallScore - Overall audit score
 * @param duration - Narrative generation duration in milliseconds
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logNarrativeComplete('audit_abc123', 4500, 84, 3200, {
 *   recommendationCount: 8,
 *   strengthCount: 5,
 *   improvementCount: 6
 * });
 * ```
 */
export function logNarrativeComplete(
  auditId: string,
  narrativeLength: number,
  overallScore: number,
  duration: number,
  metadata: LogMetadata = {}
): void {
  logger.info('Audit narrative generation completed', {
    component: 'compliance-audit',
    operation: 'generate-narrative',
    auditId,
    narrativeLength,
    overallScore,
    duration,
    ...metadata,
  });
}

/**
 * Log audit completion
 *
 * Logs successful completion of the entire audit with final metrics.
 *
 * @param auditId - Audit ID for correlation
 * @param overallScore - Overall audit score (0-100)
 * @param categoriesScored - Number of categories successfully scored
 * @param totalCategories - Total number of categories
 * @param duration - Total audit duration in milliseconds
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logAuditComplete('audit_abc123', 84, 12, 12, 45000, {
 *   passCount: 8,
 *   partialCount: 3,
 *   failCount: 1,
 *   criticalFindings: 2
 * });
 * ```
 */
export function logAuditComplete(
  auditId: string,
  overallScore: number,
  categoriesScored: number,
  totalCategories: number,
  duration: number,
  metadata: LogMetadata = {}
): void {
  logger.info('Compliance audit completed', {
    component: 'compliance-audit',
    operation: 'audit-complete',
    auditId,
    overallScore,
    categoriesScored,
    totalCategories,
    completionRate: (categoriesScored / totalCategories) * 100,
    duration,
    ...metadata,
  });
}

/**
 * Log audit error
 *
 * Logs critical audit failures that prevent completion.
 *
 * @param auditId - Audit ID for correlation
 * @param error - Error object or message
 * @param categoriesCompleted - Number of categories completed before failure
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logAuditError('audit_abc123', new Error('Database connection lost'), 8, {
 *   totalCategories: 12,
 *   failurePoint: 'narrative-generation'
 * });
 * ```
 */
export function logAuditError(
  auditId: string,
  error: Error | string,
  categoriesCompleted: number,
  metadata: LogMetadata = {}
): void {
  logger.error('Compliance audit failed', {
    component: 'compliance-audit',
    operation: 'audit-error',
    auditId,
    categoriesCompleted,
    error: error instanceof Error ? error : new Error(error),
    ...metadata,
  });
}

/**
 * Log partial result save
 *
 * Logs when partial audit results are saved to the database for resilience.
 * This enables graceful degradation if the audit fails partway through.
 *
 * @param auditId - Audit ID for correlation
 * @param categoryName - Category being saved
 * @param score - Category score
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logPartialResultSave('audit_abc123', 'Communications', 87, {
 *   criteriaScored: 8,
 *   saveSuccess: true
 * });
 * ```
 */
export function logPartialResultSave(
  auditId: string,
  categoryName: string,
  score: number,
  metadata: LogMetadata = {}
): void {
  logger.debug('Partial audit result saved', {
    component: 'compliance-audit',
    operation: 'save-partial',
    auditId,
    categoryName,
    categoryScore: score,
    ...metadata,
  });
}

/**
 * Log critical finding
 *
 * Logs when a critical compliance finding is identified during audit.
 *
 * @param auditId - Audit ID for correlation
 * @param categoryName - Category where finding was identified
 * @param finding - Description of critical finding
 * @param timestamp - Timestamp from transcript where finding occurred
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logCriticalFinding('audit_abc123', 'Safety', 'Mayday not acknowledged within 30 seconds', '02:45', {
 *   criterionId: 'safety-crit-3',
 *   severity: 'HIGH'
 * });
 * ```
 */
export function logCriticalFinding(
  auditId: string,
  categoryName: string,
  finding: string,
  timestamp: string,
  metadata: LogMetadata = {}
): void {
  logger.warn('Critical compliance finding identified', {
    component: 'compliance-audit',
    operation: 'critical-finding',
    auditId,
    categoryName,
    finding,
    transcriptTimestamp: timestamp,
    ...metadata,
  });
}

/**
 * Log audit progress
 *
 * Logs periodic progress updates during long-running audits.
 *
 * @param auditId - Audit ID for correlation
 * @param completed - Number of categories completed
 * @param total - Total number of categories
 * @param currentScore - Current average score across completed categories
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logAuditProgress('audit_abc123', 8, 12, 85, {
 *   elapsedTime: 32000,
 *   estimatedTimeRemaining: 16000
 * });
 * ```
 */
export function logAuditProgress(
  auditId: string,
  completed: number,
  total: number,
  currentScore: number,
  metadata: LogMetadata = {}
): void {
  const progress = `${completed}/${total}`;
  const percentComplete = (completed / total) * 100;

  logger.info('Audit progress update', {
    component: 'compliance-audit',
    operation: 'audit-progress',
    auditId,
    progress,
    percentComplete,
    categoriesCompleted: completed,
    totalCategories: total,
    currentScore,
    ...metadata,
  });
}

/**
 * Log evidence extraction
 *
 * Logs when evidence is extracted from transcript for a criterion.
 *
 * @param auditId - Audit ID for correlation
 * @param categoryName - Category being scored
 * @param criterionId - Criterion ID
 * @param evidenceCount - Number of evidence items extracted
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logEvidenceExtraction('audit_abc123', 'Communications', 'comm-crit-1', 3, {
 *   relevanceScores: [0.92, 0.87, 0.78]
 * });
 * ```
 */
export function logEvidenceExtraction(
  auditId: string,
  categoryName: string,
  criterionId: string,
  evidenceCount: number,
  metadata: LogMetadata = {}
): void {
  logger.debug('Evidence extracted for criterion', {
    component: 'compliance-audit',
    operation: 'extract-evidence',
    auditId,
    categoryName,
    criterionId,
    evidenceCount,
    ...metadata,
  });
}

/**
 * Log weighted score calculation
 *
 * Logs when weighted scores are calculated from category results.
 *
 * @param auditId - Audit ID for correlation
 * @param categoryScores - Map of category names to scores
 * @param categoryWeights - Map of category names to weights
 * @param overallScore - Calculated overall score
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logWeightedScoreCalculation('audit_abc123', {
 *   'Communications': 87,
 *   'Safety': 92,
 *   'Command': 78
 * }, {
 *   'Communications': 0.4,
 *   'Safety': 0.4,
 *   'Command': 0.2
 * }, 85);
 * ```
 */
export function logWeightedScoreCalculation(
  auditId: string,
  categoryScores: Record<string, number>,
  categoryWeights: Record<string, number>,
  overallScore: number,
  metadata: LogMetadata = {}
): void {
  logger.debug('Weighted score calculated', {
    component: 'compliance-audit',
    operation: 'calculate-score',
    auditId,
    categoryScores,
    categoryWeights,
    overallScore,
    ...metadata,
  });
}
