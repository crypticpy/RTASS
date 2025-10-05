/**
 * Compliance Service
 * Fire Department Radio Transcription System
 *
 * GPT-4o-powered compliance scoring engine that:
 * - Evaluates transcripts against compliance templates
 * - Extracts findings with citations
 * - Generates weighted scores
 * - Provides actionable recommendations
 */

import { getOpenAIClient, withRateLimit, trackTokenUsage } from './utils/openai';
import { templateService } from './templateService';
import { prisma } from '@/lib/db';
import { Errors } from './utils/errorHandlers';
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

// Prisma JSON type helper
type PrismaJson = Record<string, unknown> | unknown[];

/**
 * GPT-4o response structure
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
 * Provides AI-powered compliance auditing using GPT-4o.
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
   * 2. Build scoring prompt for GPT-4o
   * 3. Call GPT-4o API for evaluation
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
      // Step 1: Fetch transcript and template
      const transcript = await prisma.transcript.findUnique({
        where: { id: transcriptId },
        include: { incident: true },
      });

      if (!transcript) {
        throw Errors.notFound('Transcript', transcriptId);
      }

      const template = await templateService.getTemplateById(templateId);

      // Step 2: Build scoring prompt
      const prompt = this.buildScoringPrompt(
        transcript,
        template,
        additionalNotes
      );

      // Step 3: Call GPT-4o API
      const gptResponse = await this.callGPT4o(prompt);

      // Step 4: Parse response
      const parsedAudit = this.parseAuditResponse(
        gptResponse,
        template.categories as ComplianceCategory[]
      );

      // Step 5: Calculate scores
      const categoriesWithScores = this.calculateCategoryScores(
        parsedAudit.categories
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
        model: 'gpt-4o',
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

      // Step 10: Save audit to database
      const audit = await this.saveAudit({
        incidentId: transcript.incidentId,
        transcriptId: transcript.id,
        templateId: template.id,
        overallScore,
        overallStatus,
        summary,
        categories: categoriesWithScores,
        findings: allFindings,
        recommendations,
        metadata,
      });

      // Step 11: Return formatted result
      return {
        id: audit.id,
        incidentId: audit.incidentId,
        transcriptId: audit.transcriptId,
        templateId: audit.templateId,
        overallStatus: audit.overallStatus as AuditStatus,
        overallScore: audit.overallScore,
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
    const categories = template.categories as ComplianceCategory[];

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
   * Call GPT-4o API for compliance scoring
   *
   * @private
   * @param {string} prompt - Scoring prompt
   * @returns {Promise} GPT-4o response
   * @throws {ServiceError} If API call fails
   */
  private async callGPT4o(prompt: string): Promise<any> {
    try {
      const client = getOpenAIClient();

      const response = await withRateLimit(async () => {
        return await client.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.1, // Low for consistency
          max_tokens: 4000,
          response_format: { type: 'json_object' },
          messages: [
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
        await trackTokenUsage(
          'gpt-4o',
          {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          },
          'compliance_audit'
        );
      }

      return {
        content: JSON.parse(response.choices[0].message.content || '{}'),
        usage: response.usage,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw Errors.externalServiceError('OpenAI GPT-4o API', error.message);
      }
      throw Errors.processingFailed('GPT-4o API call', 'Unknown error');
    }
  }

  /**
   * Parse and validate GPT-4o response
   *
   * @private
   * @param {object} gptResponse - Raw GPT-4o response
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
        'GPT-4o response parsing',
        'Invalid response format'
      );
    }

    // Merge GPT-4o results with template structure
    const categories = templateCategories.map((templateCategory) => {
      const gptCategory = content.categories.find(
        (c: any) => c.name === templateCategory.name
      );

      if (!gptCategory) {
        // If GPT-4o didn't provide this category, mark all as NOT_APPLICABLE
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
   * Save audit to database
   *
   * @private
   * @param {object} auditData - Audit data to save
   * @returns {Promise} Saved audit
   */
  private async saveAudit(auditData: {
    incidentId: string;
    transcriptId: string | null;
    templateId: string;
    overallScore: number | null;
    overallStatus: AuditStatus;
    summary: string;
    categories: ComplianceCategory[];
    findings: Finding[];
    recommendations: Recommendation[];
    metadata: AuditMetadata;
  }) {
    try {
      const audit = await prisma.audit.create({
        data: {
          incidentId: auditData.incidentId,
          transcriptId: auditData.transcriptId,
          templateId: auditData.templateId,
          overallScore: auditData.overallScore,
          overallStatus: auditData.overallStatus,
          summary: auditData.summary,
          findings: {
            categories: auditData.categories,
            findings: auditData.findings,
          } as PrismaJson,
          recommendations: auditData.recommendations as unknown as PrismaJson,
          metadata: auditData.metadata as unknown as PrismaJson,
        },
      });

      return audit;
    } catch (error) {
      throw Errors.processingFailed(
        'Audit save',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
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

      const findings = audit.findings as { categories: ComplianceCategory[]; findings: Finding[] };

      return {
        id: audit.id,
        incidentId: audit.incidentId,
        transcriptId: audit.transcriptId,
        templateId: audit.templateId,
        overallStatus: audit.overallStatus as AuditStatus,
        overallScore: audit.overallScore,
        summary: audit.summary,
        categories: findings.categories || [],
        findings: findings.findings || [],
        recommendations: audit.recommendations as Recommendation[],
        metadata: audit.metadata as AuditMetadata,
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
}

/**
 * Singleton compliance service instance
 */
export const complianceService = new ComplianceService();
