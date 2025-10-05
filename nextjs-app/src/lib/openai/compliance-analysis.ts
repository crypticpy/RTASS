/**
 * Compliance Analysis Integration
 *
 * Uses GPT-4 to analyze radio transcripts against audit templates
 * and generate detailed compliance reports with evidence and recommendations.
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
import { TemplateCategory, TemplateCriterion } from './template-generation';

/**
 * Context about the incident being analyzed
 */
export interface IncidentContext {
  type?: string;
  date?: Date;
  units?: string[];
  notes?: string;
}

/**
 * Result of analyzing a single category
 */
export interface CategoryAnalysisResult {
  category: string;
  categoryScore: number;
  criteriaScores: CriterionScore[];
  overallAnalysis: string;
  keyFindings: string[];
  recommendations: string[];
}

/**
 * Score and analysis for a single criterion
 */
export interface CriterionScore {
  criterionId: string;
  score: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
  confidence: number;
  evidence: Evidence[];
  reasoning: string;
  impact?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation?: string;
}

/**
 * Evidence extracted from transcript
 */
export interface Evidence {
  timestamp: string;
  text: string;
  type: 'VIOLATION' | 'COMPLIANCE' | 'CONTEXT';
}

/**
 * Complete audit results
 */
export interface AuditResults {
  overallScore: number;
  categories: CategoryAnalysisResult[];
  executiveSummary?: string;
  criticalFindings?: string[];
}

/**
 * Options for compliance analysis
 */
export interface AnalysisOptions {
  model?: string;
  temperature?: number;
}

/**
 * Default GPT-4 model for compliance analysis
 */
const DEFAULT_MODEL = 'gpt-4-turbo-preview';

/**
 * System prompt for compliance analysis
 */
const COMPLIANCE_ANALYSIS_SYSTEM_PROMPT = `You are a fire service compliance auditor analyzing radio communications.

Your task is to objectively evaluate radio transcripts against specific compliance criteria.

IMPORTANT GUIDELINES:
- Use EXACT transcript text for all evidence
- Include precise timestamps in MM:SS format
- Be objective and specific in your reasoning
- Identify both violations AND examples of compliance
- Provide actionable, specific recommendations
- Consider the operational context of emergency incidents
- Use NOT_APPLICABLE when criteria don't apply to the situation
- Assign appropriate impact levels based on safety implications`;

/**
 * Create user prompt for category analysis
 */
function createAnalysisPrompt(
  transcript: string,
  incidentContext: IncidentContext,
  category: TemplateCategory
): string {
  let prompt = `TRANSCRIPT:\n${transcript}\n\n`;

  prompt += `INCIDENT CONTEXT:\n`;
  if (incidentContext.type) {
    prompt += `- Type: ${incidentContext.type}\n`;
  }
  if (incidentContext.date) {
    prompt += `- Date: ${incidentContext.date.toISOString().split('T')[0]}\n`;
  }
  if (incidentContext.units && incidentContext.units.length > 0) {
    prompt += `- Units: ${incidentContext.units.join(', ')}\n`;
  }
  if (incidentContext.notes) {
    prompt += `- Notes: ${incidentContext.notes}\n`;
  }
  prompt += '\n';

  prompt += `CATEGORY TO ANALYZE: ${category.name}\n`;
  prompt += `WEIGHT: ${(category.weight * 100).toFixed(0)}%\n\n`;

  if (category.description) {
    prompt += `CATEGORY DESCRIPTION: ${category.description}\n\n`;
  }

  prompt += `CRITERIA TO SCORE:\n`;
  category.criteria.forEach((crit, idx) => {
    prompt += `${idx + 1}. [Criterion ID: ${crit.id}]\n`;
    prompt += `   Description: ${crit.description}\n`;
    prompt += `   Scoring Guidance: ${crit.scoringGuidance}\n`;
    if (crit.examplePass) {
      prompt += `   Example PASS: ${crit.examplePass}\n`;
    }
    if (crit.exampleFail) {
      prompt += `   Example FAIL: ${crit.exampleFail}\n`;
    }
    prompt += '\n';
  });

  prompt += `TASK:
For each criterion above, provide:
1. Score: PASS, FAIL, or NOT_APPLICABLE
2. Evidence: Specific transcript excerpts with timestamps
3. Reasoning: Brief explanation of score (2-3 sentences)
4. Impact: CRITICAL, HIGH, MEDIUM, or LOW (for failures)
5. Recommendation: Specific action to address issues (for failures)

OUTPUT FORMAT (JSON):
{
  "category": "${category.name}",
  "categoryScore": 0.75,
  "criteriaScores": [
    {
      "criterionId": "${category.criteria[0]?.id || 'example'}",
      "score": "FAIL",
      "confidence": 0.95,
      "evidence": [
        {
          "timestamp": "00:14:35",
          "text": "[Exact excerpt from transcript]",
          "type": "VIOLATION"
        }
      ],
      "reasoning": "Clear explanation of why this score was assigned",
      "impact": "HIGH",
      "recommendation": "Specific actionable recommendation"
    }
  ],
  "overallAnalysis": "Overall assessment of performance in this category",
  "keyFindings": ["Finding 1", "Finding 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

SCORING NOTES:
- categoryScore should be 0.0 to 1.0 (average of criteria scores)
- PASS = 1.0, FAIL = 0.0, NOT_APPLICABLE = excluded from average
- Include multiple evidence items when relevant
- Be specific and objective in all reasoning`;

  return prompt;
}

/**
 * Analyze transcript against a single category
 *
 * Uses GPT-4 to evaluate radio communications transcript against
 * all criteria in a template category.
 *
 * @param transcript Full transcript with timestamps
 * @param incidentContext Context about the incident
 * @param category Template category to analyze
 * @param options Analysis options
 * @returns Detailed analysis results for the category
 * @throws AnalysisError if analysis fails
 *
 * @example
 * ```typescript
 * const result = await analyzeCategory(
 *   transcript,
 *   {
 *     type: 'Structure Fire',
 *     date: new Date('2024-12-15'),
 *     units: ['Engine 1', 'Ladder 2']
 *   },
 *   category
 * );
 *
 * console.log(`Category Score: ${result.categoryScore}`);
 * result.criteriaScores.forEach(score => {
 *   console.log(`${score.criterionId}: ${score.score}`);
 * });
 * ```
 */
export async function analyzeCategory(
  transcript: string,
  incidentContext: IncidentContext,
  category: TemplateCategory,
  options: AnalysisOptions = {}
): Promise<CategoryAnalysisResult> {
  try {
    // Validate input
    if (!transcript || transcript.trim().length === 0) {
      throw new AnalysisError('Transcript is empty');
    }

    if (!category || !category.criteria || category.criteria.length === 0) {
      throw new AnalysisError('Category has no criteria to analyze');
    }

    // Create prompt
    const userPrompt = createAnalysisPrompt(transcript, incidentContext, category);
    const model = options.model || DEFAULT_MODEL;

    // Estimate tokens for logging
    const inputTokens = estimateTokens(
      COMPLIANCE_ANALYSIS_SYSTEM_PROMPT + userPrompt
    );

    // Call GPT-4 with retry logic
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: COMPLIANCE_ANALYSIS_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: options.temperature ?? 0.3, // Low temperature for consistency
        response_format: { type: 'json_object' },
      });
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new AnalysisError('Empty response from GPT-4');
    }

    // Parse JSON response
    const parsed = parseJSONResponse<CategoryAnalysisResult>(responseText);

    // Validate required fields
    validateResponseFields(parsed, [
      'category',
      'categoryScore',
      'criteriaScores',
    ]);

    // Validate and transform result
    const result = validateAndTransformAnalysis(parsed, category);

    // Log API call
    const outputTokens = estimateTokens(responseText);
    logAPICall('compliance-analysis', model, inputTokens, outputTokens);

    return result;
  } catch (error) {
    throw new AnalysisError(
      `Failed to analyze category "${category.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      category.name,
      error
    );
  }
}

/**
 * Validate and transform analysis result
 */
function validateAndTransformAnalysis(
  parsed: CategoryAnalysisResult,
  category: TemplateCategory
): CategoryAnalysisResult {
  // Validate category score
  if (
    typeof parsed.categoryScore !== 'number' ||
    parsed.categoryScore < 0 ||
    parsed.categoryScore > 1
  ) {
    throw new AnalysisError(
      'Category score must be a number between 0 and 1'
    );
  }

  // Validate criteria scores
  if (!Array.isArray(parsed.criteriaScores)) {
    throw new AnalysisError('criteriaScores must be an array');
  }

  // Validate each criterion score
  parsed.criteriaScores.forEach((score, idx) => {
    if (!score.criterionId || !score.score) {
      throw new AnalysisError(
        `Criterion score ${idx} missing required fields`
      );
    }

    if (!['PASS', 'FAIL', 'NOT_APPLICABLE'].includes(score.score)) {
      throw new AnalysisError(
        `Invalid score value: ${score.score}. Must be PASS, FAIL, or NOT_APPLICABLE`
      );
    }

    if (!Array.isArray(score.evidence)) {
      score.evidence = [];
    }

    if (
      typeof score.confidence !== 'number' ||
      score.confidence < 0 ||
      score.confidence > 1
    ) {
      score.confidence = 0.5; // Default to medium confidence if invalid
    }
  });

  return parsed;
}

/**
 * Generate narrative summary from audit results
 *
 * Creates a human-readable executive summary of audit findings.
 *
 * @param auditResults Complete audit results
 * @param options Analysis options
 * @returns Narrative summary text
 * @throws AnalysisError if generation fails
 *
 * @example
 * ```typescript
 * const narrative = await generateNarrative(auditResults);
 * console.log(narrative);
 * ```
 */
export async function generateNarrative(
  auditResults: AuditResults,
  options: AnalysisOptions = {}
): Promise<string> {
  try {
    // Create summary of results
    const summary = {
      overallScore: auditResults.overallScore,
      categoryCount: auditResults.categories.length,
      categories: auditResults.categories.map((cat) => ({
        name: cat.category,
        score: cat.categoryScore,
        keyFindings: cat.keyFindings,
      })),
    };

    const model = options.model || DEFAULT_MODEL;

    const prompt = `You are a fire service compliance auditor writing an executive summary.

AUDIT RESULTS:
${JSON.stringify(summary, null, 2)}

TASK:
Write a professional, concise executive summary (3-5 paragraphs) that:
1. Provides an overview of the audit scope and overall performance
2. Highlights key strengths and areas of compliance
3. Identifies critical findings and areas for improvement
4. Provides actionable recommendations
5. Maintains a constructive, professional tone

Write the summary in clear, direct language suitable for fire service leadership.
Do NOT use JSON format - write plain text paragraphs.`;

    // Call GPT-4
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional fire service compliance auditor.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
      });
    });

    const narrative = completion.choices[0]?.message?.content;
    if (!narrative) {
      throw new AnalysisError('Failed to generate narrative summary');
    }

    return narrative.trim();
  } catch (error) {
    throw new AnalysisError(
      `Failed to generate narrative: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'narrative-generation',
      error
    );
  }
}

/**
 * Calculate overall audit score from category results
 *
 * @param categories Array of category analysis results
 * @returns Weighted overall score (0.0 to 1.0)
 */
export function calculateOverallScore(
  categories: CategoryAnalysisResult[],
  categoryWeights: Map<string, number>
): number {
  let totalScore = 0;
  let totalWeight = 0;

  categories.forEach((cat) => {
    const weight = categoryWeights.get(cat.category) || 0;
    totalScore += cat.categoryScore * weight;
    totalWeight += weight;
  });

  if (totalWeight === 0) {
    return 0;
  }

  return totalScore / totalWeight;
}

/**
 * Extract critical findings from audit results
 *
 * @param auditResults Complete audit results
 * @returns Array of critical findings
 */
export function extractCriticalFindings(
  auditResults: AuditResults
): string[] {
  const criticalFindings: string[] = [];

  auditResults.categories.forEach((cat) => {
    cat.criteriaScores.forEach((score) => {
      if (
        score.score === 'FAIL' &&
        (score.impact === 'CRITICAL' || score.impact === 'HIGH')
      ) {
        criticalFindings.push(
          `[${cat.category}] ${score.reasoning} (${score.evidence[0]?.timestamp || 'N/A'})`
        );
      }
    });
  });

  return criticalFindings;
}
