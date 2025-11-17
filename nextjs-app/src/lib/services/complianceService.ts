/**
 * Compliance Service
 * Fire Department Radio Transcription System
 *
 * GPT-4.1-powered compliance scoring engine that:
 * - Evaluates transcripts against compliance templates
 * - Extracts findings with citations
 * - Generates weighted scores
 * - Provides actionable recommendations
 */

import OpenAI from 'openai';
import { getOpenAIClient, withRateLimit, trackTokenUsage } from './utils/openai';
import { extractResponseText } from '@/lib/openai/utils';
import { templateService } from './templateService';
import { prisma } from '@/lib/db';
import { withTransaction } from '@/lib/utils/database';
import { Errors } from './utils/errorHandlers';
import { validateContentNotEmpty } from '@/lib/utils/validators';
import type {
  AuditResult,
  AuditStatus,
  ComplianceCategory,
  ComplianceCriterion,
  CriterionStatus,
  Finding,
  Recommendation,
  AuditMetadata,
} from '@/lib/types';
import {
  analyzeCategory,
  generateNarrative as generateAuditNarrative,
  calculateOverallScore as calculateWeightedScore,
  extractCriticalFindings,
  type CategoryAnalysisResult,
  type IncidentContext,
  type AuditResults,
} from '@/lib/openai/compliance-analysis';
import {
  logAuditStart,
  logCategoryScoring,
  logCategoryScoringComplete,
  logCategoryScoringError,
  logNarrativeGeneration,
  logNarrativeComplete,
  logAuditComplete,
  logAuditError,
  logAuditProgress,
  logPartialResultSave,
  generateCorrelationId,
  logger,
} from '@/lib/logging';
import { circuitBreakers } from '@/lib/utils/circuitBreaker';

// Prisma JSON type helper
type PrismaJson = Record<string, unknown> | unknown[];

/**
 * Normalizes evidence timestamps to MM:SS format
 *
 * Handles invalid timestamps from GPT-4.1 responses by converting various formats
 * to a consistent MM:SS format. This prevents display and processing issues.
 *
 * @param timestamp - Timestamp string from GPT response (can be null, undefined, or invalid)
 * @returns Normalized timestamp in MM:SS format (e.g., "02:45")
 *
 * @example
 * ```typescript
 * normalizeTimestamp('125')        // '2:05' (seconds to MM:SS)
 * normalizeTimestamp('1:23:45')    // '83:45' (HH:MM:SS to MM:SS)
 * normalizeTimestamp('invalid')    // '00:00' (fallback)
 * normalizeTimestamp('2:65')       // '2:00' (invalid seconds)
 * ```
 */
function normalizeTimestamp(
  timestamp: string | undefined | null,
  context?: { criterionId?: string; auditId?: string }
): string {
  if (!timestamp || timestamp === 'invalid' || timestamp === 'N/A') {
    return '00:00';
  }

  // Match MM:SS format
  const mmssMatch = timestamp.match(/^(\d{1,3}):(\d{2})$/);
  if (mmssMatch) {
    const minutes = parseInt(mmssMatch[1], 10);
    const seconds = parseInt(mmssMatch[2], 10);

    // Validate seconds
    if (seconds >= 60) {
      logger.warn('Invalid seconds in timestamp, normalizing', {
        component: 'compliance-service',
        operation: 'normalize-timestamp',
        originalTimestamp: timestamp,
        criterionId: context?.criterionId,
        auditId: context?.auditId,
      });
      return `${minutes}:00`;
    }

    return timestamp;
  }

  // Match HH:MM:SS format and convert to MM:SS
  const hhmmssMatch = timestamp.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hhmmssMatch) {
    const hours = parseInt(hhmmssMatch[1], 10);
    const minutes = parseInt(hhmmssMatch[2], 10);
    const seconds = parseInt(hhmmssMatch[3], 10);

    const totalMinutes = hours * 60 + minutes;
    return `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Match seconds only (e.g., "125" -> "2:05")
  const secondsMatch = timestamp.match(/^(\d+)$/);
  if (secondsMatch) {
    const totalSeconds = parseInt(secondsMatch[1], 10);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Couldn't parse, return default
  logger.warn('Unable to parse timestamp, using default', {
    component: 'compliance-service',
    operation: 'normalize-timestamp',
    originalTimestamp: timestamp,
    criterionId: context?.criterionId,
    auditId: context?.auditId,
  });

  return '00:00';
}

/**
 * Validates and clamps criterion scores to valid range [0, 100]
 *
 * Ensures scores from GPT-4.1 responses are within valid bounds.
 * Invalid scores are logged and clamped to prevent data corruption.
 *
 * @param score - Score value from GPT response (can be null, undefined, or out of bounds)
 * @param criterionId - Criterion identifier for logging
 * @returns Valid score in range [0, 100]
 *
 * @example
 * ```typescript
 * validateCriterionScore(85, 'criterion-1')     // 85
 * validateCriterionScore(-10, 'criterion-2')    // 0 (clamped)
 * validateCriterionScore(150, 'criterion-3')    // 100 (clamped)
 * validateCriterionScore(null, 'criterion-4')   // 0 (default)
 * ```
 */
function validateCriterionScore(score: number | undefined | null, criterionId: string): number {
  if (score === undefined || score === null || isNaN(score)) {
    logger.warn('Invalid criterion score, using 0', {
      component: 'compliance-service',
      operation: 'validate-criterion-score',
      criterionId,
      score,
    });
    return 0;
  }

  // Clamp to [0, 100] range
  if (score < 0) {
    logger.warn('Criterion score below 0, clamping to 0', {
      component: 'compliance-service',
      operation: 'validate-criterion-score',
      criterionId,
      originalScore: score,
    });
    return 0;
  }

  if (score > 100) {
    logger.warn('Criterion score above 100, clamping to 100', {
      component: 'compliance-service',
      operation: 'validate-criterion-score',
      criterionId,
      originalScore: score,
    });
    return 100;
  }

  return score;
}

/**
 * Progress callback for modular audit execution
 */
export type AuditProgressCallback = (
  current: number,
  total: number,
  categoryName: string
) => void;

/**
 * Options for modular audit execution
 */
export interface ModularAuditOptions {
  onProgress?: AuditProgressCallback;
  savePartialResults?: boolean;
  additionalNotes?: string;
  correlationId?: string;
}

/**
 * GPT-4.1 response structure
 */
interface GPT4Response {
  categories: Array<{
    name: string;
    status?: AuditStatus;
    criteria: Array<{
      id: string;
      status: CriterionStatus;
      score: number;
      rationale: string;
      findings?: Finding[];
    }>;
  }>;
}

/**
 * Compliance Service
 *
 * Provides AI-powered compliance auditing using GPT-4.1.
 *
 * @example
 * ```typescript
 * const complianceService = new ComplianceService();
 *
 * // Run compliance audit
 * const audit = await complianceService.auditTranscript(
 *   'transcript-123',
 *   'template-456',
 *   'Additional context...'
 * );
 *
 * console.log('Overall score:', audit.overallScore);
 * console.log('Recommendations:', audit.recommendations);
 * ```
 */
export class ComplianceService {
  /**
   * Audit transcript against compliance template
   *
   * Performs the following steps:
   * 1. Fetch transcript and template from database
   * 2. Build scoring prompt for GPT-4.1
   * 3. Call GPT-4.1 API for evaluation
   * 4. Parse and validate response
   * 5. Calculate scores with weighting
   * 6. Generate recommendations
   * 7. Save audit to database
   *
   * @param {string} transcriptId - Transcript ID
   * @param {string} templateId - Template ID
   * @param {string} additionalNotes - Optional context or instructions
   * @returns {Promise<AuditResult>} Complete audit result
   * @throws {ServiceError} If audit fails
   *
   * @example
   * ```typescript
   * const audit = await complianceService.auditTranscript(
   *   'transcript-123',
   *   'template-456'
   * );
   * ```
   */
  async auditTranscript(
    transcriptId: string,
    templateId: string,
    additionalNotes?: string
  ): Promise<AuditResult> {
    const startTime = Date.now();

    try {
      // Step 1: Fetch transcript and template (validate both exist up-front to fail fast)
      const [transcript, template] = await Promise.all([
        prisma.transcript.findUnique({
          where: { id: transcriptId },
          include: { incident: true },
        }),
        templateService.getTemplateById(templateId),
      ]);

      if (!transcript) {
        throw Errors.notFound('Transcript', transcriptId);
      }

      if (!template.isActive) {
        throw Errors.invalidInput('templateId', 'Template is not active');
      }


      // Validate incident exists and is not resolved
      if (!transcript.incident) {
        throw Errors.invalidInput(
          'transcriptId',
          'Transcript must be associated with an incident'
        );
      }

      if (transcript.incident.status === 'RESOLVED') {
        logger.warn('Skipping audit for resolved incident', {
          component: 'compliance-service',
          operation: 'audit-transcript',
          incidentId: transcript.incident.id,
          incidentNumber: transcript.incident.number,
          status: transcript.incident.status,
        });

        throw Errors.invalidInput(
          'incidentId',
          `Cannot audit resolved incident ${transcript.incident.number}. Audits must be run while incident is active.`
        );
      }

      // Validate transcript has content
      validateContentNotEmpty(transcript.text, 'transcript.text');

      // Validate transcript has sufficient content for analysis
      if (transcript.text.trim().length < 10) {
        throw Errors.invalidInput(
          'transcriptId',
          'Transcript text is too short for meaningful analysis'
        );
      }

      // Warn if transcript has no segments (may have limited context)
      if (!transcript.segments || (transcript.segments as any[]).length === 0) {
        logger.warn('Transcript has no segments, audit may have limited context', {
          component: 'compliance-service',
          operation: 'audit-transcript',
          transcriptId: transcript.id,
          textLength: transcript.text?.length || 0,
        });
      }

      // Step 2: Build scoring prompt
      const prompt = this.buildScoringPrompt(
        transcript,
        template,
        additionalNotes
      );

      // Step 3: Call GPT-4.1 API
      const gptResponse = await this.callGPT4o(prompt);

      // Step 4: Parse response
      const parsedAudit = this.parseAuditResponse(
        gptResponse,
        template.categories as any as ComplianceCategory[]
      );

      // Step 5: Calculate scores
      const categoriesWithScores = this.calculateCategoryScores(
        parsedAudit.categories as any
      );
      const overallScore = this.calculateOverallScore(categoriesWithScores);
      const overallStatus = this.determineOverallStatus(overallScore);

      // Step 6: Extract all findings
      const allFindings = this.extractAllFindings(categoriesWithScores);

      // Step 7: Generate recommendations
      const recommendations = this.generateRecommendations(
        categoriesWithScores,
        allFindings
      );

      // Step 8: Prepare metadata
      const processingTime = (Date.now() - startTime) / 1000;
      const metadata: AuditMetadata = {
        model: 'gpt-4.1',  // ⚠️ DO NOT change this model
        processingTime,
        tokenUsage: gptResponse.usage,
        additionalNotes,
      };

      // Step 9: Generate summary
      const summary = this.generateSummary(
        overallScore,
        overallStatus,
        categoriesWithScores,
        allFindings
      );

      // Step 10: Save audit to database (wrapped in transaction for atomicity)
      const audit = await withTransaction(async (tx) => {
        return await tx.audit.create({
          data: {
            incidentId: transcript.incidentId,
            transcriptId: transcript.id,
            templateId: template.id,
            overallScore,
            overallStatus,
            summary,
            findings: {
              categories: categoriesWithScores,
              findings: allFindings,
            } as any,
            recommendations: recommendations as any,
            metadata: metadata as any,
          },
        });
      });

      // Step 11: Return formatted result
      return {
        id: audit.id,
        incidentId: audit.incidentId,
        transcriptId: audit.transcriptId || undefined,
        templateId: audit.templateId,
        overallStatus: audit.overallStatus as AuditStatus,
        overallScore: audit.overallScore || 0,
        summary: audit.summary,
        categories: categoriesWithScores,
        findings: allFindings,
        recommendations,
        metadata,
        createdAt: audit.createdAt,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw Errors.processingFailed(
        'Compliance audit',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Build scoring prompt for GPT-4o
   *
   * Creates a comprehensive prompt with transcript, template criteria,
   * and scoring instructions.
   *
   * @private
   * @param {object} transcript - Transcript data
   * @param {object} template - Template data
   * @param {string} additionalNotes - Optional additional context
   * @returns {string} Complete prompt for GPT-4o
   */
  private buildScoringPrompt(
    transcript: any,
    template: any,
    additionalNotes?: string
  ): string {
    const transcriptText = transcript.text;
    const categories = template.categories as any as ComplianceCategory[];

    const templateStructure = categories
      .map((category, catIndex) => {
        const criteriaList = category.criteria
          .map((criterion, critIndex) => {
            return `
        ${critIndex + 1}. [ID: ${criterion.id}]
           Description: ${criterion.description}
           Evidence Required: ${criterion.evidenceRequired}
           Scoring Method: ${criterion.scoringMethod}
           Weight: ${criterion.weight}`;
          })
          .join('\n');

        return `
    Category ${catIndex + 1}: ${category.name}
    Description: ${category.description}
    Weight: ${category.weight}
    Regulatory References: ${category.regulatoryReferences?.join(', ') || 'None'}

    Criteria:${criteriaList}`;
      })
      .join('\n\n');

    return `You are an expert fire department compliance auditor evaluating radio communications against ${template.source || 'compliance'} standards.

TRANSCRIPT:
${transcriptText}

COMPLIANCE TEMPLATE: ${template.name}
${templateStructure}

${additionalNotes ? `\nADDITIONAL CONTEXT:\n${additionalNotes}\n` : ''}

TASK:
Evaluate the transcript against each criterion in the template. For each criterion:

1. Determine status: PASS, FAIL, PARTIAL, or NOT_APPLICABLE
   - PASS: Criterion fully met with clear evidence in transcript
   - PARTIAL: Criterion partially met or evidence is unclear/incomplete
   - FAIL: Criterion not met or violated
   - NOT_APPLICABLE: Criterion does not apply to this incident type

2. Provide detailed rationale with specific quotes from the transcript
   - Include exact quotes to support your evaluation
   - Reference specific sections or speakers when possible

3. Extract findings (positive or negative compliance examples)
   - For each finding, include:
     * Timestamp (if available from context)
     * Exact quote from transcript
     * Compliance type: POSITIVE, NEGATIVE, or NEUTRAL
     * Significance: HIGH, MEDIUM, or LOW
     * Explanation of why this is significant

SCORING RULES:
- Be thorough but fair in your evaluation
- Use NOT_APPLICABLE when criteria genuinely don't apply
- Cite exact transcript quotes to support your findings
- Focus on regulatory compliance, not perfection
- Consider context and incident conditions

OUTPUT FORMAT (JSON):
{
  "categories": [
    {
      "name": "Category Name",
      "criteria": [
        {
          "id": "criterion-id",
          "status": "PASS|FAIL|PARTIAL|NOT_APPLICABLE",
          "score": 0-100,
          "rationale": "Detailed explanation with quotes from transcript",
          "findings": [
            {
              "timestamp": "00:15" or null,
              "quote": "Exact transcript quote",
              "compliance": "POSITIVE|NEGATIVE|NEUTRAL",
              "significance": "HIGH|MEDIUM|LOW",
              "explanation": "Why this is significant for compliance"
            }
          ]
        }
      ]
    }
  ]
}

Provide ONLY the JSON output, no additional text.`;
  }

  /**
   * Call GPT-4.1 API for compliance scoring
   *
   * @private
   * @param {string} prompt - Scoring prompt
   * @returns {Promise} GPT-4.1 response
   * @throws {ServiceError} If API call fails
   */
  private async callGPT4o(prompt: string): Promise<any> {
    try {
      const client = getOpenAIClient();

      const response = await withRateLimit(async () => {
        return await client.responses.create({
          model: 'gpt-4.1', // ⚠️ DO NOT change this model
          temperature: 0.1,
          max_output_tokens: 4000,
          input: [
            {
              role: 'system',
              content:
                'You are an expert fire department compliance auditor. Evaluate radio transcripts against compliance standards and provide detailed, evidence-based assessments in JSON format.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        });
      });

      // Track token usage
      if (response.usage) {
        const promptTokens =
          response.usage.input_tokens ?? response.usage.prompt_tokens ?? 0;
        const completionTokens =
          response.usage.output_tokens ?? response.usage.completion_tokens ?? 0;
        const totalTokens =
          response.usage.total_tokens ?? promptTokens + completionTokens;

        await trackTokenUsage(
          'gpt-4.1', // ⚠️ DO NOT change this model
          {
            promptTokens,
            completionTokens,
            totalTokens,
          },
          'compliance_audit'
        );
      }

      const rawContent = extractResponseText(
        response,
        'Compliance audit scoring response'
      );

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawContent || '{}');
      } catch (error) {
        logger.warn('GPT-4.1 returned invalid JSON, attempting partial result recovery', {
          component: 'compliance-service',
          operation: 'parse-gpt-response',
          transcriptId: 'unknown', // Not available in this context
          templateId: 'unknown', // Not available in this context
          rawContent: rawContent?.substring(0, 500), // Log first 500 chars for debugging
          parseError: error instanceof Error ? error.message : String(error),
        });

        // No partial results available in legacy method, throw error
        throw Errors.processingFailed(
          'GPT-4.1 response parsing',
          `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      const usageSummary = response.usage
        ? {
            prompt:
              response.usage.input_tokens ??
              response.usage.prompt_tokens ??
              0,
            completion:
              response.usage.output_tokens ??
              response.usage.completion_tokens ??
              0,
            total:
              response.usage.total_tokens ??
              ((response.usage.input_tokens ?? response.usage.prompt_tokens ?? 0) +
                (response.usage.output_tokens ?? response.usage.completion_tokens ?? 0)),
          }
        : undefined;

      return {
        content: parsed,
        usage: usageSummary,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw Errors.externalServiceError('OpenAI GPT-4.1 API', error.message);
      }
      throw Errors.processingFailed('GPT-4.1 API call', 'Unknown error');
    }
  }

  /**
   * Parse and validate GPT-4.1 response
   *
   * @private
   * @param {object} gptResponse - Raw GPT-4.1 response
   * @param {ComplianceCategory[]} templateCategories - Original template categories
   * @returns {object} Parsed categories with criteria
   */
  private parseAuditResponse(
    gptResponse: any,
    templateCategories: ComplianceCategory[]
  ): GPT4Response {
    const content = gptResponse.content;

    if (!content.categories || !Array.isArray(content.categories)) {
      throw Errors.processingFailed(
        'GPT-4.1 response parsing',
        'Invalid response format'
      );
    }

    // Merge GPT-4.1 results with template structure
    const categories = templateCategories.map((templateCategory) => {
      const gptCategory = content.categories.find(
        (c: any) => c.name === templateCategory.name
      );

      if (!gptCategory) {
        // If GPT-4.1 didn't provide this category, mark all as NOT_APPLICABLE
        return {
          ...templateCategory,
          criteria: templateCategory.criteria.map((criterion) => ({
            ...criterion,
            status: 'NOT_APPLICABLE' as CriterionStatus,
            score: 0,
            rationale: 'Not evaluated by AI',
            findings: [],
          })),
        };
      }

      // Merge criteria
      const criteria = templateCategory.criteria.map((templateCriterion) => {
        const gptCriterion = gptCategory.criteria.find(
          (c: any) => c.id === templateCriterion.id
        );

        if (!gptCriterion) {
          return {
            ...templateCriterion,
            status: 'NOT_APPLICABLE' as CriterionStatus,
            score: 0,
            rationale: 'Not evaluated by AI',
            findings: [],
          };
        }

        return {
          ...templateCriterion,
          status: gptCriterion.status as CriterionStatus,
          score: gptCriterion.score,
          rationale: gptCriterion.rationale,
          findings: gptCriterion.findings || [],
        };
      });

      return {
        ...templateCategory,
        criteria,
      };
    });

    return { categories };
  }

  /**
   * Calculate category scores with criterion weighting
   *
   * @private
   * @param {ComplianceCategory[]} categories - Categories with evaluated criteria
   * @returns {ComplianceCategory[]} Categories with calculated scores
   */
  private calculateCategoryScores(
    categories: ComplianceCategory[]
  ): ComplianceCategory[] {
    return categories.map((category) => {
      // Filter applicable criteria
      const applicable = category.criteria.filter(
        (c) => c.status !== 'NOT_APPLICABLE'
      );

      if (applicable.length === 0) {
        return {
          ...category,
          score: 0,
          status: 'NEEDS_IMPROVEMENT' as AuditStatus,
          rationale: 'No applicable criteria for this incident',
        };
      }

      // Calculate total weight of applicable criteria
      const totalWeight = applicable.reduce((sum, c) => sum + c.weight, 0);

      // Calculate weighted score
      const weightedSum = applicable.reduce((sum, c) => {
        const normalizedWeight = c.weight / totalWeight;
        const criterionScore = this.getCriterionScore(c.status!);
        return sum + criterionScore * normalizedWeight;
      }, 0);

      const score = Math.round(weightedSum);

      // Determine category status
      let status: AuditStatus;
      if (score >= 80) {
        status = 'PASS';
      } else if (score >= 60) {
        status = 'NEEDS_IMPROVEMENT';
      } else {
        status = 'FAIL';
      }

      return {
        ...category,
        score,
        status,
        rationale: `Category score: ${score}/100 (${applicable.length} applicable criteria)`,
      };
    });
  }

  /**
   * Get numeric score for criterion status
   *
   * @private
   * @param {CriterionStatus} status - Criterion status
   * @returns {number} Numeric score (0-100)
   */
  private getCriterionScore(status: CriterionStatus): number {
    switch (status) {
      case 'PASS':
        return 100;
      case 'PARTIAL':
        return 50;
      case 'FAIL':
        return 0;
      case 'NOT_APPLICABLE':
        return 0; // Should be filtered out
      default:
        return 0;
    }
  }

  /**
   * Calculate overall score from partial category results
   *
   * Uses only completed categories, normalizes weights.
   * This is used when JSON parsing fails but some categories succeeded.
   *
   * @private
   * @param {any[]} categoryResults - Partial category results
   * @returns {number} Normalized overall score (0-100)
   */
  private calculatePartialScore(categoryResults: any[]): number {
    const completed = categoryResults.filter(
      (r) => r.categoryScore !== undefined && r.categoryScore !== null
    );

    if (completed.length === 0) {
      return 0;
    }

    // Simple average for partial results (weights may not sum to 1.0)
    const sum = completed.reduce(
      (total, cat) => total + (cat.categoryScore || 0),
      0
    );
    return Math.round(sum / completed.length);
  }

  /**
   * Calculate overall score with category weighting
   *
   * @private
   * @param {ComplianceCategory[]} categories - Categories with scores
   * @returns {number} Overall weighted score (0-100)
   */
  private calculateOverallScore(categories: ComplianceCategory[]): number {
    // Filter categories that have applicable criteria
    const applicable = categories.filter((c) => (c.score || 0) > 0);

    if (applicable.length === 0) {
      return 0;
    }

    // Calculate total weight of applicable categories
    const totalWeight = applicable.reduce((sum, c) => sum + c.weight, 0);

    // Handle case where all weights are zero (prevents division by zero)
    if (totalWeight === 0) {
      logger.warn('All category weights are zero, defaulting to 0.0 score', {
        component: 'compliance-service',
        operation: 'calculate-overall-score',
        categoryCount: applicable.length,
      });
      return 0.0;
    }

    // Calculate weighted average
    const weightedSum = applicable.reduce((sum, c) => {
      const normalizedWeight = c.weight / totalWeight;
      return sum + (c.score || 0) * normalizedWeight;
    }, 0);

    return Math.round(weightedSum);
  }

  /**
   * Determine overall audit status based on score
   *
   * @private
   * @param {number} score - Overall score
   * @returns {AuditStatus} Overall status
   */
  private determineOverallStatus(score: number): AuditStatus {
    if (score >= 80) return 'PASS';
    if (score >= 60) return 'NEEDS_IMPROVEMENT';
    return 'FAIL';
  }

  /**
   * Extract all findings from categories
   *
   * @private
   * @param {ComplianceCategory[]} categories - Categories with findings
   * @returns {Finding[]} All findings
   */
  private extractAllFindings(categories: ComplianceCategory[]): Finding[] {
    const findings: Finding[] = [];

    categories.forEach((category) => {
      category.criteria.forEach((criterion) => {
        if (criterion.findings && criterion.findings.length > 0) {
          criterion.findings.forEach((finding) => {
            findings.push({
              ...finding,
              criterionId: criterion.id,
            });
          });
        }
      });
    });

    return findings;
  }

  /**
   * Generate actionable recommendations
   *
   * @private
   * @param {ComplianceCategory[]} categories - Evaluated categories
   * @param {Finding[]} findings - All findings
   * @returns {Recommendation[]} Generated recommendations
   */
  private generateRecommendations(
    categories: ComplianceCategory[],
    findings: Finding[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Analyze each category for improvement areas
    categories.forEach((category) => {
      const failedCriteria = category.criteria.filter(
        (c) => c.status === 'FAIL' || c.status === 'PARTIAL'
      );

      if (failedCriteria.length > 0) {
        // Group by severity
        const criticalFails = failedCriteria.filter(
          (c) => c.scoringMethod === 'CRITICAL_PASS_FAIL' && c.status === 'FAIL'
        );
        const partialCompliance = failedCriteria.filter(
          (c) => c.status === 'PARTIAL'
        );

        // Critical failures
        if (criticalFails.length > 0) {
          recommendations.push({
            priority: 'HIGH',
            category: category.name,
            description: `Critical compliance gaps identified in ${category.name}`,
            actionItems: criticalFails.map(
              (c) => `Address: ${c.description}`
            ),
            resources: category.regulatoryReferences || [],
          });
        }

        // Partial compliance
        if (partialCompliance.length > 0) {
          recommendations.push({
            priority: 'MEDIUM',
            category: category.name,
            description: `Improve consistency in ${category.name}`,
            actionItems: partialCompliance.map(
              (c) => `Strengthen: ${c.description}`
            ),
            resources: category.regulatoryReferences || [],
          });
        }
      }
    });

    // Analyze negative findings
    const highSeverityFindings = findings.filter(
      (f) => f.compliance === 'NEGATIVE' && f.significance === 'HIGH'
    );

    if (highSeverityFindings.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Critical Issues',
        description: 'Address high-severity compliance violations',
        actionItems: highSeverityFindings.map(
          (f) => `Review: ${f.quote} - ${f.explanation}`
        ),
      });
    }

    return recommendations;
  }

  /**
   * Generate audit summary
   *
   * @private
   * @param {number} overallScore - Overall score
   * @param {AuditStatus} overallStatus - Overall status
   * @param {ComplianceCategory[]} categories - Evaluated categories
   * @param {Finding[]} findings - All findings
   * @returns {string} Executive summary
   */
  private generateSummary(
    overallScore: number,
    overallStatus: AuditStatus,
    categories: ComplianceCategory[],
    findings: Finding[]
  ): string {
    const passedCategories = categories.filter((c) => c.status === 'PASS');
    const failedCategories = categories.filter((c) => c.status === 'FAIL');
    const positiveFindings = findings.filter((f) => f.compliance === 'POSITIVE');
    const negativeFindings = findings.filter((f) => f.compliance === 'NEGATIVE');

    return `Overall Compliance Score: ${overallScore}/100 (${overallStatus})

Category Performance:
- ${passedCategories.length} categories passed
- ${failedCategories.length} categories failed
- ${categories.length - passedCategories.length - failedCategories.length} categories need improvement

Key Findings:
- ${positiveFindings.length} positive compliance examples identified
- ${negativeFindings.length} compliance gaps or violations noted

${
  failedCategories.length > 0
    ? `Priority Areas for Improvement:\n${failedCategories
        .map((c) => `- ${c.name}: ${c.rationale}`)
        .join('\n')}`
    : 'No critical areas requiring immediate attention.'
}`;
  }

  /**
   * Get audit by ID
   *
   * @param {string} auditId - Audit ID
   * @returns {Promise<AuditResult>} Audit result
   * @throws {ServiceError} If audit not found
   */
  async getAudit(auditId: string): Promise<AuditResult> {
    try {
      const audit = await prisma.audit.findUnique({
        where: { id: auditId },
        include: {
          incident: true,
          transcript: true,
          template: true,
        },
      });

      if (!audit) {
        throw Errors.notFound('Audit', auditId);
      }

      const findings = audit.findings as any as { categories: ComplianceCategory[]; findings: Finding[] };

      return {
        id: audit.id,
        incidentId: audit.incidentId,
        transcriptId: audit.transcriptId || undefined,
        templateId: audit.templateId,
        overallStatus: audit.overallStatus as AuditStatus,
        overallScore: audit.overallScore || 0,
        summary: audit.summary,
        categories: findings.categories || [],
        findings: findings.findings || [],
        recommendations: audit.recommendations as any as Recommendation[],
        metadata: audit.metadata as any as AuditMetadata,
        createdAt: audit.createdAt,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw Errors.processingFailed(
        'Audit retrieval',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Execute modular compliance audit (category-by-category)
   *
   * This method implements a sequential, category-by-category scoring approach
   * that provides better error handling, progress tracking, and partial results
   * compared to the monolithic auditTranscript() method.
   *
   * **Key Features**:
   * - Sequential processing: One category at a time
   * - Progress callbacks: Real-time status updates
   * - Graceful error handling: Category failures don't abort the audit
   * - Partial result saving: Resume interrupted audits
   * - Per-category token tracking: Better cost visibility
   *
   * **Workflow**:
   * 1. Load transcript and template from database
   * 2. Extract incident context
   * 3. Loop through each category:
   *    - Call analyzeCategory() from OpenAI service
   *    - Invoke progress callback (if provided)
   *    - Save partial result to database (if enabled)
   *    - Handle errors gracefully (continue with remaining categories)
   * 4. Generate final narrative summary
   * 5. Calculate overall weighted score
   * 6. Save complete audit to database
   * 7. Return full audit results
   *
   * @param {string} transcriptId - Transcript ID to audit
   * @param {string} templateId - Compliance template ID
   * @param {ModularAuditOptions} options - Execution options
   * @returns {Promise<AuditResult>} Complete audit result with all categories
   * @throws {ServiceError} If critical failure occurs (transcript/template not found)
   *
   * @example
   * ```typescript
   * // Basic usage
   * const audit = await complianceService.executeModularAudit(
   *   'transcript-123',
   *   'template-456'
   * );
   *
   * // With progress tracking
   * const audit = await complianceService.executeModularAudit(
   *   'transcript-123',
   *   'template-456',
   *   {
   *     onProgress: (current, total, categoryName) => {
   *       console.log(`Processing ${categoryName} (${current}/${total})`);
   *     },
   *     savePartialResults: true
   *   }
   * );
   * ```
   */
  async executeModularAudit(
    transcriptId: string,
    templateId: string,
    options?: ModularAuditOptions
  ): Promise<AuditResult> {
    const startTime = Date.now();
    const correlationId = options?.correlationId || generateCorrelationId();
    const auditId = correlationId.replace('cor_', 'audit_');

    // Initialize tracking variables before try block for error handling visibility
    // eslint-disable-next-line prefer-const
    let categoryResults: CategoryAnalysisResult[] = [];
    // eslint-disable-next-line prefer-const
    let failedCategories: string[] = [];
    let categories: ComplianceCategory[] = [];

    try {
      // Step 1: Fetch transcript and template
      const transcript = await prisma.transcript.findUnique({
        where: { id: transcriptId },
        include: {
          incident: {
            include: {
              units: true,
            },
          },
        },
      });

      if (!transcript) {
        throw Errors.notFound('Transcript', transcriptId);
      }


      // Validate incident exists and is not resolved
      if (!transcript.incident) {
        throw Errors.invalidInput(
          'transcriptId',
          'Transcript must be associated with an incident'
        );
      }

      if (transcript.incident.status === 'RESOLVED') {
        logger.warn('Skipping audit for resolved incident', {
          component: 'compliance-service',
          operation: 'modular-audit',
          incidentId: transcript.incident.id,
          incidentNumber: transcript.incident.number,
          status: transcript.incident.status,
          correlationId,
        });

        throw Errors.invalidInput(
          'incidentId',
          `Cannot audit resolved incident ${transcript.incident.number}. Audits must be run while incident is active.`
        );
      }

      // Validate transcript has content
      validateContentNotEmpty(transcript.text, 'transcript.text');

      // Validate transcript has sufficient content for analysis
      if (transcript.text.trim().length < 10) {
        throw Errors.invalidInput(
          'transcriptId',
          'Transcript text is too short for meaningful analysis'
        );
      }

      // Warn if transcript has no segments (may have limited context)
      if (!transcript.segments || (transcript.segments as any[]).length === 0) {
        logger.warn('Transcript has no segments, audit may have limited context', {
          component: 'compliance-service',
          operation: 'modular-audit',
          transcriptId: transcript.id,
          textLength: transcript.text?.length || 0,
          correlationId,
        });
      }

      const template = await templateService.getTemplateById(templateId);
      categories = template.categories as any as ComplianceCategory[];

      // Log audit start
      logAuditStart(auditId, templateId, transcriptId, categories.length, {
        incidentId: transcript.incidentId,
        incidentType: transcript.incident?.type,
        correlationId,
      });

      // Step 2: Extract incident context
      const incidentContext: IncidentContext = {
        type: transcript.incident?.type || undefined,
        date: transcript.incident?.startTime || undefined,
        units: transcript.incident?.units?.map((u) => u.number) || [],
        notes: options?.additionalNotes,
      };

      // Step 3: Initialize tracking variables (now declared at function scope)
      const categoryTokenUsage: Record<string, number> = {};
      let totalTokens = 0;

      // Step 4: Build category weights map for scoring
      const categoryWeights = new Map<string, number>();
      categories.forEach((cat) => {
        categoryWeights.set(cat.name, cat.weight);
      });

      // Step 5: Loop through each category sequentially
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const progress = `${i + 1}/${categories.length}`;
        const categoryStartTime = Date.now();

        try {
          // Log category scoring start
          logCategoryScoring(
            auditId,
            category.name,
            progress,
            category.criteria.length,
            { categoryWeight: category.weight, correlationId }
          );

          // Transform ComplianceCategory to TemplateCategory format
          const templateCategory = {
            id: category.name.toLowerCase().replace(/\s+/g, '-'),
            name: category.name,
            description: category.description || '',
            weight: category.weight,
            criteria: category.criteria.map((c) => ({
              id: c.id,
              description: c.description,
              scoringGuidance: c.evidenceRequired,
              examplePass: undefined,
              exampleFail: undefined,
            })),
            analysisPrompt: `Analyze compliance for: ${category.name}`,
          };

          // Call modular scoring function (analyzeCategory from OpenAI service)
          // Wrapped in circuit breaker with content moderation error handling
          let result: CategoryAnalysisResult;

          try {
            result = await circuitBreakers.openaiGPT4.execute(async () => {
              return await analyzeCategory(
                transcript.text,
                incidentContext,
                templateCategory,
                {
                  model: 'gpt-4.1',  // ⚠️ DO NOT change this model
                  temperature: 0.3, // Low temperature for consistency
                }
              );
            });
          } catch (error) {
            // Check for OpenAI content policy violation
            if (error instanceof OpenAI.APIError && error.code === 'content_policy_violation') {
              logger.warn('Content moderation refusal from OpenAI', {
                component: 'compliance-service',
                operation: 'category-scoring',
                categoryName: category.name,
                transcriptId,
                templateId,
                errorCode: error.code,
                errorMessage: error.message,
              });

              // Return placeholder result instead of failing
              result = {
                category: category.name,
                categoryScore: 0,
                criteriaScores: [],
                overallAnalysis: 'Content analysis was refused by OpenAI content moderation policy.',
                strengths: [],
                weaknesses: ['Unable to analyze content due to policy restrictions'],
                recommendations: [
                  'Review transcript content for policy violations',
                  'Contact system administrator if you believe this is in error',
                ],
                keyFindings: ['Content moderation refusal'],
                moderationRefused: true,
              } as any; // Type cast for moderationRefused flag
            } else {
              // Re-throw non-moderation errors
              throw error;
            }
          }

          categoryResults.push(result);

          // Calculate category duration and log completion
          const categoryDuration = Date.now() - categoryStartTime;
          const categoryScore = Math.round(result.categoryScore * 100);
          const categoryStatus = this.determineOverallStatus(categoryScore);

          logCategoryScoringComplete(
            auditId,
            category.name,
            categoryScore,
            categoryStatus as any,
            categoryDuration,
            { criteriaScored: result.criteriaScores.length, correlationId }
          );

          // Track token usage (estimated)
          const estimatedTokens = Math.round(
            (transcript.text.length + JSON.stringify(category).length) / 4
          );
          categoryTokenUsage[category.name] = estimatedTokens;
          totalTokens += estimatedTokens;

          // Invoke progress callback
          if (options?.onProgress) {
            options.onProgress(i + 1, categories.length, category.name);
          }

          // Save partial results (if enabled)
          if (options?.savePartialResults) {
            await this.savePartialCategoryScore(
              transcriptId,
              templateId,
              result
            );

            // Log partial result save
            logPartialResultSave(auditId, category.name, categoryScore, { correlationId });
          }

          // Log progress every 3 categories
          if ((i + 1) % 3 === 0 || (i + 1) === categories.length) {
            const currentAvgScore = categoryResults.reduce((sum, r) => sum + r.categoryScore, 0) / categoryResults.length;
            logAuditProgress(
              auditId,
              i + 1,
              categories.length,
              Math.round(currentAvgScore * 100),
              { correlationId }
            );
          }
        } catch (categoryError) {
          // Log category scoring error
          logCategoryScoringError(
            auditId,
            category.name,
            categoryError instanceof Error ? categoryError : new Error(String(categoryError)),
            { criteriaCount: category.criteria.length, correlationId }
          );

          // Handle category failure gracefully - log as warning instead of error
          logger.warn('Category analysis failed, using placeholder result', {
            component: 'compliance-service',
            operation: 'modular-audit-category',
            auditId,
            category: category.name,
            error: categoryError instanceof Error ? categoryError.message : String(categoryError),
            progress,
            correlationId,
          });

          failedCategories.push(category.name);

          // Add placeholder result instead of failing entire audit
          categoryResults.push({
            category: category.name,
            categoryScore: 0,
            criteriaScores: [],
            overallAnalysis: `Category analysis failed: ${
              categoryError instanceof Error ? categoryError.message : 'Unknown error'
            }`,
            keyFindings: [],
            recommendations: [
              'Retry audit for this category',
            ],
            partialFailure: true, // Flag for partial failure
          } as any); // Type cast needed for partialFailure flag

          // Continue to next category instead of throwing
        }
      }

      // Step 6: Validate completeness
      const completeness = this.validateAuditCompleteness(
        categoryResults,
        categories
      );

      // Step 7: Calculate overall score
      const overallScore = calculateWeightedScore(
        categoryResults,
        categoryWeights
      );
      const overallScoreNormalized = Math.round(overallScore * 100); // Convert to 0-100
      const overallStatus = this.determineOverallStatus(overallScoreNormalized);

      // Step 8: Transform category results to database format
      const transformedCategories = this.transformCategoryResults(
        categoryResults,
        categories
      );

      // Step 9: Extract all findings
      const allFindings = this.extractAllFindingsFromResults(categoryResults);

      // Step 10: Generate recommendations
      const recommendations =
        this.generateRecommendationsFromResults(categoryResults);

      // Step 11: Generate final narrative
      logNarrativeGeneration(auditId, categoryResults.length, 0, { correlationId });
      const narrativeStartTime = Date.now();

      const auditResults: AuditResults = {
        overallScore,
        categories: categoryResults,
        criticalFindings: extractCriticalFindings({ overallScore, categories: categoryResults }),
      };
      const narrative = await generateAuditNarrative(auditResults);

      // Log narrative completion
      const narrativeDuration = Date.now() - narrativeStartTime;
      logNarrativeComplete(
        auditId,
        narrative.length,
        overallScoreNormalized,
        narrativeDuration,
        { correlationId }
      );

      // Step 12: Prepare metadata
      const processingTime = (Date.now() - startTime) / 1000;
      const metadata: AuditMetadata = {
        model: 'gpt-4.1',  // ⚠️ DO NOT change this model
        processingTime,
        tokenUsage: {
          prompt: Math.round(totalTokens * 0.6),
          completion: Math.round(totalTokens * 0.4),
          total: totalTokens,
        },
        additionalNotes: options?.additionalNotes,
        mode: 'modular' as any,
        failedCategories: failedCategories.length > 0 ? failedCategories : undefined,
        categoryTokenUsage: categoryTokenUsage as any,
        partialResultsSaved: options?.savePartialResults,
      } as any;

      // Step 13: Save audit to database (wrapped in transaction for atomicity)
      const audit = await withTransaction(async (tx) => {
        return await tx.audit.create({
          data: {
            incidentId: transcript.incidentId,
            transcriptId: transcript.id,
            templateId: template.id,
            overallScore: overallScoreNormalized,
            overallStatus,
            summary: narrative,
            findings: {
              categories: transformedCategories,
              findings: allFindings,
            } as any,
            recommendations: recommendations as any,
            metadata: metadata as any,
          },
        });
      });

      // Log audit completion
      const totalDuration = Date.now() - startTime;
      logAuditComplete(
        auditId,
        overallScoreNormalized,
        categoryResults.length,
        categories.length,
        totalDuration,
        {
          failedCategories,
          tokenUsage: totalTokens,
          partialResultsSaved: options?.savePartialResults,
          correlationId,
        }
      );

      // Step 14: Return formatted result
      return {
        id: audit.id,
        incidentId: audit.incidentId,
        transcriptId: audit.transcriptId || undefined,
        templateId: audit.templateId,
        overallStatus: audit.overallStatus as AuditStatus,
        overallScore: audit.overallScore || 0,
        summary: audit.summary,
        categories: transformedCategories,
        findings: allFindings,
        recommendations,
        metadata,
        createdAt: audit.createdAt,
      };
    } catch (error) {
      // Log audit error (use variables from outer scope)
      const completedCategories = categoryResults?.length || 0;
      const totalCategories = categories?.length || 0;
      const categoriesWithFailures = failedCategories || [];

      logAuditError(
        auditId,
        error instanceof Error ? error : new Error(String(error)),
        completedCategories,
        {
          totalCategories,
          failedCategories: categoriesWithFailures,
          correlationId: options?.correlationId,
        }
      );

      logger.error('Modular compliance audit failed', {
        component: 'compliance-audit',
        operation: 'execute-modular-audit',
        auditId,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
        correlationId: options?.correlationId,
      });

      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw Errors.processingFailed(
        'Modular compliance audit',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Convert CategoryAnalysisResult to Prisma-safe JSON format
   *
   * Ensures dates and complex types are properly serialized for database storage.
   * This avoids the unsafe JSON.parse(JSON.stringify()) anti-pattern.
   *
   * @private
   * @param {CategoryAnalysisResult} result - Category result to convert
   * @returns {Prisma.JsonValue} Prisma-compatible JSON value
   */
  private categoryResultToPrismaJson(result: CategoryAnalysisResult): Record<string, unknown> {
    return {
      category: result.category,
      categoryScore: result.categoryScore,
      criteriaScores: result.criteriaScores.map(score => ({
        criterionId: score.criterionId,
        score: score.score,
        confidence: score.confidence,
        evidence: score.evidence.map(ev => ({
          timestamp: ev.timestamp,
          text: ev.text,
          type: ev.type,
        })),
        reasoning: score.reasoning,
        impact: score.impact,
        recommendation: score.recommendation ?? null,
      })),
      overallAnalysis: result.overallAnalysis,
      keyFindings: result.keyFindings,
      recommendations: result.recommendations,
    };
  }

  /**
   * Transform modular category results to ComplianceCategory format
   *
   * Converts CategoryAnalysisResult objects from the OpenAI service
   * to ComplianceCategory objects for database storage.
   *
   * @private
   * @param {CategoryAnalysisResult[]} categoryResults - Results from analyzeCategory()
   * @param {ComplianceCategory[]} templateCategories - Original template categories
   * @returns {ComplianceCategory[]} Transformed categories with scores and findings
   * @throws {Error} If category or criterion not found in template
   */
  private transformCategoryResults(
    categoryResults: CategoryAnalysisResult[],
    templateCategories: ComplianceCategory[]
  ): ComplianceCategory[] {
    return categoryResults.map((result) => {
      // Find matching template category
      const templateCategory = templateCategories.find(
        (tc) => tc.name === result.category
      );

      if (!templateCategory) {
        throw new Error(
          `Template category not found: ${result.category}`
        );
      }

      // Transform criteria scores to criteria
      const criteria: ComplianceCriterion[] = result.criteriaScores.map(
        (score) => {
          const templateCriterion = templateCategory.criteria.find(
            (c) => c.id === score.criterionId
          );

          if (!templateCriterion) {
            logger.warn('Criterion not found in template, using default score', {
              component: 'compliance-service',
              operation: 'transform-category-results',
              category: result.category,
              criterionId: score.criterionId,
            });

            // Use default score instead of failing
            const findings: Finding[] = score.evidence.map((ev) => ({
              timestamp: normalizeTimestamp(ev.timestamp),
              quote: ev.text,
              compliance:
                ev.type === 'VIOLATION'
                  ? 'NEGATIVE'
                  : ev.type === 'COMPLIANCE'
                    ? 'POSITIVE'
                    : 'NEUTRAL',
              significance:
                score.impact === 'CRITICAL' ? 'HIGH' : score.impact || 'MEDIUM',
              explanation: score.reasoning,
              criterionId: score.criterionId,
            }));

            return {
              id: score.criterionId,
              description: 'Unknown Criterion',
              evidenceRequired: '',
              scoringMethod: 'NUMERIC',
              weight: 0,
              status: 'NOT_APPLICABLE' as CriterionStatus,
              score: 0,
              rationale: 'Criterion not found in template',
              findings,
              recommendations: [],
            };
          }

          // Convert evidence to findings with timestamp normalization
          const findings: Finding[] = score.evidence.map((ev) => ({
            timestamp: normalizeTimestamp(ev.timestamp),
            quote: ev.text,
            compliance:
              ev.type === 'VIOLATION'
                ? 'NEGATIVE'
                : ev.type === 'COMPLIANCE'
                  ? 'POSITIVE'
                  : 'NEUTRAL',
            significance:
              score.impact === 'CRITICAL' ? 'HIGH' : score.impact || 'MEDIUM',
            explanation: score.reasoning,
            criterionId: score.criterionId,
          }));

          // Validate and normalize score
          const numericScore = this.convertScoreToNumeric(score.score);
          const validatedScore = validateCriterionScore(numericScore, score.criterionId);

          return {
            ...templateCriterion,
            status: score.score as CriterionStatus,
            score: validatedScore,
            rationale: score.reasoning,
            findings,
            recommendations: score.recommendation
              ? [score.recommendation]
              : [],
          };
        }
      );

      // Calculate category score (0-100)
      const categoryScore = Math.round(result.categoryScore * 100);

      return {
        ...templateCategory,
        criteria,
        score: categoryScore,
        status: this.determineOverallStatus(categoryScore),
        rationale: result.overallAnalysis,
      };
    });
  }

  /**
   * Convert score string to numeric value
   *
   * @private
   * @param {string} score - Score value (PASS, FAIL, NOT_APPLICABLE)
   * @returns {number} Numeric score (0-100)
   */
  private convertScoreToNumeric(
    score: 'PASS' | 'FAIL' | 'NOT_APPLICABLE'
  ): number {
    switch (score) {
      case 'PASS':
        return 100;
      case 'FAIL':
        return 0;
      case 'NOT_APPLICABLE':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Extract all findings from category results
   *
   * @private
   * @param {CategoryAnalysisResult[]} categoryResults - Results from analyzeCategory()
   * @returns {Finding[]} Flattened array of all findings across categories
   */
  private extractAllFindingsFromResults(
    categoryResults: CategoryAnalysisResult[]
  ): Finding[] {
    const findings: Finding[] = [];

    categoryResults.forEach((categoryResult) => {
      categoryResult.criteriaScores.forEach((score) => {
        score.evidence.forEach((ev) => {
          findings.push({
            timestamp: normalizeTimestamp(ev.timestamp),
            quote: ev.text,
            compliance:
              ev.type === 'VIOLATION'
                ? 'NEGATIVE'
                : ev.type === 'COMPLIANCE'
                  ? 'POSITIVE'
                  : 'NEUTRAL',
            significance:
              score.impact === 'CRITICAL' ? 'HIGH' : score.impact || 'MEDIUM',
            explanation: score.reasoning,
            criterionId: score.criterionId,
          });
        });
      });
    });

    return findings;
  }

  /**
   * Generate recommendations from category results
   *
   * @private
   * @param {CategoryAnalysisResult[]} categoryResults - Results from analyzeCategory()
   * @returns {Recommendation[]} Prioritized recommendations for improvement
   */
  private generateRecommendationsFromResults(
    categoryResults: CategoryAnalysisResult[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    categoryResults.forEach((categoryResult) => {
      // Extract category-level recommendations
      if (
        categoryResult.recommendations &&
        categoryResult.recommendations.length > 0
      ) {
        recommendations.push({
          priority: categoryResult.categoryScore < 0.6 ? 'HIGH' : 'MEDIUM',
          category: categoryResult.category,
          description: `Improve performance in ${categoryResult.category}`,
          actionItems: categoryResult.recommendations,
        });
      }

      // Extract criterion-level recommendations
      categoryResult.criteriaScores.forEach((score) => {
        if (score.score === 'FAIL' && score.recommendation) {
          recommendations.push({
            priority:
              score.impact === 'CRITICAL' || score.impact === 'HIGH'
                ? 'HIGH'
                : 'MEDIUM',
            category: categoryResult.category,
            description: score.recommendation,
            actionItems: [score.reasoning],
          });
        }
      });
    });

    // Sort by priority (HIGH first)
    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Save partial category score to database
   *
   * Stores intermediate category results to enable audit resumption
   * if the process is interrupted.
   *
   * @private
   * @param {string} transcriptId - Transcript ID
   * @param {string} templateId - Template ID
   * @param {CategoryAnalysisResult} categoryResult - Category result to save
   */
  private async savePartialCategoryScore(
    transcriptId: string,
    templateId: string,
    categoryResult: CategoryAnalysisResult
  ): Promise<void> {
    try {
      // Store partial result in SystemMetrics for now
      // (Could be moved to dedicated PartialAudit table in future)
      await prisma.systemMetrics.create({
        data: {
          metricName: 'partial_audit_category',
          metricValue: categoryResult.categoryScore,
          metadata: {
            transcriptId,
            templateId,
            categoryName: categoryResult.category,
            result: this.categoryResultToPrismaJson(categoryResult),
          } as any,
        },
      });
    } catch (error) {
      // Log error but don't throw (partial save is optional)
      logger.error('Failed to save partial category score', {
        component: 'compliance-service',
        operation: 'save-partial-category',
        transcriptId,
        templateId,
        categoryName: categoryResult.category,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Validate audit completeness
   *
   * Checks that all expected categories were scored and identifies
   * any missing or failed categories.
   *
   * @private
   * @param {CategoryAnalysisResult[]} categoryResults - Scored categories
   * @param {ComplianceCategory[]} templateCategories - Expected categories
   * @returns {object} Completeness report
   */
  private validateAuditCompleteness(
    categoryResults: CategoryAnalysisResult[],
    templateCategories: ComplianceCategory[]
  ): {
    isComplete: boolean;
    missingCategories: string[];
    failedCategories: string[];
  } {
    const scoredCategoryNames = new Set(
      categoryResults.map((r) => r.category)
    );
    const expectedCategoryNames = templateCategories.map((c) => c.name);

    const missingCategories = expectedCategoryNames.filter(
      (name) => !scoredCategoryNames.has(name)
    );

    const failedCategories = categoryResults
      .filter((r) => r.categoryScore === 0 && r.criteriaScores.length === 0)
      .map((r) => r.category);

    return {
      isComplete: missingCategories.length === 0 && failedCategories.length === 0,
      missingCategories,
      failedCategories,
    };
  }
}

/**
 * Singleton compliance service instance
 */
export const complianceService = new ComplianceService();
