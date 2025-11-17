/**
 * Template generation workflow logging utilities
 * Fire Department Radio Transcription System
 *
 * Provides specialized logging for multi-turn template generation workflows,
 * tracking category discovery, criteria generation, weight normalization,
 * and Zod schema validation across turns.
 *
 * @module lib/logging/template-logger
 */

import { logger } from './logger';
import type { LogMetadata } from './types';

/**
 * Template workflow step types
 */
export type TemplateWorkflowStep =
  | 'discover-categories'
  | 'generate-criteria'
  | 'normalize-weights'
  | 'enhance-criteria'
  | 'validate-structure'
  | 'generate-suggestions';

/**
 * Template generation metadata
 */
export interface TemplateWorkflowMetadata extends LogMetadata {
  jobId: string;
  step?: TemplateWorkflowStep;
  documentCount?: number;
  categoryCount?: number;
  criteriaCount?: number;
  progress?: string;
  confidence?: number;
  validationErrors?: string[];
  promptLength?: number;
  responseLength?: number;
}

/**
 * Log template workflow start
 *
 * Logs the initiation of a template generation workflow with context about
 * the policy documents being analyzed.
 *
 * @param jobId - Unique job ID for tracking across turns
 * @param documentCount - Number of policy documents being analyzed
 * @param options - Generation options (templateName, focusAreas, etc.)
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logTemplateWorkflowStart('job_abc123', 3, {
 *   templateName: 'NFPA 1561 Communications',
 *   focusAreas: ['Radio Discipline', 'Mayday Procedures']
 * });
 * ```
 */
export function logTemplateWorkflowStart(
  jobId: string,
  documentCount: number,
  options: Record<string, unknown> = {},
  metadata: LogMetadata = {}
): void {
  logger.info('Template generation workflow started', {
    component: 'template-generation',
    operation: 'workflow-start',
    jobId,
    documentCount,
    options,
    ...metadata,
  });
}

/**
 * Log template workflow step completion
 *
 * Logs the completion of a specific step in the multi-turn workflow.
 *
 * @param jobId - Job ID for correlation
 * @param step - Workflow step that completed
 * @param progress - Progress indicator (e.g., "3/8 categories")
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logTemplateWorkflowStep('job_abc123', 'discover-categories', '8 categories discovered', {
 *   categoryCount: 8,
 *   confidence: 0.92
 * });
 * ```
 */
export function logTemplateWorkflowStep(
  jobId: string,
  step: TemplateWorkflowStep,
  progress: string,
  metadata: LogMetadata = {}
): void {
  logger.info('Template workflow step completed', {
    component: 'template-generation',
    operation: step,
    jobId,
    step,
    progress,
    ...metadata,
  });
}

/**
 * Log template workflow completion
 *
 * Logs successful completion of the entire template generation workflow
 * with final metrics.
 *
 * @param jobId - Job ID for correlation
 * @param result - Generated template result
 * @param duration - Total workflow duration in milliseconds
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logTemplateWorkflowComplete('job_abc123', {
 *   categoryCount: 8,
 *   totalCriteria: 52,
 *   confidence: 0.89
 * }, 45000);
 * ```
 */
export function logTemplateWorkflowComplete(
  jobId: string,
  result: {
    categoryCount: number;
    totalCriteria: number;
    confidence: number;
  },
  duration: number,
  metadata: LogMetadata = {}
): void {
  logger.info('Template generation workflow completed', {
    component: 'template-generation',
    operation: 'workflow-complete',
    jobId,
    categoryCount: result.categoryCount,
    totalCriteria: result.totalCriteria,
    confidence: result.confidence,
    duration,
    ...metadata,
  });
}

/**
 * Log template workflow error
 *
 * Logs when a template generation workflow fails at any step.
 *
 * @param jobId - Job ID for correlation
 * @param step - Workflow step where failure occurred
 * @param error - Error object or message
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logTemplateWorkflowError('job_abc123', 'generate-criteria', new Error('OpenAI timeout'), {
 *   categoryName: 'Communications',
 *   retryAttempt: 2
 * });
 * ```
 */
export function logTemplateWorkflowError(
  jobId: string,
  step: TemplateWorkflowStep,
  error: Error | string,
  metadata: LogMetadata = {}
): void {
  logger.error('Template workflow step failed', {
    component: 'template-generation',
    operation: step,
    jobId,
    step,
    error: error instanceof Error ? error : new Error(error),
    ...metadata,
  });
}

/**
 * Log category discovery phase
 *
 * Logs the category discovery phase of template generation, including
 * the number of categories discovered and confidence score.
 *
 * @param jobId - Job ID for correlation
 * @param categories - Array of discovered category names
 * @param confidence - Confidence score (0-1)
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logCategoryDiscovery('job_abc123', [
 *   'Communications',
 *   'Safety Procedures',
 *   'Incident Command'
 * ], 0.92);
 * ```
 */
export function logCategoryDiscovery(
  jobId: string,
  categories: string[],
  confidence: number,
  metadata: LogMetadata = {}
): void {
  logger.info('Category discovery completed', {
    component: 'template-generation',
    operation: 'discover-categories',
    jobId,
    categoryCount: categories.length,
    categories,
    confidence,
    ...metadata,
  });
}

/**
 * Log criteria generation phase
 *
 * Logs the criteria generation for a specific category, including
 * the number of criteria generated.
 *
 * @param jobId - Job ID for correlation
 * @param categoryName - Category name
 * @param criteriaCount - Number of criteria generated
 * @param progress - Progress through categories (e.g., "3/8")
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logCriteriaGeneration('job_abc123', 'Communications', 7, '3/8', {
 *   avgCriteriaWeight: 0.14
 * });
 * ```
 */
export function logCriteriaGeneration(
  jobId: string,
  categoryName: string,
  criteriaCount: number,
  progress: string,
  metadata: LogMetadata = {}
): void {
  logger.info('Criteria generation completed for category', {
    component: 'template-generation',
    operation: 'generate-criteria',
    jobId,
    categoryName,
    criteriaCount,
    progress,
    ...metadata,
  });
}

/**
 * Log weight normalization
 *
 * Logs the weight normalization step where category and criteria weights
 * are adjusted to sum to 1.0.
 *
 * @param jobId - Job ID for correlation
 * @param categoryCount - Number of categories normalized
 * @param totalCriteria - Total number of criteria across all categories
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logWeightNormalization('job_abc123', 8, 52, {
 *   categoryWeightSum: 1.0,
 *   criteriaWeightSum: 1.0
 * });
 * ```
 */
export function logWeightNormalization(
  jobId: string,
  categoryCount: number,
  totalCriteria: number,
  metadata: LogMetadata = {}
): void {
  logger.info('Weight normalization completed', {
    component: 'template-generation',
    operation: 'normalize-weights',
    jobId,
    categoryCount,
    totalCriteria,
    ...metadata,
  });
}

/**
 * Log Zod schema validation
 *
 * Logs when AI-generated responses are validated against Zod schemas
 * at each turn of the workflow.
 *
 * @param jobId - Job ID for correlation
 * @param step - Workflow step being validated
 * @param schemaName - Name of Zod schema
 * @param success - Whether validation succeeded
 * @param errors - Validation errors (if any)
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logSchemaValidation('job_abc123', 'discover-categories', 'CategoryDiscoverySchema', true, []);
 * ```
 */
export function logSchemaValidation(
  jobId: string,
  step: TemplateWorkflowStep,
  schemaName: string,
  success: boolean,
  errors: string[] = [],
  metadata: LogMetadata = {}
): void {
  if (success) {
    logger.debug('Schema validation passed', {
      component: 'template-generation',
      operation: step,
      jobId,
      schemaName,
      validationSuccess: true,
      ...metadata,
    });
  } else {
    logger.error('Schema validation failed', {
      component: 'template-generation',
      operation: step,
      jobId,
      schemaName,
      validationSuccess: false,
      validationErrors: errors,
      ...metadata,
    });
  }
}

/**
 * Log full-context prompt
 *
 * Logs information about full-context prompts sent in multi-turn workflows,
 * with automatic truncation for large payloads.
 *
 * @param jobId - Job ID for correlation
 * @param step - Workflow step
 * @param promptLength - Length of prompt in characters
 * @param documentCount - Number of documents in context
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logFullContextPrompt('job_abc123', 'discover-categories', 25000, 3, {
 *   estimatedTokens: 6250
 * });
 * ```
 */
export function logFullContextPrompt(
  jobId: string,
  step: TemplateWorkflowStep,
  promptLength: number,
  documentCount: number,
  metadata: LogMetadata = {}
): void {
  logger.debug('Full-context prompt prepared', {
    component: 'template-generation',
    operation: step,
    jobId,
    promptLength,
    documentCount,
    promptTruncated: promptLength > 50000,
    ...metadata,
  });
}

/**
 * Log AI response parsing
 *
 * Logs when AI responses are parsed and extracted from the Responses API.
 *
 * @param jobId - Job ID for correlation
 * @param step - Workflow step
 * @param responseLength - Length of response in characters
 * @param parseSuccess - Whether parsing succeeded
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logAIResponseParsing('job_abc123', 'discover-categories', 3500, true, {
 *   responseFormat: 'json_schema'
 * });
 * ```
 */
export function logAIResponseParsing(
  jobId: string,
  step: TemplateWorkflowStep,
  responseLength: number,
  parseSuccess: boolean,
  metadata: LogMetadata = {}
): void {
  if (parseSuccess) {
    logger.debug('AI response parsed successfully', {
      component: 'template-generation',
      operation: step,
      jobId,
      responseLength,
      parseSuccess: true,
      ...metadata,
    });
  } else {
    logger.error('AI response parsing failed', {
      component: 'template-generation',
      operation: step,
      jobId,
      responseLength,
      parseSuccess: false,
      ...metadata,
    });
  }
}

/**
 * Log template validation
 *
 * Logs the structural validation of the generated template, checking for
 * unique IDs, weight sums, and reasonable category/criteria counts.
 *
 * @param jobId - Job ID for correlation
 * @param valid - Whether template is valid
 * @param errors - Validation errors (if any)
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logTemplateValidation('job_abc123', false, [
 *   'Category weights sum to 1.02, expected 1.0',
 *   'Duplicate criterion ID: comm-crit-1'
 * ]);
 * ```
 */
export function logTemplateValidation(
  jobId: string,
  valid: boolean,
  errors: string[] = [],
  metadata: LogMetadata = {}
): void {
  if (valid) {
    logger.info('Template validation passed', {
      component: 'template-generation',
      operation: 'validate-structure',
      jobId,
      validationSuccess: true,
      ...metadata,
    });
  } else {
    logger.warn('Template validation failed, attempting auto-fix', {
      component: 'template-generation',
      operation: 'validate-structure',
      jobId,
      validationSuccess: false,
      validationErrors: errors,
      ...metadata,
    });
  }
}

/**
 * Log auto-fix attempt
 *
 * Logs when the system attempts to automatically fix template validation issues.
 *
 * @param jobId - Job ID for correlation
 * @param issuesFixed - Number of issues fixed
 * @param fixSuccess - Whether auto-fix succeeded
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logAutoFix('job_abc123', 2, true, {
 *   fixedIssues: ['normalized category weights', 'normalized criteria weights']
 * });
 * ```
 */
export function logAutoFix(
  jobId: string,
  issuesFixed: number,
  fixSuccess: boolean,
  metadata: LogMetadata = {}
): void {
  if (fixSuccess) {
    logger.info('Template auto-fix succeeded', {
      component: 'template-generation',
      operation: 'auto-fix',
      jobId,
      issuesFixed,
      fixSuccess: true,
      ...metadata,
    });
  } else {
    logger.error('Template auto-fix failed', {
      component: 'template-generation',
      operation: 'auto-fix',
      jobId,
      issuesFixed,
      fixSuccess: false,
      ...metadata,
    });
  }
}

/**
 * Log suggestion generation
 *
 * Logs when improvement suggestions are generated for the template.
 *
 * @param jobId - Job ID for correlation
 * @param suggestionCount - Number of suggestions generated
 * @param suggestionTypes - Types of suggestions (ISSUE, ENHANCEMENT, REFERENCE)
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logSuggestionGeneration('job_abc123', 3, ['ENHANCEMENT', 'REFERENCE', 'REFERENCE']);
 * ```
 */
export function logSuggestionGeneration(
  jobId: string,
  suggestionCount: number,
  suggestionTypes: string[],
  metadata: LogMetadata = {}
): void {
  logger.info('Template suggestions generated', {
    component: 'template-generation',
    operation: 'generate-suggestions',
    jobId,
    suggestionCount,
    suggestionTypes,
    ...metadata,
  });
}
