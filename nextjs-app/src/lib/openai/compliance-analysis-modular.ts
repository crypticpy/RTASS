/**
 * Modular Compliance Analysis Integration
 *
 * ⚠️ CRITICAL: This module MUST use the following:
 * - Model: gpt-4.1 (DO NOT change to gpt-4o, gpt-4-turbo, or any other model)
 * - API: client.responses.create() Responses API (DO NOT use chat.completions.create())
 *
 * These are project requirements. Do not substitute or change these values.
 * Any changes will cause production failures.
 *
 * Category-by-category compliance scoring using GPT-4.1 with structured outputs.
 * Each category is analyzed independently with laser-focused AI attention,
 * then a final narrative is generated from all results.
 *
 * Benefits over monolithic approach:
 * - Higher accuracy (AI focuses on one category at a time)
 * - Better token management (no token limit issues)
 * - Graceful degradation (one category failure doesn't lose all work)
 * - Parallelizable (can analyze categories concurrently if needed)
 *
 * @module lib/openai/compliance-analysis-modular
 */

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { openai } from './client';
import {
  AnalysisError,
  RateLimitError,
  ServiceUnavailableError,
  ContextLengthExceededError,
} from './errors';
import {
  retryWithBackoff,
  estimateTokens,
  logAPICall,
  extractResponseText,
} from './utils';
import {
  CategoryScoreSchema,
  AuditNarrativeSchema,
  type CategoryScore,
  type AuditNarrative,
  type CriterionScore,
  type EvidenceItem,
} from '@/lib/schemas/compliance-analysis.schema';
import type { TemplateCategory } from '@/types/policy';
import { wrapOpenAICall, logOpenAISchemaValidation, logger } from '@/lib/logging';
import { circuitBreakers } from '@/lib/utils/circuitBreaker';
import { requestQueues } from '@/lib/utils/requestQueue';
import { Errors } from '@/lib/services/utils/errorHandlers';

/**
 * Transcript segment with timestamp
 */
export interface TranscriptSegment {
  id: string;
  startTime: number; // seconds
  endTime: number; // seconds
  text: string;
  speaker?: string;
  confidence?: number;
}

/**
 * Context about the incident being analyzed
 */
export interface IncidentContext {
  type?: string;
  date?: Date;
  units?: string[];
  location?: string;
  notes?: string;
}

/**
 * Options for single category scoring
 */
export interface CategoryScoringOptions {
  /** OpenAI model to use (defaults to gpt-4.1) */
  model?: string;
  /** Temperature for AI generation (defaults to 0.3 for consistency) */
  temperature?: number;
}

/**
 * Options for narrative generation
 */
export interface NarrativeGenerationOptions {
  /** OpenAI model to use (defaults to gpt-4.1) */
  model?: string;
  /** Temperature for AI generation (defaults to 0.5 for creativity) */
  temperature?: number;
}

/**
 * Default GPT model for compliance analysis
 *
 * ⚠️ WARNING: DO NOT CHANGE THIS VALUE
 * This project requires gpt-4.1 specifically. Do not substitute with any other model.
 *
 * Changing this will cause production failures.
 */
const DEFAULT_MODEL = 'gpt-4.1';

/**
 * Default temperature for category scoring (low for consistency)
 */
const DEFAULT_CATEGORY_TEMPERATURE = 0.3;

/**
 * Default temperature for narrative generation (higher for natural language)
 */
const DEFAULT_NARRATIVE_TEMPERATURE = 0.5;

/**
 * System prompt for focused category analysis
 */
const CATEGORY_ANALYSIS_SYSTEM_PROMPT = `You are a fire service compliance auditor analyzing radio communications transcripts.

Your task is to objectively evaluate ONE specific category of compliance criteria against a radio transcript.

CRITICAL GUIDELINES:
- Use EXACT transcript text for all evidence (verbatim quotes)
- Include precise timestamps in MM:SS or HH:MM:SS format (e.g., "02:45" or "01:23:45")
- Be objective and specific in your reasoning
- Identify both violations AND examples of compliance
- Provide actionable, specific recommendations
- Consider the operational context of emergency incidents
- Use NOT_APPLICABLE when criteria don't apply to this specific incident
- For PARTIAL scores: explain what was done correctly and what was missed
- Focus ONLY on the category and criteria provided - ignore other aspects

SCORING PHILOSOPHY:
- PASS (100): Criterion fully met, no issues
- PARTIAL (50-90): Some compliance but with gaps or minor issues
- FAIL (0-40): Clear violation or significant non-compliance
- NOT_APPLICABLE: Criterion doesn't apply to this incident type/context

EVIDENCE QUALITY:
- Supporting: Evidence shows compliance with the criterion
- Contradicting: Evidence shows violation or non-compliance
- Contextual: Provides background but doesn't directly prove/disprove`;

/**
 * System prompt for audit narrative generation
 */
const NARRATIVE_GENERATION_SYSTEM_PROMPT = `You are an expert fire service compliance auditor writing an executive summary.

Your task is to synthesize category-level analysis results into a comprehensive, professional audit narrative suitable for fire department leadership.

GUIDELINES:
- Write in clear, professional language avoiding jargon where possible
- Focus on actionable insights and specific recommendations
- Acknowledge both strengths and areas for improvement
- Prioritize safety-critical findings
- Provide constructive, supportive feedback
- Include specific examples from the transcript where relevant
- Organize recommendations by priority (HIGH, MEDIUM, LOW)
- Identify training opportunities based on observed patterns`;

/**
 * Create user prompt for category scoring
 *
 * Constructs a focused prompt for analyzing a single category against the transcript.
 *
 * @param transcriptText Full transcript text
 * @param transcriptSegments Timed transcript segments
 * @param category Category to analyze
 * @param incidentContext Context about the incident
 * @returns Formatted user prompt
 */
function createCategoryScoringPrompt(
  transcriptText: string,
  transcriptSegments: TranscriptSegment[],
  category: TemplateCategory,
  incidentContext: IncidentContext
): string {
  let prompt = `INCIDENT CONTEXT:\n`;
  if (incidentContext.type) {
    prompt += `- Incident Type: ${incidentContext.type}\n`;
  }
  if (incidentContext.date) {
    prompt += `- Date: ${incidentContext.date.toISOString().split('T')[0]}\n`;
  }
  if (incidentContext.location) {
    prompt += `- Location: ${incidentContext.location}\n`;
  }
  if (incidentContext.units && incidentContext.units.length > 0) {
    prompt += `- Units Involved: ${incidentContext.units.join(', ')}\n`;
  }
  if (incidentContext.notes) {
    prompt += `- Additional Notes: ${incidentContext.notes}\n`;
  }
  prompt += '\n';

  prompt += `RADIO TRANSCRIPT:\n${transcriptText}\n\n`;

  prompt += `CATEGORY TO ANALYZE: ${category.name}\n`;
  if (category.description) {
    prompt += `CATEGORY DESCRIPTION: ${category.description}\n`;
  }
  prompt += `CATEGORY WEIGHT: ${(category.weight * 100).toFixed(0)}%\n\n`;

  if (category.analysisPrompt) {
    prompt += `ANALYSIS GUIDANCE:\n${category.analysisPrompt}\n\n`;
  }

  prompt += `CRITERIA TO EVALUATE:\n`;
  category.criteria.forEach((criterion, idx) => {
    prompt += `\n${idx + 1}. Criterion ID: ${criterion.id}\n`;
    prompt += `   Description: ${criterion.description}\n`;
    prompt += `   Scoring Guidance: ${criterion.scoringGuidance}\n`;
    if (criterion.examplePass) {
      prompt += `   Example of PASS: ${criterion.examplePass}\n`;
    }
    if (criterion.exampleFail) {
      prompt += `   Example of FAIL: ${criterion.exampleFail}\n`;
    }
    if (criterion.sourceText) {
      prompt += `   Policy Reference: ${criterion.sourceText}\n`;
    }
    if (criterion.sourcePageNumber) {
      prompt += `   Source Page: ${criterion.sourcePageNumber}\n`;
    }
  });

  prompt += `\n\nTASK:
For each criterion listed above, provide:
1. Score: PASS (100), PARTIAL (50-90), FAIL (0-40), or NOT_APPLICABLE (null)
2. Confidence: Your confidence in this assessment (0.0 to 1.0)
3. Evidence: Specific transcript excerpts with timestamps (verbatim quotes)
4. Reasoning: Clear explanation (2-3 sentences) of why this score was assigned
5. Recommendation: Specific action to address issues (for PARTIAL/FAIL scores only)

Your response must match the CategoryScoreSchema structure exactly.`;

  return prompt;
}

/**
 * Create user prompt for narrative generation
 *
 * Constructs a prompt for generating the final audit narrative from all category scores.
 *
 * @param transcriptText Full transcript text
 * @param categoryScores All category analysis results
 * @param incidentContext Context about the incident
 * @returns Formatted user prompt
 */
function createNarrativePrompt(
  transcriptText: string,
  categoryScores: CategoryScore[],
  incidentContext: IncidentContext
): string {
  let prompt = `INCIDENT CONTEXT:\n`;
  if (incidentContext.type) {
    prompt += `- Incident Type: ${incidentContext.type}\n`;
  }
  if (incidentContext.date) {
    prompt += `- Date: ${incidentContext.date.toISOString().split('T')[0]}\n`;
  }
  if (incidentContext.location) {
    prompt += `- Location: ${incidentContext.location}\n`;
  }
  if (incidentContext.units && incidentContext.units.length > 0) {
    prompt += `- Units Involved: ${incidentContext.units.join(', ')}\n`;
  }
  prompt += '\n';

  prompt += `CATEGORY ANALYSIS RESULTS:\n`;
  categoryScores.forEach((category, idx) => {
    prompt += `\n${idx + 1}. ${category.categoryName}\n`;
    prompt += `   Overall Score: ${category.overallCategoryScore}/100\n`;
    prompt += `   Status: ${category.categoryStatus}\n`;
    prompt += `   Summary: ${category.summary}\n`;
    if (category.criticalFindings.length > 0) {
      prompt += `   Critical Findings:\n`;
      category.criticalFindings.forEach((finding) => {
        prompt += `   - ${finding}\n`;
      });
    }
  });

  prompt += `\n\nTRANSCRIPT EXCERPT (for reference):\n`;
  // Include first 2000 characters of transcript for context
  prompt += transcriptText.substring(0, 2000);
  if (transcriptText.length > 2000) {
    prompt += `\n... (transcript continues for ${transcriptText.length - 2000} more characters)`;
  }

  prompt += `\n\nTASK:
Generate a comprehensive audit narrative that:

1. EXECUTIVE SUMMARY (3-5 paragraphs):
   - Overview of the audit scope and methodology
   - Overall performance assessment
   - Key findings (both positive and negative)
   - Critical safety concerns (if any)
   - Forward-looking recommendations

2. STRENGTHS:
   - Specific compliance behaviors that were exemplary
   - Positive aspects of communication and operations
   - Best practices observed

3. AREAS FOR IMPROVEMENT:
   - Non-critical issues that should be addressed
   - Opportunities for enhanced performance
   - Training and development needs

4. CRITICAL ISSUES:
   - Immediate safety concerns requiring urgent attention
   - Critical policy violations
   - High-risk behaviors or patterns

5. PRIORITIZED RECOMMENDATIONS:
   - HIGH priority: Safety-critical, requires immediate action
   - MEDIUM priority: Important improvements, address soon
   - LOW priority: Enhancements for excellence
   - Each recommendation should include specific action items

6. COMPLIANCE HIGHLIGHTS:
   - Noteworthy actions that exceeded baseline compliance
   - Examples of exceptional performance under pressure

Your response must match the AuditNarrativeSchema structure exactly.`;

  return prompt;
}

/**
 * Score a single category against the transcript
 *
 * Analyzes one category of compliance criteria with laser-focused AI attention.
 * Uses GPT-4.1 with structured outputs (Zod schema enforcement) to ensure
 * valid, type-safe responses.
 *
 * @param transcriptText Full radio transcript
 * @param transcriptSegments Timed transcript segments with timestamps
 * @param category Template category to analyze
 * @param incidentContext Context about the incident
 * @param options Scoring options
 * @returns Validated category score
 * @throws AnalysisError if scoring fails or AI refuses
 *
 * @example
 * ```typescript
 * const categoryScore = await scoreSingleCategory(
 *   transcript,
 *   segments,
 *   communicationCategory,
 *   {
 *     type: 'STRUCTURE_FIRE',
 *     date: new Date(),
 *     units: ['Engine 1', 'Ladder 2']
 *   }
 * );
 *
 * console.log(`Category: ${categoryScore.categoryName}`);
 * console.log(`Score: ${categoryScore.overallCategoryScore}/100`);
 * console.log(`Status: ${categoryScore.categoryStatus}`);
 * ```
 */
export async function scoreSingleCategory(
  transcriptText: string,
  transcriptSegments: TranscriptSegment[],
  category: TemplateCategory,
  incidentContext: IncidentContext,
  options: CategoryScoringOptions = {}
): Promise<CategoryScore> {
  try {
    // Validate inputs
    if (!transcriptText || transcriptText.trim().length === 0) {
      throw new AnalysisError('Transcript text is empty', category.name);
    }

    if (!category || !category.criteria || category.criteria.length === 0) {
      throw new AnalysisError('Category has no criteria to analyze', category.name);
    }

    // Create prompts
    const systemPrompt = CATEGORY_ANALYSIS_SYSTEM_PROMPT;
    const userPrompt = createCategoryScoringPrompt(
      transcriptText,
      transcriptSegments,
      category,
      incidentContext
    );
    const model = options.model || DEFAULT_MODEL;
    const temperature = options.temperature ?? DEFAULT_CATEGORY_TEMPERATURE;

    // Estimate tokens for logging
    const inputTokens = estimateTokens(systemPrompt + userPrompt);

    // Request queue → Circuit breaker → Logging → Retry → OpenAI API
    // Queue controls request admission (rate limiting, concurrency)
    // Circuit breaker prevents cascading failures
    // Logging tracks API calls and token usage
    // Retry handles transient failures
    const completion = await requestQueues.openaiAPI.enqueue(
      async () => {
        return await circuitBreakers.openaiGPT4.execute(async () => {
          return await wrapOpenAICall(
            'compliance-category-scoring',
            model,
            inputTokens,
            async () => {
              return await retryWithBackoff(async () => {
                return await openai.responses.create(
                  {
                    model, // ⚠️ DO NOT change this model
                    input: [
                      { role: 'system', content: systemPrompt },
                      { role: 'user', content: userPrompt },
                    ],
                    temperature,
                    response_format: zodResponseFormat(
                      CategoryScoreSchema as any,
                      'category_score'
                    ),
                  },
                  {
                    timeout: 3 * 60 * 1000, // 3 minutes for compliance analysis
                  }
                );
              });
            },
            {
              estimatedInputTokens: inputTokens,
              categoryName: category.name,
              criteriaCount: category.criteria.length,
            }
          );
        });
      },
      1 // Normal priority for user-initiated compliance audits
    );

    const responseText = extractResponseText(
      completion,
      `Category score response (${category.name})`
    );

    let parsed: any;
    try {
      parsed = CategoryScoreSchema.parse(JSON.parse(responseText));

      logOpenAISchemaValidation(
        'compliance-category-scoring',
        'CategoryScoreSchema',
        true,
        [],
        { categoryName: category.name }
      );
    } catch (zodError) {
      const errors =
        zodError instanceof Error ? [zodError.message] : ['Unknown validation error'];
      logOpenAISchemaValidation(
        'compliance-category-scoring',
        'CategoryScoreSchema',
        false,
        errors,
        { categoryName: category.name }
      );
      throw zodError;
    }

    const categoryScore: CategoryScore = {
      ...parsed,
      timestamp: new Date().toISOString(),
    };

    const inputTokenUsage = completion.usage?.input_tokens ?? inputTokens;
    const outputTokens =
      completion.usage?.output_tokens ?? estimateTokens(responseText);
    logAPICall(
      'compliance-category-scoring',
      model,
      inputTokenUsage,
      outputTokens
    );

    // Log completion with summary
    logger.info('Category scoring completed successfully', {
      component: 'openai',
      operation: 'compliance-category-scoring',
      categoryName: category.name,
      overallScore: categoryScore.overallCategoryScore,
      categoryStatus: categoryScore.categoryStatus,
      criteriaScored: categoryScore.criteriaScores.length,
      model,
    });

    return categoryScore;
  } catch (error) {
    // Handle OpenAI APIError specifically
    if (error instanceof OpenAI.APIError) {
      logger.error('OpenAI API error in category scoring', {
        component: 'openai',
        operation: 'compliance-category-scoring',
        status: error.status,
        code: error.code,
        type: error.type,
        requestId: error.request_id,
        message: error.message,
        categoryName: category.name,
        criteriaCount: category.criteria.length,
        model: options.model || DEFAULT_MODEL,
      });

      // Handle specific error types
      if (error.status === 429) {
        throw Errors.rateLimited('OpenAI API');
      } else if (error.status === 503) {
        throw Errors.serviceUnavailable('OpenAI API');
      } else if (error.code === 'context_length_exceeded') {
        throw Errors.contextLimitExceeded();
      }

      // Generic APIError
      throw new AnalysisError(
        `OpenAI API error: ${error.message}`,
        category.name,
        error
      );
    }

    // Log error with context
    logger.error('Category scoring failed', {
      component: 'openai',
      operation: 'compliance-category-scoring',
      error: error instanceof Error ? error : new Error(String(error)),
      categoryName: category.name,
      criteriaCount: category.criteria.length,
      model: options.model || DEFAULT_MODEL,
    });

    // Handle Zod validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      throw new AnalysisError(
        `Invalid category score structure from AI: ${error.message}`,
        category.name,
        error
      );
    }

    // Handle other errors
    throw new AnalysisError(
      `Failed to score category "${category.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      category.name,
      error
    );
  }
}

/**
 * Generate audit narrative from category scores
 *
 * Creates a comprehensive executive summary, recommendations, and insights
 * from all category analysis results. Uses GPT-4.1 with structured outputs
 * to ensure consistent, actionable narratives.
 *
 * @param transcriptText Full radio transcript
 * @param categoryScores All category analysis results
 * @param incidentContext Context about the incident
 * @param options Narrative generation options
 * @returns Validated audit narrative
 * @throws AnalysisError if generation fails or AI refuses
 *
 * @example
 * ```typescript
 * const narrative = await generateAuditNarrative(
 *   transcript,
 *   [commScore, safetyScore, commandScore],
 *   {
 *     type: 'STRUCTURE_FIRE',
 *     date: new Date(),
 *     units: ['Engine 1', 'Ladder 2']
 *   }
 * );
 *
 * console.log(narrative.executiveSummary);
 * console.log(`Overall Score: ${narrative.overallScore}/100`);
 * narrative.recommendations.forEach(rec => {
 *   console.log(`[${rec.priority}] ${rec.recommendation}`);
 * });
 * ```
 */
export async function generateAuditNarrative(
  transcriptText: string,
  categoryScores: CategoryScore[],
  incidentContext: IncidentContext,
  options: NarrativeGenerationOptions = {}
): Promise<AuditNarrative> {
  try {
    // Validate inputs
    if (!categoryScores || categoryScores.length === 0) {
      throw new AnalysisError('No category scores provided for narrative generation');
    }

    // Create prompts
    const systemPrompt = NARRATIVE_GENERATION_SYSTEM_PROMPT;
    const userPrompt = createNarrativePrompt(
      transcriptText,
      categoryScores,
      incidentContext
    );
    const model = options.model || DEFAULT_MODEL;
    const temperature = options.temperature ?? DEFAULT_NARRATIVE_TEMPERATURE;

    // Estimate tokens for logging
    const inputTokens = estimateTokens(systemPrompt + userPrompt);

    // Request queue → Circuit breaker → Logging → Retry → OpenAI API
    // Queue controls request admission (rate limiting, concurrency)
    // Circuit breaker prevents cascading failures
    // Logging tracks API calls and token usage
    // Retry handles transient failures
    const completion = await requestQueues.openaiAPI.enqueue(
      async () => {
        return await circuitBreakers.openaiGPT4.execute(async () => {
          return await wrapOpenAICall(
            'compliance-narrative-generation',
            model,
            inputTokens,
            async () => {
              return await retryWithBackoff(async () => {
                return await openai.responses.create(
                  {
                    model, // ⚠️ DO NOT change this model
                    input: [
                      { role: 'system', content: systemPrompt },
                      { role: 'user', content: userPrompt },
                    ],
                    temperature,
                    response_format: zodResponseFormat(
                      AuditNarrativeSchema as any,
                      'audit_narrative'
                    ),
                  },
                  {
                    timeout: 3 * 60 * 1000, // 3 minutes for narrative generation
                  }
                );
              });
            },
            {
              estimatedInputTokens: inputTokens,
              categoryCount: categoryScores.length,
            }
          );
        });
      },
      1 // Normal priority for user-initiated compliance audits
    );

    const responseText = extractResponseText(
      completion,
      'Audit narrative generation response'
    );
    let parsed: AuditNarrative;
    try {
      parsed = AuditNarrativeSchema.parse(JSON.parse(responseText));

      logOpenAISchemaValidation(
        'compliance-narrative-generation',
        'AuditNarrativeSchema',
        true,
        []
      );
    } catch (zodError) {
      const errors =
        zodError instanceof Error ? [zodError.message] : ['Unknown validation error'];
      logOpenAISchemaValidation(
        'compliance-narrative-generation',
        'AuditNarrativeSchema',
        false,
        errors
      );
      throw zodError;
    }

    const inputTokenUsage = completion.usage?.input_tokens ?? inputTokens;
    const outputTokens =
      completion.usage?.output_tokens ?? estimateTokens(responseText);
    logAPICall(
      'compliance-narrative-generation',
      model,
      inputTokenUsage,
      outputTokens
    );

    // Log completion with summary
    logger.info('Audit narrative generation completed successfully', {
      component: 'openai',
      operation: 'compliance-narrative-generation',
      overallScore: parsed.overallScore,
      recommendationCount: parsed.recommendations.length,
      narrativeLength: parsed.executiveSummary.length,
      model,
    });

    return parsed;
  } catch (error) {
    // Handle OpenAI APIError specifically
    if (error instanceof OpenAI.APIError) {
      logger.error('OpenAI API error in narrative generation', {
        component: 'openai',
        operation: 'compliance-narrative-generation',
        status: error.status,
        code: error.code,
        type: error.type,
        requestId: error.request_id,
        message: error.message,
        categoryCount: categoryScores.length,
        model: options.model || DEFAULT_MODEL,
      });

      // Handle specific error types
      if (error.status === 429) {
        throw Errors.rateLimited('OpenAI API');
      } else if (error.status === 503) {
        throw Errors.serviceUnavailable('OpenAI API');
      } else if (error.code === 'context_length_exceeded') {
        throw Errors.contextLimitExceeded();
      }

      // Generic APIError
      throw new AnalysisError(
        `OpenAI API error: ${error.message}`,
        'narrative-generation',
        error
      );
    }

    // Log error with context
    logger.error('Audit narrative generation failed', {
      component: 'openai',
      operation: 'compliance-narrative-generation',
      error: error instanceof Error ? error : new Error(String(error)),
      categoryCount: categoryScores.length,
      model: options.model || DEFAULT_MODEL,
    });

    // Handle Zod validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      throw new AnalysisError(
        `Invalid audit narrative structure from AI: ${error.message}`,
        'narrative-generation',
        error
      );
    }

    // Handle other errors
    throw new AnalysisError(
      `Failed to generate audit narrative: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'narrative-generation',
      error
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract relevant evidence from transcript segments
 *
 * Finds transcript excerpts matching a search term with surrounding context.
 *
 * @param transcriptSegments All transcript segments
 * @param searchTerm Term to search for
 * @param contextWindowSec Seconds of context before/after (default: 5)
 * @returns Array of evidence items
 *
 * @example
 * ```typescript
 * const evidence = extractEvidenceFromTranscript(
 *   segments,
 *   'mayday',
 *   10
 * );
 * ```
 */
export function extractEvidenceFromTranscript(
  transcriptSegments: TranscriptSegment[],
  searchTerm: string,
  contextWindowSec: number = 5
): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];
  const searchLower = searchTerm.toLowerCase();

  transcriptSegments.forEach((segment, idx) => {
    if (segment.text.toLowerCase().includes(searchLower)) {
      // Find surrounding context
      let contextText = segment.text;
      const contextStart = Math.max(0, idx - 1);
      const contextEnd = Math.min(transcriptSegments.length - 1, idx + 1);

      // Add preceding segment if within time window
      if (
        idx > 0 &&
        segment.startTime - transcriptSegments[contextStart].endTime <= contextWindowSec
      ) {
        contextText = transcriptSegments[contextStart].text + ' ' + contextText;
      }

      // Add following segment if within time window
      if (
        idx < transcriptSegments.length - 1 &&
        transcriptSegments[contextEnd].startTime - segment.endTime <= contextWindowSec
      ) {
        contextText = contextText + ' ' + transcriptSegments[contextEnd].text;
      }

      // Format timestamp
      const minutes = Math.floor(segment.startTime / 60);
      const seconds = Math.floor(segment.startTime % 60);
      const timestamp =
        segment.startTime >= 3600
          ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      evidence.push({
        timestamp,
        text: contextText.trim(),
        relevance: 'CONTEXTUAL',
      });
    }
  });

  return evidence;
}

/**
 * Calculate weighted overall score from category scores
 *
 * Applies category weights to compute the final audit score.
 *
 * @param categoryScores Array of category scores
 * @param categoryWeights Map of category names to weights (0-1, sum to 1.0)
 * @returns Weighted overall score (0-100)
 *
 * @example
 * ```typescript
 * const weights = new Map([
 *   ['Communication', 0.4],
 *   ['Safety', 0.4],
 *   ['Command', 0.2]
 * ]);
 * const overall = calculateWeightedScore(categoryScores, weights);
 * ```
 */
export function calculateWeightedScore(
  categoryScores: CategoryScore[],
  categoryWeights: Map<string, number>
): number {
  let totalScore = 0;
  let totalWeight = 0;

  categoryScores.forEach((category) => {
    const weight = categoryWeights.get(category.categoryName) || 0;
    totalScore += category.overallCategoryScore * weight;
    totalWeight += weight;
  });

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round(totalScore / totalWeight);
}

/**
 * Identify critical findings across all categories
 *
 * Extracts high-priority issues requiring immediate attention.
 *
 * @param categoryScores Array of category scores
 * @returns Array of critical finding descriptions
 *
 * @example
 * ```typescript
 * const criticalIssues = identifyCriticalFindings(categoryScores);
 * criticalIssues.forEach(issue => {
 *   console.error(`CRITICAL: ${issue}`);
 * });
 * ```
 */
export function identifyCriticalFindings(categoryScores: CategoryScore[]): string[] {
  const criticalFindings: string[] = [];

  categoryScores.forEach((category) => {
    // Add category-level critical findings
    category.criticalFindings.forEach((finding) => {
      criticalFindings.push(`[${category.categoryName}] ${finding}`);
    });

    // Extract criterion-level critical findings
    category.criteriaScores.forEach((criterion) => {
      if (
        criterion.score === 'FAIL' &&
        criterion.confidence >= 0.8 &&
        criterion.recommendation
      ) {
        const evidenceTimestamp =
          criterion.evidence.length > 0 ? ` (${criterion.evidence[0].timestamp})` : '';
        criticalFindings.push(
          `[${category.categoryName}] ${criterion.reasoning}${evidenceTimestamp}`
        );
      }
    });
  });

  return criticalFindings;
}
